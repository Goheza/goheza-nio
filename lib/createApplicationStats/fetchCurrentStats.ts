import { supabase } from '../supabase'

/**
 * Used to fetch creator Stats and other things required
 * @param creatorUserId
 * @param campaignId - optional: scope to a specific campaign's application row
 * @returns
 */

export async function getCreatorDetailsPagePackageAndStats(creatorUserId: string, campaignId?: string) {
    let appQuery = supabase
        .from('campaign_applications')
        .select(
            'id, campaign_id, tiktok_open_id, tiktok_username, tiktok_display_name, tiktok_avatar_url, tiktok_bio_description, tiktok_follower_count, tiktok_following_count, tiktok_likes_count, tiktok_video_count, tiktok_is_verified, tiktok_account_type, tiktok_stats_synced_at'
        )
        .eq('creator_id', creatorUserId)

    // Scope to the campaign we arrived from, when we know it, so refreshes
    // land on the same application row the Applications Hub is reading from.
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
        // NOTE: removed .not('tiktok_stats_synced_at', 'is', null) — that filter
        // meant a creator who had never been synced returned latestApp = null,
        // which left currentApplicationId empty on the detail page and silently
        // skipped every subsequent DB write. We want the most recent application
        // row regardless of sync status, so there's always a valid id to write to.
        appQuery.order('applied_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    return {
        profile,
        socialRows,
        latestApplications: latestApp,
    }
}

export type TikTokStats = {
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
    console.log('WillUpdateApplicationStats')
    const { error } = await supabase
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

    console.log('DidUpdateApplicationStats',applicationId)


    if (error) throw error
}

/**
 * Single source of truth for "hit the TikTok insights endpoint, normalize the
 * response, persist it." Both the Applications Hub list and the creator
 * detail page should call this instead of maintaining their own partial
 * update payloads — previously the list page only wrote follower/likes/video
 * counts + synced_at, so avatar/display name/bio/following/verified drifted
 * out of sync depending on which "Refresh" button was clicked last.
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

    console.log("Refreshed-Stats",json)
    if (!res.ok) throw new Error(json.error || 'Failed to refresh stats.')

    const stats: TikTokStats = {
        open_id: json.tiktok?.open_id ?? null,
        username: json.creator?.username ?? json.tiktok?.username ?? null,
        display_name: json.tiktok?.display_name ?? null,
        avatar_url: json.tiktok?.raw?.profile_image ?? null,
        bio_description: json.tiktok?.bio_description ?? null,

        follower_count: json.tiktok?.follower_count ?? null,
        following_count: json.tiktok?.following_count ?? null,
        likes_count: json.tiktok?.likes_count ?? null,
        video_count: json.tiktok?.video_count ?? null,

        is_verified: json.tiktok?.is_verified ?? null,
        account_type: json.tiktok?.account_type ?? null,

        synced_at: new Date().toISOString(),
    }

    console.log("DidRefreshStatsWithNewData",stats)

    if (applicationId) {
        console.log("WillUpdatetheApplicationStas witAppID",applicationId)
        await updateCreatorApplicationStats(stats, applicationId)
    }

    return stats
}
