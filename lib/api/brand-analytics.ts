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
    videoUrl: string
    submittedAt: string
    analyticsSyncedAt: string | null
    views: number
    likes: number
    comments: number
    shares: number
    engagementRate: number // (likes+comments+shares)/views*100 — real, not fabricated
    earnings: number
    effectiveCpm: number // what this creator's payout actually cost per 1,000 views
}

/**
 * Real per-video breakdown for a campaign's approved submissions —
 * everything here comes from campaign_submissions (synced via
 * refreshCampaignAnalytics / the TikTok video-query endpoint), not
 * derived/fabricated multipliers. There is currently no data source
 * for audience demographics, traffic source, or watch time (TikTok's
 * Content Posting API doesn't expose those — that needs the separate
 * Business/Ads API), and no Instagram submissions exist yet since
 * Instagram connection isn't built. Both are surfaced as explicit
 * "not available" states in the UI rather than faked.
 */
export async function getCampaignVideoAnalytics(campaignId: string): Promise<CampaignVideoRow[]> {
    const [{ data: campaign }, { data: subs, error }] = await Promise.all([
        supabase.from('campaigns').select('cost_per_1k_views, max_pay').eq('id', campaignId).maybeSingle(),
        supabase
            .from('campaign_submissions')
            .select(
                `id, video_url, tiktok_url, submitted_at, views, likes, comments, shares, analytics_synced_at,
                 creator_profiles!campaign_submissions_creator_fkey ( display_name, full_name )`
            )
            .eq('campaign_id', campaignId)
            .eq('status', 'approved')
            .order('views', { ascending: false }),
    ])

    if (error) throw error

    const rewardPerK = campaign?.cost_per_1k_views ?? 0
    const maxPerCreator = campaign?.max_pay ? Number(campaign.max_pay) : Infinity

    return (subs ?? []).map((s: any) => {
        const views = s.views ?? 0
        const likes = s.likes ?? 0
        const comments = s.comments ?? 0
        const shares = s.shares ?? 0
        const rawEarnings = (views / 1000) * rewardPerK
        const earnings = Math.min(rawEarnings, maxPerCreator)
        const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0
        const effectiveCpm = views > 0 ? (earnings / views) * 1000 : 0
        return {
            id: s.id,
            creatorName: s.creator_profiles?.display_name || s.creator_profiles?.full_name || 'Creator',
            tiktokUrl: s.tiktok_url,
            videoUrl: s.video_url,
            submittedAt: s.submitted_at,
            analyticsSyncedAt: s.analytics_synced_at,
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