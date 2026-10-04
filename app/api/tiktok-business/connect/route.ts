import crypto from 'crypto'
import { cookies } from 'next/headers'

const baseURL = 'https://goheza.com'

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}))
        const returnTo: string = body.returnTo ?? '/56738-b-323'

        // Lightweight CSRF check for the OAuth round trip — not tied to a
        // Supabase user, just confirms the callback came from a browser
        // that actually started this flow.
        const state = crypto.randomBytes(16).toString('hex')

        const cookieStore = await cookies()
        cookieStore.set('tiktok_test_state', state, {
            httpOnly: true,
            secure: true,
            maxAge: 600,
            path: '/',
            sameSite: 'lax',
        })
        cookieStore.set('tiktok_oauth_return_to', returnTo, {
            httpOnly: true,
            secure: true,
            maxAge: 600,
            path: '/',
            sameSite: 'lax',
        })

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
        ].join(',')

        const authUrl =
            `https://www.tiktok.com/v2/auth/authorize/?` +
            `client_key=${clientKey}&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${state}`

        return Response.json({ authUrl })
    } catch (error) {
        console.error(error)
        return Response.json({ error: 'Generation failed' }, { status: 500 })
    }
}