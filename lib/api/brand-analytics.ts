import { supabase } from '@/lib/supabase'

export type CampaignInsightsSummary = {
    likes: number
    comments: number
    shares: number
    engagementRate: number
    postedVideos: number
}

/**
 * Aggregates campaign_insights rows per campaign, client-side (supabase-js
 * has no group-by without an RPC, and this dataset is small enough not to
 * need one). Used by the campaign picker to show engagement at a glance
 * without opening each campaign's detail page.
 */
export async function getInsightsSummaryByCampaign(
    campaignIds: string[]
): Promise<Map<string, CampaignInsightsSummary>> {
    const result = new Map<string, CampaignInsightsSummary>()
    if (campaignIds.length === 0) return result

    const { data, error } = await supabase
        .from('campaign_insights')
        .select('campaign_id, views, likes, comments, shares')
        .in('campaign_id', campaignIds)
    if (error) throw error

    const totalsByCampaign = new Map<string, { views: number; likes: number; comments: number; shares: number; postedVideos: number }>()
    for (const row of data ?? []) {
        const entry = totalsByCampaign.get(row.campaign_id) ?? { views: 0, likes: 0, comments: 0, shares: 0, postedVideos: 0 }
        entry.views += row.views ?? 0
        entry.likes += row.likes ?? 0
        entry.comments += row.comments ?? 0
        entry.shares += row.shares ?? 0
        entry.postedVideos += 1
        totalsByCampaign.set(row.campaign_id, entry)
    }

    for (const [campaignId, t] of totalsByCampaign) {
        result.set(campaignId, {
            likes: t.likes,
            comments: t.comments,
            shares: t.shares,
            engagementRate: t.views > 0 ? ((t.likes + t.comments + t.shares) / t.views) * 100 : 0,
            postedVideos: t.postedVideos,
        })
    }

    return result
}

export type SubmissionAnalyticsDetail = {
    id: string
    creatorName: string
    videoUrl: string
    caption: string | null
    tiktokUrl: string | null
    status: string
    posted: boolean
    views: number
    likes: number
    comments: number
    shares: number
    engagementRate: number
    analyticsSyncedAt: string | null
    campaignAverage: {
        views: number
        likes: number
        comments: number
        shares: number
        engagementRate: number
    }
}

/**
 * Detail for a single creator's video within a campaign, plus the campaign
 * average (across posted + synced submissions only) for comparison charts.
 * Reuses getCampaignVideoAnalytics rather than re-deriving the
 * submission/insight merge a second time.
 */
export async function getSubmissionAnalyticsDetail(
    campaignId: string,
    submissionId: string
): Promise<SubmissionAnalyticsDetail | null> {
    const [rows, { data: submissionRow, error }] = await Promise.all([
        getCampaignVideoAnalytics(campaignId),
        supabase.from('campaign_submissions').select('video_url, caption, status').eq('id', submissionId).maybeSingle(),
    ])
    if (error) throw error

    const target = rows.find((r) => r.id === submissionId)
    if (!target || !submissionRow) return null

    const comparable = rows.filter((r) => r.posted && r.analyticsSyncedAt)
    const avg = (key: 'views' | 'likes' | 'comments' | 'shares') =>
        comparable.length > 0 ? comparable.reduce((sum, r) => sum + r[key], 0) / comparable.length : 0

    const avgViews = avg('views')
    const avgLikes = avg('likes')
    const avgComments = avg('comments')
    const avgShares = avg('shares')

    return {
        id: target.id,
        creatorName: target.creatorName,
        videoUrl: submissionRow.video_url,
        caption: submissionRow.caption,
        tiktokUrl: target.tiktokUrl,
        status: submissionRow.status,
        posted: target.posted,
        views: target.views,
        likes: target.likes,
        comments: target.comments,
        shares: target.shares,
        engagementRate: target.engagementRate,
        analyticsSyncedAt: target.analyticsSyncedAt,
        campaignAverage: {
            views: avgViews,
            likes: avgLikes,
            comments: avgComments,
            shares: avgShares,
            engagementRate: avgViews > 0 ? ((avgLikes + avgComments + avgShares) / avgViews) * 100 : 0,
        },
    }
}

export type CampaignVideoRow = {
    id: string
    creatorName: string
    tiktokUrl: string | null
    views: number
    likes: number
    comments: number
    shares: number
    // Present in campaign_insights' schema but never populated yet — TikTok's
    // Content Posting API doesn't return these (Instagram/Business-API-tier
    // fields). Left here, typed nullable, so the UI can light them up later
    // without another data-layer change.
    reach: number | null
    impressions: number | null
    saves: number | null
    avgWatchTime: number | null
    completionRate: number | null
    engagementRate: number
    analyticsSyncedAt: string | null
    posted: boolean // false when approved but never posted through our TikTok pipeline — no insight row to show yet
}

/**
 * Reads whatever's currently stored in campaign_insights — this is a plain
 * read, not a live TikTok call. Call refreshCampaignAnalytics() first to
 * actually pull fresh numbers from TikTok.
 *
 * campaign_insights has no foreign key to campaign_submissions (only to
 * campaigns, via campaign_id) — it's keyed on (campaign_id, media_id), where
 * media_id is the platform's own video/media id. So creator identity, the
 * post link, and "was this ever posted" all come from a separate
 * campaign_submissions read, joined here in JS on
 * insight.media_id === submission.tiktok_post_id.
 */
export async function getCampaignVideoAnalytics(campaignId: string): Promise<CampaignVideoRow[]> {
    const [{ data: submissions, error: subsErr }, { data: insights, error: insightsErr }] = await Promise.all([
        supabase
            .from('campaign_submissions')
            .select(
                `id, tiktok_url, tiktok_post_id,
                 creator_profiles!campaign_submissions_creator_fkey ( display_name, full_name )`
            )
            .eq('campaign_id', campaignId)
            .eq('status', 'approved'),
        supabase.from('campaign_insights').select('*').eq('campaign_id', campaignId),
    ])
    if (subsErr) throw subsErr
    if (insightsErr) throw insightsErr

    const insightByMediaId = new Map((insights ?? []).map((i) => [i.media_id, i]))

    const rows = (submissions ?? []).map((row: any) => {
        const insight = row.tiktok_post_id ? insightByMediaId.get(row.tiktok_post_id) : undefined
        const views = insight?.views ?? 0
        const likes = insight?.likes ?? 0
        const comments = insight?.comments ?? 0
        const shares = insight?.shares ?? 0
        return {
            id: row.id,
            creatorName:  row.creator_profiles?.full_name ?? 'Unknown creator',
            tiktokUrl: row.tiktok_url,
            views,
            likes,
            comments,
            shares,
            reach: insight?.reach ?? null,
            impressions: insight?.impressions ?? null,
            saves: insight?.saves ?? null,
            avgWatchTime: insight?.avg_watch_time ?? null,
            completionRate: insight?.completion_rate ?? null,
            engagementRate: views > 0 ? ((likes + comments + shares) / views) * 100 : 0,
            analyticsSyncedAt: insight?.last_updated ?? null,
            posted: !!row.tiktok_post_id,
        } as CampaignVideoRow
    })

    return rows.sort((a, b) => b.views - a.views)
}

export type RefreshResult = {
    synced: number
    errors: string[]
}

/**
 * Triggers a live pull from TikTok for every posted, approved submission in
 * this campaign. Runs server-side (see /api/brand/analytics/refresh) — the
 * brand's browser never touches a creator's TikTok token.
 */
export async function refreshCampaignAnalytics(campaignId: string): Promise<RefreshResult> {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr) throw sessionErr
    const accessToken = sessionData.session?.access_token
    if (!accessToken) throw new Error('Not signed in.')

    const res = await fetch('/api/brand/analytics/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ campaignId }),
    })
    const data = await res.json()

    if (!res.ok) {
        throw new Error(data?.error || 'Failed to refresh analytics.')
    }

    return { synced: data.synced ?? 0, errors: data.errors ?? [] }
}