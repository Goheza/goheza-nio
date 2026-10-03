import { supabase } from '@/lib/supabase'
import type { CreatorEarningsByBrand, CreatorEarningsByCampaign, CreatorEarningEntry } from '@/types/earnings'
import { computeRequiredViews } from '../config/payout-rules'

type EarningsRow = {
    id: string
    submission_id: string
    campaign_id: string
    views_counted: number
    gross_amount: number
    platform_fee: number
    net_amount: number
    status: string
    created_at: string
}

type CampaignLite = {
    id: string
    name: string
    cover_image_url: string | null
    created_by: string | null
    max_pay:any
}

type BrandLite = {
    user_id: string
    brand_name: string | null
    logo_url: string | null,
    
}

export async function getEarningsByBrand(creatorId: string): Promise<CreatorEarningsByBrand[]> {
    const { data: earnings, error: earningsError } = await supabase
        .from('creator_earnings')
        .select(
            'id, submission_id, campaign_id, views_counted, gross_amount, platform_fee, net_amount, status, created_at'
        )
        .eq('user_id', creatorId)
        .order('created_at', { ascending: false })

    if (earningsError) throw earningsError
    const rows = (earnings ?? []) as EarningsRow[]
    if (rows.length === 0) return []

    const campaignIds = Array.from(new Set(rows.map((r) => r.campaign_id)))

    const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, cover_image_url, created_by, max_pay')
        .in('id', campaignIds)

    if (campaignsError) throw campaignsError
    const campaignById = new Map((campaigns ?? []).map((c) => [c.id, c as CampaignLite]))

    const brandUserIds = Array.from(
        new Set((campaigns ?? []).map((c) => c.created_by).filter((id): id is string => !!id))
    )

    const { data: brands, error: brandsError } = await supabase
        .from('brand_profiles')
        .select('user_id, brand_name, logo_url')
        .in('user_id', brandUserIds)

    if (brandsError) throw brandsError
    const brandByUserId = new Map((brands ?? []).map((b) => [b.user_id, b as BrandLite]))

    const brandMap = new Map<string, CreatorEarningsByBrand>()

    for (const row of rows) {
        const campaign = campaignById.get(row.campaign_id)
        const brandUserId = campaign?.created_by ?? 'unknown'
        const brandInfo = brandByUserId.get(brandUserId)

        if (!brandMap.has(brandUserId)) {
            brandMap.set(brandUserId, {
                brandUserId,
                brandName: brandInfo?.brand_name ?? 'Brand',
                brandLogoUrl: brandInfo?.logo_url ?? null,
                totalNet: 0,
                totalViews: 0,
                campaigns: [],
            })
        }
        const brand = brandMap.get(brandUserId)!
        const maxPayGross = campaign?.max_pay ? Number(campaign.max_pay) : null
        const requiredViews =
            maxPayGross !== null && !Number.isNaN(maxPayGross) && maxPayGross > 0
                ? computeRequiredViews(maxPayGross)
                : null

        let campaignEntry = brand.campaigns.find((c) => c.campaignId === row.campaign_id)
        if (!campaignEntry) {
            campaignEntry = {
                campaignId: row.campaign_id,
                campaignName: campaign?.name ?? 'Campaign',
                campaignCover: campaign?.cover_image_url ?? null,
                totalNet: 0,
                totalViews: 0,
                requiredViews,
                entries: [],
            }
            brand.campaigns.push(campaignEntry)
        }

        const entry: CreatorEarningEntry = {
            id: row.id,
            submissionId: row.submission_id,
            campaignId: row.campaign_id,
            campaignName: campaign?.name ?? 'Campaign',
            viewsCounted: row.views_counted,
            grossAmount: row.gross_amount,
            platformFee: row.platform_fee,
            netAmount: row.net_amount,
            status: row.status as CreatorEarningEntry['status'],
            createdAt: row.created_at,
        }

        campaignEntry.entries.push(entry)
        campaignEntry.totalNet += entry.netAmount
        campaignEntry.totalViews += entry.viewsCounted
        brand.totalNet += entry.netAmount
        brand.totalViews += entry.viewsCounted
    }

    return Array.from(brandMap.values()).sort((a, b) => b.totalNet - a.totalNet)
}

// Convenience for drill-in level 2 if a page wants to fetch lazily rather
// than hold the whole tree — currently just filters the full fetch since
// volumes are small; swap for a scoped query later if this gets heavy.
export async function getEarningsForBrand(
    creatorId: string,
    brandUserId: string
): Promise<CreatorEarningsByCampaign[]> {
    const all = await getEarningsByBrand(creatorId)
    return all.find((b) => b.brandUserId === brandUserId)?.campaigns ?? []
}

// Cheaper than getEarningsByBrand — no campaign/brand joins, just the total
// across every ledger row regardless of status (accruing + settled + paid).
export async function getLifetimeNetEarnings(creatorId: string): Promise<number> {
    const { data, error } = await supabase.from('creator_earnings').select('net_amount').eq('user_id', creatorId)

    if (error) throw error
    return (data ?? []).reduce((sum, r) => sum + Number(r.net_amount), 0)
}
