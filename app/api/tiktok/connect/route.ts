import crypto from 'crypto'
import { createClient } from '@/lib/supabase-server'
import { createOAuthState, parseClient } from '@/lib/server/oauth-state'

function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    return { codeVerifier, codeChallenge }
}

/**
 * For content posting
 * video.upload
    video.publish
    */

const baseURL = 'https://goheza.com'

/**
 * Starts a TikTok connect for the signed-in user.
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

        const { codeVerifier, codeChallenge } = generatePKCE()

        const state = await createOAuthState({
            userId: user.id,
            provider: 'tiktok',
            client: parseClient(body.client),
            returnTo: body.returnTo,
            codeVerifier,
        })

        const clientKey = process.env.TIKTOK_CLIENT_KEY!
        const redirectUri = `${baseURL}/api/tiktok/callback`

        const scopes = [
            'user.info.basic',
            'user.info.profile',
            'user.info.stats',
            'video.list',
            'video.upload',
        ].join(',')

        const authUrl =
            `https://www.tiktok.com/v2/auth/authorize/?` +
            `client_key=${clientKey}&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${state}&` +
            `code_challenge=${codeChallenge}&` +
            `code_challenge_method=S256`

        return Response.json({ authUrl })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Generation failed' }, { status: 500 })
    }
}
