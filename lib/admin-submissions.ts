import { supabase } from '@/lib/supabase'

export type SubmissionStatus = 'draft' | 'admin_reject' | 'pending' | 'revision_requested' | 'approved' | 'rejected'

export type SubmissionStatusFilter = 'pending' | 'admin_reject' | 'approved' | 'rejected' | 'all'

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
        creator_name: row.creator_profiles?.display_name ?? row.creator_profiles?.full_name ?? null,
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