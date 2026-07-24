import { supabase } from '@/lib/supabase'
import { campaignPhase, campaignStatusToUi, effectiveApprovalCap } from '@/lib/api/status-mapping'
import type { Campaign, CampaignSummary, CreateCampaignInput } from '@/types/campaign'

const PLATFORM_FEE_PCT = 0.15
const REFERRAL_FEE_PER_CREATOR = 10.5

// SUBMISSION_WINDOW_DAYS moved to lib/admin-campaigns.ts — schedule dates
// are now set when admin approves the campaign (inreview -> live), not at
// creation. A campaign can otherwise sit in `inreview` for days, and its
// 14-day submission window would already be ticking (or fully expired)
// before a single creator could see or apply to it.

// ============================================================================
// Budget calculation — mirrors the pricing logic in /brand/create/$type
// ============================================================================

export function calculateCampaignBudget(
    type: CreateCampaignInput['campaignType'],
    creators: number,
    maxPerCreator: number
) {
    if (type === 'referral') {
        const total = creators * REFERRAL_FEE_PER_CREATOR
        return { subtotal: total, platformFee: 0, total }
    }
    const subtotal = creators * maxPerCreator
    const platformFee = subtotal * PLATFORM_FEE_PCT
    return { subtotal, platformFee, total: subtotal + platformFee }
}

// ============================================================================
// Create / draft
// ============================================================================
export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
        throw new Error('You must be signed in to create a campaign.')
    }

    const { total } = calculateCampaignBudget(input.campaignType, input.creators, input.maxPerCreator)
    const status = input.status ?? 'inreview'

    const payload = {
        created_by: userData.user.id,
        name: input.name,
        description: input.brief,
        campaign_type: input.campaignType,
        status,
        target_countries: input.visibility === 'global' ? [] : input.countries,
        dos: input.dos,
        donts: input.donts,
        num_creators: input.creators,
        max_pay: String(input.maxPerCreator),
        cost_per_1k_views: input.rewardPerK,
        total_budget_pool: total,
        remaining_budget_pool: total,
        flat_fee: input.campaignType === 'referral' ? String(REFERRAL_FEE_PER_CREATOR * input.creators) : null,
        type_specific_details: input.typeSpecificDetails,
        brief_assets: input.briefAssets ?? [],
        live_duration_days: input.liveDurationDays,
        payout: `${input.rewardPerK} per 1,000 views`,
        requirements: [],
    }

    const { data, error } = await supabase.from('campaigns').insert(payload).select().single()

    if (error) throw error
    if (!data) throw new Error('Campaign was not created — no data returned.')

    return data as Campaign
}

export async function saveCampaignDraft(input: CreateCampaignInput): Promise<Campaign> {
    return createCampaign({ ...input, status: 'draft' })
}

// ============================================================================
// Fetch — single campaign, raw row
// ============================================================================

export async function getCampaign(id: string): Promise<Campaign | null> {
    const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle()

    if (error) throw error
    return data as Campaign | null
}

// ============================================================================
// List — aggregated summaries for a brand's campaigns
// ============================================================================

export async function listCampaignsWithStats(brandUserId: string): Promise<CampaignSummary[]> {
    const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('created_by', brandUserId)
        .order('created_at', { ascending: false })

    if (campaignsError) throw campaignsError
    if (!campaigns || campaigns.length === 0) return []

    const campaignIds = campaigns.map((c) => c.id)

    // Views + approved/received counts, aggregated per campaign from submissions.
    const { data: submissions, error: submissionsError } = await supabase
        .from('campaign_submissions')
        .select('campaign_id, status, views')
        .in('campaign_id', campaignIds)

    if (submissionsError) throw submissionsError

    const statsByCampaign = new Map<string, { views: number; approved: number; received: number }>()
    for (const s of submissions ?? []) {
        const entry = statsByCampaign.get(s.campaign_id) ?? { views: 0, approved: 0, received: 0 }
        // Only approved/pending/revision/rejected submissions ever reach the brand
        // (admin_reject and draft are excluded), so any row here counts as "received".
        entry.received += 1
        if (s.status === 'approved') {
            entry.approved += 1
            entry.views += s.views ?? 0
        }
        statsByCampaign.set(s.campaign_id, entry)
    }

    //@ts-ignore
    return (campaigns as Campaign[]).map((c) => {
        const stats = statsByCampaign.get(c.id) ?? { views: 0, approved: 0, received: 0 }
        const budgetTotal = c.total_budget_pool ?? 0
        const budgetRemaining = c.remaining_budget_pool ?? budgetTotal
        return {
            id: c.id,
            name: c.name,
            type: c.campaign_type,
            status: campaignStatusToUi(c.status),
            phase: campaignPhase(c.status),
            cover: c.cover_image_url ?? c.image_url,
            countries: c.target_countries && c.target_countries.length > 0 ? c.target_countries : 'global',
            views: stats.views,
            approvedVideos: stats.approved,
            submissionsReceived: stats.received,
            creatorsRequested: c.num_creators ?? 0,
            approvalCap: effectiveApprovalCap(c),
            budgetUsed: budgetTotal - budgetRemaining,
            budgetTotal,
            rewardPerK: c.cost_per_1k_views ?? 0,
            liveStartsAt: c.live_starts_at,
            liveEndsAt: c.live_ends_at,
            submissionDeadline: c.submission_deadline,
        }
    })
}

export async function getCampaignWithStats(id: string): Promise<CampaignSummary | null> {
    const campaign = await getCampaign(id)
    if (!campaign) return null

    const { data: submissions, error } = await supabase
        .from('campaign_submissions')
        .select('status, views')
        .eq('campaign_id', id)

    if (error) throw error

    let views = 0
    let approved = 0
    const received = submissions?.length ?? 0
    for (const s of submissions ?? []) {
        if (s.status === 'approved') {
            approved += 1
            views += s.views ?? 0
        }
    }

    const budgetTotal = campaign.total_budget_pool ?? 0
    const budgetRemaining = campaign.remaining_budget_pool ?? budgetTotal

    return {
        id: campaign.id,
        name: campaign.name,
        type: campaign.campaign_type,
        status: campaignStatusToUi(campaign.status),
        //@ts-ignore
        phase: campaignPhase(campaign.status),
        cover: campaign.cover_image_url ?? campaign.image_url,
        countries:
            campaign.target_countries && campaign.target_countries.length > 0 ? campaign.target_countries : 'global',
        views,
        approvedVideos: approved,
        submissionsReceived: received,
        creatorsRequested: campaign.num_creators ?? 0,
        approvalCap: effectiveApprovalCap(campaign),
        budgetUsed: budgetTotal - budgetRemaining,
        budgetTotal,
        rewardPerK: campaign.cost_per_1k_views ?? 0,
        liveStartsAt: campaign.live_starts_at,
        liveEndsAt: campaign.live_ends_at,
        submissionDeadline: campaign.submission_deadline,
    }
}

// ============================================================================
// Mutations
// ============================================================================

export async function updateCampaignStatus(id: string, status: Campaign['status']): Promise<void> {
    const { error } = await supabase.from('campaigns').update({ status }).eq('id', id)
    if (error) throw error
}

// "Unlock Additional Videos" — raises the approval cap above the original
// num_creators. Caller (UI) decides the new value; this just persists it.
export async function unlockApprovalCap(id: string, newCap: number): Promise<void> {
    const { error } = await supabase.from('campaigns').update({ approval_cap: newCap }).eq('id', id)
    if (error) throw error
}
