import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { fetchTikTokUsername } from '@/lib/server/tiktok'

const baseURL = 'https://goheza.com'

function safeRedirectPath(path: string | undefined | null, fallback: string): string {
    // Only allow same-app relative paths — reject anything that looks like
    // it could redirect off-site (protocol-relative //, absolute http(s)://).
    if (!path || !path.startsWith('/') || path.startsWith('//')) return fallback
    return path
}

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(req.url)
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const errorParam = searchParams.get('error')

        if (!code || !state) {
            return Response.json({ error: 'Missing code or state' }, { status: 400 })
        }
        const cookieStore = await cookies()
        const codeVerifier = cookieStore.get('tiktok_code_verifier')?.value
        const returnTo = safeRedirectPath(cookieStore.get('tiktok_oauth_return_to')?.value, '/app/creator/campaigns')

        if (!codeVerifier) {
            const url = new URL(`${baseURL}${returnTo}`)
            url.searchParams.set('provider', 'tiktok')

            url.searchParams.set('social', 'error')

            return Response.redirect(url.toString())
        }

        const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_key: process.env.TIKTOK_BUSINESS_APP_ID!,
                client_secret: process.env.TIKTOK_BUSINESS_APP_SECRET!,
                code,
                grant_type: 'authorization_code',
                redirect_uri: `${baseURL}/api/tiktok/callback`,
                code_verifier: codeVerifier,
            }),
        })

        const tokenData = await tokenRes.json()

        if (!tokenRes.ok) {
            console.error('TikTok token error:', tokenData)
            const url = new URL(`${baseURL}${returnTo}`)
            url.searchParams.set('social', 'error')

            return Response.redirect(url.toString())
        }

        const tokenPayload = tokenData.data ?? tokenData
        const { access_token, refresh_token, expires_in, open_id, scope } = tokenPayload

        const username = await fetchTikTokUsername(access_token, open_id)

       

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

        console.log('FINIDAL-DETAILS-FROM-TIKTOK', {
            user_id: state,
            platform: 'tiktok',
            status: 'connected',
            open_id,
            external_username: username,
            access_token,
            refresh_token,
            token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
            scopes: scope ? scope.split(',') : [],
        })

        if (upsertError) {
            console.error('Database upsert error:', upsertError)
            const url = new URL(`${baseURL}${returnTo}`)
            url.searchParams.set('provider', 'tiktok')
            url.searchParams.set('social', 'error')

            return Response.redirect(url.toString())
        }

        const url = new URL(`${baseURL}${returnTo}`)
        url.searchParams.set('provider', 'tiktok')
        url.searchParams.set('social', 'success')
        return Response.redirect(url.toString())
    } catch (error) {
        console.error(error)
        if (error instanceof Error) {
            return Response.json({ error: { msg: error.message } }, { status: 500 })
        } else {
            return Response.json({ error: { msg: error } }, { status: 500 })
        }
    }
}
