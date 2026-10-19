'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/use-notifications'
import type { Notification } from '@/types/notification'
import { FALLBACK_ICON, KIND_ICONS, daysAgo, timeLabel } from '@/components/app/notifications-ui'

const POPOVER_MAX_WIDTH = 384
const EDGE_GAP = 12

type Pos = { top: number; left: number; width: number }

/**
 * Bell button with unread badge. Click it and a small panel opens right under the bell.
 * Drop it into any layout header: <NotificationBell userId={userId} viewAllHref="/app/<role>/notifications" />
 */
export default function NotificationBell({ userId, viewAllHref }: { userId: string | null; viewAllHref?: string }) {
    const router = useRouter()
    const pathname = usePathname()
    const { items, unread, markRead, markAllRead } = useNotifications(userId)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState<Pos | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])
    useEffect(() => setOpen(false), [pathname])

    // Place the panel under the bell, kept fully on screen (matters on phones, where the bell isn't at the edge).
    useEffect(() => {
        if (!open) return
        const place = () => {
            const rect = buttonRef.current?.getBoundingClientRect()
            if (!rect) return
            const width = Math.min(POPOVER_MAX_WIDTH, window.innerWidth - EDGE_GAP * 2)
            const left = Math.min(Math.max(rect.right - width, EDGE_GAP), window.innerWidth - width - EDGE_GAP)
            setPos({ top: rect.bottom + 8, left, width })
        }
        place()
        window.addEventListener('resize', place)
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('resize', place)
            window.removeEventListener('keydown', onKey)
        }
    }, [open])

    const groups = useMemo(() => {
        const today: Notification[] = []
        const yesterday: Notification[] = []
        const earlier: Notification[] = []
        items.forEach((n) => {
            const d = daysAgo(n.created_at)
            if (d === 0) today.push(n)
            else if (d === 1) yesterday.push(n)
            else earlier.push(n)
        })
        return { today, yesterday, earlier }
    }, [items])

    function handleClick(n: Notification) {
        if (!n.read) markRead(n.id)
        if (n.link) {
            setOpen(false)
            router.push(n.link)
        }
    }

    // Rendered in a portal: the header uses backdrop-blur, which would otherwise trap a `fixed` panel inside it.
    const popover =
        open && pos ? (
            <div className="fixed inset-0 z-[60]">
                {/* Invisible layer: click anywhere outside the panel to close it */}
                <button aria-label="Close notifications" className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} />

                <div
                    role="dialog"
                    aria-label="Notifications"
                    style={{ top: pos.top, left: pos.left, width: pos.width }}
                    className="absolute flex max-h-[min(70vh,32rem)] flex-col overflow-hidden rounded-2xl border border-hairline bg-surface-elevated shadow-elevated animate-in fade-in-0 zoom-in-95 duration-150"
                >
                    <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
                        <div>
                            <p className="font-display text-sm font-semibold text-ink">Notifications</p>
                            <p className="text-[11px] text-muted-foreground">
                                {unread === 0 ? 'All caught up' : `${unread} unread`}
                            </p>
                        </div>
                        <button
                            onClick={markAllRead}
                            disabled={unread === 0}
                            className="rounded-full border border-hairline bg-background px-3 py-1 text-[11px] font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                        >
                            Mark all read
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <Group title="Today" items={groups.today} onClick={handleClick} />
                        <Group title="Yesterday" items={groups.yesterday} onClick={handleClick} />
                        <Group title="Earlier" items={groups.earlier} onClick={handleClick} />
                        {items.length === 0 && (
                            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No notifications yet.</p>
                        )}
                    </div>

                    {viewAllHref && (
                        <Link
                            href={viewAllHref}
                            onClick={() => setOpen(false)}
                            className="block border-t border-hairline px-4 py-2.5 text-center text-xs font-semibold text-[oklch(0.55_0.18_45)] hover:bg-ink/[0.03]"
                        >
                            View all notifications
                        </Link>
                    )}
                </div>
            </div>
        ) : null

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setOpen((o) => !o)}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-expanded={open}
                className="relative rounded-full border border-hairline bg-background p-2 text-ink hover:bg-ink/5"
            >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>
            {mounted && popover ? createPortal(popover, document.body) : null}
        </>
    )
}

function Group({
    title,
    items,
    onClick,
}: {
    title: string
    items: Notification[]
    onClick: (n: Notification) => void
}) {
    if (items.length === 0) return null
    return (
        <div>
            <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {title}
            </p>
            <ul className="divide-y divide-hairline">
                {items.map((n) => (
                    <li key={n.id}>
                        <button
                            onClick={() => onClick(n)}
                            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-ink/[0.03] ${
                                !n.read ? 'bg-[oklch(0.97_0.02_75)]' : ''
                            }`}
                        >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-elevated ring-1 ring-hairline">
                                {KIND_ICONS[n.kind as string] ?? FALLBACK_ICON}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-[13px] font-semibold text-ink">{n.title}</p>
                                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" />}
                                </div>
                                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                                <p className="mt-1 text-[11px] text-muted-foreground/70">{timeLabel(n.created_at)}</p>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}