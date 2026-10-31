import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'

const REFRESH_URL = 'https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/refresh_token/'
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // refresh when the token expires within 5 minutes

// token_status written when a refresh fails. Change it to whatever the rest of your app uses.
const TOKEN_STATUS_FAILED = 'refresh_failed'

/**
 * Service-role client. tiktok_publishes has RLS on with no policies, and the webhook is
 * called by TikTok with no user session.
 */
export function createServiceClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set')
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Returns a NextResponse to send back when the key is missing/wrong, or null when allowed. */
export function requireApiKey(request: Request): NextResponse | null {
    const expected = process.env.BACKEND_API_KEY
    if (!expected) {
        return NextResponse.json({ success: false, error: 'BACKEND_API_KEY is not configured' }, { status: 500 })
    }
    const provided = request.headers.get('x-api-key') ?? ''
    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    return null
}

export type CreatorAccount = {
    accountId: string // creator_social_accounts.id
    userId: string
    openId: string
    businessId: string // business_id, falling back to open_id
    accessToken: string
    scopes: string[]
}

export type AccountResult =
    | { ok: true; account: CreatorAccount }
    | { ok: false; reason: 'not_connected' | 'needs_reconnect'; message: string }

/** The creator's TikTok row, with a fresh access token (refreshed and persisted if needed). */
export async function loadCreatorAccount(supabase: SupabaseClient, userId: string): Promise<AccountResult> {
    const { data: row, error } = await supabase
        .from('creator_social_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', 'tiktok')
        .maybeSingle()

    if (error) throw new Error(`Failed to read creator_social_accounts: ${error.message}`)
    if (!row) return { ok: false, reason: 'not_connected', message: 'This creator has not connected TikTok.' }

    const reconnect = (message: string): AccountResult => ({ ok: false, reason: 'needs_reconnect', message })

    if (row.status !== 'connected' || (row.token_status && row.token_status !== 'active')) {
        return reconnect('The TikTok connection for this creator needs to be reconnected.')
    }

    const businessId: string | null = row.business_id ?? row.open_id
    if (!businessId || !row.access_token) {
        return reconnect('The TikTok connection for this creator is incomplete. Reconnect it.')
    }

    const accessToken = await getFreshAccessToken(supabase, row)
    if (!accessToken) return reconnect('The TikTok token for this creator could not be refreshed. Reconnect it.')

    return {
        ok: true,
        account: {
            accountId: row.id,
            userId,
            openId: row.open_id ?? businessId,
            businessId,
            accessToken,
            scopes: Array.isArray(row.scopes) ? row.scopes : [],
        },
    }
}

async function getFreshAccessToken(supabase: SupabaseClient, row: any): Promise<string | null> {
    const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : null
    const stale = expiresAt !== null && expiresAt - Date.now() <= REFRESH_BUFFER_MS
    if (!stale) return row.access_token as string

    const markFailed = () =>
        supabase.from('creator_social_accounts').update({ token_status: TOKEN_STATUS_FAILED }).eq('id', row.id)

    if (!row.refresh_token) {
        await markFailed()
        return null
    }

    const res = await fetch(REFRESH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.TIKTOK_BUSINESS_APP_ID!,
            client_secret: process.env.TIKTOK_BUSINESS_APP_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: row.refresh_token,
        }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok || body.code !== 0) {
        // A parallel request may have refreshed already (refresh tokens can rotate): use its result.
        const { data: latest } = await supabase
            .from('creator_social_accounts')
            .select('access_token, token_expires_at')
            .eq('id', row.id)
            .maybeSingle()
        if (
            latest?.access_token &&
            latest.access_token !== row.access_token &&
            latest.token_expires_at &&
            new Date(latest.token_expires_at).getTime() - Date.now() > REFRESH_BUFFER_MS
        ) {
            return latest.access_token as string
        }

        console.error('TikTok token refresh failed:', body.message ?? res.status)
        await markFailed()
        return null
    }

    const data = body.data ?? body
    const now = new Date().toISOString()
    await supabase
        .from('creator_social_accounts')
        .update({
            access_token: data.access_token,
            refresh_token: data.refresh_token ?? row.refresh_token,
            token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
            last_token_refresh_at: now,
            token_status: 'active',
        })
        .eq('id', row.id)

    return data.access_token as string
}

export function accountFailure(result: Extract<AccountResult, { ok: false }>) {
    return NextResponse.json(
        { success: false, error: result.message, code: result.reason },
        { status: result.reason === 'not_connected' ? 400 : 409 }
    )
}