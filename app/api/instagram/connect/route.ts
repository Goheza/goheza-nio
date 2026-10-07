import { createClient } from '@/lib/supabase-server'
import { createOAuthState, parseClient } from '@/lib/server/oauth-state'
import { instagramRedirectUri } from '@/lib/server/instagram-oauth'

/**
 * Starts an Instagram connect for the signed-in user.
 *
 * Body: { returnTo?: string }   web: page to land on afterwards
 *       { client: 'app' }       Goheza mobile app: callback returns to the app
 * Returns { authUrl }.
 */
export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const authHeader = req.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return Response.json({ error: 'No token provided' }, { status: 401 })
        }

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return Response.json({ error: 'User not authenticated' }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))

        // No PKCE here — unlike TikTok, Instagram's Business Login
        // for Instagram uses a plain authorization-code exchange, no
        // code_verifier/code_challenge involved.
        const state = await createOAuthState({
            userId: user.id,
            provider: 'instagram',
            client: parseClient(body.client),
            returnTo: body.returnTo,
        })

        const clientId = process.env.INSTAGRAM_APP_ID!
        const redirectUri = instagramRedirectUri()

        // Current (post Jan 27, 2025) scope values for the Instagram API
        // with Instagram Login — the old business_basic /
        // business_content_publish names (without the instagram_ prefix)
        // were deprecated and no longer work.
        const scopes = ['instagram_business_basic', 'instagram_business_content_publish', 'instagram_business_manage_insights'].join(
            ','
        )

        const authUrl =
            `https://api.instagram.com/oauth/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `response_type=code&` +
            `state=${state}`

        return Response.json({ authUrl })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Generation failed' }, { status: 500 })
    }
}
