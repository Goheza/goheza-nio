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

        // No PKCE here — the Business API auth flow doesn't use code_challenge/code_verifier,
        // unlike the Login Kit v2 flow this replaces.
        if (returnTo) {
            cookieStore.set('tiktok_oauth_return_to', returnTo, {
                httpOnly: true,
                secure: true,
                maxAge: 600,
                path: '/',
                sameSite: 'lax',
            })
        }

        const appId = process.env.TIKTOK_BUSINESS_APP_ID!
        const redirectUri = `${baseURL}/api/tiktok/callback`

        const authUrl =
            `https://business-api.tiktok.com/portal/auth?` +
            `app_id=${appId}&` +
            `state=${user.id}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}`

        return Response.json({ authUrl })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Generation failed' }, { status: 500 })
    }
}