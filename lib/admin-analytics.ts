import { supabase } from '@/lib/supabase'

export type AdminBrandAnalyticsRow = {
    user_id: string
    brand_name: string | null
    logo_url: string | null
    account_status: 'active' | 'suspended'
    campaignCount: number
    totalViews: number
    totalSpend: number
}

export type AdminBrandCampaignRow = {
    id: string
    name: string
    status: string
    cover: string | null
    views: number
    budgetUsed: number
    budgetTotal: number
    approvedVideos: number
}

/**
 * One row per brand with aggregated stats across all their campaigns.
 * Views are sourced from campaign_posts joined to campaign_insights — the
 * same real source used by the per-campaign analytics page — not from
 * campaign_submissions, which is a separate (and looser) count used
 * elsewhere for quick dashboard stats.
 */
export async function listBrandsWithAnalytics(): Promise<AdminBrandAnalyticsRow[]> {
    const [{ data: brands, error: brandsErr }, { data: campaigns, error: campaignsErr }] = await Promise.all([
        supabase.from('brand_profiles').select('user_id, brand_name, logo_url, account_status'),
        supabase.from('campaigns').select('id, created_by, total_budget_pool, remaining_budget_pool'),
    ])
    if (brandsErr) throw brandsErr
    if (campaignsErr) throw campaignsErr

    const campaignIds = (campaigns ?? []).map((c) => c.id)
    let viewsByCampaign = new Map<string, number>()

    if (campaignIds.length > 0) {
        const { data: posts, error: postsErr } = await supabase
            .from('campaign_posts')
            .select('campaign_id, media_id')
            .in('campaign_id', campaignIds)
            .eq('status', 'PUBLISHED')
        if (postsErr) throw postsErr

        const mediaIds = (posts ?? []).map((p) => p.media_id)
        if (mediaIds.length > 0) {
            const { data: insights, error: insightsErr } = await supabase
                .from('campaign_insights')
                .select('campaign_id, media_id, views')
                .in('campaign_id', campaignIds)
            if (insightsErr) throw insightsErr

            for (const row of insights ?? []) {
                viewsByCampaign.set(row.campaign_id, (viewsByCampaign.get(row.campaign_id) ?? 0) + (row.views ?? 0))
            }
        }
    }

    const campaignsByBrand = new Map<string, typeof campaigns>()
    for (const c of campaigns ?? []) {
        if (!c.created_by) continue
        if (!campaignsByBrand.has(c.created_by)) campaignsByBrand.set(c.created_by, [])
        campaignsByBrand.get(c.created_by)!.push(c)
    }

    return (brands ?? []).map((b) => {
        const brandCampaigns = campaignsByBrand.get(b.user_id) ?? []
        let totalViews = 0
        let totalSpend = 0
        for (const c of brandCampaigns) {
            totalViews += viewsByCampaign.get(c.id) ?? 0
            const total = c.total_budget_pool ?? 0
            const remaining = c.remaining_budget_pool ?? total
            totalSpend += total - remaining
        }
        return {
            user_id: b.user_id,
            brand_name: b.brand_name,
            logo_url: b.logo_url,
            account_status: b.account_status,
            campaignCount: brandCampaigns.length,
            totalViews,
            totalSpend,
        }
    })
}

/** A single brand's campaigns with the same view/spend sourcing as above. */
export async function getCampaignsForBrand(brandUserId: string): Promise<AdminBrandCampaignRow[]> {
    const { data: campaigns, error: campaignsErr } = await supabase
        .from('campaigns')
        .select('id, name, status, cover_image_url, image_url, total_budget_pool, remaining_budget_pool')
        .eq('created_by', brandUserId)
        .order('created_at', { ascending: false })
    if (campaignsErr) throw campaignsErr
    if (!campaigns || campaigns.length === 0) return []

    const campaignIds = campaigns.map((c) => c.id)

    const [{ data: insights, error: insightsErr }, { data: submissions, error: subsErr }] = await Promise.all([
        supabase.from('campaign_insights').select('campaign_id, views').in('campaign_id', campaignIds),
        supabase.from('campaign_submissions').select('campaign_id, status').in('campaign_id', campaignIds),
    ])
    if (insightsErr) throw insightsErr
    if (subsErr) throw subsErr

    const viewsByCampaign = new Map<string, number>()
    for (const row of insights ?? []) {
        viewsByCampaign.set(row.campaign_id, (viewsByCampaign.get(row.campaign_id) ?? 0) + (row.views ?? 0))
    }

    const approvedByCampaign = new Map<string, number>()
    for (const row of submissions ?? []) {
        if (row.status === 'approved') {
            approvedByCampaign.set(row.campaign_id, (approvedByCampaign.get(row.campaign_id) ?? 0) + 1)
        }
    }

    return campaigns.map((c) => {
        const total = c.total_budget_pool ?? 0
        const remaining = c.remaining_budget_pool ?? total
        return {
            id: c.id,
            name: c.name,
            status: c.status,
            cover: c.cover_image_url ?? c.image_url,
            views: viewsByCampaign.get(c.id) ?? 0,
            budgetUsed: total - remaining,
            budgetTotal: total,
            approvedVideos: approvedByCampaign.get(c.id) ?? 0,
        }
    })
}

export async function refreshBrandAnalytics(brandUserId: string): Promise<{ updated: number; errors: string[] }> {
    const {
        data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('You must be signed in to refresh analytics.')

    const res = await fetch(`/api/admin/brands/${brandUserId}/refresh-analytics`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to refresh analytics.')
    return json
}