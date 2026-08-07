import { createClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

const baseURL = 'https://goheza.com'

function safeRedirectPath(path: string | undefined | null, fallback: string): string {
    if (!path || !path.startsWith('/') || path.startsWith('//')) {
        return fallback
    }
    return path
}

export async function GET(req: Request) {
    try {
        const supabase = await createClient()

        const { searchParams } = new URL(req.url)
        // Business API redirects with `auth_code`, not `code`
        const authCode = searchParams.get('auth_code')
        const state = searchParams.get('state')

        if (!authCode || !state) {
            return Response.json({ error: 'Missing auth_code or state' }, { status: 400 })
        }

        const cookieStore = await cookies()
        const returnTo = safeRedirectPath(cookieStore.get('tiktok_oauth_return_to')?.value, '/app/creator/campaigns')

        const tokenRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                app_id: process.env.TIKTOK_BUSINESS_APP_ID!,
                secret: process.env.TIKTOK_BUSINESS_APP_SECRET!,
                auth_code: authCode,
            }),
        })

        const tokenJson = await tokenRes.json()

        // Business API wraps results in { code, message, data }, code 0 = success —
        // it does NOT use HTTP status codes the way v2 did, so check tokenJson.code too.
        if (!tokenRes.ok || tokenJson.code !== 0) {
            console.error('TikTok Business token error:', tokenJson)

            const url = new URL(returnTo, baseURL)
            url.searchParams.set('provider', 'tiktok')
            url.searchParams.set('social', 'error')

            return Response.redirect(url.toString())
        }

        const { access_token, advertiser_ids, scope, refresh_token } = tokenJson.data

        // No open_id / display_name here — Business API auth doesn't return an individual
        // creator profile, it returns which advertiser accounts this token can manage.
        // fetchTikTokDisplayName (built for the v2 user-info endpoint) has nothing to call here.
        const { error: upsertError } = await supabase.from('creator_social_accounts').upsert(
            {
                user_id: state,
                platform: 'tiktok',
                status: 'connected',
                advertiser_ids: advertiser_ids ?? [],
                access_token,
                refresh_token: refresh_token ?? null,
                token_status: 'active',
                last_token_refresh_at: null,
                scopes: Array.isArray(scope) ? scope.map(String) : [],
            },
            {
                onConflict: 'user_id, platform',
            }
        )

        if (upsertError) {
            console.error('Database upsert error:', upsertError)

            const url = new URL(returnTo, baseURL)
            url.searchParams.set('provider', 'tiktok')
            url.searchParams.set('social', 'error')

            return Response.redirect(url.toString())
        }

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