import { consumeOAuthState, finishOAuth } from '@/lib/server/oauth-state'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

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
    /**
     * Try to accquire the search params for the url.
     */
    const { searchParams } = new URL(req.url)

    /**
     * ensure to get the necessary state required for the Mobile app as well
     * for Mark's implementation
     */
    const pending = await consumeOAuthState(searchParams.get('state'), 'tiktok')
    const finish = (result: 'connected' | 'cancelled' | 'failed', reason?: string) =>
        finishOAuth('tiktok', pending, result, reason)

    try {
        /**
         * extract the rest of the params form the code,
         */
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const tiktokError = searchParams.get('error')
        const tiktokErrorDescription = searchParams.get('error_description')

        /**
         * We nolonger use tiktok cookies cause its useless to
         * move session cookies across the browser and the app as well.
         */
        // const cookieStore = await cookies()
        // const returnTo = safeRedirectPath(cookieStore.get('tiktok_oauth_return_to')?.value, '/app/56738-b-323')
        // const expectedState = cookieStore.get('tiktok_test_state')?.value

        /**
         * Protect against any unlikely errors that may occure
         */
        if (tiktokError) {
            console.error('TikTok denied authorization:', { tiktokError, tiktokErrorDescription })
            return finish(tiktokError === 'access_denied' ? 'cancelled' : 'failed', tiktokError)
        }

        if (!code || !state) {
            return finish('failed', 'Missing authentication code')
        }
        if (!pending) {
            return finish('failed', 'invalid_state')
        }

        /**
         * begin the tiktok response body to the business API
         */

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
            return finish('failed', tokenData?.error ?? 'token_exchange_failed')
        }

        /**
         * Get the required data from the User.
         */
        const tokenPayload = tokenData.data ?? tokenData
        const { access_token, refresh_token, expires_in, refresh_token_expires_in, open_id, scope } = tokenPayload

        /**
         * Store the returned access tokens back to the user as required
         */

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
                },
            )

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
