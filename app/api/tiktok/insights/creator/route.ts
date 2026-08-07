
// /api/tiktok/insights/creator
import { NextResponse } from 'next/server'
import { ensureFreshAccessToken, fetchTikTokBusinessAccountStats, TikTokError } from '@/lib/server/tiktok'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

export async function POST(req: Request) {
    try {
        const supabase = getSupabaseAdmin()

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

        const { data: socialAccount, error: socialError } = await supabase
            .from('creator_social_accounts')
            .select('access_token, refresh_token, token_expires_at, open_id, business_id')
            .eq('user_id', creator.user_id)
            .eq('platform', 'tiktok')
            .single()

        if (socialError || !socialAccount) {
            return NextResponse.json({ error: 'TikTok account not connected' }, { status: 400 })
        }

        try {
            const { accessToken, refreshed } = await ensureFreshAccessToken(socialAccount)

            if (refreshed) {
                await supabase
                    .from('creator_social_accounts')
                    .update({
                        access_token: refreshed.access_token,
                        refresh_token: refreshed.refresh_token,
                        token_expires_at: refreshed.expires_at,
                    })
                    .eq('user_id', creator.user_id)
                    .eq('platform', 'tiktok')
            }

            const businessId = socialAccount.business_id || socialAccount.open_id
            const stats = await fetchTikTokBusinessAccountStats(accessToken, businessId)

            if (!stats) {
                return NextResponse.json({ error: 'Failed fetching TikTok insights' }, { status: 400 })
            }

            return NextResponse.json({
                creator: { id: creator.id, username: creator.display_name },
                tiktok: stats,
            })
        } catch (err) {
            const message = err instanceof TikTokError ? err.message : 'Failed to fetch TikTok insights.'
            return NextResponse.json({ error: message }, { status: 400 })
        }
    } catch (error) {
        console.error('Creator TikTok insights error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}