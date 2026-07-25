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

        // Same pattern as the TikTok connect route: record the expected
        // state server-side so the callback can confirm it, rather than
        // trusting whatever state value comes back in the redirect query
        // string. Previously this flow built the whole authorize URL
        // client-side with no server step at all, so there was nothing to
        // check the returned state against.
        const cookieStore = await cookies()
        cookieStore.set('instagram_oauth_state', user.id, {
            httpOnly: true,
            secure: true,
            maxAge: 60 * 10,
            path: '/',
            sameSite: 'lax',
        })

        const clientId = process.env.INSTAGRAM_CLIENT_ID!
        const redirectUri = `${baseURL}/api/instagram/callback`
        const scope = 'instagram_business_basic,instagram_business_content_publish'

        const url = new URL('https://www.instagram.com/oauth/authorize')
        url.searchParams.set('client_id', clientId)
        url.searchParams.set('redirect_uri', redirectUri)
        url.searchParams.set('response_type', 'code')
        url.searchParams.set('scope', scope)
        url.searchParams.set('state', user.id)

        return Response.json({ authUrl: url.toString() })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Generation failed' }, { status: 500 })
    }
}
