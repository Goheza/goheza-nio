import { supabase } from '@/lib/supabase'
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
// NOTE: status starts at 'admin_review', not 'pending' — a submission is
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
