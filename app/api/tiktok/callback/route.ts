import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { fetchTikTokDisplayName } from '@/lib/server/tiktok'

const baseURL = 'https://goheza.com'

function safeRedirectPath(path: string | undefined | null, fallback: string): string {
    if (!path || !path.startsWith('/') || path.startsWith('//')) {
        return fallback
    }
    return path
}

function buildErrorRedirect(returnTo: string, reason: string) {
    const url = new URL(returnTo, baseURL)
    url.searchParams.set('provider', 'tiktok')
    url.searchParams.set('social', 'error')
    url.searchParams.set('reason', reason)
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
        const returnTo = safeRedirectPath(cookieStore.get('tiktok_oauth_return_to')?.value, '/app/creator/campaigns')

        // Case 1: TikTok itself rejected the request before ever issuing a code
        // (user denied consent, scope not grantable for this account, app not
        // authorized for this user, account restricted, etc.)
        if (tiktokError) {
            console.error('TikTok denied authorization:', { tiktokError, tiktokErrorDescription })
            return Response.redirect(buildErrorRedirect(returnTo, tiktokError).toString())
        }

        // Case 2: We never got code/state at all
        if (!code || !state) {
            return Response.redirect(buildErrorRedirect(returnTo, 'missing_code').toString())
        }

        const codeVerifier = cookieStore.get('tiktok_code_verifier')?.value

        // Case 3: PKCE verifier cookie missing/expired
        if (!codeVerifier) {
            return Response.redirect(buildErrorRedirect(returnTo, 'missing_verifier').toString())
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

        // Case 4: Token exchange itself failed
        if (!tokenRes.ok) {
            console.error('TikTok token error:', tokenData)
            const reason = tokenData?.error ?? 'token_exchange_failed'
            return Response.redirect(buildErrorRedirect(returnTo, reason).toString())
        }

        const tokenPayload = tokenData.data ?? tokenData
        const { access_token, refresh_token, expires_in, open_id, scope } = tokenPayload

        const display_name = await fetchTikTokDisplayName(access_token, open_id)

        const { error: upsertError } = await supabase.from('creator_social_accounts').upsert(
            {
                user_id: state,
                platform: 'tiktok',
                status: 'connected',
                open_id,
                display_name: display_name ?? "User Hasn't Set a Display Name",
                access_token,
                refresh_token,
                token_status: 'active',
                last_token_refresh_at: null,
                token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
                scopes: scope ? scope.split(',') : [],
            },
            {
                onConflict: 'user_id, platform',
            }
        )

        // Case 5: DB write failed
        if (upsertError) {
            console.error('Database upsert error:', upsertError)
            return Response.redirect(buildErrorRedirect(returnTo, 'db_error').toString())
        }

        cookieStore.delete('tiktok_code_verifier')
        cookieStore.delete('tiktok_oauth_return_to')

        const url = new URL(returnTo, baseURL)
        url.searchParams.set('provider', 'tiktok')
        url.searchParams.set('social', 'success')

        return Response.redirect(url.toString())
    } catch (error) {
        console.error(error)
        if (error instanceof Error) {
            return Response.json({ error: { msg: error.message } }, { status: 500 })
        }
        return Response.json({ error: { msg: error } }, { status: 500 })
    }
}