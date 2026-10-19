import { supabase } from '@/lib/supabase'

export type CampaignStatus =
    | 'draft'
    | 'inreview'
    | 'submission_review'
    | 'live'
    | 'paused'
    | 'completed'
    | 'cancelled'
    | 'expired'

// Tabs shown on the admin page. draft and expired still exist as statuses
// (and appear under 'all') but have no tab of their own.
export type CampaignStatusFilter =
    | 'inreview'
    | 'submission_review'
    | 'live'
    | 'paused'
    | 'completed'
    | 'cancelled'
    | 'all'

export type AdminCampaignRow = {
    id: string
    name: string
    status: CampaignStatus
    payout: string
    campaign_type: string | null
    cover_image_url: string | null
    image_url: string | null
    created_at: string | null
    created_by: string | null
    approved_by: string | null
    reviewed_by: string | null
    reviewed_at: string | null
    rejection_reason: string | null
    num_creators: number | null
    target_countries: string[] | null
    brand_name?: string | null
}

const NOT_SAVED =
    'Nothing was saved. The campaign status may have changed since you opened it, or this account may not have permission to edit campaigns. Refresh and try again.'

export async function listCampaigns(filter: CampaignStatusFilter, search: string): Promise<AdminCampaignRow[]> {
    let query = supabase
        .from('campaigns')
        .select(
            `id, name, status, payout, campaign_type, cover_image_url, image_url, created_at, created_by,
             approved_by, reviewed_by, reviewed_at, rejection_reason, num_creators, target_countries,
             brand_profiles!campaigns_created_by_brand_fkey ( brand_name )`
        )
        .order('created_at', { ascending: false })

    if (filter !== 'all') query = query.eq('status', filter)
    if (search.trim()) query = query.ilike('name', `%${search.trim()}%`)

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map((row: any) => ({
        ...row,
        brand_name: row.brand_profiles?.brand_name ?? null,
    })) as AdminCampaignRow[]
}

const SUBMISSION_WINDOW_DAYS = 14

export async function updateCampaignExplainerVideo(campaignId: string, url: string | null) {
    const { error } = await supabase.from('campaigns').update({ explainer_video_url: url }).eq('id', campaignId)

    if (error) throw error
}

export async function approveCampaign(campaignId: string, adminUserId: string) {
    const { data: campaign, error: fetchErr } = await supabase
        .from('campaigns')
        .select('live_duration_days')
        .eq('id', campaignId)
        .single()
    if (fetchErr) throw fetchErr

    const submissionDeadline = new Date()
    submissionDeadline.setDate(submissionDeadline.getDate() + SUBMISSION_WINDOW_DAYS)
    const liveStartsAt = new Date(submissionDeadline)
    const liveEndsAt = new Date(liveStartsAt)
    liveEndsAt.setDate(liveEndsAt.getDate() + (campaign?.live_duration_days ?? 30))

    const { data, error } = await supabase
        .from('campaigns')
        .update({
            status: 'submission_review',
            approved_by: adminUserId,
            reviewed_by: adminUserId,
            reviewed_at: new Date().toISOString(),
            rejection_reason: null,
            submission_deadline: submissionDeadline.toISOString(),
            live_starts_at: liveStartsAt.toISOString(),
            live_ends_at: liveEndsAt.toISOString(),
        })
        .eq('id', campaignId)
        .eq('status', 'inreview')
        .select('id')
    if (error) throw error
    if (!data?.length) throw new Error(NOT_SAVED)
}

// Manual admin action: moves a campaign from the application window into 'live'.
// Deliberately not automatic: the admin decides when the applicant pool is good
// enough to close, independent of submission_deadline.
export async function moveCampaignToLive(campaignId: string, adminUserId: string) {
    const { data, error } = await supabase
        .from('campaigns')
        .update({
            status: 'live',
            reviewed_by: adminUserId,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', campaignId)
        .eq('status', 'submission_review')
        .select('id')
    if (error) throw error
    if (!data?.length) throw new Error(NOT_SAVED)
}

export async function rejectCampaign(campaignId: string, adminUserId: string, reason: string) {
    const { data, error } = await supabase
        .from('campaigns')
        .update({
            status: 'draft',
            reviewed_by: adminUserId,
            reviewed_at: new Date().toISOString(),
            rejection_reason: reason.trim(),
        })
        .eq('id', campaignId)
        .eq('status', 'inreview')
        .select('id')
    if (error) throw error
    if (!data?.length) throw new Error(NOT_SAVED)
}

export type AdminCampaignDetail = {
    id: string
    name: string
    status: CampaignStatus
    description: string | null
    requirements: string[]
    dos: string[]
    donts: string[]
    payout: string
    budget: string | null
    max_pay: string | null
    explainer_video_url: string | null
    flat_fee: string | null
    total_budget_pool: number | null
    campaign_type: string | null
    num_creators: number | null
    min_creators: number | null
    approval_cap: number | null
    target_countries: string[] | null
    quality_standard: string | null
    estimated_views: number | null
    objectives: string[] | null
    additional_information: string | null
    timeline: string | null
    live_duration_days: number | null
    cover_image_url: string | null
    image_url: string | null
    brief_assets: unknown[]
    cost_per_1k_views: number | null
    submission_deadline: string | null
    created_at: string | null
    rejection_reason: string | null
    brand_name: string | null
    brand_logo_url: string | null
    brand_email: string | null
    brand_country: string | null
    brand_is_verified: boolean | null
}

export async function getCampaignDetailForAdmin(campaignId: string): Promise<AdminCampaignDetail | null> {
    const { data, error } = await supabase
        .from('campaigns')
        .select(
            `id, name, status, description, requirements, dos, donts, payout, budget, max_pay, flat_fee,
             total_budget_pool, campaign_type, num_creators, min_creators, approval_cap, target_countries,
             quality_standard, estimated_views, objectives, additional_information, timeline, live_duration_days,
             cover_image_url, image_url, brief_assets, cost_per_1k_views, submission_deadline, created_at, explainer_video_url, rejection_reason,
             brand_profiles!campaigns_created_by_brand_fkey ( brand_name, logo_url, brand_email, country, is_verified )`
        )
        .eq('id', campaignId)
        .maybeSingle()
    if (error) throw error
    if (!data) return null

    const brand = (data as any).brand_profiles
    return {
        ...(data as any),
        brand_name: brand?.brand_name ?? null,
        brand_logo_url: brand?.logo_url ?? null,
        brand_email: brand?.brand_email ?? null,
        brand_country: brand?.country ?? null,
        brand_is_verified: brand?.is_verified ?? null,
    } as AdminCampaignDetail
}

// `from` is the status the admin saw when opening the campaign. The update only
// applies if the row is still in that status, so a stale modal cannot overwrite
// a change made elsewhere.
export async function setCampaignStatus(campaignId: string, status: CampaignStatus, from?: CampaignStatus) {
    let query = supabase.from('campaigns').update({ status }).eq('id', campaignId)
    if (from) query = query.eq('status', from)

    const { data, error } = await query.select('id')
    if (error) throw error
    // RLS can make the update a silent no-op
    if (!data?.length) throw new Error(NOT_SAVED)
}