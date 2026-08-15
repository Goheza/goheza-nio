import { supabaseAdmin } from '@/lib/supabase-admin'

const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'

// Refresh a little before the actual expiry, so request latency or minor
// clock drift never lets an already-stale token slip through.
const EXPIRY_BUFFER_MS = 5 * 60 * 1000

export type TikTokTokenResult =
    | { ok: true; accessToken: string }
    | { ok: false; reason: 'not_connected' | 'refresh_failed' }

/**
 * Returns a guaranteed-fresh TikTok access token for a creator.
 *
 * Checks token_expires_at and refreshes inline — synchronously, in this
 * same call — if it's expired or close to it, instead of trusting a
 * separate cron job to have kept it current. This is what actually removes
 * the race condition: a background refresh job and an in-flight API call
 * can no longer invalidate each other's token, because there's no "in
 * between" window where one process's refresh_token gets consumed while
 * another process is still relying on the old access_token.
 *
 * Server-only. Needs TIKTOK_CLIENT_SECRET, which must never reach the
 * browser — never call this from a 'use client' file.
 */
export async function getValidTikTokAccessToken(userId: string): Promise<TikTokTokenResult> {
    const { data: account, error } = await supabaseAdmin
        .from('creator_social_accounts')
        .select('access_token, refresh_token, token_expires_at')
        .eq('user_id', userId)
        .eq('platform', 'tiktok')
        .maybeSingle()
    if (error) throw error
    if (!account?.access_token) {
        return { ok: false, reason: 'not_connected' }
    }

    const expiresAtMs = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0
    const isStillFresh = expiresAtMs > Date.now() + EXPIRY_BUFFER_MS
    if (isStillFresh) {
        return { ok: true, accessToken: account.access_token }
    }

    if (!account.refresh_token) {
        await markTokenReconnectRequired(userId)
        return { ok: false, reason: 'refresh_failed' }
    }

    const refreshRes = await fetch(TIKTOK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            client_secret: process.env.TIKTOK_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: account.refresh_token,
        }),
    })
    const refreshData = await refreshRes.json()

    if (!refreshRes.ok || !refreshData.access_token) {
        // Covers the rotation race directly: if a concurrent refresh already
        // consumed this refresh_token, TikTok returns invalid_grant here —
        // we mark the account so the UI can prompt a reconnect instead of
        // silently retrying forever against a dead refresh_token.
        await markTokenReconnectRequired(userId)
        return { ok: false, reason: 'refresh_failed' }
    }

    const { error: updateErr } = await supabaseAdmin
        .from('creator_social_accounts')
        .update({
            access_token: refreshData.access_token,
            // TikTok rotates the refresh_token on every use — always store
            // the new one, never keep reusing the old one.
            refresh_token: refreshData.refresh_token ?? account.refresh_token,
            token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
            last_token_refresh_at: new Date().toISOString(),
            token_status: 'active',
        })
        .eq('user_id', userId)
        .eq('platform', 'tiktok')
    if (updateErr) throw updateErr

    return { ok: true, accessToken: refreshData.access_token }
}

/**
 * Marks an account as needing the creator to reconnect — 'active' and
 * 'reconnect_required' are the two real values this app's token_status
 * column uses everywhere else. Writing anything else (e.g. 'invalid')
 * silently breaks any UI check keyed on 'reconnect_required'.
 */
async function markTokenReconnectRequired(userId: string) {
    await supabaseAdmin
        .from('creator_social_accounts')
        .update({ token_status: 'reconnect_required' })
        .eq('user_id', userId)
        .eq('platform', 'tiktok')
}