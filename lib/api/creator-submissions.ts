import { supabase } from '@/lib/supabase'
import { recordTikTokStatusResult, type TikTokStatusResponse } from '@/lib/tiktok/tiktok-status'
import type { CampaignSubmission } from '@/types/submission'

export type SubmitContentInput = {
    campaignId: string
    creatorId: string
    videoUrl: string
    fileName: string
    fileSize: number
    caption?: string
    tiktokUrl?: string
    videoPath: string
    videoBucket: string
}

// NOTE: this does not yet handle `platform` or a generated `thumb` — those
// columns don't exist on campaign_submissions (open gap flagged repeatedly
// since the Brand submissions work). video_url/tiktok_url are the closest
// existing fields. Revisit once that schema decision is made.
// NOTE: status starts at 'screening', not 'pending' — a submission is
// invisible to the brand until Admin clears it. This was previously wrong
// (submitted straight to 'pending', which brands could already see) —
// fixed as part of the Admin v2 migration.
export async function submitContent(input: SubmitContentInput): Promise<CampaignSubmission> {
    const { data, error } = await supabase
        .from('campaign_submissions')
        .insert({
            video_path: input.videoPath,
            user_id: input.creatorId,
            campaign_id: input.campaignId,
            video_url: input.videoUrl,
            file_name: input.fileName,
            file_size: input.fileSize,
            caption: input.caption ?? null,
            tiktok_url: input.tiktokUrl ?? null,
            status: 'screening',
            video_bucket: input.videoBucket,
        })
        .select()
        .single()

    console.log(error)

    if (error) throw error
    return data as CampaignSubmission
}

export async function listSubmissionsForCreator(creatorId: string): Promise<CampaignSubmission[]> {
    const { data, error } = await supabase
        .from('campaign_submissions')
        .select('*')
        .eq('user_id', creatorId)
        .order('submitted_at', { ascending: false })

    if (error) throw error
    return data as CampaignSubmission[]
}

export async function getSubmissionForCampaign(
    campaignId: string,
    creatorId: string
): Promise<CampaignSubmission | null> {
    const { data, error } = await supabase
        .from('campaign_submissions')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', creatorId)
        .maybeSingle()

    if (error) throw error
    return data as CampaignSubmission | null
}

export type ResubmitContentInput = {
    submissionId: string
    videoUrl: string
    fileName: string
    fileSize: number
    caption?: string
    tiktokUrl?: string
    videoPath: string
    videoBucket: string
}

// Used when a creator resubmits after 'revision_requested'. Updates the
// existing row in place (same id) rather than inserting a new one, and
// resets status to 'pending' so it re-enters brand review. Clears the old
// feedback so a stale rejection reason doesn't linger next to new content.
export async function resubmitContent(input: ResubmitContentInput): Promise<CampaignSubmission> {
    const { data, error } = await supabase
        .from('campaign_submissions')
        .update({
            video_path: input.videoPath,
            video_url: input.videoUrl,
            file_name: input.fileName,
            file_size: input.fileSize,
            caption: input.caption ?? null,
            tiktok_url: input.tiktokUrl ?? null,
            status: 'pending',
            video_bucket: input.videoBucket,
            feedback: null,
            submitted_at: new Date().toISOString(),
        })
        .eq('id', input.submissionId)
        .select()
        .single()

    if (error) throw error
    return data as CampaignSubmission
}

/**
 * Fetches the current creator's own TikTok access token. Client-side and
 * RLS-scoped — a creator can only ever read their own row here, so no
 * separate admin-style helper is needed.
 */
export async function getMyTikTokAccessToken(creatorId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('creator_social_accounts')
        .select('access_token')
        .eq('user_id', creatorId)
        .eq('platform', 'tiktok')
        .maybeSingle()
    if (error) throw error
    return data?.access_token ?? null
}

/**
 * Lets a creator manually check the progress of their own submission's
 * TikTok post. Only meaningful once an admin has already kicked off a post
 * (i.e. tiktok_publish_id is set) — callers should gate the "Check status"
 * button on that, plus status === 'approved'.
 *
 * Returns the raw TikTok status response so the page can react to
 * SEND_TO_USER_INBOX specifically (show the "finish it in the TikTok app"
 * guide) — that distinction isn't persisted to publish_status, which only
 * has room for not_posted/processing/posted/failed, so it only exists for
 * the moment right after this call resolves.
 */
export async function checkTikTokStatusForSubmission(
    submission: Pick<CampaignSubmission, 'id' | 'user_id' | 'tiktok_publish_id'>
): Promise<TikTokStatusResponse> {
    if (!submission.tiktok_publish_id) {
        throw new Error('This submission has not been posted to TikTok yet.')
    }

    const accessToken = await getMyTikTokAccessToken(submission.user_id)
    if (!accessToken) {
        throw new Error('No connected TikTok account found.')
    }

    const res = await fetch('/api/tiktok/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, publishId: submission.tiktok_publish_id }),
    })
    const data: TikTokStatusResponse = await res.json()

    if (!res.ok) {
        throw new Error('Failed to fetch TikTok status. Please try again.')
    };

    

    await recordTikTokStatusResult(submission.id, data)
    return data
}