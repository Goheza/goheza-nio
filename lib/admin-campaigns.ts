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

export type CampaignStatusFilter = 'inreview' | 'live' | 'draft' | 'all'

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
    if (search.trim()) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map((row: any) => ({
        ...row,
        brand_name: row.brand_profiles?.brand_name ?? null,
    })) as AdminCampaignRow[]
}

const SUBMISSION_WINDOW_DAYS = 14

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

    const { error } = await supabase
        .from('campaigns')
        .update({
            status: 'live',
            approved_by: adminUserId,
            reviewed_by: adminUserId,
            reviewed_at: new Date().toISOString(),
            rejection_reason: null,
            submission_deadline: submissionDeadline.toISOString(),
            live_starts_at: liveStartsAt.toISOString(),
            live_ends_at: liveEndsAt.toISOString(),
        })
        .eq('id', campaignId)
        .eq('status', 'inreview') // only ever approve out of inreview, guards against double-submits
    if (error) throw error
}

export async function rejectCampaign(campaignId: string, adminUserId: string, reason: string) {
    const { error } = await supabase
        .from('campaigns')
        .update({
            status: 'draft',
            reviewed_by: adminUserId,
            reviewed_at: new Date().toISOString(),
            rejection_reason: reason,
        })
        .eq('id', campaignId)
        .eq('status', 'inreview')
    if (error) throw error
}