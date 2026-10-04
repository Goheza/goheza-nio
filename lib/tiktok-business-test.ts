import type { SupabaseClient } from '@supabase/supabase-js'

const REFRESH_URL = 'https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/refresh_token/'

/**
 * Pulls the most recently connected row from goheza_tests.
 * Since this is a single-tester sandbox (not multi-tenant), we don't key
 * off a user id — we just take whichever account was connected most
 * recently. Use the "Clean the database" button between test accounts.
 */
export async function getConnectedTestAccount(supabase: SupabaseClient) {
    const { data, error } = await supabase
        .from('goheza_tests')
        .select('*')
        .eq('platform', 'tiktok')
        .eq('status', 'connected')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) throw new Error(`Failed to read goheza_tests: ${error.message}`)
    return data
}

/**
 * Returns a valid access token for the given account row, refreshing and
 * persisting it first if it has expired.
 */
export async function ensureFreshAccessToken(supabase: SupabaseClient, account: any): Promise<string> {
    const isExpired = account.token_expires_at && new Date(account.token_expires_at) <= new Date()

    if (!isExpired) {
        return account.access_token as string
    }

    if (!account.refresh_token) {
        throw new Error('Access token expired and no refresh_token is stored — reconnect this account.')
    }

    const res = await fetch(REFRESH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.TIKTOK_CLIENT_KEY!,
            client_secret: process.env.TIKTOK_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token,
        }),
    })

    const body = await res.json()

    if (!res.ok || body.code !== 0) {
        await supabase
            .from('goheza_tests')
            .update({ status: 'error', last_error: body.message ?? 'refresh_failed' })
            .eq('id', account.id)
        throw new Error(body.message ?? 'TikTok token refresh failed')
    }

    const data = body.data ?? body

    await supabase
        .from('goheza_tests')
        .update({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', account.id)

    return data.access_token as string
}

/**
 * Accepts either a full TikTok video URL
 * (https://www.tiktok.com/@handle/video/7691810815636294918?...) or a raw
 * numeric video ID, and returns just the numeric ID.
 */
export function extractTikTokVideoId(input: string): string | null {
    const trimmed = input.trim()
    if (/^\d+$/.test(trimmed)) return trimmed
    const match = trimmed.match(/\/video\/(\d+)/)
    return match ? match[1] : null
}

export const TTO_CREATOR_FIELDS = [
    'handle_name',
    'display_name',
    'profile_image',
    'bio',
    'followers_count',
    'following_count',
    'videos_count',
    'likes_count',
    'creator_rate',
    'country_code',
    'content_labels',
    'industry_labels',
    'audience_countries',
    'audience_genders',
    'audience_ages',
    'audience_devices',
    'audience_usages',
]