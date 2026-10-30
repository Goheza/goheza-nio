'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard, Megaphone, PlusCircle, Inbox, BarChart3, Wallet, User, HelpCircle,
    MessageCircle, Settings, LogOut, Search, Menu, X, SmilePlus, Loader2, BellRing,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Logo } from '@/components/site/Logo'
import { supabase } from '@/lib/supabase'
import { _signout } from '@/lib/api/common'
import VerificationPending from '@/components/app/brand/verification'
import { getBrandLogo } from '@/lib/brand-utils'
import { AvatarX } from '@/components/app/avatar'
import RefreshableImage from '@/components/app/refreshable-image'
import NotificationBell from '@/components/app/notification-bell'
import { ImpersonationBanner } from '@/components/app/brand/impersonation-brand'
import GlobalErrorLogger from '@/components/app/brand/GlobalErrorLogger'
import { logError, logInfo } from '@/lib/logger'

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean }
const primary: NavItem[] = [
    { to: '/app/brand', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/app/brand/campaigns', label: 'Campaigns', icon: Megaphone },
    { to: '/app/brand/create', label: 'Create Campaign', icon: PlusCircle },
    { to: '/app/brand/applications', label: 'Applications', icon: SmilePlus },
    { to: '/app/brand/submissions', label: 'Submissions', icon: Inbox },
    { to: '/app/brand/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/app/brand/notifications', label: 'Notifications', icon: BellRing },
    { to: '/app/brand/wallet', label: 'Wallet', icon: Wallet },
]
const secondary: NavItem[] = [
    { to: '/app/brand/profile', label: 'Profile', icon: User },
    { to: '/app/brand/how-it-works', label: 'How Goheza Works', icon: HelpCircle },
    { to: '/app/brand/support', label: 'Support', icon: MessageCircle },
    { to: '/app/brand/settings', label: 'Settings', icon: Settings },
]

type BrandHeaderInfo = { name: string; initial: string }
type VerificationStatus = 'loading' | 'verified' | 'unverified' | 'error'

export default function BrandLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const [openMobile, setOpenMobile] = useState(false)
    const [brandInfo, setBrandInfo] = useState<BrandHeaderInfo>({ name: '', initial: '?' })
    const [userId, setUserId] = useState<string | null>(null)
    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('loading')
    const [brandLogo, setBrandLogo] = useState<string | null>(null)
    const [fatalError, setFatalError] = useState<string | null>(null)

    /** Throws on any failure so the caller can log + show it. */
    const brandVerificationCheck = async (): Promise<boolean> => {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw Object.assign(new Error('auth.getUser failed: ' + userError.message), { cause: userError })
        if (!user) throw new Error('No logged-in user (session missing or expired)')

        const { data, error } = await supabase
            .from('brand_profiles')
            .select('is_verified')
            .eq('user_id', user.id)
            .maybeSingle()

        if (error) throw Object.assign(new Error('brand_profiles query failed: ' + error.message), { cause: error })
        if (!data) throw new Error(`No brand_profiles row for user_id=${user.id}`)

        return !!data.is_verified
    }

    const logoutUser = async (e: React.MouseEvent) => {
        e.preventDefault()
        try {
            await _signout()
            router.push('/app/auth/login')
        } catch (err) {
            logError('BrandLayout.logout', err)
        }
    }

    const initialize = useCallback(async () => {
        logInfo('BrandLayout', 'verifying brand…')
        try {
            const isVerified = await brandVerificationCheck()
            logInfo('BrandLayout', 'verified =', isVerified)
            setFatalError(null)
            setVerificationStatus(isVerified ? 'verified' : 'unverified')
        } catch (err) {
            logError('BrandLayout.initialize', err)
            setFatalError(err instanceof Error ? err.message : String(err))
            setVerificationStatus('error') // never stay stuck on "loading"
        }
    }, [])

    useEffect(() => {
        initialize()
    }, [initialize])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const { data: userData, error: userErr } = await supabase.auth.getUser()
                if (userErr) throw userErr
                if (!userData?.user || cancelled) return
                setUserId(userData.user.id)

                const { data: profile, error: profileErr } = await supabase
                    .from('brand_profiles')
                    .select('brand_name')
                    .eq('user_id', userData.user.id)
                    .maybeSingle()
                if (profileErr) logError('BrandLayout.profile', profileErr)

                try {
                    const logo = await getBrandLogo()
                    if (logo && !cancelled) setBrandLogo(logo.logo_url)
                } catch (err) {
                    logError('BrandLayout.getBrandLogo', err)
                }

                if (cancelled) return
                const name = profile?.brand_name ?? ''
                setBrandInfo({ name, initial: name ? name.slice(0, 1).toUpperCase() : '?' })
            } catch (err) {
                logError('BrandLayout.loadHeader', err)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    const isActive = (item: NavItem) =>
        item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + '/')

    const SidebarBody = (
        <nav className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-5">
            <div className="px-2 pb-4" onClick={() => setOpenMobile(false)}>
                <Logo className="h-8 w-auto" />
            </div>
            <SidebarSection items={primary} isActive={isActive} onNav={() => setOpenMobile(false)} />
            <div className="my-3 h-px bg-hairline" />
            <SidebarSection items={secondary} isActive={isActive} onNav={() => setOpenMobile(false)} />
            <div className="mt-auto pt-4">
                <div
                    onClick={logoutUser}
                    className="flex cursor-pointer w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
                >
                    <LogOut className="h-4 w-4" />
                    Log out
                </div>
            </div>
        </nav>
    )

    if (verificationStatus === 'loading') {
        return (
            <>
                <GlobalErrorLogger />
                <BrandLayoutLoading />
            </>
        )
    }

    if (verificationStatus === 'error') {
        return (
            <>
                <GlobalErrorLogger />
                <div className="flex min-h-screen items-center justify-center p-6">
                    <div className="max-w-lg rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-900">
                        <p className="font-semibold">Couldn’t verify your account</p>
                        <pre className="mt-2 whitespace-pre-wrap">{fatalError}</pre>
                        <p className="mt-2 opacity-70">Full details are in the browser console (F12).</p>
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => { setVerificationStatus('loading'); initialize() }} className="rounded-full bg-red-600 px-4 py-2 text-white">
                                Retry
                            </button>
                            <button onClick={logoutUser} className="rounded-full border border-red-300 px-4 py-2">
                                Log out
                            </button>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    if (verificationStatus === 'verified') {
        return (
            <div className="min-h-screen bg-[oklch(0.965_0.012_78)] text-foreground">
                <GlobalErrorLogger />
                <ImpersonationBanner />
                <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-hairline bg-surface-elevated lg:block">
                    {SidebarBody}
                </aside>
                {openMobile && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <button
                            aria-label="Close menu"
                            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
                            onClick={() => setOpenMobile(false)}
                        />
                        <aside className="absolute inset-y-0 left-0 w-72 bg-surface-elevated shadow-elevated">
                            <div className="absolute right-3 top-3">
                                <button
                                    onClick={() => setOpenMobile(false)}
                                    className="rounded-full bg-ink/5 p-2 text-ink hover:bg-ink/10"
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {SidebarBody}
                        </aside>
                    </div>
                )}
                <div className="lg:pl-64">
                    <header className="sticky flex items-center justify-between top-0 z-20 border-b border-hairline bg-surface-elevated/85 backdrop-blur-xl">
                        <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
                            <button
                                onClick={() => setOpenMobile(true)}
                                className="rounded-xl p-2 text-ink hover:bg-ink/5 lg:hidden"
                                aria-label="Open menu"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <div className="hidden flex-1 items-center sm:flex sm:max-w-md">
                                <div className="relative w-full">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="search"
                                        placeholder="Search campaigns, creators…"
                                        className="w-full rounded-full border border-hairline bg-background py-2 pl-9 pr-4 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 sm:hidden" />
                            <div className="flex items-center gap-2">
                                <NotificationBell userId={userId} viewAllHref="/app/brand/notifications" />
                                <Link
                                    href="/app/brand/create"
                                    className="hidden rounded-full px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:scale-[1.02] sm:inline-flex"
                                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                                >
                                    + New Campaign
                                </Link>
                                <Link
                                    href="/app/brand/profile"
                                    className="flex items-center gap-2 rounded-full border border-hairline bg-background py-1 pl-1 pr-3 hover:bg-ink/5"
                                >
                                    <AvatarX initial={brandInfo.initial} brandLogo={brandLogo} name="" />
                                    <span className="hidden text-sm font-medium text-ink sm:inline">
                                        {brandInfo.name || 'Your brand'}
                                    </span>
                                </Link>
                            </div>
                        </div>
                        <RefreshableImage
                            src={'/goheza.jpeg'}
                            alt={brandInfo.name || 'Your brand'}
                            size={36}
                            onRefresh={async () => {
                                window.location.reload()
                            }}
                        />
                    </header>

                    <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
                </div>
            </div>
        )
    }

    return (
        <>
            <GlobalErrorLogger />
            <VerificationPending reloadVerification={initialize} />
        </>
    )
}

function BrandLayoutLoading() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[oklch(0.965_0.012_78)]">
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-hairline bg-surface-elevated px-10 py-9 shadow-card">
                <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                >
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                </span>
                <div className="text-center">
                    <p className="font-display text-base font-semibold text-ink">Checking your account</p>
                    <p className="mt-1 text-sm text-muted-foreground">Just a moment while we verify your brand.</p>
                </div>
            </div>
        </div>
    )
}

function SidebarSection({
    items, isActive, onNav,
}: {
    items: NavItem[]
    isActive: (i: NavItem) => boolean
    onNav: () => void
}) {
    return (
        <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
                const active = isActive(item)
                const Icon = item.icon
                return (
                    <li key={item.to}>
                        <Link
                            href={item.to}
                            onClick={onNav}
                            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                                active ? 'text-primary-foreground shadow-sm' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
                            }`}
                            style={active ? { backgroundImage: 'var(--gradient-primary)' } : undefined}
                        >
                            {active && (
                                <span
                                    aria-hidden
                                    className="absolute left-0 top-1/2 h-5 w-1 -translate-x-1.5 -translate-y-1/2 rounded-full bg-coral"
                                />
                            )}
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}