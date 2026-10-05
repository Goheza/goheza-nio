import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

const baseURL = 'https://goheza.com'

function safeRedirectPath(path: string | undefined | null, fallback: string): string {
    if (!path || !path.startsWith('/') || path.startsWith('//')) {
        return fallback
    }
    return path
}

function buildRedirect(returnTo: string, params: Record<string, string>) {
    const url = new URL(returnTo, baseURL)
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value)
    }
    return url
}

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(req.url)

        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const tiktokError = searchParams.get('error')
        const tiktokErrorDescription = searchParams.get('error_description')

        const cookieStore = await cookies()
        const returnTo = safeRedirectPath(cookieStore.get('tiktok_oauth_return_to')?.value, '/app/56738-b-323')
        const expectedState = cookieStore.get('tiktok_test_state')?.value

        if (tiktokError) {
            console.error('TikTok denied authorization:', { tiktokError, tiktokErrorDescription })
            return Response.redirect(
                buildRedirect(returnTo, { provider: 'tiktok', social: 'error', reason: tiktokError }).toString()
            )
        }

        if (!code || !state) {
            return Response.redirect(
                buildRedirect(returnTo, { provider: 'tiktok', social: 'error', reason: 'missing_code' }).toString()
            )
        }

        if (!expectedState || state !== expectedState) {
            return Response.redirect(
                buildRedirect(returnTo, { provider: 'tiktok', social: 'error', reason: 'state_mismatch' }).toString()
            )
        }

        const tokenRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.TIKTOK_BUSINESS_APP_ID!,
                client_secret: process.env.TIKTOK_BUSINESS_APP_SECRET!,
                grant_type: 'authorization_code',
                auth_code: code,
                redirect_uri: `${baseURL}/api/tiktok-business/callback`,
            }),
        })

        const tokenData = await tokenRes.json()

        if (!tokenRes.ok || tokenData.code !== 0) {
            console.error('TikTok token error:', tokenData)
            const reason = tokenData?.message ?? 'token_exchange_failed'
            return Response.redirect(
                buildRedirect(returnTo, { provider: 'tiktok', social: 'error', reason }).toString()
            )
        }

        const tokenPayload = tokenData.data ?? tokenData
        const { access_token, refresh_token, expires_in, refresh_token_expires_in, open_id, scope } = tokenPayload

        // TODO: verify — assuming creator_id === open_id for now, per
        // earlier decision. Swap to a token_info/get call here if they
        // ever turn out to differ.
        const creatorId = open_id

        const { error: upsertError } = await supabase.from('goheza_tests').upsert(
            {
                open_id,
                creator_id: creatorId,
                platform: 'tiktok',
                status: 'connected',
                access_token,
                refresh_token,
                token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
                refresh_token_expires_at: refresh_token_expires_in
                    ? new Date(Date.now() + refresh_token_expires_in * 1000).toISOString()
                    : null,
                scopes: scope ? scope.split(',') : [],
                last_error: null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'open_id' }
        )

        if (upsertError) {
            console.error('Database upsert error:', upsertError)
            return Response.redirect(
                buildRedirect(returnTo, { provider: 'tiktok', social: 'error', reason: 'db_error' }).toString()
            )
        }

        cookieStore.delete('tiktok_test_state')
        cookieStore.delete('tiktok_oauth_return_to')

        return Response.redirect(buildRedirect(returnTo, { provider: 'tiktok', social: 'success' }).toString())
    } catch (error) {
        console.error(error)
        if (error instanceof Error) {
            return Response.json({ error: { msg: error.message } }, { status: 500 })
        }
        return Response.json({ error: { msg: error } }, { status: 500 })
    }
}