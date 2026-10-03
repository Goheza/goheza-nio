import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

const baseURL = 'https://goheza.com'

function safeRedirectPath(path: string | undefined | null, fallback: string): string {
    if (!path || !path.startsWith('/') || path.startsWith('//')) {
        return fallback
    }
    return path
}

function buildErrorRedirect(returnTo: string, reason: string) {
    const url = new URL(returnTo, baseURL)
    url.searchParams.set('provider', 'instagram')
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
        const igError = searchParams.get('error')
        const igErrorReason = searchParams.get('error_reason')
        const igErrorDescription = searchParams.get('error_description')

        const cookieStore = await cookies()
        const returnTo = safeRedirectPath(
            cookieStore.get('instagram_oauth_return_to')?.value,
            '/app/creator/campaigns'
        )

        // Case 1: Instagram itself rejected the request before ever issuing
        // a code (user denied consent, account isn't a Business/Creator
        // account, app not authorized for this user, etc.)
        if (igError) {
            console.error('Instagram denied authorization:', { igError, igErrorReason, igErrorDescription })
            return Response.redirect(buildErrorRedirect(returnTo, igErrorReason ?? igError).toString())
        }

        // Case 2: We never got code/state at all
        if (!code || !state) {
            return Response.redirect(buildErrorRedirect(returnTo, 'missing_code').toString())
        }

        // Step 1: exchange the authorization code for a short-lived token.
        // Instagram's /oauth/access_token endpoint specifically expects
        // multipart/form-data — NOT application/x-www-form-urlencoded like
        // TikTok's token endpoint. Sending URLSearchParams here fails.
        const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || `${baseURL}/api/instagram/oauth-callback`

        const shortLivedForm = new FormData()
        shortLivedForm.append('client_id', process.env.INSTAGRAM_APP_ID!)
        shortLivedForm.append('client_secret', process.env.INSTAGRAM_APP_SECRET!)
        shortLivedForm.append('grant_type', 'authorization_code')
        shortLivedForm.append('redirect_uri', redirectUri)
        shortLivedForm.append('code', code)

        const shortLivedRes = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            body: shortLivedForm,
        })
        const shortLivedData = await shortLivedRes.json()

        // Case 3: Token exchange itself failed
        if (!shortLivedRes.ok) {
            console.error('Instagram token error:', shortLivedData)
            const reason = shortLivedData?.error_message ?? shortLivedData?.error_type ?? 'token_exchange_failed'
            return Response.redirect(buildErrorRedirect(returnTo, reason).toString())
        }

        // Response shape: { data: [{ access_token, user_id, permissions }] }
        const shortLivedEntry = shortLivedData?.data?.[0]
        const shortLivedAccessToken: string | undefined = shortLivedEntry?.access_token
        const igUserId: string | undefined = shortLivedEntry?.user_id
        const permissions: string | undefined = shortLivedEntry?.permissions

        if (!shortLivedAccessToken || !igUserId) {
            console.error('Instagram token response missing expected fields:', shortLivedData)
            return Response.redirect(buildErrorRedirect(returnTo, 'token_exchange_failed').toString())
        }

        // Step 2: immediately upgrade to a long-lived token (60 days).
        // Instagram has no separate refresh_token the way TikTok does —
        // this same access_token is what gets used later to refresh itself
        // via GET /refresh_access_token, before it expires.
        const longLivedUrl = new URL('https://graph.instagram.com/access_token')
        longLivedUrl.searchParams.set('grant_type', 'ig_exchange_token')
        longLivedUrl.searchParams.set('client_secret', process.env.INSTAGRAM_APP_SECRET!)
        longLivedUrl.searchParams.set('access_token', shortLivedAccessToken)

        const longLivedRes = await fetch(longLivedUrl.toString())
        const longLivedData = await longLivedRes.json()

        // Case 4: Long-lived exchange failed — the short-lived token is
        // basically useless to store (expires in ~1hr), so this is a hard
        // failure, not a "store it anyway and hope" situation.
        if (!longLivedRes.ok || !longLivedData?.access_token) {
            console.error('Instagram long-lived token exchange error:', longLivedData)
            return Response.redirect(buildErrorRedirect(returnTo, 'long_lived_token_exchange_failed').toString())
        }

        const { access_token: longLivedAccessToken, expires_in: longLivedExpiresIn } = longLivedData

        const { error: upsertError } = await supabase.from('creator_social_accounts').upsert(
            {
                user_id: state,
                platform: 'instagram',
                status: 'connected',
                // Instagram-scoped user id, returned directly from the token
                // exchange — no Facebook Page / business_id lookup chain
                // needed with the Instagram Login path.
                open_id: igUserId,
                display_name: "User Hasn't Set a Display Name",
                access_token: longLivedAccessToken,
                // No distinct refresh_token concept for Instagram — the
                // long-lived access_token refreshes itself.
                refresh_token: null,
                token_status: 'active',
                last_token_refresh_at: null,
                token_expires_at: new Date(Date.now() + longLivedExpiresIn * 1000).toISOString(),
                scopes: permissions ? permissions.split(',') : [],
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

        cookieStore.delete('instagram_oauth_return_to')

        const url = new URL(returnTo, baseURL)
        url.searchParams.set('provider', 'instagram')
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