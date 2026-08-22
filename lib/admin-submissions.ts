import { supabase } from '@/lib/supabase'

export type SubmissionStatus = 'draft' | 'admin_reject' | 'pending' | 'revision_requested' | 'approved' | 'rejected'

export type SubmissionStatusFilter = 'pending' | 'admin_reject' | 'approved' | 'rejected' | 'all' | 'screening'

export type PublishStatus = 'not_posted' | 'processing' | 'posted' | 'failed'

export type AdminSubmissionRow = {
    id: string
    user_id: string
    campaign_id: string
    campaign_name: string | null
    video_url: string
    tiktok_url: string | null
    caption: string | null
    status: SubmissionStatus
    views: number
    submitted_at: string
    reviewed_by: string | null
    reviewed_at: string | null
    feedback: string | null
    creator_name?: string | null
    publish_status: PublishStatus
    tiktok_post_id: string | null
    posted_at: string | null
    publish_error: string | null
    hidden_from_brand:boolean;
}

export async function listSubmissions(filter: SubmissionStatusFilter, search: string): Promise<AdminSubmissionRow[]> {
    let query = supabase
        .from('campaign_submissions')
        .select(
            `id, user_id, campaign_id, campaign_name, video_url, tiktok_url, caption, status, views,
             submitted_at, reviewed_by, reviewed_at, feedback,
             publish_status, tiktok_post_id, posted_at, publish_error,
             creator_profiles!campaign_submissions_creator_fkey ( display_name, full_name )`
        )
        .neq('status', 'draft') // drafts aren't visible to admins — creator hasn't sent them yet
        .order('submitted_at', { ascending: false })

    if (filter !== 'all') query = query.eq('status', filter)
    if (search.trim()) query = query.ilike('campaign_name', `%${search}%`)

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map((row: any) => ({
        ...row,
        creator_name:  row.creator_profiles?.full_name ?? null,
    })) as AdminSubmissionRow[]
}

/**
 * Independent moderation power described in the roles doc: admins can
 * override a brand's own approve/reject decision on a submission.
 */
export async function adminRejectSubmission(submissionId: string, adminUserId: string, feedback: string) {
    const { error } = await supabase
        .from('campaign_submissions')
        .update({
            status: 'admin_reject',
            reviewed_by: adminUserId,
            reviewed_at: new Date().toISOString(),
            feedback,
        })
        .eq('id', submissionId)
    if (error) throw error
}

export async function reinstateSubmission(submissionId: string) {
    const { error } = await supabase
        .from('campaign_submissions')
        .update({
            status: 'pending',
            reviewed_by: null,
            reviewed_at: null,
        })
        .eq('id', submissionId)
    if (error) throw error
}

async function authHeader(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Kicks off the automated TikTok publish job for an approved
 * submission. The job runs async on TikTok's side — call
 * checkTikTokPublishStatus() afterwards (e.g. on a poll interval)
 * to find out when it finishes.
 */
export async function startTikTokPublish(submissionId: string): Promise<{ publishId: string; status: string }> {
    const res = await fetch(`/api/admin/submissions/${submissionId}/publish-tiktok`, {
        method: 'POST',
        headers: await authHeader(),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to start TikTok publish.')
    return json
}

export async function checkTikTokPublishStatus(
    submissionId: string
): Promise<{ status: PublishStatus; tiktokPostId?: string; error?: string }> {
    const res = await fetch(`/api/admin/submissions/${submissionId}/publish-status`, {
        headers: await authHeader(),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to check TikTok publish status.')
    return json
}

export async function deleteSubmission(submissionId: string): Promise<void> {
    const { error } = await supabase.from('campaign_submissions').delete().eq('id', submissionId)
    if (error) throw error
}

export async function hideSubmissionFromBrand(submissionId: string): Promise<void> {
    const { error } = await supabase
        .from('campaign_submissions')
        .update({ hidden_from_brand: true })
        .eq('id', submissionId)
    if (error) throw error
}

export async function unhideSubmissionFromBrand(submissionId: string): Promise<void> {
    const { error } = await supabase
        .from('campaign_submissions')
        .update({ hidden_from_brand: false })
        .eq('id', submissionId)
    if (error) throw error
}

export type ScreeningBrandRow = {
    user_id: string
    brand_name: string | null
    logo_url: string | null
}

export type ScreeningCampaignRow = {
    id: string
    name: string
    submissionCount: number
}

export async function listBrandsWithSubmissions(): Promise<ScreeningBrandRow[]> {
    // Pull every non-draft submission's campaign, then resolve back to
    // brands — avoids listing brands who have zero submissions to screen.
    const { data: submissions, error: subsErr } = await supabase
        .from('campaign_submissions')
        .select('campaign_id')
        .neq('status', 'draft')
    if (subsErr) throw subsErr

    const campaignIds = [...new Set((submissions ?? []).map((s) => s.campaign_id))]
    if (campaignIds.length === 0) return []

    const { data: campaigns, error: campaignsErr } = await supabase
        .from('campaigns')
        .select('created_by')
        .in('id', campaignIds)
    if (campaignsErr) throw campaignsErr

    const brandIds = [...new Set((campaigns ?? []).map((c) => c.created_by).filter(Boolean))] as string[]
    if (brandIds.length === 0) return []

    const { data: brands, error: brandsErr } = await supabase
        .from('brand_profiles')
        .select('user_id, brand_name, logo_url')
        .in('user_id', brandIds)
        .order('brand_name', { ascending: true })
    if (brandsErr) throw brandsErr

    return (brands ?? []) as ScreeningBrandRow[]
}

export async function listCampaignsWithSubmissionsForBrand(brandUserId: string): Promise<ScreeningCampaignRow[]> {
    const { data: campaigns, error: campaignsErr } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('created_by', brandUserId)
        .order('created_at', { ascending: false })
    if (campaignsErr) throw campaignsErr
    if (!campaigns || campaigns.length === 0) return []

    const campaignIds = campaigns.map((c) => c.id)
    const { data: submissions, error: subsErr } = await supabase
        .from('campaign_submissions')
        .select('campaign_id')
        .in('campaign_id', campaignIds)
        .neq('status', 'draft')
    if (subsErr) throw subsErr

    const countByCampaign = new Map<string, number>()
    for (const s of submissions ?? []) {
        countByCampaign.set(s.campaign_id, (countByCampaign.get(s.campaign_id) ?? 0) + 1)
    }

    return campaigns
        .map((c) => ({ id: c.id, name: c.name, submissionCount: countByCampaign.get(c.id) ?? 0 }))
        .filter((c) => c.submissionCount > 0)
}

export async function listSubmissionsForScreening(campaignId: string): Promise<AdminSubmissionRow[]> {
    const { data, error } = await supabase
        .from('campaign_submissions')
        .select(
            `id, user_id, campaign_id, campaign_name, video_url, tiktok_url, caption, status, views,
             submitted_at, reviewed_by, reviewed_at, feedback, hidden_from_brand,
             publish_status, tiktok_post_id, posted_at, publish_error,
             creator_profiles!campaign_submissions_creator_fkey ( display_name, full_name )`
        )
        .eq('campaign_id', campaignId)
        .neq('status', 'screening')
        .order('submitted_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map((row: any) => ({
        ...row,
        creator_name: row.creator_profiles?.full_name ?? null,
    })) as AdminSubmissionRow[]
}