import { supabase } from '@/lib/supabase'
import type { PublishStatus } from '@/lib/admin-screening'

// TikTok status types/mapping and the DB-write helpers now live in
// lib/tiktok-status.ts, shared with the creator "check status" flow.
// Re-exported here so existing imports from this file keep working.
export type { TikTokRawStatus, TikTokStatusResponse } from '@/lib/tiktok/tiktok-status'
export {
    mapTikTokStatus,
    recordTikTokUploadStarted,
    recordTikTokStatusResult,
    recordTikTokUploadFailed,
} from '@/lib/tiktok/tiktok-status'

export type TikTokAccountStatus = 'connected' | 'absent'

export type SocialSubmissionRow = {
    id: string
    user_id: string
    campaign_id: string
    campaign_name: string | null
    video_url: string
    tiktok_url: string | null
    caption: string | null
    status: 'approved'
    views: number
    submitted_at: string
    creator_name: string | null
    publish_status: PublishStatus
    tiktok_post_id: string | null
    tiktok_publish_id: string | null
    posted_at: string | null
    publish_error: string | null
    posted_by: string | null
    tiktok_account_status: TikTokAccountStatus
}

export type SocialBrandRow = {
    user_id: string
    brand_name: string | null
    logo_url: string | null
}

export type SocialCampaignRow = {
    id: string
    name: string
    submissionCount: number
}

export type SocialSubmissionDetail = SocialSubmissionRow & {
    brand_name: string | null
    brand_logo_url: string | null
    creator_avatar_url: string | null
    tiktok_access_token: string | null
}

/** Brands that have at least one approved submission ready to post. */
export async function listBrandsWithApprovedSubmissions(): Promise<SocialBrandRow[]> {
    const { data: submissions, error: subsErr } = await supabase
        .from('campaign_submissions')
        .select('campaign_id')
        .eq('status', 'approved')
    if (subsErr) throw subsErr

    const campaignIds = [...new Set((submissions ?? []).map((s) => s.campaign_id))]
    if (campaignIds.length === 0) return []

    const { data: campaigns, error: campaignsErr } = await supabase
        .from('campaigns')
        .select('created_by')
        .in('id', campaignIds)
        .not('status', 'in', '(completed,cancelled,expired)')
    if (campaignsErr) throw campaignsErr

    const brandIds = [...new Set((campaigns ?? []).map((c) => c.created_by).filter(Boolean))] as string[]
    if (brandIds.length === 0) return []

    const { data: brands, error: brandsErr } = await supabase
        .from('brand_profiles')
        .select('user_id, brand_name, logo_url')
        .in('user_id', brandIds)
        .order('brand_name', { ascending: true })
    if (brandsErr) throw brandsErr

    return (brands ?? []) as SocialBrandRow[]
}

export async function listCampaignsWithApprovedSubmissionsForBrand(brandUserId: string): Promise<SocialCampaignRow[]> {
    const { data: campaigns, error: campaignsErr } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('created_by', brandUserId)
        .not('status', 'in', '(completed,cancelled,expired)')
        .order('created_at', { ascending: false })
    if (campaignsErr) throw campaignsErr
    if (!campaigns || campaigns.length === 0) return []

    const campaignIds = campaigns.map((c) => c.id)
    const { data: submissions, error: subsErr } = await supabase
        .from('campaign_submissions')
        .select('campaign_id')
        .in('campaign_id', campaignIds)
        .eq('status', 'approved')
    if (subsErr) throw subsErr

    const countByCampaign = new Map<string, number>()
    for (const s of submissions ?? []) {
        countByCampaign.set(s.campaign_id, (countByCampaign.get(s.campaign_id) ?? 0) + 1)
    }

    return campaigns
        .map((c) => ({ id: c.id, name: c.name, submissionCount: countByCampaign.get(c.id) ?? 0 }))
        .filter((c) => c.submissionCount > 0)
}

export async function listApprovedSubmissionsForCampaign(campaignId: string): Promise<SocialSubmissionRow[]> {
    const { data, error } = await supabase
        .from('campaign_submissions')
        .select(
            `id, user_id, campaign_id, campaign_name, video_url, tiktok_url, caption, status, views,
             submitted_at, publish_status, tiktok_post_id, tiktok_publish_id, posted_at, publish_error, posted_by,
             creator_profiles!campaign_submissions_creator_fkey ( display_name, full_name )`
        )
        .eq('campaign_id', campaignId)
        .eq('status', 'approved')
        .order('submitted_at', { ascending: false })
    if (error) throw error

    const rows = (data ?? []) as any[]
    const userIds = [...new Set(rows.map((r) => r.user_id))]
    const tiktokAccountsByUser = await getTikTokAccountStatusForUsers(userIds)

    return rows.map((row) => ({
        ...row,
        creator_name: row.creator_profiles?.full_name ?? null,
        tiktok_account_status: tiktokAccountsByUser.get(row.user_id) ?? 'absent',
    })) as SocialSubmissionRow[]
}

async function getTikTokAccountStatusForUsers(userIds: string[]): Promise<Map<string, TikTokAccountStatus>> {
    const result = new Map<string, TikTokAccountStatus>()
    if (userIds.length === 0) return result
    const { data, error } = await supabase
        .from('creator_social_accounts')
        .select('user_id')
        .eq('platform', 'tiktok')
        .in('user_id', userIds)
    if (error) throw error
    for (const row of data ?? []) {
        result.set(row.user_id, 'connected')
    }
    return result
}

export async function getSubmissionDetail(submissionId: string): Promise<SocialSubmissionDetail> {
    const { data: submission, error: subErr } = await supabase
        .from('campaign_submissions')
        .select(
            `id, user_id, campaign_id, campaign_name, video_url, tiktok_url, caption, status, views,
             submitted_at, publish_status, tiktok_post_id, tiktok_publish_id, posted_at, publish_error, posted_by,
             creator_profiles!campaign_submissions_creator_fkey ( display_name, full_name, avatar_url ),
             campaigns ( id, name, created_by )`
        )
        .eq('id', submissionId)
        .single()
    if (subErr) throw subErr

    const row = submission as any
    const campaign = row.campaigns as { id: string; name: string; created_by: string } | null

    let brand_name: string | null = null
    let brand_logo_url: string | null = null
    if (campaign?.created_by) {
        const { data: brand, error: brandErr } = await supabase
            .from('brand_profiles')
            .select('brand_name, logo_url')
            .eq('user_id', campaign.created_by)
            .maybeSingle()
        if (brandErr) throw brandErr
        brand_name = brand?.brand_name ?? null
        brand_logo_url = brand?.logo_url ?? null
    }

    const { data: tiktokAccount, error: tiktokErr } = await supabase
        .from('creator_social_accounts')
        .select('access_token')
        .eq('user_id', row.user_id)
        .eq('platform', 'tiktok')
        .maybeSingle()
    if (tiktokErr) throw tiktokErr

    return {
        ...row,
        creator_name: row.creator_profiles?.full_name ?? null,
        creator_avatar_url: row.creator_profiles?.avatar_url ?? null,
        campaign_name: campaign?.name ?? row.campaign_name,
        brand_name,
        brand_logo_url,
        tiktok_account_status: tiktokAccount ? 'connected' : 'absent',
        tiktok_access_token: tiktokAccount?.access_token ?? null,
    } as SocialSubmissionDetail
}

/**
 * Fetches just the TikTok access token for a submission's creator.
 * Used right before calling /api/tiktok/upload or /api/tiktok/status.
 */
export async function getTikTokAccessTokenForSubmission(userId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('creator_social_accounts')
        .select('access_token')
        .eq('user_id', userId)
        .eq('platform', 'tiktok')
        .maybeSingle()
    if (error) throw error
    return data?.access_token ?? null
}