import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { fetchTikTokUsername } from '@/lib/server/tiktok'

const baseURL = 'https://goheza.com'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(req.url)
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const errorParam = searchParams.get('error')

        if (errorParam) {
            return Response.redirect(`${baseURL}/app/onboarding/creator?social=error&provider=tiktok`)
        }

        if (!code || !state) {
            return Response.json({ error: 'Missing code or state' }, { status: 400 })
        }
        const cookieStore = await cookies()
        const codeVerifier = cookieStore.get('tiktok_code_verifier')?.value
        const expectedState = cookieStore.get('tiktok_oauth_state')?.value

        if (!codeVerifier) {
            return Response.redirect(`${baseURL}/app/onboarding/creator?social=error&provider=tiktok`)
        }

        const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY!,
                client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                code,
                grant_type: 'authorization_code',
                redirect_uri: `${baseURL}/api/tiktok/callback`,
                code_verifier: codeVerifier,
            }),
        })

        const tokenData = await tokenRes.json()

        if (!tokenRes.ok) {
            console.error('TikTok token error:', tokenData)
            return Response.redirect(`${baseURL}/app/onboarding/creator?social=error&provider=tiktok`)
        }

        const tokenPayload = tokenData.data ?? tokenData
        const { access_token, refresh_token, expires_in, open_id, scope } = tokenPayload

        const username = await fetchTikTokUsername(access_token)

        const { error: upsertError } = await supabase.from('creator_social_accounts').upsert(
            {
                user_id: state,
                platform: 'tiktok',
                status: 'connected',
                open_id,
                external_username: username,
                access_token,
                refresh_token,
                token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
                scopes: scope ? scope.split(',') : [],
            },
            {
                onConflict: 'user_id, platform',
            }
        )

        if (upsertError) {
            console.error('Database upsert error:', upsertError)
            return Response.redirect(`${baseURL}/app/onboarding/creator?social=error&provider=tiktok`)
        }

        return Response.redirect(`${baseURL}/app/onboarding/creator?social=success`)
    } catch (error) {
        console.error(error)
        if (error instanceof Error) {
            return Response.json({ error: { msg: error.message } }, { status: 500 })
        } else {
            return Response.json({ error: { msg: error } }, { status: 500 })
        }
    }
}
