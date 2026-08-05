import { supabase } from '../supabase'

/**
 * Used to fetch creator Stats and other things required
 * @param creatorUserId
 * @returns
 */

export async function getCreatorDetailsPagePackageAndStats(creatorUserId: string) {
    const [{ data: profile }, { data: socialRows }, { data: latestApp }] = await Promise.all([
        supabase
            .from('creator_profiles')
            .select('user_id, full_name, username, bio, country, languages, content_niches, account_status')
            .eq('user_id', creatorUserId)
            .maybeSingle(),
        supabase.from('creator_social_accounts').select('platform, display_name').eq('user_id', creatorUserId),
        supabase
            .from('campaign_applications')
            .select(
                'id, tiktok_open_id, tiktok_username, tiktok_display_name, tiktok_avatar_url, tiktok_bio_description, tiktok_follower_count, tiktok_following_count, tiktok_likes_count, tiktok_video_count, tiktok_is_verified, tiktok_account_type, tiktok_stats_synced_at'
            )
            .eq('creator_id', creatorUserId)
            .not('tiktok_stats_synced_at', 'is', null)
            .order('tiktok_stats_synced_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
    ])
    return {
        profile,
        socialRows,
        latestApplications: latestApp,
    }
}

type TikTokStats = {
    open_id: string | null
    username: string | null
    display_name: string | null
    avatar_url: string | null
    bio_description: string | null

    follower_count: number | null
    following_count: number | null
    likes_count: number | null
    video_count: number | null

    is_verified: boolean | null
    account_type: string | null

    synced_at: string | null
}

export async function updateCreatorApplicationStats(stats: TikTokStats, applicationId: string) {
    await supabase
        .from('campaign_applications')
        .update({
            tiktok_open_id: stats.open_id,

            tiktok_username: stats.username,
            tiktok_display_name: stats.display_name,
            tiktok_avatar_url: stats.avatar_url,
            tiktok_bio_description: stats.bio_description,

            tiktok_follower_count: stats.follower_count,
            tiktok_following_count: stats.following_count,
            tiktok_likes_count: stats.likes_count,
            tiktok_video_count: stats.video_count,

            tiktok_is_verified: stats.is_verified,
            tiktok_account_type: stats.account_type,

            tiktok_stats_synced_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
}
