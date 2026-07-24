import { createClient } from '@/lib/supabase-server'

const baseURL = 'https://goheza.com'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(req.url)
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const errorParam = searchParams.get('error')

        if (errorParam) {
            return Response.redirect(`${baseURL}/app/onboarding/creator?social=error&provider=instagram`)
        }

        if (!code || !state) {
            return Response.json({ error: 'Missing code or state' }, { status: 400 })
        }

        const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.INSTAGRAM_CLIENT_ID!,
                client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
                grant_type: 'authorization_code',
                redirect_uri: `${baseURL}/api/instagram/callback`,
                code,
            }),
        })

        const tokenData = await tokenRes.json()

        if (!tokenRes.ok) {
            console.error('Instagram token error:', tokenData)
            return Response.redirect(`${baseURL}/app/onboarding/creator?social=error&provider=instagram`)
        }

        const { access_token: shortLivedToken, user_id: externalUserId } = tokenData

        // Exchange short-lived token for a long-lived one (60 days)
        const longLivedRes = await fetch(
            `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&access_token=${shortLivedToken}`
        )
        const longLivedData = await longLivedRes.json()

        if (!longLivedRes.ok) {
            console.error('Instagram long-lived token error:', longLivedData)
            return Response.redirect(`${baseURL}/app/onboarding/creator?social=error&provider=instagram`)
        }

        const { access_token, expires_in } = longLivedData

        const { error: upsertError } = await supabase.from('creator_social_accounts').upsert(
            {
                user_id: state,
                platform: 'instagram',
                status: 'connected',
                external_username: String(externalUserId),
                open_id: String(externalUserId),
                access_token,
                token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
            },
            {
                onConflict: 'user_id, platform',
            }
        )
        if (upsertError) {
            console.error('Database upsert error:', upsertError)
            return Response.redirect(`${baseURL}/app/onboarding/creator?social=error&provider=instagram`)
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
