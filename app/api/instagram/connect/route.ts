
import { createClient } from '@/lib/supabase-server'
import {
    createOAuthState,
    parseClient,
} from '@/lib/server/oauth-state'
import { instagramRedirectUri } from '@/lib/server/instagram-oauth'

const INSTAGRAM_AUTH_URL =
    'https://www.instagram.com/oauth/authorize'

const INSTAGRAM_SCOPES = [
    'instagram_business_basic',
    'instagram_business_content_publish',
].join(',')

/**
 * Starts an Instagram OAuth connection for the authenticated Goheza user.
 *
 * Request body:
 * {
 *   returnTo?: string
 *   client?: 'app'
 * }
 *
 * Returns:
 * {
 *   authUrl: string
 * }
 */
export async function POST(req: Request) {
    try {
        // 1. Authenticate the user.
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return Response.json(
                { error: 'User not authenticated' },
                { status: 401 }
            )
        }

        // 2. Validate the Instagram OAuth configuration.
        const clientId = process.env.INSTAGRAM_APP_ID

        if (!clientId) {
            console.error(
                '[Instagram OAuth] Missing INSTAGRAM_APP_ID'
            )

            return Response.json(
                { error: 'Instagram OAuth is not configured' },
                { status: 500 }
            )
        }

        const redirectUri = instagramRedirectUri()

        if (!redirectUri) {
            console.error(
                '[Instagram OAuth] Missing redirect URI'
            )

            return Response.json(
                { error: 'Instagram OAuth redirect URI is not configured' },
                { status: 500 }
            )
        }

        // 3. Parse the request body.
        const body = await req.json()

        const client = parseClient(body.client)

        const requestedReturnTo =
            typeof body.returnTo === 'string'
                ? body.returnTo
                : null

        // 4. Create a database-backed, single-use OAuth state.
        // The helper stores the user, provider, client and safe return path.
        const state = await createOAuthState({
            userId: user.id,
            provider: 'instagram',
            client,
            returnTo: requestedReturnTo,
        })

        // 5. Build Instagram's authorization URL.
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: INSTAGRAM_SCOPES,
            state,
        })

        const authUrl =
            `${INSTAGRAM_AUTH_URL}?${params.toString()}`

        // 6. Return the URL to the web app or mobile app.
        return Response.json({ authUrl })
    } catch (error) {
        console.error(
            '[Instagram OAuth] Initialization failed:',
            error
        )

        return Response.json(
            { error: 'Failed to initialize Instagram OAuth' },
            { status: 500 }
        )
    }
}