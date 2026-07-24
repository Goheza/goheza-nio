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
      user_id: input.creatorId,
      campaign_id: input.campaignId,
      video_url: input.videoUrl,
      file_name: input.fileName,
      file_size: input.fileSize,
      caption: input.caption ?? null,
      tiktok_url: input.tiktokUrl ?? null,
      status: 'admin_review',
    })
    .select()
    .single()

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

export async function getSubmissionForCampaign(campaignId: string, creatorId: string): Promise<CampaignSubmission | null> {
  const { data, error } = await supabase
    .from('campaign_submissions')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('user_id', creatorId)
    .maybeSingle()

  if (error) throw error
  return data as CampaignSubmission | null
}