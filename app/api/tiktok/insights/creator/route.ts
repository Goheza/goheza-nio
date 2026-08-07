import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        const authHeader = req.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'No token provided' }, { status: 401 })
        }

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
        }

        const body = await req.json()
        const { creatorProfileId } = body

        if (!creatorProfileId) {
            return NextResponse.json({ error: 'Missing creatorProfileId' }, { status: 400 })
        }

        const { data: creator, error: creatorError } = await supabase
            .from('creator_profiles')
            .select('id, user_id, display_name, username')
            .eq('id', creatorProfileId)
            .single()

        if (creatorError || !creator) {
            return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 })
        }

        // Authorization: either the creator viewing their own stats, or a
        // brand that owns a campaign this creator has actually applied to.
        // Prevents any authenticated user from pulling any creator's TikTok
        // numbers by guessing/enumerating creatorProfileId.
        const isSelf = creator.user_id === user.id
        let isAuthorizedBrand = false

        if (!isSelf) {
            const { data: relationship } = await supabase
                .from('campaign_applications')
                .select('id, campaigns!inner(created_by)')
                .eq('creator_id', creator.user_id)
                .eq('campaigns.created_by', user.id)
                .limit(1)
                .maybeSingle()
            isAuthorizedBrand = !!relationship
        }

        if (!isSelf && !isAuthorizedBrand) {
            return NextResponse.json({ error: "Not authorized to view this creator's stats." }, { status: 403 })
        }

        // 2. Get connected TikTok account
        const { data: socialAccount, error: socialError } = await supabase
            .from('creator_social_accounts')
            .select(
                `
                access_token,
                refresh_token,
                token_expires_at,
                open_id
            `
            )
            .eq('user_id', creator.user_id)
            .eq('platform', 'tiktok')
            .single()

        if (socialError || !socialAccount) {
            return NextResponse.json({ error: 'TikTok account not connected' }, { status: 400 })
        }

        let accessToken = socialAccount.access_token

        // 3. Refresh token if expired
        if (socialAccount.token_expires_at && new Date(socialAccount.token_expires_at) <= new Date()) {
            if (!socialAccount.refresh_token) {
                return NextResponse.json(
                    { error: 'TikTok credentials expired and cannot be refreshed. Creator needs to reconnect.' },
                    { status: 422 }
                )
            }
            const refreshRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_key: process.env.TIKTOK_CLIENT_KEY!,
                    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                    grant_type: 'refresh_token',
                    refresh_token: socialAccount.refresh_token!,
                }),
            })

            const refreshData = await refreshRes.json()

            if (!refreshRes.ok) {
                return NextResponse.json(
                    {
                        error: 'TikTok token refresh failed',
                    },
                    { status: 400 }
                )
            }

            accessToken = refreshData.access_token

            await supabase
                .from('creator_social_accounts')
                .update({
                    access_token: refreshData.access_token,
                    refresh_token: refreshData.refresh_token,
                    token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
                })
                .eq('user_id', creator.user_id)
                .eq('platform', 'tiktok')
        }

        // 4. Fetch creator stats from TikTok

        // 4. Fetch creator stats from TikTok
        const fields = [
            'open_id',
            'union_id',
            'avatar_url',
            'avatar_url_100',
            'avatar_large_url',
            'display_name',
            'bio_description',
            'profile_deep_link',
            'is_verified',
            'username',
            'follower_count',
            'following_count',
            'likes_count',
            'video_count',
        ].join(',')

        const tiktokRes = await fetch(
            `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                // no body needed — fields go in the query string per TikTok v2 spec
            }
        )

        // const tiktokData = await tiktokRes.json()

        const rawText = await tiktokRes.text()
        let tiktokData: any
        try {
            tiktokData = JSON.parse(rawText)
        } catch {
            console.error('TikTok returned non-JSON response:', rawText)
            return NextResponse.json({ error: 'Failed fetching TikTok insights' }, { status: 502 })
        }

        return NextResponse.json({
            creator: { id: creator.id, username: creator.username },
            tiktok: tiktokData.data?.user
                ? {
                      open_id: tiktokData.data.user.open_id,
                      union_id: tiktokData.data.user.union_id,
                      avatar_url: tiktokData.data.user.avatar_url,
                      avatar_url_100: tiktokData.data.user.avatar_url_100,
                      avatar_large_url: tiktokData.data.user.avatar_large_url,
                      display_name: tiktokData.data.user.display_name,
                      bio_description: tiktokData.data.user.bio_description,
                      profile_deep_link: tiktokData.data.user.profile_deep_link,
                      is_verified: tiktokData.data.user.is_verified,
                      username: tiktokData.data.user.username,
                      follower_count: tiktokData.data.user.follower_count,
                      following_count: tiktokData.data.user.following_count,
                      likes_count: tiktokData.data.user.likes_count,
                      video_count: tiktokData.data.user.video_count,
                  }
                : null,
        })
    } catch (error) {
        console.error('Creator TikTok insights error:', error)

        return NextResponse.json(
            {
                error: 'Server error',
            },
            {
                status: 500,
            }
        )
    }
}
