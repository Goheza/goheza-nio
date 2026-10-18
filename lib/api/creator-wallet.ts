import { supabase } from '@/lib/supabase'
import type { CreatorWalletSnapshot, CreatorWithdrawal } from '@/types/creator-wallet'
import { isMatured, type PaymentTrigger } from '@/lib/earnings-maturity'

type EarningRow = {
  net_amount: number
  views_counted: number
  created_at: string
  status: string
  campaign_id: string
}

type CampaignRow = {
  id: string
  status: string
  live_ends_at: string | null
}

async function getMaturedAndPendingTotals(creatorId: string) {
  const [{ data: profile, error: profileError }, { data: earnings, error: earningsError }] = await Promise.all([
    supabase.from('creator_profiles').select('payment_trigger').eq('user_id', creatorId).maybeSingle(),
    supabase
      .from('creator_earnings')
      .select('net_amount, views_counted, created_at, status, campaign_id')
      .eq('user_id', creatorId),
  ])

  if (profileError) throw profileError
  if (earningsError) throw earningsError

  const trigger = (profile?.payment_trigger ?? 'required_views') as PaymentTrigger
  const rows = (earnings ?? []) as EarningRow[]

  // Only need campaign lookups for the campaign_end trigger — skip the
  // extra query entirely for the other three.
  let campaignById = new Map<string, CampaignRow>()
  if (trigger === 'campaign_end' && rows.length > 0) {
    const campaignIds = Array.from(new Set(rows.map((r) => r.campaign_id)))
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, status, live_ends_at')
      .in('id', campaignIds)
    if (campaignsError) throw campaignsError
    campaignById = new Map((campaigns ?? []).map((c) => [c.id, c as CampaignRow]))
  }

  let maturedTotal = 0
  let pendingTotal = 0 // view-eligible or not, just not yet withdrawable

  for (const row of rows) {
    if (row.status === 'paid') continue // already paid out, excluded from both buckets

    const campaign = campaignById.get(row.campaign_id)
    const matured = isMatured(
      { viewsCounted: row.views_counted, createdAt: row.created_at },
      trigger,
      campaign ? { status: campaign.status, liveEndsAt: campaign.live_ends_at } : undefined
    )

    if (matured) {
      maturedTotal += Number(row.net_amount)
    } else {
      pendingTotal += Number(row.net_amount)
    }
  }

  return { maturedTotal, pendingTotal, trigger }
}

export async function getWalletSnapshot(creatorId: string): Promise<CreatorWalletSnapshot> {
  const [{ maturedTotal, pendingTotal }, { data: withdrawals, error: withdrawalsError }] = await Promise.all([
    getMaturedAndPendingTotals(creatorId),
    supabase
      .from('creator_withdrawals')
      .select('id, amount, status, requested_at, processed_at')
      .eq('user_id', creatorId)
      .order('requested_at', { ascending: false }),
  ])

  if (withdrawalsError) throw withdrawalsError

  const withdrawnOrInFlight = (withdrawals ?? [])
    .filter((w) => w.status !== 'failed')
    .reduce((sum, w) => sum + Number(w.amount), 0)

  const totalWithdrawn = (withdrawals ?? [])
    .filter((w) => w.status === 'paid')
    .reduce((sum, w) => sum + Number(w.amount), 0)

  const recentWithdrawals: CreatorWithdrawal[] = (withdrawals ?? []).slice(0, 5).map((w) => ({
    id: w.id,
    amount: Number(w.amount),
    status: w.status as CreatorWithdrawal['status'],
    requestedAt: w.requested_at,
    processedAt: w.processed_at,
  }))

  return {
    availableBalance: Math.max(0, maturedTotal - withdrawnOrInFlight),
    pendingBalance: pendingTotal,
    totalWithdrawn,
    recentWithdrawals,
  }
}

export async function requestWithdrawal(creatorId: string, amount: number): Promise<void> {
  if (amount <= 0) throw new Error('Withdrawal amount must be greater than zero.')

  const snapshot = await getWalletSnapshot(creatorId)
  if (amount > snapshot.availableBalance) {
    throw new Error('This amount exceeds what is currently available to withdraw.')
  }

  const { error } = await supabase.from('creator_withdrawals').insert({
    user_id: creatorId,
    amount,
    status: 'requested',
  })

  if (error) throw error
}