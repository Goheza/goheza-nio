'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Building2,
    Users,
    Megaphone,
    Inbox,
    ShieldCheck,
    Settings,
    LogOut,
    Search,
    ChartLine,
    Menu,
    Wallet,
    DollarSign,
    X,
    FunnelX,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/site/Logo'
import { supabase } from '@/lib/supabase'
import { _signout } from '@/lib/api/common'

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean }

const primary: NavItem[] = [
    { to: '/app/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/app/admin/brands', label: 'Brands', icon: Building2 },
    { to: '/app/admin/creators', label: 'Creators', icon: Users },
    { to: '/app/admin/campaigns', label: 'Campaigns', icon: Megaphone },
    { to: '/app/admin/submissions', label: 'Submissions', icon: Inbox },
    { to: '/app/admin/analytics', label: 'Analytics', icon: ChartLine },
    { to: '/app/admin/wallet', label: 'Wallet', icon: Wallet },
    { to: '/app/admin/screening', label: 'Screening', icon: FunnelX },
    { to: '/app/admin/invoices', label: 'Invoices', icon: DollarSign },
]

// Roster management is flagged super_admin-only in the roles doc — shown
// // conditionally below rather than hardcoded into `primary`.
// const rosterItem: NavItem = { to: '/app/admin/roster', label: 'Admin Roster', icon: ShieldCheck }

// const secondary: NavItem[] = [{ to: '/app/admin/settings', label: 'Settings', icon: Settings }]

type AdminHeaderInfo = { name: string; initial: string; role: 'moderator' | 'super_admin' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [openMobile, setOpenMobile] = useState(false)
    const [adminInfo, setAdminInfo] = useState<AdminHeaderInfo>({ name: '', initial: '?', role: 'moderator' })
    const [checkingAuth, setCheckingAuth] = useState(true)

    const router = useRouter()

    const logoutUser = (e: any) => {
        e.preventDefault()
        _signout().then(() => {
            router.push('/app/auth/login')
        })
    }

    useEffect(() => {
        let cancelled = false

        ;(async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (cancelled) return

            // Not logged in
            if (!user) {
                router.replace('/app/auth/login')
                return
            }

            const { data: admin } = await supabase
                .from('admins')
                .select('full_name, role')
                .eq('user_id', user.id)
                .maybeSingle()

            if (cancelled) return

            // Logged in but not an admin
            if (!admin) {
                await supabase.auth.signOut()
                router.replace('/app/auth/login')
                return
            }

            const name = admin.full_name ?? ''

            setAdminInfo({
                name,
                initial: name ? name.charAt(0).toUpperCase() : '?',
                role: admin.role as 'moderator' | 'super_admin',
            })

            setCheckingAuth(false)
        })()

        return () => {
            cancelled = true
        }
    }, [router])

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                router.replace('/app/auth/login')
            }
        })

        return () => subscription.unsubscribe()
    }, [router])

    const isActive = (item: NavItem) =>
        item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + '/')

    const navItems = adminInfo.role === 'super_admin' ? [...primary] : primary

    const SidebarBody = (
        <nav className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-5">
            <div className="px-2 pb-4" onClick={() => setOpenMobile(false)}>
                <Logo className="h-8 w-auto" />
            </div>
            <SidebarSection items={navItems} isActive={isActive} onNav={() => setOpenMobile(false)} />
            <div className="my-3 h-px bg-hairline" />
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

    if (checkingAuth) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[oklch(0.965_0.012_78)]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[oklch(0.965_0.012_78)] text-foreground">
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
                <header className="sticky top-0 z-20 border-b border-hairline bg-surface-elevated/85 backdrop-blur-xl">
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
                                    placeholder="Search brands, creators, campaigns…"
                                    className="w-full rounded-full border border-hairline bg-background py-2 pl-9 pr-4 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </div>
                        </div>
                        <div className="flex-1 sm:hidden" />
                        <div className="flex items-center gap-3">
                            <span className="hidden rounded-full border border-hairline bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft sm:inline-flex">
                                {adminInfo.role === 'super_admin' ? 'Super Admin' : 'Moderator'}
                            </span>
                            <Link
                                href="/app/admin/settings"
                                className="flex items-center gap-2 rounded-full border border-hairline bg-background py-1 pl-1 pr-3 hover:bg-ink/5"
                            >
                                <span
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                                    style={{ backgroundImage: 'var(--gradient-primary)' }}
                                >
                                    {adminInfo.initial}
                                </span>
                                <span className="hidden text-sm font-medium text-ink sm:inline">
                                    {adminInfo.name || 'Admin'}
                                </span>
                            </Link>
                        </div>
                    </div>
                </header>
                <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
            </div>
        </div>
    )
}

function SidebarSection({
    items,
    isActive,
    onNav,
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
                                active
                                    ? 'text-primary-foreground shadow-sm'
                                    : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
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
