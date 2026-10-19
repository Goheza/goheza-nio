import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/notification'

// Named notification-feed so it doesn't collide with your existing lib/api/notifications.ts.

function asError(e: unknown): Error {
    if (e instanceof Error) return e
    return new Error((e as { message?: string } | null)?.message || 'Something went wrong.')
}

/** One page of the user's notifications, newest first. Pass `before` (created_at of the last item) for the next page. */
export async function fetchNotificationPage(
    userId: string,
    opts: { limit: number; before?: string | null; unreadOnly?: boolean; category?: string | null }
): Promise<{ items: Notification[]; hasMore: boolean }> {
    let q = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(opts.limit + 1) // one extra row tells us whether another page exists

    if (opts.before) q = q.lt('created_at', opts.before)
    if (opts.unreadOnly) q = q.eq('read', false)
    if (opts.category) q = q.eq('category', opts.category)

    const { data, error } = await q
    if (error) throw asError(error)

    const rows = (data ?? []) as Notification[]
    return { items: rows.slice(0, opts.limit), hasMore: rows.length > opts.limit }
}

/** Categories present in the user's recent notifications, for the filter chips. */
export async function fetchNotificationCategories(userId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('category')
        .eq('user_id', userId)
        .not('category', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500)

    if (error) throw asError(error)
    return Array.from(new Set((data ?? []).map((r) => r.category as string)))
}

export async function markNotificationRead(id: string) {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) throw asError(error)
}

export async function markAllNotificationsRead(userId: string) {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    if (error) throw asError(error)
}