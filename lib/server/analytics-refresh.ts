import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { ensureFreshAccessToken, tiktokFetch, TikTokError, VIDEO_FIELDS } from '@/lib/server/tiktok'

const TIKTOK_BATCH_SIZE = 20
const BATCH_DELAY_MS = 500

type TikTokVideoStat = {
    item_id: string
    video_views: number
    likes: number
    comments: number
    shares: number
    reach: number
    average_time_watched: number
    full_video_watched_rate: number
}

/**
 * Business API's video/list doesn't take a video_ids filter the way the
 * old Content Posting API's video/query did — it lists videos for the
 * business account, paginated via cursor. We fetch the account's videos
 * and filter client-side to just the media_ids we care about, since
 * that's the only shape Business API actually supports for this.
 */
async function fetchVideoStatsForAccount(
    accessToken: string,
    businessId: string,
    wantedMediaIds: Set<string>
): Promise<TikTokVideoStat[]> {
    const found: TikTokVideoStat[] = []
    let cursor: string | undefined
    let hasMore = true

    // Cap iterations defensively so a runaway account (or an API bug)
    // can't loop forever inside a single refresh request.
    let safetyCounter = 0

    while (hasMore && found.length < wantedMediaIds.size && safetyCounter < 25) {
        safetyCounter++
        const data = await tiktokFetch<{
            videos: TikTokVideoStat[]
            cursor?: string
            has_more?: boolean
        }>('/business/video/list/', accessToken, {
            params: {
                business_id: businessId,
                fields: `[${VIDEO_FIELDS.split(',')
                    .map((f) => `"${f}"`)
                    .join(',')}]`,
                max_count: 20,
                cursor,
            },
        })

        for (const v of data.videos ?? []) {
            if (wantedMediaIds.has(v.item_id)) found.push(v)
        }

        cursor = data.cursor
        hasMore = !!data.has_more && !!cursor
    }

    return found
}

export type RefreshResult = { updated: number; errors: string[] }

export async function refreshAnalyticsForCampaigns(campaignIds: string[]): Promise<RefreshResult> {
    const supabaseAdmin = getSupabaseAdmin()
    const errors: string[] = []
    let updated = 0

    if (campaignIds.length === 0) return { updated: 0, errors: [] }

    const { data: posts, error: postsErr } = await supabaseAdmin
        .from('campaign_posts')
        .select('id, campaign_id, media_id, user_id')
        .in('campaign_id', campaignIds)
        .eq('platform', 'tiktok')
        .eq('status', 'PUBLISHED')

    if (postsErr) throw postsErr
    if (!posts || posts.length === 0) return { updated: 0, errors: [] }

    const postsByCreator = new Map<string, typeof posts>()
    for (const p of posts) {
        if (!postsByCreator.has(p.user_id)) postsByCreator.set(p.user_id, [])
        postsByCreator.get(p.user_id)!.push(p)
    }

    for (const [creatorUserId, creatorPosts] of postsByCreator) {
        const { data: social } = await supabaseAdmin
            .from('creator_social_accounts')
            .select('open_id, business_id, access_token, refresh_token, token_expires_at')
            .eq('user_id', creatorUserId)
            .eq('platform', 'tiktok')
            .maybeSingle()

        if (!social?.access_token) {
            errors.push(`Creator ${creatorUserId}: TikTok not connected, skipped.`)
            continue
        }

        try {
            const { accessToken, refreshed } = await ensureFreshAccessToken(social)
            if (refreshed) {
                await supabaseAdmin
                    .from('creator_social_accounts')
                    .update({
                        access_token: refreshed.access_token,
                        refresh_token: refreshed.refresh_token,
                        token_expires_at: refreshed.expires_at,
                    })
                    .eq('user_id', creatorUserId)
                    .eq('platform', 'tiktok')
            }

            const businessId = social.business_id || social.open_id
            const wantedMediaIds = new Set(creatorPosts.map((p) => p.media_id))
            const campaignByMediaId = new Map(creatorPosts.map((p) => [p.media_id, p.campaign_id]))

            const stats = await fetchVideoStatsForAccount(accessToken, businessId, wantedMediaIds)

            for (const stat of stats) {
                const campaignId = campaignByMediaId.get(stat.item_id)
                if (!campaignId) continue

                const { error: upsertErr } = await supabaseAdmin.from('campaign_insights').upsert(
                    {
                        campaign_id: campaignId,
                        media_id: stat.item_id,
                        likes: stat.likes ?? 0,
                        comments: stat.comments ?? 0,
                        shares: stat.shares ?? 0,
                        views: stat.video_views ?? 0,
                        reach: stat.reach ?? 0,
                        avg_watch_time: stat.average_time_watched ?? null,
                        completion_rate: stat.full_video_watched_rate ?? null,
                        last_updated: new Date().toISOString(),
                    },
                    { onConflict: 'campaign_id, media_id' }
                )
                if (upsertErr) {
                    errors.push(`media_id ${stat.item_id}: ${upsertErr.message}`)
                } else {
                    updated++
                    await supabaseAdmin.from('campaign_insights_history').insert({
                        campaign_id: campaignId,
                        media_id: stat.item_id,
                        likes: stat.likes ?? 0,
                        comments: stat.comments ?? 0,
                        shares: stat.shares ?? 0,
                        views: stat.video_views ?? 0,
                    })
                }
            }

            await new Promise((r) => setTimeout(r, BATCH_DELAY_MS))
        } catch (err) {
            const message = err instanceof TikTokError ? err.message : "Failed to refresh this creator's stats."
            errors.push(`Creator ${creatorUserId}: ${message}`)
        }
    }

    return { updated, errors }
}