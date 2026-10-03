import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

const baseURL = 'https://goheza.com'

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

        const body = await req.json()
        const returnTo: string | null = body.returnTo

        const cookieStore = await cookies()

        // No PKCE cookie here - unlike TikTok, Instagram's Business Login
        // for Instagram uses a plain authorization-code exchange, no
        // code_verifier/code_challenge involved.
        if (returnTo) {
            cookieStore.set('instagram_oauth_return_to', returnTo, {
                httpOnly: true,
                secure: true,
                maxAge: 600,
                path: '/',
                sameSite: 'lax',
            })
        }

        const clientId = process.env.INSTAGRAM_APP_ID!
        const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${baseURL}/api/instagram/oauth-callback`

        // Current (post Jan 27, 2025) scope values for the Instagram API
        // with Instagram Login - the old business_basic /
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
            `state=${user.id}`

        return Response.json({ authUrl })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Generation failed' }, { status: 500 })
    }
}