import { supabaseAdmin } from '@/lib/supabase-admin'
import { getValidInstagramAccessToken } from '@/lib/instagram-token'

const IG_GRAPH_BASE = 'https://graph.instagram.com'
const IG_GRAPH_VERSION = 'v22.0'

// 'impressions' was deprecated across the whole Graph API on April 21,
// 2025, replaced by 'views' — NOT requested here. campaign_insights.
// impressions is intentionally left null for Instagram too, same as
// TikTok never populates it; this isn't a gap unique to either platform,
// it's a metric that no longer exists.
const REEL_INSIGHT_METRICS = ['views', 'reach', 'saved', 'shares', 'likes', 'comments'].join(',')

export type InstagramSyncResult = { synced: number; errors: string[] }

/**
 * Syncs Instagram Reel insights for every posted, approved submission in a
 * campaign. Deliberately a separate function from syncCampaignAnalytics
 * (TikTok) — different metric names, different token model, different
 * failure modes (e.g. the 1,000-follower minimum below), not just a
 * find-and-replace of "tiktok" with "instagram".
 */
export async function syncInstagramCampaignAnalytics(campaignId: string): Promise<InstagramSyncResult> {
    const { data: submissions, error: subsErr } = await supabaseAdmin
        .from('campaign_submissions')
        .select('id, user_id, instagram_post_id')
        .eq('campaign_id', campaignId)
        .eq('status', 'approved')
        .not('instagram_post_id', 'is', null)
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
        (creatorProfiles ?? []).map((p) => [p.user_id, p.full_name ?? 'Unknown creator'])
    )

    const errors: string[] = []
    let synced = 0

    for (const submission of submissions) {
        const creatorName = nameByUser.get(submission.user_id) ?? 'Unknown creator'

        const tokenResult = await getValidInstagramAccessToken(submission.user_id)
        if (!tokenResult.ok) {
            errors.push(
                tokenResult.reason === 'not_connected'
                    ? `${creatorName}: no connected Instagram account.`
                    : `${creatorName}: Instagram connection expired — creator needs to reconnect their account.`
            )
            continue
        }

        try {
            const url = new URL(`${IG_GRAPH_BASE}/${IG_GRAPH_VERSION}/${submission.instagram_post_id}/insights`)
            url.searchParams.set('metric', REEL_INSIGHT_METRICS)
            url.searchParams.set('access_token', tokenResult.accessToken)

            const res = await fetch(url.toString())
            const data = await res.json()

            if (!res.ok) {
                // Engagement insights require 1,000+ followers on the
                // account — surface that distinctly rather than as a
                // generic failure, since it's an account limitation, not
                // something retrying will fix.
                const message: string = data?.error?.message ?? ''
                const reason = /follower/i.test(message)
                    ? 'insights unavailable — account has fewer than 1,000 followers.'
                    : message || 'Instagram insights request failed.'
                errors.push(`${creatorName}: ${reason}`)
                continue
            }

            const metrics = new Map<string, number>(
                (data?.data ?? []).map((m: { name: string; values: { value: number }[] }) => [
                    m.name,
                    m.values?.[0]?.value ?? 0,
                ])
            )

            const { error: insightErr } = await supabaseAdmin.from('campaign_insights').upsert(
                {
                    campaign_id: campaignId,
                    media_id: submission.instagram_post_id,
                    views: metrics.get('views') ?? 0,
                    reach: metrics.get('reach') ?? 0,
                    saves: metrics.get('saved') ?? 0,
                    shares: metrics.get('shares') ?? 0,
                    likes: metrics.get('likes') ?? 0,
                    comments: metrics.get('comments') ?? 0,
                    last_updated: new Date().toISOString(),
                },
                { onConflict: 'campaign_id,media_id' }
            )
            if (insightErr) throw insightErr

            synced += 1
        } catch (err) {
            errors.push(`${creatorName}: ${err instanceof Error ? err.message : 'sync failed'}.`)
        }
    }

    return { synced, errors }
}