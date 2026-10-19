import { supabase } from './supabase'

/**
 * Error thrown by activateInstagramOAuth. Carries the server's `stage` and
 * `detail` so the UI (or Sentry) can show exactly where it failed.
 */
export class InstagramConnectError extends Error {
    stage?: string
    status?: number
    detail?: string

    constructor(message: string, opts: { stage?: string; status?: number; detail?: string } = {}) {
        super(message)
        this.name = 'InstagramConnectError'
        this.stage = opts.stage
        this.status = opts.status
        this.detail = opts.detail
    }
}

export async function activateInstagramOAuth(returnTo?: string) {
    // 1. Session
    const {
        data: { session },
        error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
        console.error('[Instagram connect] No session', { sessionError })
        throw new InstagramConnectError('Please sign in again to connect Instagram.', {
            stage: 'client_session',
            detail: sessionError?.message,
        })
    }

    // 2. Request (network failures are caught separately from HTTP failures)
    let res: Response
    try {
        res = await fetch('/api/instagram/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ returnTo }),
        })
    } catch (error) {
        console.error('[Instagram connect] Network error', error)
        throw new InstagramConnectError('Network error. Check your connection and try again.', {
            stage: 'client_network',
            detail: error instanceof Error ? error.message : String(error),
        })
    }

    // 3. Parse the body without ever throwing (HTML/empty error pages are common)
    const raw = await res.text()
    let data: { authUrl?: string; error?: string; stage?: string; detail?: string } | null = null
    try {
        data = raw ? JSON.parse(raw) : null
    } catch {
        data = null
    }

    // 4. Failure: log everything useful, then throw a readable error
    if (!res.ok || !data?.authUrl) {
        console.error('[Instagram connect] Failed to start', {
            httpStatus: res.status,
            stage: data?.stage,
            error: data?.error,
            detail: data?.detail,
            // Only present when the response wasn't JSON
            rawSnippet: data ? undefined : raw.slice(0, 200),
        })

        throw new InstagramConnectError(
            data?.error || `Could not start the Instagram connection (HTTP ${res.status}).`,
            { stage: data?.stage, status: res.status, detail: data?.detail }
        )
    }

    // 5. Sanity-check the destination before leaving the app
    let target: URL
    try {
        target = new URL(data.authUrl)
    } catch {
        throw new InstagramConnectError('Received an invalid Instagram link.', { stage: 'client_validate_url' })
    }

    if (target.protocol !== 'https:' || !/(^|\.)instagram\.com$/.test(target.hostname)) {
        console.error('[Instagram connect] Unexpected authUrl host', target.hostname)
        throw new InstagramConnectError('Received an unexpected Instagram link.', {
            stage: 'client_validate_url',
        })
    }

    window.location.href = target.toString()
}

/**
 * Turn the `reason` the callback passes to finishOAuth into something a user
 * can act on. Unknown reasons fall through to a generic message that still
 * includes the code, so support can match it against server logs.
 */
export function instagramErrorMessage(reason?: string | null): string {
    switch (reason) {
        case 'user_denied':
            return 'You cancelled the Instagram connection.'
        case 'invalid_state':
            return 'That connection link expired or was already used. Please try again.'
        case 'missing_code':
            return 'Instagram did not return an authorization code. Please try again.'
        case 'instagram_unreachable':
            return "We couldn't reach Instagram. Please try again in a moment."
        case 'long_lived_token_exchange_failed':
        case 'token_response_malformed':
        case 'invalid_token_expiry':
            return 'Instagram connected but we could not finish setting it up. Please try again.'
        case 'db_error':
        case 'server_error':
        case 'server_misconfigured':
            return "Something went wrong on our side. We've logged it. Please try again later."
        case undefined:
        case null:
        case '':
            return 'The Instagram connection failed. Please try again.'
        default:
            // Covers Instagram's own messages, e.g. "Invalid redirect_uri" or
            // "This authorization code has expired".
            return `Instagram connection failed: ${reason}`
    }
}