import { supabase } from '../supabase'

export async function getCreatorDetailsPagePackageAndStats(creatorUserId: string, campaignId?: string) {
    let appQuery = supabase
        .from('campaign_applications')
        .select(
            'id, campaign_id, tiktok_open_id, tiktok_username, tiktok_display_name, tiktok_profile_deep_link, tiktok_bio_description, tiktok_is_verified, tiktok_is_business_account, tiktok_following_count, tiktok_total_likes, tiktok_videos_count, tiktok_unique_video_views, tiktok_followers_count, tiktok_stats_synced_at'
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

// Mirrors TikTokBusinessAccountStats field-for-field.
export type TikTokStats = {
    open_id: string | null
    username: string | null
    display_name: string | null
    profile_deep_link: string | null
    is_business_account: boolean | null
    is_verified: boolean | null
    bio_description: string | null
    following_count: number | null
    total_likes: number | null
    videos_count: number | null
    unique_video_views: number | null
    followers_count: number | null
    synced_at: string | null
}

export async function updateCreatorApplicationStats(stats: TikTokStats, applicationId: string) {
    const { error } = await supabase
        .from('campaign_applications')
        .update({
            tiktok_open_id: stats.open_id,
            tiktok_username: stats.username,
            tiktok_display_name: stats.display_name,
            tiktok_profile_deep_link: stats.profile_deep_link,

            tiktok_is_business_account: stats.is_business_account,
            tiktok_is_verified: stats.is_verified,
            tiktok_bio_description: stats.bio_description,
            tiktok_following_count: stats.following_count,
            tiktok_total_likes: stats.total_likes,
            tiktok_videos_count: stats.videos_count,
            tiktok_unique_video_views: stats.unique_video_views,
            tiktok_followers_count: stats.followers_count,

            tiktok_stats_synced_at: new Date().toISOString(),
        })
        .eq('id', applicationId)

    if (error) throw error
}

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

    if (!res.ok) throw new Error(json.error || 'Failed to refresh stats.')

    const stats: TikTokStats = {
        open_id: json.tiktok?.open_id ?? null,
        username: json.tiktok?.username ?? null,
        display_name: json.tiktok?.display_name ?? null,
        profile_deep_link: json.tiktok?.profile_deep_link ?? null,

        is_business_account: json.tiktok?.is_business_account ?? null,
        is_verified: json.tiktok?.is_verified ?? null,
        bio_description: json.tiktok?.bio_description ?? null,
        following_count: json.tiktok?.following_count ?? null,
        total_likes: json.tiktok?.likes_count ?? null,
        videos_count: json.tiktok?.videos_count ?? null,
        unique_video_views: json.tiktok?.unique_video_views ?? null,
        followers_count: json.tiktok?.follower_count ?? null,

        synced_at: new Date().toISOString(),
    }

    if (applicationId) {
        await updateCreatorApplicationStats(stats, applicationId)
    }

    return stats
}
