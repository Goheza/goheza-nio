import { supabase } from '@/lib/supabase'
import type {
    AdminBrandSummary,
    AdminCampaignSummary,
    AdminCreatorSummary,
    AdminEarningEntry,
} from '@/types/admin-earnings'
import { computeRequiredViews } from '../config/payout-rules'

type EarningRow = {
    id: string
    submission_id: string
    user_id: string
    campaign_id: string
    brand_user_id: string
    views_counted: number
    gross_amount: number
    platform_fee: number
    net_amount: number
    status: string
    created_at: string
}

// Admin-wide tree: every ledger row across every creator, grouped
// brand -> campaign -> creator. Three flat queries, joined client-side —
// same defensive pattern used for the creator-facing earnings tree.
export async function getAdminEarningsTree(): Promise<AdminBrandSummary[]> {
    const { data: earnings, error: earningsError } = await supabase
        .from('creator_earnings')
        .select(
            'id, submission_id, user_id, campaign_id, brand_user_id, views_counted, gross_amount, platform_fee, net_amount, status, created_at'
        )
        .order('created_at', { ascending: false })

    if (earningsError) throw earningsError
    const rows = (earnings ?? []) as EarningRow[]
    if (rows.length === 0) return []

    const campaignIds = Array.from(new Set(rows.map((r) => r.campaign_id)))
    const brandUserIds = Array.from(new Set(rows.map((r) => r.brand_user_id)))
    const creatorUserIds = Array.from(new Set(rows.map((r) => r.user_id)))

    const [
        { data: campaigns, error: campaignsError },
        { data: brands, error: brandsError },
        { data: creators, error: creatorsError },
    ] = await Promise.all([
        supabase.from('campaigns').select('id, name, cover_image_url,max_pay').in('id', campaignIds),
        supabase.from('brand_profiles').select('user_id, brand_name, logo_url').in('user_id', brandUserIds),
        supabase.from('creator_profiles').select('user_id, display_name, full_name').in('user_id', creatorUserIds),
    ])

    if (campaignsError) throw campaignsError
    if (brandsError) throw brandsError
    if (creatorsError) throw creatorsError

    const campaignById = new Map((campaigns ?? []).map((c) => [c.id, c]))
    const brandById = new Map((brands ?? []).map((b) => [b.user_id, b]))
    const creatorById = new Map((creators ?? []).map((c) => [c.user_id, c]))

    const brandMap = new Map<string, AdminBrandSummary>()

    for (const row of rows) {
        const brandInfo = brandById.get(row.brand_user_id)
        if (!brandMap.has(row.brand_user_id)) {
            brandMap.set(row.brand_user_id, {
                brandUserId: row.brand_user_id,
                brandName: brandInfo?.brand_name ?? 'Brand',
                brandLogoUrl: brandInfo?.logo_url ?? null,
                totalNet: 0,
                campaigns: [],
            })
        }
        const brand = brandMap.get(row.brand_user_id)!

        const campaignInfo = campaignById.get(row.campaign_id)

        const maxPayGross = campaignInfo?.max_pay ? Number(campaignInfo.max_pay) : null
        const requiredViews =
            maxPayGross !== null && !Number.isNaN(maxPayGross) && maxPayGross > 0
                ? computeRequiredViews(maxPayGross)
                : null

        let campaign = brand.campaigns.find((c) => c.campaignId === row.campaign_id)
        if (!campaign) {
            campaign = {
                campaignId: row.campaign_id,
                campaignName: campaignInfo?.name ?? 'Campaign',
                campaignCover: campaignInfo?.cover_image_url ?? null,
                totalNet: 0,
                creators: [],
                requiredViews : requiredViews
            }
            brand.campaigns.push(campaign)
        }

        const creatorInfo = creatorById.get(row.user_id)
        let creator = campaign.creators.find((c) => c.creatorId === row.user_id)
        if (!creator) {
            creator = {
                creatorId: row.user_id,
                creatorName: creatorInfo?.full_name || 'Creator',
                totalNet: 0,
                totalViews: 0,
                accruingNet: 0,
                settledNet: 0,
                paidNet: 0,
                entries: [],
            }
            campaign.creators.push(creator)
        }

        const entry: AdminEarningEntry = {
            id: row.id,
            submissionId: row.submission_id,
            viewsCounted: row.views_counted,
            grossAmount: row.gross_amount,
            platformFee: row.platform_fee,
            netAmount: row.net_amount,
            status: row.status as AdminEarningEntry['status'],
            createdAt: row.created_at,
        }

        creator.entries.push(entry)
        creator.totalNet += entry.netAmount
        creator.totalViews += entry.viewsCounted
        if (entry.status === 'accruing') creator.accruingNet += entry.netAmount
        if (entry.status === 'settled') creator.settledNet += entry.netAmount
        if (entry.status === 'paid') creator.paidNet += entry.netAmount

        campaign.totalNet += entry.netAmount
        brand.totalNet += entry.netAmount
    }

    return Array.from(brandMap.values()).sort((a, b) => b.totalNet - a.totalNet)
}

export type ManualSettlementResult = {
    matchedExactly: boolean
    earningsMarkedPaid: number
    totalMarked: number
}

// Reconciliation tool: admin already paid a creator outside the system
// (bank transfer, mobile money, whatever) and wants the records to line
// up. Consumes the creator's oldest 'accruing' earnings first (FIFO)
// until the entered amount is covered, marking those rows 'paid', then
// logs the action as a withdrawal row with source='admin_manual' so it's
// clearly distinguishable from a creator-initiated request.
//
// Caveat: earnings rows are all-or-nothing (one row = one submission's
// full net amount), so if `amount` doesn't land exactly on a row
// boundary, this will mark slightly MORE in earnings as paid than the
// amount entered, rather than splitting a row. Returns the actual total
// marked so the caller can show that to the admin.
export async function manualSettleCreator(
    creatorId: string,
    amount: number,
    adminId: string,
    notes?: string
): Promise<ManualSettlementResult> {
    if (amount <= 0) throw new Error('Amount must be greater than zero.')

    const { data: accruing, error: accruingError } = await supabase
        .from('creator_earnings')
        .select('id, net_amount')
        .eq('user_id', creatorId)
        .eq('status', 'accruing')
        .order('created_at', { ascending: true })

    if (accruingError) throw accruingError

    let remaining = amount
    const idsToMarkPaid: string[] = []
    let totalMarked = 0

    for (const row of accruing ?? []) {
        if (remaining <= 0) break
        idsToMarkPaid.push(row.id)
        totalMarked += Number(row.net_amount)
        remaining -= Number(row.net_amount)
    }

    if (idsToMarkPaid.length > 0) {
        const { error: updateError } = await supabase
            .from('creator_earnings')
            .update({ status: 'paid', settled_by: adminId, settled_at: new Date().toISOString() })
            .in('id', idsToMarkPaid)

        if (updateError) throw updateError
    }

    const { error: insertError } = await supabase.from('creator_withdrawals').insert({
        user_id: creatorId,
        amount,
        status: 'paid',
        processed_by: adminId,
        processed_at: new Date().toISOString(),
        source: 'admin_manual',
        notes: notes ?? null,
    })

    if (insertError) throw insertError

    return {
        matchedExactly: Math.abs(totalMarked - amount) < 1,
        earningsMarkedPaid: idsToMarkPaid.length,
        totalMarked,
    }
}
