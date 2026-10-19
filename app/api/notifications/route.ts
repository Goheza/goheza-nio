import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminNotifications, createNotification, supabaseAdmin } from '@/lib/server/create-notification'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications       (credential goes in `Authorization: Bearer <credential>`)
 *
 * THREE KINDS OF CALLER
 *
 * 1) Your server (cron, webhooks, server actions): the secret in NOTIFICATIONS_API_SECRET.
 * 2) A signed-in ADMIN: their Supabase access token.
 *    Both 1 and 2 have full control:
 *      { "recipient": "admin" | "brand" | "creator", "userId": "<auth user id>",   // userId for brand/creator
 *        "kind": "wallet_low", "category": "Wallet", "title": "...", "body": "...",
 *        "link": "/app/brand/wallet", "data": {}, "dedupeKey": "wallet_low" }
 *
 * 3) A signed-in BRAND or CREATOR: they can ONLY notify the admin, with a fixed kind:
 *      { "recipient": "admin", "kind": "submission", "ref": "<optional id>", "note": "<optional short text>" }
 *    The title, category and link come from USER_TEMPLATES below and the sender's name is read from their
 *    profile, so a brand or creator can't write their own headline or point the admin at a link of their choice.
 *    Calls are rate-limited per user (RATE_LIMIT per RATE_WINDOW_MINUTES).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ------------------------------------------------------------------ settings for brands & creators
const RATE_LIMIT = 10
const RATE_WINDOW_MINUTES = 10

type SenderRole = 'brand' | 'creator'

/** What a brand/creator may ping the admin about. Add a line to allow a new kind. */
const USER_TEMPLATES: Record<
    string,
    { roles: SenderRole[]; category: string; link: string; title: (sender: string) => string }
> = {
    submission: {
        roles: ['creator'],
        category: 'Submissions',
        link: '/app/admin/screening',
        title: (n) => `New submission from ${n}`,
    },
    application: {
        roles: ['creator'],
        category: 'Campaigns',
        link: '/app/admin/applications',
        title: (n) => `New campaign application from ${n}`,
    },
    payment_processed: {
        roles: ['brand'],
        category: 'Wallet',
        link: '/app/admin/wallet',
        title: (n) => `Payment update from ${n}`,
    },
    invoice: {
        roles: ['brand'],
        category: 'Wallet',
        link: '/app/admin/invoices',
        title: (n) => `Invoice update from ${n}`,
    },
    platform: {
        roles: ['brand', 'creator'],
        category: 'Platform',
        link: '/app/admin',
        title: (n) => `Message from ${n}`,
    },
}

// ------------------------------------------------------------------ helpers
type Caller =
    | { type: 'privileged' } // server secret or admin
    | { type: 'user'; userId: string; role: SenderRole; name: string }

const fail = (status: number, error: string, headers?: Record<string, string>) =>
    NextResponse.json({ error }, { status, headers })

function safeEqual(a: string, b: string) {
    const x = Buffer.from(a)
    const y = Buffer.from(b)
    return x.length === y.length && timingSafeEqual(x, y)
}

async function identify(req: NextRequest): Promise<Caller | NextResponse> {
    const header = req.headers.get('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    if (!token) return fail(401, 'Missing credentials.')

    const secret = process.env.NOTIFICATIONS_API_SECRET
    if (secret && safeEqual(token, secret)) return { type: 'privileged' }

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) return fail(401, 'Invalid credentials.')
    const uid = data.user.id

    const { data: admin } = await supabaseAdmin.from('admins').select('user_id').eq('user_id', uid).maybeSingle()
    if (admin) return { type: 'privileged' }

    const { data: brand } = await supabaseAdmin
        .from('brand_profiles')
        .select('brand_name, account_status')
        .eq('user_id', uid)
        .maybeSingle()
    if (brand) {
        if (brand.account_status === 'suspended') return fail(403, 'This account is suspended.')
        return { type: 'user', userId: uid, role: 'brand', name: brand.brand_name || 'A brand' }
    }

    const { data: creator } = await supabaseAdmin
        .from('creator_profiles')
        .select('full_name')
        .eq('user_id', uid)
        .maybeSingle()
    if (creator) return { type: 'user', userId: uid, role: 'creator', name: creator.full_name || 'A creator' }

    return fail(403, 'No brand or creator account found for this user.')
}

/** Returns true if the call is allowed (and records it), false if the user is over the limit. */
async function takeRateLimitSlot(userId: string): Promise<boolean> {
    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString()

    const { count, error } = await supabaseAdmin
        .from('notification_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', since)
    if (error) throw new Error(error.message)
    if ((count ?? 0) >= RATE_LIMIT) return false

    const { error: insertError } = await supabaseAdmin.from('notification_requests').insert({ user_id: userId })
    if (insertError) throw new Error(insertError.message)

    // Housekeeping: now and then, drop rows older than a day.
    if (Math.random() < 0.02) {
        const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
        supabaseAdmin.from('notification_requests').delete().lt('created_at', cutoff).then(() => {})
    }
    return true
}

const str = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : null
const optStr = (v: unknown, max: number) => (v === undefined || v === null ? null : str(v, max))

// ------------------------------------------------------------------ full-control payload (admin / server)
type FullPayload = {
    recipient: 'admin' | 'brand' | 'creator'
    userId?: string
    kind: string
    category: string | null
    title: string
    body: string | null
    link: string | null
    data: Record<string, unknown>
    dedupeKey: string | null
}

function validateFull(b: Record<string, unknown>): { ok: true; value: FullPayload } | { ok: false; message: string } {
    if (b.recipient !== 'admin' && b.recipient !== 'brand' && b.recipient !== 'creator') {
        return { ok: false, message: 'recipient must be "admin", "brand" or "creator".' }
    }
    if (b.recipient !== 'admin' && !(typeof b.userId === 'string' && UUID.test(b.userId))) {
        return { ok: false, message: 'userId (a UUID) is required for brand and creator.' }
    }

    const kind = str(b.kind, 60)
    if (!kind || !/^[a-z0-9_]+$/i.test(kind)) return { ok: false, message: 'kind is required (letters, numbers, underscores).' }

    const title = str(b.title, 140)
    if (!title) return { ok: false, message: 'title is required (max 140 characters).' }

    const body = optStr(b.body, 500)
    if (b.body != null && !body) return { ok: false, message: 'body must be 1-500 characters.' }

    const category = optStr(b.category, 40)
    if (b.category != null && !category) return { ok: false, message: 'category must be 1-40 characters.' }

    const dedupeKey = optStr(b.dedupeKey, 120)
    if (b.dedupeKey != null && !dedupeKey) return { ok: false, message: 'dedupeKey must be 1-120 characters.' }

    // In-app paths only: blocks external URLs and javascript: links.
    const link = optStr(b.link, 300)
    if (b.link != null && (!link || !link.startsWith('/') || link.startsWith('//'))) {
        return { ok: false, message: 'link must be an in-app path starting with "/".' }
    }

    let data: Record<string, unknown> = {}
    if (b.data !== undefined) {
        if (!b.data || typeof b.data !== 'object' || Array.isArray(b.data) || JSON.stringify(b.data).length > 4000) {
            return { ok: false, message: 'data must be a JSON object under 4 KB.' }
        }
        data = b.data as Record<string, unknown>
    }

    return {
        ok: true,
        value: {
            recipient: b.recipient,
            userId: b.recipient === 'admin' ? undefined : (b.userId as string),
            kind,
            category,
            title,
            body,
            link,
            data,
            dedupeKey,
        },
    }
}

// ------------------------------------------------------------------ brand / creator payload
type UserPayload = { kind: string; ref: string | null; note: string | null }

function validateUser(
    b: Record<string, unknown>,
    role: SenderRole
): { ok: true; value: UserPayload } | { ok: false; message: string } {
    if (b.recipient !== 'admin') return { ok: false, message: 'You can only notify the admin.' }

    const forbidden = ['userId', 'title', 'body', 'category', 'link', 'data', 'dedupeKey'].filter((k) => b[k] !== undefined)
    if (forbidden.length > 0) {
        return { ok: false, message: `Not allowed for your account: ${forbidden.join(', ')}. Send kind, ref and note only.` }
    }

    const kind = typeof b.kind === 'string' ? b.kind : ''
    const template = USER_TEMPLATES[kind]
    if (!template) return { ok: false, message: `kind must be one of: ${Object.keys(USER_TEMPLATES).join(', ')}.` }
    if (!template.roles.includes(role)) return { ok: false, message: `A ${role} can't send "${kind}".` }

    let ref: string | null = null
    if (b.ref !== undefined && b.ref !== null) {
        if (typeof b.ref !== 'string' || !/^[A-Za-z0-9_-]{1,60}$/.test(b.ref)) {
            return { ok: false, message: 'ref must be 1-60 letters, numbers, dashes or underscores.' }
        }
        ref = b.ref
    }

    const note = optStr(b.note, 200)
    if (b.note != null && !note) return { ok: false, message: 'note must be 1-200 characters.' }

    return { ok: true, value: { kind, ref, note } }
}

// ------------------------------------------------------------------ handler
export async function POST(req: NextRequest) {
    const caller = await identify(req)
    if (caller instanceof NextResponse) return caller

    let raw: unknown
    try {
        raw = await req.json()
    } catch {
        return fail(400, 'Body must be valid JSON.')
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(400, 'Body must be a JSON object.')
    const body = raw as Record<string, unknown>

    try {
        // ---- brand / creator: ping the admin only
        if (caller.type === 'user') {
            const parsed = validateUser(body, caller.role)
            if (!parsed.ok) return fail(400, parsed.message)
            const { kind, ref, note } = parsed.value
            const template = USER_TEMPLATES[kind]

            const allowed = await takeRateLimitSlot(caller.userId)
            if (!allowed) {
                return fail(429, 'Too many notifications. Try again in a few minutes.', {
                    'Retry-After': String(RATE_WINDOW_MINUTES * 60),
                })
            }

            await createAdminNotifications({
                kind,
                category: template.category,
                title: template.title(caller.name),
                body: note ? `${caller.name}: ${note}` : null,
                link: template.link,
                data: { from_user_id: caller.userId, from_role: caller.role, ref },
                // Same sender + same item while unread = one notification, not a pile.
                dedupeKey: `${kind}:${caller.userId}:${ref ?? ''}`,
            })
            return NextResponse.json({ ok: true }, { status: 201 })
        }

        // ---- admin / server: full control
        const parsed = validateFull(body)
        if (!parsed.ok) return fail(400, parsed.message)
        const p = parsed.value

        if (p.recipient === 'admin') {
            await createAdminNotifications({
                kind: p.kind,
                category: p.category,
                title: p.title,
                body: p.body,
                link: p.link,
                data: p.data,
                dedupeKey: p.dedupeKey,
            })
            return NextResponse.json({ ok: true }, { status: 201 })
        }

        // brand / creator recipient: make sure the user really is one, so a wrong id can't land in the wrong inbox
        const table = p.recipient === 'brand' ? 'brand_profiles' : 'creator_profiles'
        const { data: profile, error: lookupError } = await supabaseAdmin
            .from(table)
            .select('user_id')
            .eq('user_id', p.userId!)
            .maybeSingle()

        if (lookupError) return fail(500, 'Could not verify the recipient.')
        if (!profile) return fail(404, `No ${p.recipient} found with that userId.`)

        await createNotification({
            userId: p.userId!,
            kind: p.kind,
            category: p.category,
            title: p.title,
            body: p.body,
            link: p.link,
            data: p.data,
            dedupeKey: p.dedupeKey,
        })
        return NextResponse.json({ ok: true }, { status: 201 })
    } catch (err) {
        console.error('POST /api/notifications failed:', err)
        return fail(500, 'Could not create the notification.')
    }
}