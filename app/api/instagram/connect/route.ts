import { createClient } from '@/lib/supabase-server'
import { createOAuthState, parseClient } from '@/lib/server/oauth-state'
import { instagramRedirectUri } from '@/lib/server/instagram-oauth'

const INSTAGRAM_AUTH_URL = 'https://www.instagram.com/oauth/authorize'

const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'].join(',')

/**
 * Starts an Instagram OAuth connection for the authenticated Goheza user.
 *
 * Request body (all optional):
 * {
 *   returnTo?: string
 *   client?: 'app'
 * }
 *
 * Returns: { authUrl: string }
 *
 * On failure returns { error: string, stage: string } so the client can show
 * (and you can debug) exactly which step failed.
 */
export async function POST(req: Request) {
    let stage = 'init'

    try {
        // 1. Authenticate the user.
        // The browser client sends `Authorization: Bearer <access_token>`, but
        // the server client usually reads cookies only. Try cookies first, then
        // fall back to the bearer token.
        stage = 'auth'
        const supabase = await createClient()

        let {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            const token = req.headers
                .get('authorization')
                ?.replace(/^Bearer\s+/i, '')
                .trim()

            if (token) {
                const { data } = await supabase.auth.getUser(token)
                user = data.user
            }
        }

        if (!user) {
            return Response.json({ error: 'User not authenticated', stage }, { status: 401 })
        }

        // 2. Validate the Instagram OAuth configuration.
        stage = 'config'
        const clientId = process.env.INSTAGRAM_APP_ID

        if (!clientId) {
            console.error('[Instagram OAuth] Missing INSTAGRAM_APP_ID')
            return Response.json({ error: 'Instagram OAuth is not configured (app id)', stage }, { status: 500 })
        }

        const redirectUri = instagramRedirectUri()

        if (!redirectUri) {
            console.error('[Instagram OAuth] Missing redirect URI')
            return Response.json(
                { error: 'Instagram OAuth redirect URI is not configured', stage },
                { status: 500 }
            )
        }

        // 3. Parse the request body defensively (empty/invalid body is fine).
        stage = 'body'
        let body: { client?: unknown; returnTo?: unknown } = {}
        try {
            body = (await req.json()) ?? {}
        } catch {
            body = {}
        }

        // parseClient may throw when `client` is missing, so fall back to 'app'.
        let client: ReturnType<typeof parseClient>
        try {
            client = parseClient(body.client)
        } catch {
            client = parseClient('app')
        }

        const requestedReturnTo = typeof body.returnTo === 'string' ? body.returnTo : null

        // 4. Create a database-backed, single-use OAuth state.
        stage = 'create_state'
        const state = await createOAuthState({
            userId: user.id,
            provider: 'instagram',
            client,
            returnTo: requestedReturnTo,
        })

        // 5. Build Instagram's authorization URL.
        stage = 'build_url'
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: INSTAGRAM_SCOPES,
            state,
        })

        const authUrl = `${INSTAGRAM_AUTH_URL}?${params.toString()}`

        // 6. Return the URL to the web app or mobile app.
        return Response.json({ authUrl })
    } catch (error) {
        console.error(`[Instagram OAuth] Initialization failed at stage "${stage}":`, error)

        return Response.json(
            {
                error: 'Failed to initialize Instagram OAuth',
                stage,
                // Only expose details outside production.
                detail:
                    process.env.NODE_ENV !== 'production' && error instanceof Error
                        ? error.message
                        : undefined,
            },
            { status: 500 }
        )
    }
}