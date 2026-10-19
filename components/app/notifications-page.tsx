'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BellOff, ChevronRight, Loader2 } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/app/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import {
    fetchNotificationCategories,
    fetchNotificationPage,
    markAllNotificationsRead,
    markNotificationRead,
} from '@/lib/api/notifications-feed'
import { FALLBACK_ICON, KIND_ICONS, daysAgo, timeLabel } from '@/components/app/notifications-ui'
import type { Notification } from '@/types/notification'

const PAGE_SIZE = 30

const newestFirst = (a: Notification, b: Notification) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'text-primary-foreground shadow-sm' : 'border border-hairline bg-background text-ink hover:bg-ink/5'
    }`
const chipStyle = (active: boolean) => (active ? { backgroundImage: 'var(--gradient-primary)' } : undefined)

/** Full notifications page. The same component serves brand, creator and admin: each only ever sees their own rows. */
export default function NotificationsPage() {
    const router = useRouter()

    const [userId, setUserId] = useState<string | null>(null)
    const [items, setItems] = useState<Notification[]>([])
    const [hasMore, setHasMore] = useState(false)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [unreadOnly, setUnreadOnly] = useState(false)
    const [category, setCategory] = useState<string>('all')
    const [categories, setCategories] = useState<string[]>([])

    // Refs let the realtime listener see current filters without resubscribing on every change.
    const filters = useRef({ unreadOnly, category })
    filters.current = { unreadOnly, category }
    const hasMoreRef = useRef(hasMore)
    hasMoreRef.current = hasMore

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setUserId(data.user.id)
            else router.replace('/app/auth/login')
        })
    }, [router])

    // First page, reloaded whenever a filter changes
    useEffect(() => {
        if (!userId) return
        let cancelled = false
        setLoading(true)
        setError(null)
        fetchNotificationPage(userId, {
            limit: PAGE_SIZE,
            unreadOnly,
            category: category === 'all' ? null : category,
        })
            .then((page) => {
                if (cancelled) return
                setItems(page.items)
                setHasMore(page.hasMore)
            })
            .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Failed to load notifications.'))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [userId, unreadOnly, category])

    useEffect(() => {
        if (!userId) return
        fetchNotificationCategories(userId)
            .then(setCategories)
            .catch(() => {})
    }, [userId])

    // Live: new and updated notifications show up without a refresh
    useEffect(() => {
        if (!userId) return

        const apply = (n: Notification) => {
            if (n.category) setCategories((prev) => (prev.includes(n.category as string) ? prev : [...prev, n.category as string]))
            setItems((prev) => {
                const f = filters.current
                const matches = (!f.unreadOnly || !n.read) && (f.category === 'all' || n.category === f.category)
                const exists = prev.some((x) => x.id === n.id)
                // An old row that isn't loaded yet will arrive with the next page; don't splice it in early.
                const older = prev.length > 0 && n.created_at < prev[prev.length - 1].created_at
                if (!exists && hasMoreRef.current && older) return prev
                const rest = prev.filter((x) => x.id !== n.id)
                return matches ? [n, ...rest].sort(newestFirst) : rest
            })
        }

        const channel = supabase
            .channel(`notifications-page-${userId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (p) => apply(p.new as Notification)
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (p) => apply(p.new as Notification)
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])

    async function loadMore() {
        if (!userId || loadingMore || items.length === 0) return
        setLoadingMore(true)
        try {
            const page = await fetchNotificationPage(userId, {
                limit: PAGE_SIZE,
                before: items[items.length - 1].created_at,
                unreadOnly,
                category: category === 'all' ? null : category,
            })
            setItems((prev) => {
                const seen = new Set(prev.map((n) => n.id))
                return [...prev, ...page.items.filter((n) => !seen.has(n.id))]
            })
            setHasMore(page.hasMore)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load more.')
        } finally {
            setLoadingMore(false)
        }
    }

    function open(n: Notification) {
        if (!n.read) {
            setItems((prev) =>
                unreadOnly ? prev.filter((x) => x.id !== n.id) : prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
            )
            markNotificationRead(n.id).catch(() => {})
        }
        if (n.link) router.push(n.link)
    }

    async function handleMarkAll() {
        if (!userId) return
        setItems((prev) => (unreadOnly ? [] : prev.map((n) => ({ ...n, read: true }))))
        markAllNotificationsRead(userId).catch(() => {})
    }

    const groups = useMemo(() => {
        const out: { title: string; rows: Notification[] }[] = [
            { title: 'Today', rows: [] },
            { title: 'Yesterday', rows: [] },
            { title: 'Earlier', rows: [] },
        ]
        items.forEach((n) => {
            const d = daysAgo(n.created_at)
            out[d === 0 ? 0 : d === 1 ? 1 : 2].rows.push(n)
        })
        return out.filter((g) => g.rows.length > 0)
    }, [items])

    const anyUnread = items.some((n) => !n.read)

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <PageHeader
                title="Notifications"
                subtitle="Everything that needs your attention, newest first."
                action={
                    <button
                        onClick={handleMarkAll}
                        disabled={!anyUnread}
                        className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                    >
                        Mark all read
                    </button>
                }
            />

            <DashCard>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => {
                            setUnreadOnly(false)
                            setCategory('all')
                        }}
                        className={chip(!unreadOnly && category === 'all')}
                        style={chipStyle(!unreadOnly && category === 'all')}
                    >
                        All
                    </button>
                    <button onClick={() => setUnreadOnly((v) => !v)} className={chip(unreadOnly)} style={chipStyle(unreadOnly)}>
                        Unread
                    </button>
                    {categories.map((c) => (
                        <button
                            key={c}
                            onClick={() => setCategory((cur) => (cur === c ? 'all' : c))}
                            className={chip(category === c)}
                            style={chipStyle(category === c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </DashCard>

            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
                </div>
            )}

            {error && <DashCard className="text-center text-sm text-muted-foreground">{error}</DashCard>}

            {!loading && items.length > 0 && (
                <DashCard className="!p-0 sm:!p-0">
                    {groups.map((g) => (
                        <div key={g.title}>
                            <p className="px-5 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:px-6">
                                {g.title}
                            </p>
                            <ul className="divide-y divide-hairline">
                                {g.rows.map((n) => (
                                    <li key={n.id}>
                                        <button
                                            onClick={() => open(n)}
                                            className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-ink/[0.03] sm:px-6 ${
                                                !n.read ? 'bg-[oklch(0.97_0.02_75)]' : ''
                                            }`}
                                        >
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-elevated ring-1 ring-hairline">
                                                {KIND_ICONS[n.kind as string] ?? FALLBACK_ICON}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                                                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" />}
                                                </div>
                                                {n.body && (
                                                    <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{n.body}</p>
                                                )}
                                                <p className="mt-1 text-[11px] text-muted-foreground/70">
                                                    {timeLabel(n.created_at)}
                                                    {n.category ? ` · ${n.category}` : ''}
                                                </p>
                                            </div>
                                            {n.link && <ChevronRight className="mt-2 hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {hasMore && (
                        <div className="border-t border-hairline p-4 text-center">
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-background px-5 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                            >
                                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                                Load more
                            </button>
                        </div>
                    )}
                </DashCard>
            )}

            {!loading && !error && items.length === 0 && (
                <DashCard className="flex flex-col items-center gap-3 py-12 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[oklch(0.95_0.02_75)] text-ink-soft">
                        <BellOff className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-semibold text-ink">
                        {unreadOnly || category !== 'all' ? 'Nothing matches this filter' : 'No notifications yet'}
                    </p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                        {unreadOnly || category !== 'all'
                            ? 'Try another filter.'
                            : 'Updates about your campaigns, payments and support tickets will show up here.'}
                    </p>
                </DashCard>
            )}
        </div>
    )
}