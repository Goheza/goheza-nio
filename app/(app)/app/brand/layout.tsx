'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Megaphone,
    PlusCircle,
    Inbox,
    BarChart3,
    Wallet,
    User,
    HelpCircle,
    MessageCircle,
    Settings,
    LogOut,
    Search,
    Menu,
    X,
    Bell,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    DollarSign,
    Clock,
    FileText,
    Users,
    Award,
    Calendar,
    SmilePlus,
    Zap,
    Loader2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Logo } from '@/components/site/Logo'
import { supabase } from '@/lib/supabase'
import { listNotifications, markAllAsRead } from '@/lib/api/notifications'
import type { Notification, NotificationKind, NotificationCategory } from '@/types/notification'
import { _signout } from '@/lib/api/common'
import VerificationPending from '@/components/app/brand/verification'
import { getBrandLogo } from '@/lib/brand-utils'
import { AvatarX } from '@/components/app/avatar'
import RefreshableImage from '@/components/app/refreshable-image'

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean }
const primary: NavItem[] = [
    { to: '/app/brand', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/app/brand/campaigns', label: 'Campaigns', icon: Megaphone },
    { to: '/app/brand/create', label: 'Create Campaign', icon: PlusCircle },
    { to: '/app/brand/applications', label: 'Applications', icon: SmilePlus },
    { to: '/app/brand/submissions', label: 'Submissions', icon: Inbox },
    { to: '/app/brand/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/app/brand/wallet', label: 'Wallet', icon: Wallet },
]
const secondary: NavItem[] = [
    { to: '/app/brand/profile', label: 'Profile', icon: User },
    { to: '/app/brand/how-it-works', label: 'How Goheza Works', icon: HelpCircle },
    { to: '/app/brand/support', label: 'Support', icon: MessageCircle },
    { to: '/app/brand/settings', label: 'Settings', icon: Settings },
]
const notifIconMap: Record<NotificationKind, React.ReactNode> = {
    application: <Users className="h-4 w-4 text-[oklch(0.5_0.14_268)]" />,
    submission: <Sparkles className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />,
    revision: <AlertTriangle className="h-4 w-4 text-[oklch(0.5_0.18_45)]" />,
    approval: <CheckCircle2 className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />,
    submission_limit: <Inbox className="h-4 w-4 text-[oklch(0.5_0.14_268)]" />,
    phase_change: <Zap className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />,
    campaign_end: <Clock className="h-4 w-4 text-ink-soft" />,
    milestone_payment: <DollarSign className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />,
    milestone_views: <Award className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />,
    wallet_low: <AlertTriangle className="h-4 w-4 text-[oklch(0.5_0.18_25)]" />,
    payment_processed: <DollarSign className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />,
    invoice: <FileText className="h-4 w-4 text-ink-soft" />,
    platform: <Sparkles className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />,
    support: <MessageCircle className="h-4 w-4 text-[oklch(0.5_0.14_268)]" />,
    meeting: <Calendar className="h-4 w-4 text-[oklch(0.5_0.14_268)]" />,
}

const FILTERS: ('All' | NotificationCategory)[] = [
    'All',
    'Campaigns',
    'Submissions',
    'Wallet',
    'Analytics',
    'Support',
    'Platform',
]

function daysAgo(iso: string): number {
    const d = new Date(iso)
    const today = new Date()
    const diffMs =
        new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    return Math.round(diffMs / 86_400_000)
}

function timeLabel(iso: string): string {
    const d = new Date(iso)
    const ago = daysAgo(iso)
    if (ago === 0) return `Today at ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    if (ago === 1) return `Yesterday at ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    return d.toLocaleDateString()
}

type BrandHeaderInfo = { name: string; initial: string }
type VerificationStatus = 'loading' | 'verified' | 'unverified'

export default function BrandLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const navigate = useRouter()
    const [openMobile, setOpenMobile] = useState(false)
    const [openNotif, setOpenNotif] = useState(false)
    const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
    const [brandInfo, setBrandInfo] = useState<BrandHeaderInfo>({ name: '', initial: '?' })
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [userId, setUserId] = useState<string | null>(null)
    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('loading')
    const [brandLogo, setBrandLogo] = useState<string | null>(null)
    const router = useRouter()

    const brandVerificationCheck = async () => {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) return null

        const { data, error } = await supabase
            .from('brand_profiles')
            .select('is_verified')
            .eq('user_id', user.id)
            .maybeSingle()

        if (error || !data) {
            console.error(error)
            return null
        }

        return data.is_verified
    }

    const logooutUser = (e: any) => {
        e.preventDefault()
        _signout().then(() => {
            router.push('/app/auth/login')
        })
    }

    const intialize = async () => {
        const isVerified = await brandVerificationCheck()

        setVerificationStatus(isVerified ? 'verified' : 'unverified')
    }
    useEffect(() => {
        intialize()
    }, [])

    /**
     * Check if the brand has actually been verified:
     */

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user || cancelled) return
            setUserId(userData.user.id)

            const [{ data: profile }, notifs] = await Promise.all([
                supabase.from('brand_profiles').select('brand_name').eq('user_id', userData.user.id).maybeSingle(),
                listNotifications(userData.user.id),
            ])

            /**
             * We also set the current brand logo
             */

            let brandLogoURL = await getBrandLogo()
            if (brandLogoURL) {
                setBrandLogo(brandLogoURL.logo_url)
            }

            if (cancelled) return
            const name = profile?.brand_name ?? ''
            setBrandInfo({ name, initial: name ? name.slice(0, 1).toUpperCase() : '?' })
            setNotifications(notifs)
        })()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        setOpenNotif(false)
    }, [pathname])

    const unread = notifications.filter((n) => !n.read).length

    async function handleMarkAllRead() {
        if (!userId) return
        await markAllAsRead(userId)
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }

    const isActive = (item: NavItem) =>
        item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + '/')

    const filtered = useMemo(
        () => notifications.filter((n) => filter === 'All' || n.category === filter),
        [filter, notifications]
    )

    const groups = useMemo(() => {
        const today: Notification[] = []
        const yesterday: Notification[] = []
        const earlier: Notification[] = []
        filtered.forEach((n) => {
            const d = daysAgo(n.created_at)
            if (d === 0) today.push(n)
            else if (d === 1) yesterday.push(n)
            else earlier.push(n)
        })
        return { today, yesterday, earlier }
    }, [filtered])

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
                    onClick={logooutUser}
                    className="flex cursor-pointer w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
                >
                    <LogOut className="h-4 w-4" />
                    Log out
                </div>
            </div>
        </nav>
    )

    if (verificationStatus === 'loading') {
        return <BrandLayoutLoading />
    }

    if (verificationStatus === 'verified') {
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
                                // whatever this refresh should trigger — reload campaigns, revalidate, etc.
                            }}
                        />
                    </header>

                    <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
                </div>
                {openNotif && (
                    <div className="fixed inset-0 z-50">
                        <button
                            aria-label="Close notifications"
                            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
                            onClick={() => setOpenNotif(false)}
                        />
                        <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface-elevated shadow-elevated animate-in slide-in-from-right duration-200">
                            <div className="border-b border-hairline px-5 py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-display text-lg font-semibold text-ink">Notifications</p>
                                        <p className="text-xs text-muted-foreground">{unread} unread</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="rounded-full border border-hairline bg-background px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5"
                                        >
                                            Mark all read
                                        </button>
                                        <button
                                            onClick={() => setOpenNotif(false)}
                                            className="rounded-full bg-ink/5 p-2 text-ink hover:bg-ink/10"
                                            aria-label="Close"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {FILTERS.map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                                filter === f
                                                    ? 'bg-ink text-white'
                                                    : 'border border-hairline bg-background text-ink-soft hover:bg-ink/5'
                                            }`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <NotifGroup title="Today" items={groups.today} />
                                <NotifGroup title="Yesterday" items={groups.yesterday} />
                                <NotifGroup title="Earlier" items={groups.earlier} />
                                {filtered.length === 0 && (
                                    <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                                        No notifications in this category.
                                    </p>
                                )}
                            </div>
                            <div className="border-t border-hairline px-5 py-3">
                                <Link
                                    href="/app/brand/notifications"
                                    onClick={() => setOpenNotif(false)}
                                    className="block w-full rounded-full bg-ink py-2.5 text-center text-sm font-semibold text-white hover:bg-ink/85"
                                >
                                    View all notifications
                                </Link>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        )
    }

    return <VerificationPending reloadVerification={intialize} />
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

function NotifGroup({ title, items }: { title: string; items: Notification[] }) {
    if (items.length === 0) return null
    return (
        <div>
            <p className="px-5 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {title}
            </p>
            <ul className="divide-y divide-hairline">
                {items.map((n) => (
                    <li
                        key={n.id}
                        className={`flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-ink/[0.02] ${
                            !n.read ? 'bg-[oklch(0.97_0.02_75)]' : ''
                        }`}
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-elevated ring-1 ring-hairline">
                            {notifIconMap[n.kind]}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-ink">{n.title}</p>
                                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" />}
                            </div>
                            {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                            <p className="mt-1 text-[11px] text-muted-foreground/70">{timeLabel(n.created_at)}</p>
                        </div>
                    </li>
                ))}
            </ul>
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
