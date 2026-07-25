import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { ensureFreshAccessToken, TikTokPublishError } from '@/lib/server/tiktok'

const TIKTOK_BATCH_SIZE = 20
const BATCH_DELAY_MS = 500

async function fetchVideoStats(accessToken: string, videoIds: string[]) {
    const res = await fetch('https://open.tiktokapis.com/v2/video/query/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filters: { video_ids: videoIds },
            fields: ['id', 'like_count', 'comment_count', 'share_count', 'view_count'],
        }),
    })
    const json = await res.json()
    if (!res.ok || json.error?.code !== 'ok') {
        throw new TikTokPublishError('Failed to fetch TikTok video stats.', json)
    }
    return (json.data?.videos ?? []) as Array<{
        id: string
        like_count: number
        comment_count: number
        share_count: number
        view_count: number
    }>
}

export type RefreshResult = { updated: number; errors: string[] }

/**
 * Refreshes analytics for every published TikTok post across the given
 * campaign ids, in one pass. Posts are grouped by creator first (not by
 * campaign) so each creator's access token is refreshed at most once and
 * their videos are batched together regardless of which campaign they
 * belong to — this is what makes a multi-campaign refresh (e.g. "refresh
 * all campaigns for a brand") meaningfully cheaper and safer than calling
 * the single-campaign refresh N times in a row.
 */
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
            .select('access_token, refresh_token, token_expires_at')
            .eq('user_id', creatorUserId)
            .eq('platform', 'tiktok')
            .maybeSingle()

        if (!social?.access_token) {
            errors.push(`Creator ${creatorUserId}: TikTok not connected, skipped.`)
            continue
        }

        try {
            const { accessToken, refreshed } = await ensureFreshAccessToken({
                access_token: social.access_token,
                refresh_token: social.refresh_token,
                open_id: null,
                token_expires_at: social.token_expires_at,
            })

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

            for (let i = 0; i < creatorPosts.length; i += TIKTOK_BATCH_SIZE) {
                const chunk = creatorPosts.slice(i, i + TIKTOK_BATCH_SIZE)
                const stats = await fetchVideoStats(
                    accessToken,
                    chunk.map((p) => p.media_id)
                )
                // media_id alone isn't enough to know which campaign a stat
                // belongs to when refreshing across multiple campaigns at
                // once — look it up from the chunk we just requested.
                const campaignByMediaId = new Map(chunk.map((p) => [p.media_id, p.campaign_id]))

                for (const stat of stats) {
                    const campaignId = campaignByMediaId.get(stat.id)
                    if (!campaignId) continue

                    const { error: upsertErr } = await supabaseAdmin.from('campaign_insights').upsert(
                        {
                            campaign_id: campaignId,
                            media_id: stat.id,
                            likes: stat.like_count ?? 0,
                            comments: stat.comment_count ?? 0,
                            shares: stat.share_count ?? 0,
                            views: stat.view_count ?? 0,
                            last_updated: new Date().toISOString(),
                        },
                        { onConflict: 'campaign_id, media_id' }
                    )
                    if (upsertErr) {
                        errors.push(`media_id ${stat.id}: ${upsertErr.message}`)
                    } else {
                        updated++
                        await supabaseAdmin.from('campaign_insights_history').insert({
                            campaign_id: campaignId,
                            media_id: stat.id,
                            likes: stat.like_count ?? 0,
                            comments: stat.comment_count ?? 0,
                            shares: stat.share_count ?? 0,
                            views: stat.view_count ?? 0,
                        })
                        // Not awaited-and-checked strictly — a failed history insert shouldn't
                        // block the primary insights update from counting as a success.
                    }
                }

                if (i + TIKTOK_BATCH_SIZE < creatorPosts.length) {
                    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS))
                }
            }
        } catch (err) {
            const message = err instanceof TikTokPublishError ? err.message : "Failed to refresh this creator's stats."
            errors.push(`Creator ${creatorUserId}: ${message}`)
        }
    }

    return { updated, errors }
}
