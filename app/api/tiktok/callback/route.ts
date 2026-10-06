import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { consumeOAuthState, finishOAuth } from '@/lib/server/oauth-state'

const baseURL = 'https://goheza.com'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)

    // The state row says who is connecting and where they go back to (web
    // page or the mobile app). It's single-use, so look it up first.
    const pending = await consumeOAuthState(searchParams.get('state'), 'tiktok')
    const finish = (result: 'connected' | 'cancelled' | 'failed', reason?: string) =>
        finishOAuth('tiktok', pending, result, reason)

    try {
        const code = searchParams.get('code')
        const tiktokError = searchParams.get('error')
        const tiktokErrorDescription = searchParams.get('error_description')

        // Case 1: TikTok itself rejected the request before ever issuing a code
        // (user denied consent, scope not grantable for this account, app not
        // authorized for this user, account restricted, etc.)
        if (tiktokError) {
            console.error('TikTok denied authorization:', { tiktokError, tiktokErrorDescription })
            return finish(tiktokError === 'access_denied' ? 'cancelled' : 'failed', tiktokError)
        }

        // Case 2: Unknown, expired or already-used state
        if (!pending) {
            return finish('failed', 'invalid_state')
        }

        // Case 3: We never got a code
        if (!code) {
            return finish('failed', 'missing_code')
        }

        // Case 4: PKCE verifier missing (shouldn't happen: it's saved with the state)
        if (!pending.codeVerifier) {
            return finish('failed', 'missing_verifier')
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
                code_verifier: pending.codeVerifier,
            }),
        })

        const tokenData = await tokenRes.json()

        // Case 5: Token exchange itself failed
        if (!tokenRes.ok || tokenData?.error) {
            console.error('TikTok token error:', tokenData)
            return finish('failed', tokenData?.error ?? 'token_exchange_failed')
        }

        const tokenPayload = tokenData.data ?? tokenData
        const { access_token, refresh_token, expires_in, open_id, scope } = tokenPayload

        // const display_name = await fetchTikTokDisplayName(access_token, open_id)

        // Service role: the user id comes from the verified state row, and the
        // app's in-app browser has no Supabase session cookie.
        const { error: upsertError } = await getSupabaseAdmin()
            .from('creator_social_accounts')
            .upsert(
                {
                    user_id: pending.userId,
                    platform: 'tiktok',
                    status: 'connected',
                    open_id,
                    display_name: "User Hasn't Set a Display Name",
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

        // Case 6: DB write failed
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
