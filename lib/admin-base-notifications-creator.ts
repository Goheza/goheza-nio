import { supabase } from '@/lib/supabase'

async function post(payload: Record<string, unknown>): Promise<void> {
    const {
        data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in.')

    const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Could not send the notification.')
    }
}

// ---------------------------------------------------------------- for brands and creators

/** Kinds a brand or creator may send. Must match USER_TEMPLATES in app/api/notifications/route.ts. */
export type NotifyAdminKind = 'submission' | 'application' | 'payment_processed' | 'invoice' | 'platform'

/**
 * Brand or creator pings the admin. The headline, category and link are fixed per kind on the server;
 * you can only add a short note and an id (`ref`) so repeats about the same item collapse into one notification.
 *
 *   await notifyAdmin({ kind: 'submission', ref: submission.id })
 *   await notifyAdmin({ kind: 'platform', note: 'I need help with my payout details' })
 *
 * Throws a readable error when rate-limited (HTTP 429) or when the kind isn't allowed for the user's role.
 */
export async function notifyAdmin(input: { kind: NotifyAdminKind; ref?: string; note?: string }): Promise<void> {
    await post({ recipient: 'admin', ...input })
}

// ---------------------------------------------------------------- admin only

export type SendNotificationInput = {
    recipient: 'admin' | 'brand' | 'creator'
    /** auth user id; required for brand and creator */
    userId?: string
    kind: string
    category?: string
    title: string
    body?: string
    /** in-app path, e.g. '/app/brand/wallet' */
    link?: string
    data?: Record<string, unknown>
    dedupeKey?: string
}

/** Full control, but only works when the signed-in user is an admin (everyone else gets 403). */
export async function sendNotification(input: SendNotificationInput): Promise<void> {
    await post(input)
}