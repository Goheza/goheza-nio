import crypto from 'crypto'
import { createClient } from '@/lib/supabase-server'
import { createOAuthState, parseClient } from '@/lib/server/oauth-state'

function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    return { codeVerifier, codeChallenge }
}

const baseURL = 'https://goheza.com'

export async function POST(req: Request) {
    try {
        /**
         * Verify User Authentication part.
         */
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

        /**
         * Get the required data for the user
         */

        const body = await req.json().catch(() => ({}))


        /**
         * Create the Authentcation State verifier
         */

        const { codeVerifier, codeChallenge } = generatePKCE()
        const state = await createOAuthState({
            userId: user.id,
            provider: 'tiktok',
            client: parseClient(body.client),
            returnTo: body.returnTo,
            codeVerifier,
        })

        /**
         * Verify the client credentials and the user's scopes
         */
        const clientKey = process.env.TIKTOK_BUSINESS_APP_ID!
        const redirectUri = `${baseURL}/api/tiktok-business/callback`

        const scopes = [
            'user.info.basic',
            'video.list',
            'video.insights',
            'video.publish',
            'video.upload',
            'biz.creator.info',
            'biz.creator.insights',
            'user.info.username',
            'user.info.stats',
            'user.info.profile',
            'user.account.type',
            'user.insights',
            'comment.list',
            'comment.list.manage',
        ].join(',');


        /**
         * Generate the autentication url of the user.
         */

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
