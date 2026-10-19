import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { consumeOAuthState, finishOAuth } from '@/lib/server/oauth-state'
import { instagramRedirectUri } from '@/lib/server/instagram-oauth'

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

const SENSITIVE_KEYS = new Set([
    'access_token',
    'refresh_token',
    'client_secret',
    'code',
    'state',
])

/** JSON.stringify replacer that hides secrets but keeps everything else. */
function redactReplacer(key: string, value: unknown) {
    if (SENSITIVE_KEYS.has(key) && typeof value === 'string') {
        return `[redacted:${value.length} chars]`
    }
    return value
}

type LogLevel = 'info' | 'warn' | 'error'

/**
 * One JSON object per line: easy to search/filter in Vercel, Datadog, etc.
 * Example search: "Instagram OAuth callback" AND "stage":"short_lived_exchange"
 */
function makeLogger(requestId: string) {
    return (level: LogLevel, stage: string, message: string, extra?: Record<string, unknown>) => {
        const line = JSON.stringify(
            {
                tag: 'instagram_oauth_callback',
                requestId,
                level,
                stage,
                message,
                ...extra,
            },
            redactReplacer
        )
        if (level === 'error') console.error(line)
        else if (level === 'warn') console.warn(line)
        else console.log(line)
    }
}

/** Serialize any thrown value (Error, Supabase error, string, ...) for logs. */
function describeError(err: unknown) {
    if (err instanceof Error) {
        return {
            name: err.name,
            message: err.message,
            cause: err.cause instanceof Error ? err.cause.message : err.cause,
            stack: err.stack?.split('\n').slice(0, 6).join('\n'),
        }
    }
    if (err && typeof err === 'object') return err as Record<string, unknown>
    return { message: String(err) }
}

/**
 * Read a response body without ever throwing. Instagram sometimes returns
 * HTML or an empty body on gateway errors, which makes res.json() blow up and
 * hide the real problem.
 */
async function readBody(res: Response): Promise<{ json: any; raw: string }> {
    const raw = await res.text()
    try {
        return { json: raw ? JSON.parse(raw) : null, raw }
    } catch {
        return { json: null, raw }
    }
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
    const requestId = crypto.randomUUID().slice(0, 8)
    const log = makeLogger(requestId)
    let stage = 'init'

    const { searchParams } = new URL(req.url)

    log('info', stage, 'Callback hit', {
        hasCode: searchParams.has('code'),
        hasState: searchParams.has('state'),
        hasError: searchParams.has('error'),
    })

    // The state row says who is connecting and where they go back to.
    // It's single-use, so look it up first.
    stage = 'consume_state'
    let pending: Awaited<ReturnType<typeof consumeOAuthState>> = null
    try {
        pending = await consumeOAuthState(searchParams.get('state'), 'instagram')
    } catch (error) {
        log('error', stage, 'consumeOAuthState threw', { error: describeError(error) })
    }

    log(pending ? 'info' : 'warn', stage, pending ? 'State found' : 'State missing, expired, or already used', {
        userId: pending?.userId,
    })

    const finish = (result: 'connected' | 'cancelled' | 'failed', reason?: string) => {
        log(result === 'failed' ? 'error' : 'info', stage, `Finishing OAuth: ${result}`, {
            result,
            reason,
            userId: pending?.userId,
        })
        return finishOAuth('instagram', pending, result, reason)
    }

    try {
        const code = searchParams.get('code')
        const igError = searchParams.get('error')
        const igErrorReason = searchParams.get('error_reason')
        const igErrorDescription = searchParams.get('error_description')

        // Case 1: Instagram rejected the request before issuing a code.
        stage = 'instagram_denied'
        if (igError) {
            log('error', stage, 'Instagram denied authorization', {
                igError,
                igErrorReason,
                igErrorDescription,
            })
            return finish(igErrorReason === 'user_denied' ? 'cancelled' : 'failed', igErrorReason ?? igError)
        }

        // Case 2: Unknown, expired or already-used state.
        stage = 'validate_state'
        if (!pending) {
            return finish('failed', 'invalid_state')
        }

        // Case 3: We never got a code.
        stage = 'validate_code'
        if (!code) {
            return finish('failed', 'missing_code')
        }

        // Config sanity check: fail loudly instead of sending "undefined" to Instagram.
        stage = 'config'
        const appId = process.env.INSTAGRAM_APP_ID
        const appSecret = process.env.INSTAGRAM_APP_SECRET
        const redirectUri = instagramRedirectUri()

        const missingConfig = [
            !appId && 'INSTAGRAM_APP_ID',
            !appSecret && 'INSTAGRAM_APP_SECRET',
            !redirectUri && 'redirect_uri',
        ].filter(Boolean)

        if (missingConfig.length > 0) {
            log('error', stage, 'Missing configuration', { missingConfig })
            return finish('failed', 'server_misconfigured')
        }

        // Step 1: exchange the code for a short-lived token (multipart/form-data).
        stage = 'short_lived_exchange'
        const shortLivedForm = new FormData()
        shortLivedForm.append('client_id', appId!)
        shortLivedForm.append('client_secret', appSecret!)
        shortLivedForm.append('grant_type', 'authorization_code')
        shortLivedForm.append('redirect_uri', redirectUri)
        shortLivedForm.append('code', code)

        let shortLivedRes: Response
        try {
            shortLivedRes = await fetch('https://api.instagram.com/oauth/access_token', {
                method: 'POST',
                body: shortLivedForm,
            })
        } catch (error) {
            log('error', stage, 'Network error calling Instagram token endpoint', {
                error: describeError(error),
            })
            return finish('failed', 'instagram_unreachable')
        }

        const shortLived = await readBody(shortLivedRes)

        if (!shortLivedRes.ok) {
            log('error', stage, 'Short-lived token exchange failed', {
                httpStatus: shortLivedRes.status,
                redirectUri, // the #1 cause of failures here is a redirect_uri mismatch
                response: shortLived.json ?? shortLived.raw.slice(0, 500),
            })
            const reason =
                shortLived.json?.error_message ?? shortLived.json?.error_type ?? 'token_exchange_failed'
            return finish('failed', reason)
        }

        // Handle both documented shapes: { data: [{...}] } and a flat object.
        stage = 'parse_short_lived'
        const entry = shortLived.json?.data?.[0] ?? shortLived.json
        const shortLivedAccessToken: string | undefined = entry?.access_token
        const igUserId: string | undefined = entry?.user_id != null ? String(entry.user_id) : undefined
        const permissions: string | string[] | undefined = entry?.permissions

        if (!shortLivedAccessToken || !igUserId) {
            log('error', stage, 'Token response missing expected fields', {
                hasAccessToken: Boolean(shortLivedAccessToken),
                hasUserId: Boolean(igUserId),
                topLevelKeys: shortLived.json ? Object.keys(shortLived.json) : null,
                response: shortLived.json ?? shortLived.raw.slice(0, 500),
            })
            return finish('failed', 'token_response_malformed')
        }

        // Step 2: upgrade to a long-lived token (60 days).
        stage = 'long_lived_exchange'
        const longLivedUrl = new URL('https://graph.instagram.com/access_token')
        longLivedUrl.searchParams.set('grant_type', 'ig_exchange_token')
        longLivedUrl.searchParams.set('client_secret', appSecret!)
        longLivedUrl.searchParams.set('access_token', shortLivedAccessToken)

        let longLivedRes: Response
        try {
            longLivedRes = await fetch(longLivedUrl.toString())
        } catch (error) {
            log('error', stage, 'Network error calling Instagram long-lived endpoint', {
                error: describeError(error),
            })
            return finish('failed', 'instagram_unreachable')
        }

        const longLived = await readBody(longLivedRes)

        if (!longLivedRes.ok || !longLived.json?.access_token) {
            log('error', stage, 'Long-lived token exchange failed', {
                httpStatus: longLivedRes.status,
                response: longLived.json ?? longLived.raw.slice(0, 500),
            })
            return finish('failed', 'long_lived_token_exchange_failed')
        }

        const { access_token: longLivedAccessToken, expires_in: longLivedExpiresIn } = longLived.json

        // Guard against a bad expires_in producing "Invalid Date" (which would
        // throw on toISOString and show up as a vague server_error).
        stage = 'compute_expiry'
        const expiresInSeconds = Number(longLivedExpiresIn)
        if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
            log('error', stage, 'Invalid expires_in from Instagram', { longLivedExpiresIn })
            return finish('failed', 'invalid_token_expiry')
        }
        const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

        const scopes = Array.isArray(permissions)
            ? permissions
            : typeof permissions === 'string' && permissions.length > 0
              ? permissions.split(',')
              : []

        // Service role: user id comes from the verified state row.
        stage = 'db_upsert'
        const { error: upsertError } = await getSupabaseAdmin().from('creator_social_accounts').upsert(
            {
                user_id: pending.userId,
                platform: 'instagram',
                status: 'connected',
                open_id: igUserId,
                display_name: "User Hasn't Set a Display Name",
                access_token: longLivedAccessToken,
                refresh_token: null,
                token_status: 'active',
                last_token_refresh_at: null,
                token_expires_at: tokenExpiresAt,
                scopes,
            },
            { onConflict: 'user_id, platform' }
        )

        if (upsertError) {
            // Supabase errors carry code/details/hint, which tell you exactly
            // what's wrong (e.g. 42P10 = missing unique constraint for onConflict,
            // 23502 = NOT NULL violation, 42501 = permissions).
            log('error', stage, 'Database upsert failed', {
                code: upsertError.code,
                message: upsertError.message,
                details: upsertError.details,
                hint: upsertError.hint,
                userId: pending.userId,
                igUserId,
            })
            return finish('failed', 'db_error')
        }

        stage = 'done'
        log('info', stage, 'Instagram account connected', { userId: pending.userId, igUserId, scopes })
        return finish('connected')
    } catch (error) {
        // Anything unexpected lands here, now with the stage it happened in.
        log('error', stage, 'Unhandled exception in callback', { error: describeError(error) })
        return finish('failed', 'server_error')
    }
}