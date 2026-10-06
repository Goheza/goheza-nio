import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { consumeOAuthState, finishOAuth } from '@/lib/server/oauth-state'
import { instagramRedirectUri } from '@/lib/server/instagram-oauth'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)

    // The state row says who is connecting and where they go back to (web
    // page or the mobile app). It's single-use, so look it up first.
    const pending = await consumeOAuthState(searchParams.get('state'), 'instagram')
    const finish = (result: 'connected' | 'cancelled' | 'failed', reason?: string) =>
        finishOAuth('instagram', pending, result, reason)

    try {
        const code = searchParams.get('code')
        const igError = searchParams.get('error')
        const igErrorReason = searchParams.get('error_reason')
        const igErrorDescription = searchParams.get('error_description')

        // Case 1: Instagram itself rejected the request before ever issuing
        // a code (user denied consent, account isn't a Business/Creator
        // account, app not authorized for this user, etc.)
        if (igError) {
            console.error('Instagram denied authorization:', { igError, igErrorReason, igErrorDescription })
            return finish(igErrorReason === 'user_denied' ? 'cancelled' : 'failed', igErrorReason ?? igError)
        }

        // Case 2: Unknown, expired or already-used state
        if (!pending) {
            return finish('failed', 'invalid_state')
        }

        // Case 3: We never got a code
        if (!code) {
            return finish('failed', 'missing_code')
        }

        // Step 1: exchange the authorization code for a short-lived token.
        // Instagram's /oauth/access_token endpoint specifically expects
        // multipart/form-data — NOT application/x-www-form-urlencoded like
        // TikTok's token endpoint. Sending URLSearchParams here fails.
        const redirectUri = instagramRedirectUri()

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
            return finish('failed', reason)
        }

        // Response shape: { data: [{ access_token, user_id, permissions }] }
        const shortLivedEntry = shortLivedData?.data?.[0]
        const shortLivedAccessToken: string | undefined = shortLivedEntry?.access_token
        const igUserId: string | undefined = shortLivedEntry?.user_id
        const permissions: string | undefined = shortLivedEntry?.permissions

        if (!shortLivedAccessToken || !igUserId) {
            console.error('Instagram token response missing expected fields:', shortLivedData)
            return finish('failed', 'token_exchange_failed')
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
            return finish('failed', 'long_lived_token_exchange_failed')
        }

        const { access_token: longLivedAccessToken, expires_in: longLivedExpiresIn } = longLivedData

        // Service role: the user id comes from the verified state row, and the
        // app's in-app browser has no Supabase session cookie.
        const { error: upsertError } = await getSupabaseAdmin().from('creator_social_accounts').upsert(
            {
                user_id: pending.userId,
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
            return finish('failed', 'db_error')
        }

        return finish('connected')
    } catch (error) {
        console.error(error)
        return finish('failed', 'server_error')
    }
}
