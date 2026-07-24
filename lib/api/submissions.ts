import { supabase } from '@/lib/supabase'
import { BRAND_VISIBLE_SUBMISSION_STATUSES } from '@/lib/api/status-mapping'
import type { CampaignSubmission } from '@/types/submission'

// ============================================================================
// Reads
// ============================================================================

// Submissions for one campaign, filtered to statuses a brand is allowed to
// see (excludes 'draft' and 'admin_reject' — those never leave Admin).
export async function listSubmissionsForCampaign(campaignId: string): Promise<CampaignSubmission[]> {
  const { data, error } = await supabase
    .from('campaign_submissions')
    .select('*')
    .eq('campaign_id', campaignId)
    .in('status', BRAND_VISIBLE_SUBMISSION_STATUSES)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return data as CampaignSubmission[]
}

// All submissions across a brand's campaigns, grouped by campaign — powers
// /brand/submissions. Two queries (campaigns owned by brand, then their
// submissions) rather than a join, since supabase-js keeps this simpler to
// reason about and cache independently.
export async function listSubmissionsForBrand(brandUserId: string): Promise<Record<string, CampaignSubmission[]>> {
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('created_by', brandUserId)

  if (campaignsError) throw campaignsError
  const campaignIds = (campaigns ?? []).map((c) => c.id)
  if (campaignIds.length === 0) return {}

  const { data: submissions, error: submissionsError } = await supabase
    .from('campaign_submissions')
    .select('*')
    .in('campaign_id', campaignIds)
    .in('status', BRAND_VISIBLE_SUBMISSION_STATUSES)
    .order('submitted_at', { ascending: false })

  if (submissionsError) throw submissionsError

  const grouped: Record<string, CampaignSubmission[]> = {}
  for (const s of (submissions ?? []) as CampaignSubmission[]) {
    if (!grouped[s.campaign_id]) grouped[s.campaign_id] = []
    grouped[s.campaign_id].push(s)
  }
  return grouped
}

// ============================================================================
// Decisions
// ============================================================================

async function getReviewerId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error('You must be signed in to review submissions.')
  return data.user.id
}

// Enforces the approval cap server-side (not just disabling the button in
// the UI) — re-checks the current approved count before writing.
export async function approveSubmission(submissionId: string, campaignId: string): Promise<void> {
  const reviewerId = await getReviewerId()

  const [{ data: campaign, error: campaignError }, { data: existingApproved, error: countError }] =
    await Promise.all([
      supabase
        .from('campaigns')
        .select('num_creators, approval_cap, max_pay, remaining_budget_pool')
        .eq('id', campaignId)
        .single(),
      supabase.from('campaign_submissions').select('id').eq('campaign_id', campaignId).eq('status', 'approved'),
    ])

  if (campaignError) throw campaignError
  if (countError) throw countError

  const cap = campaign?.approval_cap ?? campaign?.num_creators ?? 0
  if ((existingApproved?.length ?? 0) >= cap) {
    throw new Error(`Approval limit reached (${cap} creators). Unlock additional slots to approve more.`)
  }

  // .eq('status', 'pending') makes this idempotent — if the submission was
  // already approved (e.g. a double-click, or a retry after a network
  // error), this update matches zero rows instead of approving it (and
  // decrementing the budget) a second time.
  const { data: updated, error } = await supabase
    .from('campaign_submissions')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .eq('status', 'pending')
    .select('id')

  if (error) throw error
  if (!updated || updated.length === 0) {
    throw new Error('This submission is no longer pending — it may have already been reviewed.')
  }

  // Flat/creator-type budget tracking: each approval spends maxPerCreator
  // (campaigns.max_pay) out of the campaign's budget pool. max_pay is
  // stored as text (schema constraint), and is "0" for referral campaigns
  // (which don't have a per-creator max-pay field on the create form), so
  // this naturally no-ops for referral without needing a type check.
  const maxPay = Number(campaign?.max_pay ?? 0)
  if (Number.isFinite(maxPay) && maxPay > 0) {
    const currentRemaining = campaign?.remaining_budget_pool ?? 0
    const newRemaining = Math.max(0, currentRemaining - maxPay)
    const { error: budgetError } = await supabase
      .from('campaigns')
      .update({ remaining_budget_pool: newRemaining })
      .eq('id', campaignId)
    if (budgetError) throw budgetError
  }
}

export async function rejectSubmission(submissionId: string, feedback: string): Promise<void> {
  const reviewerId = await getReviewerId()

  const { error } = await supabase
    .from('campaign_submissions')
    .update({
      status: 'rejected',
      feedback,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) throw error
}

export async function requestRevision(submissionId: string, feedback: string): Promise<void> {
  const reviewerId = await getReviewerId()

  const { error } = await supabase
    .from('campaign_submissions')
    .update({
      status: 'revision_requested',
      feedback,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) throw error
}