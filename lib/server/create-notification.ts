import { createClient } from '@supabase/supabase-js'

/**
 * SERVER ONLY (route handlers, server actions, cron jobs). Never import this from a client component:
 * it uses the service-role key, which must never reach the browser.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in your server env (no NEXT_PUBLIC_ prefix).
 */
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
})

export type CreateNotificationInput = {
    userId: string
    kind: string
    category?: string | null
    title: string
    body?: string | null
    link?: string | null
    data?: Record<string, unknown>
    /** Same key + still unread = refresh that notification instead of adding another. */
    dedupeKey?: string | null
}

/** Calls the same SQL function the triggers use, so behavior is identical everywhere. */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
    const { error } = await admin.rpc('create_notification', {
        p_user_id: input.userId,
        p_kind: input.kind,
        p_category: input.category ?? null,
        p_title: input.title,
        p_body: input.body ?? null,
        p_link: input.link ?? null,
        p_data: input.data ?? {},
        p_dedupe_key: input.dedupeKey ?? null,
    })
    if (error) throw new Error(error.message)
}

/** Notify every admin (you have one, but this stays correct if you add more). */
export async function createAdminNotifications(input: Omit<CreateNotificationInput, 'userId'>): Promise<void> {
    const { error } = await admin.rpc('create_admin_notifications', {
        p_kind: input.kind,
        p_category: input.category ?? null,
        p_title: input.title,
        p_body: input.body ?? null,
        p_link: input.link ?? null,
        p_data: input.data ?? {},
        p_dedupe_key: input.dedupeKey ?? null,
    })
    if (error) throw new Error(error.message)
}

/** Service-role client, exported so server routes can verify callers. Server only. */
export { admin as supabaseAdmin }