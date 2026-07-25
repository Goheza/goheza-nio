import { supabase } from '@/lib/supabase'

export type ReportCreatorRow = {
    userId: string
    name: string
    username: string | null
    followers: number | null
    views: number
    likes: number
    comments: number
    shares: number
    earnings: number
    tiktokUrl: string | null
    videoUrl: string | null
}

export type ReportTrendPoint = { date: string; views: number }

export type CampaignReportData = {
    campaignId: string
    name: string
    brandName: string | null
    status: string
    startDate: string | null
    endDate: string | null
    approvedCreators: number
    liveVideos: number
    totalViews: number
    totalLikes: number
    totalComments: number
    totalShares: number
    budgetTotal: number
    budgetUsed: number
    budgetRemaining: number
    costPerLike: number
    costPerComment: number
    costPerShare: number
    costPer1kViews: number
    creators: ReportCreatorRow[]
    trend: ReportTrendPoint[]
}

export async function getCampaignReportData(campaignId: string): Promise<CampaignReportData> {
    const { data: campaign, error: campaignErr } = await supabase
        .from('campaigns')
        .select(
            `id, name, status, live_starts_at, live_ends_at, total_budget_pool, remaining_budget_pool,
             brand_profiles!campaigns_created_by_brand_fkey ( brand_name )`
        )
        .eq('id', campaignId)
        .single()
    if (campaignErr) throw campaignErr

    const { data: posts, error: postsErr } = await supabase
        .from('campaign_posts')
        .select('id, media_id, user_id, video_url, permalink')
        .eq('campaign_id', campaignId)
        .eq('status', 'PUBLISHED')
    if (postsErr) throw postsErr

    const { data: insights, error: insightsErr } = await supabase
        .from('campaign_insights')
        .select('media_id, views, likes, comments, shares')
        .eq('campaign_id', campaignId)
    if (insightsErr) throw insightsErr

    const insightByMedia = new Map((insights ?? []).map((i) => [i.media_id, i]))

    const creatorUserIds = [...new Set((posts ?? []).map((p) => p.user_id))]
    const { data: profiles } = creatorUserIds.length
        ? await supabase
              .from('creator_profiles')
              .select('user_id, display_name, full_name, username')
              .in('user_id', creatorUserIds)
        : { data: [] }
    const { data: socials } = creatorUserIds.length
        ? await supabase
              .from('creator_social_accounts')
              .select('user_id, open_id')
              .eq('platform', 'tiktok')
              .in('user_id', creatorUserIds)
        : { data: [] }

    const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]))

    const budgetTotal = campaign.total_budget_pool ?? 0
    const budgetRemaining = campaign.remaining_budget_pool ?? budgetTotal
    const budgetUsed = budgetTotal - budgetRemaining

    let totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0

    const creators: ReportCreatorRow[] = (posts ?? []).map((p) => {
        const insight = insightByMedia.get(p.media_id)
        const profile = profileByUser.get(p.user_id)
        const views = insight?.views ?? 0
        const likes = insight?.likes ?? 0
        const comments = insight?.comments ?? 0
        const shares = insight?.shares ?? 0
        totalViews += views
        totalLikes += likes
        totalComments += comments
        totalShares += shares

        return {
            userId: p.user_id,
            name: profile?.display_name || profile?.full_name || 'Creator',
            username: profile?.username ?? null,
            followers: null, // requires a live TikTok call per creator — deliberately
            // left out of the bulk report fetch to avoid a report load
            // triggering dozens of external API calls; can be added via a
            // dedicated refresh action if you want it here later.
            views,
            likes,
            comments,
            shares,
            earnings: 0, // filled in below once rewardPerK is known
            tiktokUrl: p.permalink,
            videoUrl: p.video_url,
        }
    })

    const { data: campaignRates } = await supabase
        .from('campaigns')
        .select('cost_per_1k_views, max_pay')
        .eq('id', campaignId)
        .single()
    const rewardPerK = campaignRates?.cost_per_1k_views ?? 0
    const maxPerCreator = campaignRates?.max_pay ? Number(campaignRates.max_pay) : Infinity
    for (const c of creators) {
        c.earnings = Math.min((c.views / 1000) * rewardPerK, maxPerCreator)
    }

    const { data: history } = await supabase
        .from('campaign_insights_history')
        .select('recorded_at, views')
        .eq('campaign_id', campaignId)
        .order('recorded_at', { ascending: true })

    const trendByDay = new Map<string, number>()
    for (const row of history ?? []) {
        const day = row.recorded_at.slice(0, 10)
        trendByDay.set(day, (trendByDay.get(day) ?? 0) + (row.views ?? 0))
    }
    const trend: ReportTrendPoint[] = Array.from(trendByDay.entries()).map(([date, views]) => ({ date, views }))

    return {
        campaignId,
        name: campaign.name,
        brandName: (campaign as any).brand_profiles?.brand_name ?? null,
        status: campaign.status,
        startDate: campaign.live_starts_at,
        endDate: campaign.live_ends_at,
        approvedCreators: creatorUserIds.length,
        liveVideos: posts?.length ?? 0,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        budgetTotal,
        budgetUsed,
        budgetRemaining,
        costPerLike: totalLikes > 0 ? budgetUsed / totalLikes : 0,
        costPerComment: totalComments > 0 ? budgetUsed / totalComments : 0,
        costPerShare: totalShares > 0 ? budgetUsed / totalShares : 0,
        costPer1kViews: totalViews > 0 ? (budgetUsed / totalViews) * 1000 : 0,
        creators: creators.sort((a, b) => b.views - a.views),
        trend,
    }
}