import { supabaseAdmin } from '@/lib/supabase-admin'
import { getValidTikTokAccessToken } from '@/lib/tiktok-token'

const TIKTOK_VIDEO_QUERY_URL = 'https://open.tiktokapis.com/v2/video/query/'

const VIDEO_FIELDS = ['id', 'share_url', 'like_count', 'comment_count', 'share_count', 'view_count'].join(',')

/**
 * Pulls the numeric video id out of a TikTok share URL, e.g.
 * https://www.tiktok.com/@user/video/7521234567890123456?is_from_webapp=1
 * -> "7521234567890123456"
 *
 * Preferred over trusting a stored tiktok_post_id: that column was written
 * from publicaly_available_post_id, a 19-digit number that can get silently
 * rounded by JSON.parse if it ever passes through un-patched parsing. A URL
 * is just a copied string — it was never at risk of that corruption — so
 * it's the more durable source of truth for the actual video id.
 */
function extractVideoIdFromUrl(url: string | null): string | null {
    if (!url) return null
    try {
        const parsed = new URL(url)
        const parts = parsed.pathname.split('/').filter(Boolean)
        const videoIdx = parts.indexOf('video')
        if (videoIdx !== -1 && /^\d+$/.test(parts[videoIdx + 1] ?? '')) {
            return parts[videoIdx + 1]
        }
        // Fallback: last long numeric path segment, in case TikTok's URL
        // shape ever changes and "video" isn't the literal segment name.
        for (let i = parts.length - 1; i >= 0; i--) {
            if (/^\d{5,}$/.test(parts[i])) return parts[i]
        }
        return null
    } catch {
        return null
    }
}

export type SyncResult = {
    synced: number
    errors: string[]
}

/**
 * Does the actual TikTok sync work for every approved, identifiable
 * submission in a campaign: resolves a fresh access token per creator,
 * derives the real video id (URL-first, see extractVideoIdFromUrl), calls
 * TikTok's Video Query API, and writes results into campaign_insights (plus
 * a compatibility write onto campaign_submissions).
 *
 * Deliberately has NO authorization logic — callers (brand route: ownership
 * check, admin route: admin-role check) verify the caller is allowed to
 * refresh this campaign *before* calling this. Keeping auth out of here
 * means the sync logic — which has already needed real bug fixes twice —
 * only exists in one place for both surfaces to share.
 */
export async function syncCampaignAnalytics(campaignId: string): Promise<SyncResult> {
    // Eligible if we have SOME way to identify the video on TikTok —
    // either the URL (preferred, see extractVideoIdFromUrl) or the
    // stored tiktok_post_id as a fallback.
    const { data: submissions, error: subsErr } = await supabaseAdmin
        .from('campaign_submissions')
        .select('id, user_id, tiktok_post_id, tiktok_url')
        .eq('campaign_id', campaignId)
        .eq('status', 'approved')
        .or('tiktok_url.not.is.null,tiktok_post_id.not.is.null')
    if (subsErr) throw subsErr

    if (!submissions || submissions.length === 0) {
        return { synced: 0, errors: [] }
    }

    const userIds = [...new Set(submissions.map((s) => s.user_id))]

    const { data: creatorProfiles, error: profilesErr } = await supabaseAdmin
        .from('creator_profiles')
        .select('user_id, display_name, full_name')
        .in('user_id', userIds)
    if (profilesErr) throw profilesErr

    const nameByUser = new Map(
        (creatorProfiles ?? []).map((p) => [p.user_id, p.display_name ?? p.full_name ?? 'Unknown creator'])
    )

    const errors: string[] = []
    let synced = 0

    for (const submission of submissions) {
        const creatorName = nameByUser.get(submission.user_id) ?? 'Unknown creator'

        const tokenResult = await getValidTikTokAccessToken(submission.user_id)
        if (!tokenResult.ok) {
            errors.push(
                tokenResult.reason === 'not_connected'
                    ? `${creatorName}: no connected TikTok account.`
                    : `${creatorName}: TikTok connection expired — creator needs to reconnect their account.`
            )
            continue
        }
        const accessToken = tokenResult.accessToken

        const videoId = extractVideoIdFromUrl(submission.tiktok_url) ?? submission.tiktok_post_id
        if (!videoId) {
            errors.push(`${creatorName}: couldn't determine a TikTok video id from the stored link.`)
            continue
        }

        try {
            const url = new URL(TIKTOK_VIDEO_QUERY_URL)
            url.searchParams.set('fields', VIDEO_FIELDS)

            const tiktokRes = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filters: { video_ids: [videoId] } }),
            })
            const tiktokData = await tiktokRes.json()

            if (!tiktokRes.ok || (tiktokData.error?.code && tiktokData.error.code !== 'ok')) {
                const reason = tiktokData.error?.message || tiktokData.error?.code || `HTTP ${tiktokRes.status}`
                errors.push(`${creatorName}: TikTok analytics request failed (${reason}).`)
                continue
            }

            const video = tiktokData.data?.videos?.[0]
            if (!video) {
                errors.push(`${creatorName}: video not found on TikTok.`)
                continue
            }

            const views = video.view_count ?? 0
            const likes = video.like_count ?? 0
            const comments = video.comment_count ?? 0
            const shares = video.share_count ?? 0

            // Source of truth for the analytics page. reach/impressions/saves/
            // avg_watch_time/completion_rate are left null — TikTok's Content
            // Posting API doesn't return them (that needs the Business/Ads
            // API tier), and this table's shape is shared with whatever
            // platform gets added next (e.g. Instagram), not TikTok-only.
            const { error: insightErr } = await supabaseAdmin.from('campaign_insights').upsert(
                {
                    campaign_id: campaignId,
                    media_id: videoId,
                    likes,
                    comments,
                    views,
                    shares,
                    last_updated: new Date().toISOString(),
                },
                { onConflict: 'campaign_id,media_id' }
            )
            if (insightErr) throw insightErr

            // Kept in sync purely so unrelated existing code (the campaign
            // picker's totals/budgetUsed, which reads campaign_submissions.views)
            // doesn't go stale. campaign_insights is the source of truth for
            // the analytics page; this is a compatibility write, not a second
            // source of truth. tiktok_post_id is also self-healed here to the
            // correct, URL-derived id — repairs any row that got corrupted by
            // the earlier big-integer JSON.parse precision bug.
            const { error: updateErr } = await supabaseAdmin
                .from('campaign_submissions')
                .update({
                    views,
                    tiktok_url: video.share_url ?? undefined,
                    tiktok_post_id: videoId,
                })
                .eq('id', submission.id)
            if (updateErr) throw updateErr

            synced += 1
        } catch (err) {
            errors.push(`${creatorName}: ${err instanceof Error ? err.message : 'sync failed'}.`)
        }
    }

    return { synced, errors }
}
