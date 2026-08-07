import { supabase } from '../supabase'

export async function getCreatorDetailsPagePackageAndStats(creatorUserId: string, campaignId?: string) {
    let appQuery = supabase
        .from('campaign_applications')
        .select(
            'id, campaign_id, tiktok_open_id, tiktok_username, tiktok_display_name, tiktok_avatar_url, tiktok_followers_count, tiktok_likes_count, tiktok_comments, tiktok_shares, tiktok_profile_views, tiktok_video_views, tiktok_stats_synced_at'
        )
        .eq('creator_id', creatorUserId)

    if (campaignId) {
        appQuery = appQuery.eq('campaign_id', campaignId)
    }

    const [{ data: profile }, { data: socialRows }, { data: latestApp }] = await Promise.all([
        supabase
            .from('creator_profiles')
            .select('user_id, full_name, username, bio, country, languages, content_niches, account_status')
            .eq('user_id', creatorUserId)
            .maybeSingle(),
        supabase.from('creator_social_accounts').select('platform, display_name').eq('user_id', creatorUserId),
        appQuery.order('applied_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    return {
        profile,
        socialRows,
        latestApplications: latestApp,
    }
}

// Mirrors TikTokBusinessAccountStats field-for-field. No fields here that the
// Business API can't actually supply.
export type TikTokStats = {
    open_id: string | null
    username: string | null
    display_name: string | null
    profile_image: string | null
    followers_count: number | null
    likes: number | null
    comments: number | null
    shares: number | null
    profile_views: number | null
    video_views: number | null
    synced_at: string | null
}

export async function updateCreatorApplicationStats(stats: TikTokStats, applicationId: string) {
    const { error } = await supabase
        .from('campaign_applications')
        .update({
            tiktok_open_id: stats.open_id,
            tiktok_username: stats.username,
            tiktok_display_name: stats.display_name,
            tiktok_avatar_url: stats.profile_image,

            tiktok_followers_count: stats.followers_count,
            tiktok_likes_count: stats.likes,
            tiktok_comments: stats.comments,
            tiktok_shares: stats.shares,
            tiktok_profile_views: stats.profile_views,
            tiktok_video_views: stats.video_views,

            tiktok_stats_synced_at: new Date().toISOString(),
        })
        .eq('id', applicationId)

    if (error) throw error
}

/**
 * Single source of truth for "hit the TikTok insights endpoint, normalize the
 * response, persist it." Shape here matches TikTokBusinessAccountStats
 * exactly — no field is invented or renamed beyond what the API returns.
 */
export async function refreshTikTokStats(creatorUserId: string, applicationId?: string): Promise<TikTokStats> {
    const { data: creatorProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', creatorUserId)
        .maybeSingle()
    if (!creatorProfile) throw new Error('Creator profile not found.')

    const {
        data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('Not signed in.')

    const res = await fetch('/api/tiktok/insights/creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ creatorProfileId: creatorProfile.id }),
    })
    const json = await res.json()

    if (!res.ok) throw new Error(json.error || 'Failed to refresh stats.');

    console.log(res)

    const stats: TikTokStats = {
        open_id: json.tiktok?.open_id ?? null,
        username: json.tiktok?.username ?? null,
        display_name: json.tiktok?.display_name ?? null,
        profile_image: json.tiktok?.profile_image ?? null,

        followers_count: json.tiktok?.followers_count ?? null,
        likes: json.tiktok?.likes ?? null,
        comments: json.tiktok?.comments ?? null,
        shares: json.tiktok?.shares ?? null,
        profile_views: json.tiktok?.profile_views ?? null,
        video_views: json.tiktok?.video_views ?? null,

        synced_at: new Date().toISOString(),
    }

    if (applicationId) {
        await updateCreatorApplicationStats(stats, applicationId)
    }

    return stats
}
