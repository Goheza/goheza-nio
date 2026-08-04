'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
    LayoutDashboard,
    Megaphone,
    Briefcase,
    DollarSign,
    Wallet,
    Bell,
    Lightbulb,
    HelpCircle,
    MessageCircle,
    User,
    Settings,
    LogOut,
    Search,
    Menu,
    X,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    Clock,
} from 'lucide-react'
import { Logo } from '@/components/site/Logo'
import { BrandAvatar } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { markAllAsRead } from '@/lib/api/notifications'
import type { Notification } from '@/types/notification'
import { _signout } from '@/lib/api/common'
import { AnnouncementBanner } from '@/components/app/announcement'

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean }

const primary: NavItem[] = [
    { to: '/app/creator', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/app/creator/campaigns', label: 'Browse Campaigns', icon: Megaphone },
    { to: '/app/creator/submissions', label: 'My Submissions', icon: Briefcase },
    { to: '/app/creator/wallet', label: 'Wallet', icon: Wallet },
    { to: '/app/creator/earnings', label: 'Earnings', icon: DollarSign },
]

const secondary: NavItem[] = [
    { to: '/app/creator/tips', label: 'Creator Tips', icon: Lightbulb },
    { to: '/app/creator/how-it-works', label: 'How Goheza Works', icon: HelpCircle },
    { to: '/app/creator/support', label: 'Support', icon: MessageCircle },
    { to: '/app/creator/profile', label: 'Profile', icon: User },
    { to: '/app/creator/settings', label: 'Settings', icon: Settings },
]

const notifIcon: Record<string, React.ReactNode> = {
    approval: <CheckCircle2 className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />,
    new: <Sparkles className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />,
    payment: <DollarSign className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />,
    revision: <AlertTriangle className="h-4 w-4 text-[oklch(0.5_0.18_45)]" />,
    deadline: <Clock className="h-4 w-4 text-[oklch(0.5_0.14_268)]" />,
}

type CreatorHeaderInfo = { name: string; avatarUrl: string | null }

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [openMobile, setOpenMobile] = useState(false)
    const [openNotif, setOpenNotif] = useState(false)
    const [creatorInfo, setCreatorInfo] = useState<CreatorHeaderInfo>({ name: '', avatarUrl: null })
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [userId, setUserId] = useState<string | null>(null)
    const [creatorLogo, setCreatorLogo] = useState<string | null>(null)
    const [checkingAuth, setCheckingAuth] = useState(true)

    const logooutUser = (e: any) => {
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

            setUserId(user.id)

            const { data: profile } = await supabase
                .from('creator_profiles')
                .select('display_name, full_name, avatar_url')
                .eq('user_id', user.id)
                .maybeSingle()

            if (cancelled) return

            setCreatorInfo({
                name: profile?.display_name || profile?.full_name || '',
                avatarUrl: profile?.avatar_url ?? null,
            })

            setCheckingAuth(false)
        })()

        return () => {
            cancelled = true
        }
    }, [router])

    useEffect(() => {
        setOpenNotif(false)
    }, [pathname])

    const unread = notifications.filter((n) => !n.read).length
    const initial = (creatorInfo.name || '?').slice(0, 1).toUpperCase()

    async function handleMarkAllRead() {
        if (!userId) return
        await markAllAsRead(userId)
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }

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
                    onClick={logooutUser}
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
            <AnnouncementBanner />
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
                    <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
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
                                    placeholder="Search campaigns, brands…"
                                    className="w-full rounded-full border border-hairline bg-background py-2 pl-9 pr-4 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </div>
                        </div>
                        <div className="flex-1 sm:hidden" />
                        <div className="flex items-center gap-2">
                            <Link
                                href="/app/creator/profile"
                                className="flex items-center gap-2 rounded-full border border-hairline bg-background py-1 pl-1 pr-3 hover:bg-ink/5"
                            >
                                {creatorInfo.avatarUrl ? (
                                    <img
                                        src={creatorInfo.avatarUrl}
                                        alt={creatorInfo.name}
                                        className="h-7 w-7 rounded-full object-cover"
                                    />
                                ) : (
                                    <BrandAvatar initial={initial} color="oklch(0.66 0.20 42)" size={28} />
                                )}
                                <span className="hidden text-sm font-medium text-ink sm:inline">
                                    {creatorInfo.name || 'You'}
                                </span>
                            </Link>
                        </div>
                    </div>
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
                        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
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
                        <ul className="flex-1 divide-y divide-hairline overflow-y-auto">
                            {notifications.map((n) => (
                                <li
                                    key={n.id}
                                    className={`flex items-start gap-3 px-5 py-4 transition-colors hover:bg-ink/[0.02] ${
                                        !n.read ? 'bg-[oklch(0.97_0.02_75)]' : ''
                                    }`}
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-elevated ring-1 ring-hairline">
                                        {notifIcon[n.kind] ?? <Bell className="h-4 w-4" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-semibold text-ink">{n.title}</p>
                                            {!n.read && (
                                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" />
                                            )}
                                        </div>
                                        {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                                        <p className="mt-1 text-[11px] text-muted-foreground/70">
                                            {new Date(n.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </li>
                            ))}
                            {notifications.length === 0 && (
                                <li className="py-12 text-center text-sm text-muted-foreground">
                                    No notifications yet.
                                </li>
                            )}
                        </ul>
                        <div className="border-t border-hairline px-5 py-3">
                            {/* <Link
                                href="/creator/notifications"
                                onClick={() => setOpenNotif(false)}
                                className="block w-full rounded-full bg-ink py-2.5 text-center text-sm font-semibold text-white hover:bg-ink/85"
                            >
                                View all notifications
                            </Link> */}
                        </div>
                    </aside>
                </div>
            )}
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
                                    ? 'bg-primary text-primary-foreground shadow-sm'
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
