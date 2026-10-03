import { supabaseAdmin } from '@/lib/supabase-admin'

const INSTAGRAM_REFRESH_URL = 'https://graph.instagram.com/refresh_access_token'

// Refresh when less than this much time remains. Generous on purpose:
// Instagram long-lived tokens last ~60 days but can only be refreshed
// once every 24 hours, so checking early and often (rather than waiting
// until the last minute) avoids ever racing the clock.
const EXPIRY_BUFFER_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export type InstagramTokenResult =
    | { ok: true; accessToken: string }
    | { ok: false; reason: 'not_connected' | 'reconnect_required' }

/**
 * Returns a usable Instagram access token for a creator.
 *
 * Deliberately NOT built on top of or sharing code with
 * lib/tiktok-token.ts - Instagram's refresh model is fundamentally
 * different, not just differently named:
 *
 * - There's no distinct refresh_token. A long-lived access_token
 *   refreshes ITSELF via GET /refresh_access_token, using the current
 *   token as the credential.
 * - Meta requires a token be at least 24 hours old since it was last
 *   issued or refreshed before it can be refreshed again. If we attempt a
 *   refresh too soon, Meta rejects the call - but that does NOT mean the
 *   connection is broken. It just means we tried early. The existing
 *   token is still perfectly valid until its real expiry.
 *
 * Because of that last point, a failed refresh call here only means
 * 'reconnect_required' if the token has actually passed its stated
 * expiry - not merely because the refresh attempt itself failed. TikTok's
 * helper treats any refresh failure as fatal (correct there, since TikTok
 * rotates a single-use refresh_token); that logic would be wrong here.
 */
export async function getValidInstagramAccessToken(userId: string): Promise<InstagramTokenResult> {
    const { data: account, error } = await supabaseAdmin
        .from('creator_social_accounts')
        .select('access_token, token_expires_at')
        .eq('user_id', userId)
        .eq('platform', 'instagram')
        .maybeSingle()
    if (error) throw error
    if (!account?.access_token) {
        return { ok: false, reason: 'not_connected' }
    }

    const expiresAtMs = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0
    const isActuallyExpired = expiresAtMs > 0 && expiresAtMs <= Date.now()
    const needsRefresh = expiresAtMs === 0 || expiresAtMs <= Date.now() + EXPIRY_BUFFER_MS

    if (!needsRefresh) {
        return { ok: true, accessToken: account.access_token }
    }

    const url = new URL(INSTAGRAM_REFRESH_URL)
    url.searchParams.set('grant_type', 'ig_refresh_token')
    url.searchParams.set('access_token', account.access_token)

    const refreshRes = await fetch(url.toString())
    const refreshData = await refreshRes.json()

    if (refreshRes.ok && refreshData.access_token) {
        const { error: updateErr } = await supabaseAdmin
            .from('creator_social_accounts')
            .update({
                access_token: refreshData.access_token,
                token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
                last_token_refresh_at: new Date().toISOString(),
                token_status: 'active',
            })
            .eq('user_id', userId)
            .eq('platform', 'instagram')
        if (updateErr) throw updateErr

        return { ok: true, accessToken: refreshData.access_token }
    }

    // Refresh failed. Distinguish "token is genuinely dead" from "Meta
    // rejected the refresh for being too soon (< 24h since last
    // refresh)" - in the latter case the existing token is still fine to
    // use as-is until it actually expires.
    if (!isActuallyExpired) {
        return { ok: true, accessToken: account.access_token }
    }

    const { error: updateErr } = await supabaseAdmin
        .from('creator_social_accounts')
        .update({ token_status: 'reconnect_required' })
        .eq('user_id', userId)
        .eq('platform', 'instagram')
    if (updateErr) throw updateErr

    return { ok: false, reason: 'reconnect_required' }
}