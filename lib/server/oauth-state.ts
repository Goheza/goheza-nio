import crypto from 'crypto'
import { getSupabaseAdmin } from './supabase-admin'

/**
 * Server-side OAuth state for social connects (TikTok, Instagram).
 *
 * The `state` sent to the provider is a random, single-use key into
 * `public.oauth_states` (see lib/Database/2026-10-06_oauth_states.sql). The row
 * holds who is connecting, the PKCE verifier and where to send them back, so:
 *   - the callback never trusts a user id from the URL, and
 *   - the flow works when it's started by the mobile app, whose in-app
 *     browser doesn't share cookies with the request that started it.
 */

export type OAuthProvider = 'tiktok' | 'instagram'
export type OAuthClient = 'web' | 'app'
export type OAuthResult = 'connected' | 'cancelled' | 'failed'

export type PendingOAuth = {
    userId: string
    provider: OAuthProvider
    codeVerifier: string | null
    client: OAuthClient
    returnTo: string
}

const BASE_URL = 'https://goheza.com'
const DEFAULT_RETURN_TO = '/app/creator/campaigns'

/** Where the Goheza mobile app listens. Fixed here, never taken from a request. */
const APP_CALLBACK: Record<OAuthProvider, string> = {
    tiktok: 'com.goheza.goheza://tiktok-callback',
    instagram: 'com.goheza.goheza://instagram-callback',
}

/** Same-site relative paths only, so `returnTo` can't become an open redirect. */
export function safeRedirectPath(path: string | undefined | null, fallback = DEFAULT_RETURN_TO): string {
    if (!path || !path.startsWith('/') || path.startsWith('//')) return fallback
    return path
}

/** `client: 'app'` in the connect request body means the mobile app started it. */
export function parseClient(value: unknown): OAuthClient {
    return value === 'app' ? 'app' : 'web'
}

export async function createOAuthState(args: {
    userId: string
    provider: OAuthProvider
    client: OAuthClient
    returnTo?: string | null
    codeVerifier?: string | null
}): Promise<string> {
    const state = crypto.randomBytes(24).toString('base64url')
    const { error } = await getSupabaseAdmin()
        .from('oauth_states')
        .insert({
            state,
            user_id: args.userId,
            provider: args.provider,
            client: args.client,
            code_verifier: args.codeVerifier ?? null,
            return_to: args.client === 'web' ? safeRedirectPath(args.returnTo) : null,
        })
    if (error) throw new Error(`Could not save OAuth state: ${error.message}`)
    return state
}

/**
 * Looks up and deletes the state in one step, so it can only be used once.
 * Returns null if it's unknown, already used, expired or for another provider.
 */
export async function consumeOAuthState(state: string | null, provider: OAuthProvider): Promise<PendingOAuth | null> {
    if (!state) return null
    const { data, error } = await getSupabaseAdmin()
        .from('oauth_states')
        .delete()
        .eq('state', state)
        .eq('provider', provider)
        .gt('expires_at', new Date().toISOString())
        .select('user_id, provider, code_verifier, client, return_to')
        .maybeSingle()
    if (error) {
        console.error(`[oauth-state] consume failed for ${provider}:`, error.message)
        return null
    }
    if (!data) return null
    return {
        userId: data.user_id,
        provider: data.provider,
        codeVerifier: data.code_verifier,
        client: data.client === 'app' ? 'app' : 'web',
        returnTo: safeRedirectPath(data.return_to),
    }
}

/**
 * Ends a connect: back into the app for app flows, otherwise to the web page
 * with the same `provider` / `social` / `reason` params the web used before.
 */
export function finishOAuth(
    provider: OAuthProvider,
    pending: Pick<PendingOAuth, 'client' | 'returnTo'> | null,
    result: OAuthResult,
    reason?: string
): Response {
    if (pending?.client === 'app') {
        const url = new URL(APP_CALLBACK[provider])
        url.searchParams.set('result', result)
        if (reason) url.searchParams.set('reason', reason)
        // Response.redirect only accepts http(s) URLs.
        return new Response(null, { status: 302, headers: { Location: url.toString() } })
    }

    const url = new URL(pending?.returnTo ?? DEFAULT_RETURN_TO, BASE_URL)
    url.searchParams.set('provider', provider)
    url.searchParams.set('social', result === 'connected' ? 'success' : 'error')
    if (result !== 'connected') url.searchParams.set('reason', reason ?? result)
    return Response.redirect(url.toString())
}
