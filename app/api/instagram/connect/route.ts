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

        // Get the authenticated Supabase user from the server session
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

        const body = await req.json()
        const returnTo: string | null = body.returnTo ?? null

        const cookieStore = await cookies()

        // Store where the user should return after OAuth
        if (returnTo) {
            cookieStore.set('instagram_oauth_return_to', returnTo, {
                httpOnly: true,
                secure: true,
                maxAge: 600,
                path: '/',
                sameSite: 'lax',
            })
        }

        // Generate unpredictable OAuth state
        const state = crypto.randomUUID()

        cookieStore.set('instagram_oauth_state', state, {
            httpOnly: true,
            secure: true,
            maxAge: 600,
            path: '/',
            sameSite: 'lax',
        })

        const clientId = process.env.INSTAGRAM_APP_ID!

        const redirectUri =
            process.env.INSTAGRAM_REDIRECT_URI ||
            `${baseURL}/api/instagram/oauth-callback`

        const scopes = [
            'instagram_business_basic',
            'instagram_business_content_publish',
            'instagram_business_manage_insights',
        ].join(',')

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scopes,
            response_type: 'code',
            state,
        })

        return Response.json({
            authUrl: `https://instagram.com/oauth/authorize?${params.toString()}`,
        })
    } catch (error) {
        console.error('Instagram OAuth initialization failed:', error)

        return Response.json(
            { error: 'Failed to initialize Instagram OAuth' },
            { status: 500 }
        )
    }
}
