import { supabase } from '@/lib/supabase'
import type { CampaignSubmission } from '@/types/submission'

type SubmissionWithContext = CampaignSubmission & {
  campaigns: { name: string; brand_profiles: { brand_name: string | null } | null } | null
  creator_profiles: { display_name: string | null; full_name: string } | null
}

export type AdminSubmissionRow = {
  id: string
  campaignId: string
  campaignName: string
  brandName: string
  creatorName: string
  videoUrl: string
  caption: string | null
  submittedAt: string
}

// Everything sitting in the admin_review gate right now — this is the queue
// Admin actually works from. Nothing here has ever been visible to a brand.
export async function listSubmissionsForAdminReview(): Promise<AdminSubmissionRow[]> {
  const { data, error } = await supabase
    .from('campaign_submissions')
    .select('*, campaigns(name, brand_profiles!campaigns_created_by_brand_fkey(brand_name)), creator_profiles(display_name, full_name)')
    .eq('status', 'admin_review')
    .order('submitted_at', { ascending: true })

  if (error) throw error

  return ((data as SubmissionWithContext[]) ?? []).map((s) => ({
    id: s.id,
    campaignId: s.campaign_id,
    campaignName: s.campaigns?.name ?? 'Campaign',
    brandName: s.campaigns?.brand_profiles?.brand_name ?? 'Brand',
    creatorName: s.creator_profiles?.display_name || s.creator_profiles?.full_name || 'Creator',
    videoUrl: s.video_url,
    caption: s.caption,
    submittedAt: s.submitted_at,
  }))
}

async function getReviewerId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('You must be signed in to review submissions.')
  return data.user.id
}

// Passes the admin gate — the submission becomes visible to the brand for
// the first time here.
export async function adminApproveSubmission(submissionId: string): Promise<void> {
  const reviewerId = await getReviewerId()
  const { error } = await supabase
    .from('campaign_submissions')
    .update({ status: 'pending', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', submissionId)

  if (error) throw error
}

// Rejected before the brand ever sees it (spam, off-brief, wrong format,
// etc. — per the original workflow doc's Admin checklist). Distinct from a
// brand's own rejection later in the flow.
export async function adminRejectSubmission(submissionId: string, feedback: string): Promise<void> {
  const reviewerId = await getReviewerId()
  const { error } = await supabase
    .from('campaign_submissions')
    .update({
      status: 'admin_reject',
      feedback,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) throw error
}
