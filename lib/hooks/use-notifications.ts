'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/notification'

const LIMIT = 50

const newestFirst = (a: Notification, b: Notification) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

/**
 * Loads the signed-in user's latest notifications and keeps them live.
 * RLS guarantees a user only ever receives their own rows.
 * Works for brand, creator and admin: they all read the same table.
 */
export function useNotifications(userId: string | null) {
    const [items, setItems] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userId) return
        let cancelled = false

        ;(async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(LIMIT)

            if (cancelled) return
            if (!error) setItems((data ?? []) as Notification[])
            setLoading(false)
        })()

        // INSERT = new notification. UPDATE = marked read, or an unread one was refreshed (dedupe).
        const upsertLocal = (n: Notification) =>
            setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)].sort(newestFirst).slice(0, LIMIT))

        const channel = supabase
            .channel(`notifications-${userId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => upsertLocal(payload.new as Notification)
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => upsertLocal(payload.new as Notification)
            )
            .subscribe()

        return () => {
            cancelled = true
            supabase.removeChannel(channel)
        }
    }, [userId])

    const unread = useMemo(() => items.filter((n) => !n.read).length, [items])

    const markRead = useCallback(async (id: string) => {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
        await supabase.from('notifications').update({ read: true }).eq('id', id)
    }, [])

    const markAllRead = useCallback(async () => {
        if (!userId) return
        setItems((prev) => prev.map((n) => ({ ...n, read: true })))
        await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    }, [userId])

    return { items, unread, loading, markRead, markAllRead }
}