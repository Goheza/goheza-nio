import { supabase } from '@/lib/supabase'
import { computeEarnings, computeRequiredViews } from '@/lib/config/payout-rules'

type SubmissionForSync = {
  id: string
  user_id: string
  campaign_id: string
  views: number
  publish_status: string
}

export async function syncEarningsForSubmission(submissionId: string): Promise<void> {
  const { data: submission, error: submissionError } = await supabase
    .from('campaign_submissions')
    .select('id, user_id, campaign_id, views, publish_status')
    .eq('id', submissionId)
    .maybeSingle()

  if (submissionError) throw submissionError
  if (!submission) return

  const sub = submission as SubmissionForSync
  if (sub.publish_status !== 'posted') return

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('created_by, max_pay')
    .eq('id', sub.campaign_id)
    .maybeSingle()

  if (campaignError) throw campaignError
  const brandUserId = campaign?.created_by ?? null
  if (!brandUserId) return

  // max_pay is stored as text — parse defensively, treat unparsable/absent as uncapped.
  const maxPayGross = campaign?.max_pay ? Number(campaign.max_pay) : null
  const hasCap = maxPayGross !== null && !Number.isNaN(maxPayGross) && maxPayGross > 0
  const requiredViews = hasCap ? computeRequiredViews(maxPayGross!) : null

  let effectiveViews = sub.views

  if (hasCap) {
    // Sum views already attributed to this creator's OTHER submissions on
    // this campaign, so the total across all of them never exceeds the cap.
    const { data: otherRows, error: otherError } = await supabase
      .from('creator_earnings')
      .select('views_counted')
      .eq('user_id', sub.user_id)
      .eq('campaign_id', sub.campaign_id)
      .neq('submission_id', sub.id)

    if (otherError) throw otherError

    const otherViews = (otherRows ?? []).reduce((sum, r) => sum + Number(r.views_counted), 0)
    const remainingCap = Math.max(0, requiredViews! - otherViews)
    effectiveViews = Math.min(sub.views, remainingCap)
  }

  const { gross, platformFee, net } = computeEarnings(effectiveViews)

  const { data: existing, error: existingError } = await supabase
    .from('creator_earnings')
    .select('id, status')
    .eq('submission_id', sub.id)
    .maybeSingle()

  if (existingError) throw existingError

  if (!existing) {
    const { error: insertError } = await supabase.from('creator_earnings').insert({
      submission_id: sub.id,
      user_id: sub.user_id,
      campaign_id: sub.campaign_id,
      brand_user_id: brandUserId,
      views_counted: effectiveViews,
      gross_amount: gross,
      platform_fee: platformFee,
      net_amount: net,
      status: 'accruing',
    })
    if (insertError) throw insertError
    return
  }

  if (existing.status !== 'accruing') return

  const { error: updateError } = await supabase
    .from('creator_earnings')
    .update({
      views_counted: effectiveViews,
      gross_amount: gross,
      platform_fee: platformFee,
      net_amount: net,
    })
    .eq('id', existing.id)

  if (updateError) throw updateError
}

export async function syncEarningsForSubmissions(submissionIds: string[]): Promise<void> {
  for (const id of submissionIds) {
    await syncEarningsForSubmission(id)
  }
}