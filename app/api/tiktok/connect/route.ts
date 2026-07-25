import crypto from 'crypto'
import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    return { codeVerifier, codeChallenge }
}

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

        const { codeVerifier, codeChallenge } = generatePKCE()

        const cookieStore = await cookies()
        cookieStore.set('tiktok_code_verifier', codeVerifier, {
            httpOnly: true,
            secure: true,
            maxAge: 600,
            path: '/',
            sameSite: 'lax',
        })
        // New: store the expected state server-side (cookie, same pattern as
        // codeVerifier) so the callback can confirm the returning state actually
        // belongs to the session that initiated this flow, not just trust
        // whatever value comes back in the query string.
        cookieStore.set('tiktok_oauth_state', user.id, {
            httpOnly: true,
            secure: true,
            maxAge: 600,
            path: '/',
            sameSite: 'lax',
        })

        const clientKey = process.env.TIKTOK_CLIENT_KEY!
        const redirectUri = `${baseURL}/api/tiktok/callback`

        const authUrl =
            `https://www.tiktok.com/v2/auth/authorize/?` +
            `client_key=${clientKey}&` +
            `scope=user.info.basic,video.upload,video.publish,video.list&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${user.id}&` +
            `code_challenge=${codeChallenge}&` +
            `code_challenge_method=S256`

        return Response.json({ authUrl })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Generation failed' }, { status: 500 })
    }
}
