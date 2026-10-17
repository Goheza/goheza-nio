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

// Available / pending as the database computes them (`my_wallet_balance`):
// the same numbers the mobile app shows and `request_withdrawal` enforces.
// Null if the function isn't there, so the local calculation still works.
async function getServerBalance(): Promise<{ available: number; pending: number } | null> {
  const { data, error } = await supabase.rpc('my_wallet_balance')
  if (error) {
    if (error.code === 'PGRST202') return null
    throw error
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return { available: Number(row.available), pending: Number(row.pending) }
}

export async function getWalletSnapshot(creatorId: string): Promise<CreatorWalletSnapshot> {
  const [{ maturedTotal, pendingTotal }, { data: withdrawals, error: withdrawalsError }, server] = await Promise.all([
    getMaturedAndPendingTotals(creatorId),
    supabase
      .from('creator_withdrawals')
      .select('id, amount, status, requested_at, processed_at')
      .eq('user_id', creatorId)
      .order('requested_at', { ascending: false }),
    getServerBalance(),
  ])

  if (withdrawalsError) throw withdrawalsError

  const withdrawnOrInFlight = (withdrawals ?? [])
    .filter((w) => w.status !== 'failed' && w.status !== 'cancelled')
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
    availableBalance: server?.available ?? Math.max(0, maturedTotal - withdrawnOrInFlight),
    pendingBalance: server?.pending ?? pendingTotal,
    totalWithdrawn,
    recentWithdrawals,
  }
}

function formatUgx(n: string | undefined) {
  const value = Number(n)
  return Number.isFinite(value)
    ? new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(value)
    : ''
}

// `request_withdrawal` / `cancel_withdrawal` raise these codes (DETAIL holds
// an amount where one is useful). Same copy as the mobile app.
function withdrawalError(error: { message: string; details?: string | null }): Error {
  const amount = formatUgx(error.details ?? undefined)
  const messages: Record<string, string> = {
    withdraw_below_minimum: `The minimum withdrawal is ${amount}.`,
    withdraw_insufficient: `You can withdraw up to ${amount} right now.`,
    withdraw_daily_limit: `That's over today's withdrawal limit. You can withdraw ${amount} more today.`,
    withdraw_pending_exists: 'You already have a withdrawal in progress. Wait for it to finish or cancel it first.',
    withdraw_no_payout_method: 'Add where your payouts should go (Settings → Payment) before withdrawing.',
    withdraw_mfa_required: 'Confirm your two-factor code again, then try once more.',
    withdraw_suspended: 'Withdrawals are paused on your account. Contact Goheza Support.',
    withdraw_invalid_amount: 'Enter a whole amount in UGX.',
    withdraw_not_cancellable: "This withdrawal is already being processed, so it can't be cancelled.",
    withdraw_no_profile: 'Please sign in again and retry.',
    withdraw_signed_out: 'Please sign in again and retry.',
  }
  return new Error(messages[error.message] ?? error.message)
}

// The database checks balance, minimum, daily limit, payout method and
// "one at a time" (`request_withdrawal`), so the web and the app follow the
// same rules. `creatorId` is kept for callers; the server uses the session.
export async function requestWithdrawal(_creatorId: string, amount: number): Promise<void> {
  if (amount <= 0) throw new Error('Withdrawal amount must be greater than zero.')

  const { error } = await supabase.rpc('request_withdrawal', { p_amount: Math.floor(amount) })
  if (error) throw withdrawalError(error)
}

// Only while it's still `requested` (not yet picked up by an admin).
export async function cancelWithdrawal(withdrawalId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_withdrawal', { p_id: withdrawalId })
  if (error) throw withdrawalError(error)
}