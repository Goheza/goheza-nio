'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, AlertTriangle, DollarSign, Sparkles, Clock, Loader2 } from 'lucide-react'
import { DashCard, PageHeader } from '@/components/creator/dash-ui'
import { supabase } from '@/lib/supabase'
import { listNotifications, markAllAsRead } from '@/lib/api/notifications'
import type { Notification, NotificationKind } from '@/types/notification'

const iconMap: Partial<Record<NotificationKind, React.ReactNode>> = {
    approval: <CheckCircle2 className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />,
    platform: <Sparkles className="h-4 w-4 text-[oklch(0.55_0.18_45)]" />,
    payment_processed: <DollarSign className="h-4 w-4 text-[oklch(0.5_0.14_152)]" />,
    revision: <AlertTriangle className="h-4 w-4 text-[oklch(0.5_0.18_45)]" />,
    campaign_end: <Clock className="h-4 w-4 text-[oklch(0.5_0.14_268)]" />,
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [userId, setUserId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData?.user) return
            setUserId(userData.user.id)
            const list = await listNotifications(userData.user.id)
            if (!cancelled) {
                setNotifications(list)
                setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    async function handleMarkAllRead() {
        if (!userId) return
        await markAllAsRead(userId)
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Notifications"
                subtitle="Stay on top of approvals, payouts, and new opportunities."
                action={
                    <button
                        onClick={handleMarkAllRead}
                        className="rounded-full border border-hairline bg-background px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5"
                    >
                        Mark all as read
                    </button>
                }
            />

            <DashCard className="p-0">
                <ul className="divide-y divide-hairline">
                    {notifications.map((n) => (
                        <li
                            key={n.id}
                            className={`flex items-start gap-4 p-5 ${!n.read ? 'bg-[oklch(0.97_0.02_75)]' : ''}`}
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-elevated ring-1 ring-hairline">
                                {iconMap[n.kind] ?? <Bell className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-ink">{n.title}</p>
                                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                            </div>
                            <p className="shrink-0 text-xs text-muted-foreground">
                                {new Date(n.created_at).toLocaleDateString()}
                            </p>
                            {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                        </li>
                    ))}
                    {notifications.length === 0 && (
                        <li className="py-12 text-center text-sm text-muted-foreground">No notifications yet.</li>
                    )}
                </ul>
            </DashCard>
        </div>
    )
}
