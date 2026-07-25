import { supabase } from '@/lib/supabase'

export type RefreshAnalyticsResult = {
    updated: number
    totalViews?: number
    errors: string[]
}

export async function refreshCampaignAnalytics(campaignId: string): Promise<RefreshAnalyticsResult> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('You must be signed in to refresh analytics.')

    const res = await fetch(`/api/brand/campaigns/${campaignId}/refresh-analytics`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to refresh analytics.')
    return json as RefreshAnalyticsResult
}

export type CampaignVideoRow = {
    id: string
    creatorName: string
    tiktokUrl: string | null
    videoUrl: string | null
    postedAt: string | null
    analyticsSyncedAt: string | null
    views: number
    likes: number
    comments: number
    shares: number
    engagementRate: number
    earnings: number
    effectiveCpm: number
}

/**
 * Real per-video breakdown for a campaign, sourced the way the actual
 * data flows: campaign_posts (what was posted to TikTok, per creator)
 * joined against campaign_insights (the synced analytics for that post,
 * keyed by campaign_id + media_id). campaign_submissions is NOT queried
 * here — it has no likes/comments/shares/sync-timestamp columns; that
 * data only exists on campaign_insights per the schema.
 */
export async function getCampaignVideoAnalytics(campaignId: string): Promise<CampaignVideoRow[]> {
    const [{ data: campaign }, { data: posts, error: postsError }, { data: insights, error: insightsError }] =
        await Promise.all([
            supabase.from('campaigns').select('cost_per_1k_views, max_pay').eq('id', campaignId).maybeSingle(),
            supabase
                .from('campaign_posts')
                .select(
                    `id, media_id, permalink, video_url, posted_at, user_id,
                     creator_profiles!campaign_posts_creator_fkey ( display_name, full_name )`
                )
                .eq('campaign_id', campaignId)
                .eq('status', 'PUBLISHED'),
            supabase.from('campaign_insights').select('*').eq('campaign_id', campaignId),
        ])

    if (postsError) throw postsError
    if (insightsError) throw insightsError

    const insightsByMedia = new Map((insights ?? []).map((i) => [i.media_id, i]))
    const rewardPerK = campaign?.cost_per_1k_views ?? 0
    const maxPerCreator = campaign?.max_pay ? Number(campaign.max_pay) : Infinity

    return (posts ?? []).map((p: any) => {
        const insight = insightsByMedia.get(p.media_id)
        const views = insight?.views ?? 0
        const likes = insight?.likes ?? 0
        const comments = insight?.comments ?? 0
        const shares = insight?.shares ?? 0
        const rawEarnings = (views / 1000) * rewardPerK
        const earnings = Math.min(rawEarnings, maxPerCreator)
        const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0
        const effectiveCpm = views > 0 ? (earnings / views) * 1000 : 0

        return {
            id: p.id,
            creatorName: p.creator_profiles?.display_name || p.creator_profiles?.full_name || 'Creator',
            tiktokUrl: p.permalink,
            videoUrl: p.video_url,
            postedAt: p.posted_at,
            analyticsSyncedAt: insight?.last_updated ?? null,
            views,
            likes,
            comments,
            shares,
            engagementRate,
            earnings,
            effectiveCpm,
        }
    })
}