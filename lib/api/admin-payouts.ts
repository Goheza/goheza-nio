import { supabase } from '@/lib/supabase'

// Creator payouts for admins: the manual work queue (claim → mark paid with a
// reference, or "can't pay"), admin-started payouts, automatic (KaCyber)
// payouts, history and wallets. Reads come from admin_payouts_overview and
// every action is a database function that checks the caller is an admin.

export type PayoutsConfig = Partial<
  Record<'kacyber_auto_payouts' | 'withdraw_minimum' | 'withdraw_daily_max' | 'withdraw_platform_fee_rate', string>
>

export type PayoutsViewer = { user_id: string; role: 'moderator' | 'admin' | 'super_admin'; name: string | null }

/** Full admins (not moderators) can switch automatic payouts and step in on others' claims. */
export const isFullAdmin = (v: PayoutsViewer) => v.role !== 'moderator'

export type PayoutsStats = {
  to_pay_count: number
  to_pay_total: number
  overdue_count: number
  paid_today_count: number
  paid_today_total: number
  auto_issues: number
}

export type AdminWallet = {
  user_id: string
  name: string | null
  email: string | null
  /** Ledger balance (after the platform fee), as the website shows it. */
  available_net: number
  /** What the app shows and what can be paid out: before the platform fee. */
  available_shown: number
  pending_net: number
  earned_gross: number
  withdrawn: number
  payout_method: 'mobile' | 'bank' | null
  mobile_number: string | null
  mobile_name: string | null
  bank_name: string | null
  bank_account: string | null
  bank_account_name: string | null
  kacyber_status: string | null
  kacyber_msisdn: string | null
}

export type WithdrawalStatus = 'requested' | 'processing' | 'paid' | 'failed' | 'cancelled'

export type PayoutDetails = {
  method?: 'mobile_money' | 'bank'
  msisdn?: string
  network?: string
  account_name?: string
  bank_name?: string
  account_number?: string
}

export type AdminWithdrawal = {
  id: string
  user_id: string
  creator: string | null
  email: string | null
  status: WithdrawalStatus
  route: 'manual' | 'kacyber_auto'
  source: string | null
  payout_method: string | null
  payout_details: PayoutDetails | null
  /** The creator's current profile number, for rows without payout_details. */
  profile_number: string | null
  profile_name: string | null
  requested_at: string
  processed_at: string | null
  /** What left the creator's balance, before the platform fee. */
  withdrawn: number
  platform_fee: number | null
  /** Transfer amount (after the platform fee). */
  amount: number
  transfer_fee: number | null
  /** What to send / what arrived. Null when the transfer fee isn't known. */
  payout_net: number | null
  pay_by: string | null
  overdue: boolean
  claimed_by: string | null
  claimed_by_name: string | null
  claimed_at: string | null
  /** Set while an admin-dispatched KaCyber transfer settles. */
  dispatched_by?: string | null
  processed_by_name: string | null
  provider_state: string | null
  provider_transfer_id: string | null
  provider_last_error: string | null
  payout_reference: string | null
  notes: string | null
  /** Which campaigns the money came from. */
  campaigns?: WithdrawalSourceRow[]
}

export type AdminPayoutNotification = {
  id: string
  user_id: string
  role: string
  kind: string
  title: string
  body: string | null
  read: boolean
  created_at: string
  email: string | null
}

export type AdminKacyberEvent = {
  id: number
  received_at: string
  signature_ok: boolean
  withdrawal_id: string | null
  state: string | null
  transfer_id: string | null
}

export type PayoutsOverview = {
  viewer: PayoutsViewer
  config: PayoutsConfig
  stats: PayoutsStats
  wallets: AdminWallet[]
  withdrawals: AdminWithdrawal[]
  notifications: AdminPayoutNotification[]
  events: AdminKacyberEvent[]
}

const MESSAGES: Record<string, string> = {
  not_admin: 'Only admins can do this.',
  not_super_admin: 'Only super admins can change this.',
  withdraw_not_claimable: 'Someone else has already picked this up, or it was cancelled. Refresh the list.',
  withdraw_not_releasable: 'Only the admin paying this (or a super admin) can hand it back.',
  withdraw_not_payable: 'Pick this up ("I\'m paying this") before marking it paid, or it was already handled.',
  withdraw_not_open: 'This withdrawal is already closed. Refresh the list.',
  reference_required: 'Enter the transaction reference from the mobile money or bank receipt.',
  reason_required: 'Tell the creator why it can\'t be paid (at least a few words).',
  invalid_amount: 'Enter a whole amount in UGX.',
  invalid_transfer_fee: 'The transfer fee must be less than the amount sent.',
  creator_not_found: 'That creator has no profile.',
  withdraw_insufficient: 'That\'s more than the creator has earned.',
  campaign_not_releasable: 'Follow-ups have nothing to release.',
  name_required: 'Give the follow-up a name.',
  no_creators: 'Pick at least one creator.',
  original_not_same_brand: 'All originals must belong to the same brand.',
  invalid_kind: 'Choose top-up, withdrawal or adjustment.',
}

function friendly(error: { message: string; code?: string }): Error {
  if (error.code === 'PGRST202') {
    return new Error('The payouts database functions are missing. Apply the payouts migrations.')
  }
  const key = Object.keys(MESSAGES).find((k) => error.message.includes(k))
  return new Error(key ? MESSAGES[key] : error.message)
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw friendly(error)
  return data as T
}

export function getPayoutsOverview(search?: string): Promise<PayoutsOverview> {
  return call<PayoutsOverview>('admin_payouts_overview', { p_search: search?.trim() || null, p_limit: 200 })
}

/** "I'm paying this": moves a manual withdrawal to Sending under your name. */
export function claimWithdrawal(id: string) {
  return call('admin_claim_withdrawal', { p_id: id })
}

/** Hands a withdrawal you picked up back to the queue. */
export function releaseWithdrawal(id: string) {
  return call('admin_release_withdrawal', { p_id: id })
}

export function markWithdrawalPaid(id: string, reference: string, amountSent?: number) {
  return call('admin_mark_withdrawal_paid', { p_id: id, p_reference: reference, p_amount_sent: amountSent ?? null })
}

/** Can't pay: the creator sees [reason] and gets the money back in their balance. */
export function failWithdrawal(id: string, reason: string) {
  return call('admin_fail_withdrawal', { p_id: id, p_reason: reason })
}

/** A payout the admin already sent outside a creator request. */
export function createPayout(input: {
  creatorId: string
  amount: number
  reference: string
  transferFee: number
  notes?: string
}) {
  return call('admin_create_payout', {
    p_user_id: input.creatorId,
    p_amount: input.amount,
    p_reference: input.reference,
    p_transfer_fee: input.transferFee,
    p_notes: input.notes ?? null,
  })
}

export function setAutoPayouts(on: boolean) {
  return call<string>('admin_set_auto_payouts', { p_on: on })
}

/** Where to send a manual withdrawal: network/bank, number and the name on it. */
export function sendTo(w: AdminWithdrawal): { kind: 'mobile' | 'bank'; label: string; number: string; name: string } {
  const d = w.payout_details ?? {}
  if (d.method === 'bank') {
    return {
      kind: 'bank',
      label: d.bank_name || 'Bank',
      number: d.account_number || '—',
      name: d.account_name || w.creator || '—',
    }
  }
  const raw = d.msisdn || w.profile_number || ''
  return {
    kind: 'mobile',
    label: d.network ? `${d.network} Mobile Money` : 'Mobile Money',
    number: formatPhone(raw),
    name: d.account_name || w.profile_name || w.creator || '—',
  }
}

/** 256769163990 / +256769163990 → 0769 163 990 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const local = digits.startsWith('256') ? `0${digits.slice(3)}` : digits
  return local.length === 10 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : raw || '—'
}

export function formatMoney(amount: number | null | undefined) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount)
}

/* ---------------------------------------------------------------- Dispatch */

export type DispatchStatus = { mode: 'fake' | 'live'; enabled: boolean }

/** Whether "Dispatch payment" can be used (only when KaCyber is live). */
export async function getDispatchStatus(): Promise<DispatchStatus> {
  const { data, error } = await supabase.functions.invoke('kacyber-dispatch', { body: { action: 'status' } })
  if (error) return { mode: 'fake', enabled: false }
  return data as DispatchStatus
}

const DISPATCH_ERRORS: Record<string, string> = {
  not_live: 'Dispatch is available once KaCyber payments are live.',
  not_mobile_money: 'Only mobile money withdrawals can be dispatched. Pay bank withdrawals by hand.',
  claimed_by_other: 'Another admin is paying this one.',
  not_open: 'This withdrawal is already closed.',
  changed: 'This withdrawal just changed. Refresh and try again.',
  not_admin: 'Only admins can dispatch payments.',
}

export type DispatchResult = {
  outcome: 'paid' | 'dispatched' | 'returned' | 'awaiting_float' | 'retry_later'
  transferId?: string
  reason?: string
}

/** Sends a manual mobile money withdrawal through KaCyber. */
export async function dispatchWithdrawal(id: string): Promise<DispatchResult> {
  const { data, error } = await supabase.functions.invoke('kacyber-dispatch', { body: { withdrawal_id: id } })
  if (error) {
    let code = ''
    try {
      code = (await (error as { context?: Response }).context?.json())?.error ?? ''
    } catch {
      // not JSON
    }
    throw new Error(DISPATCH_ERRORS[code] ?? 'Dispatch failed. Try again, or pay it by hand.')
  }
  return data as DispatchResult
}

/* ----------------------------------------------------------- Wallet detail */

export type CreatorWalletDetail = {
  viewer: PayoutsViewer
  profile: {
    user_id: string
    name: string | null
    full_name: string | null
    username: string | null
    email: string | null
    phone: string | null
    avatar_url: string | null
    country: string | null
    account_status: string | null
    payment_trigger: string | null
    payout_method: 'mobile' | 'bank' | null
    mobile_number: string | null
    mobile_name: string | null
    bank_name: string | null
    bank_account: string | null
    bank_account_name: string | null
  }
  kacyber: {
    status: string
    msisdn: string
    network: string
    registered_name: string | null
    nin_last4: string | null
    verified_at: string | null
  } | null
  balance: {
    available_net: number
    available_shown: number
    pending_net: number
    pending_shown: number
    earned_gross: number
    paid_out: number
    in_flight: number
    fee_rate: number
  }
  earnings: {
    id: string
    campaign: string | null
    campaign_id: string
    views: number
    gross: number
    net: number
    status: 'accruing' | 'settled' | 'paid'
    created_at: string
  }[]
  withdrawals: AdminWithdrawal[]
  notifications: { id: string; kind: string; title: string; body: string | null; read: boolean; created_at: string }[]
}

export function getCreatorWallet(userId: string): Promise<CreatorWalletDetail> {
  return call<CreatorWalletDetail>('admin_creator_wallet', { p_user_id: userId })
}

/** Verified = active KaCyber account: withdrawals are paid automatically. */
export const isVerified = (status: string | null | undefined) => status === 'active'

/* ------------------------------------------- Campaign payouts & follow-ups */

export type WithdrawalSourceRow = { campaign_id: string; name: string; amount: number; requested_amount: number | null }

/** What a paying campaign still owes creators, before the fee (as creators see it). */
export type OwedCampaign = {
  id: string
  name: string
  brand: string | null
  released: boolean
  available: number
  awaiting_release: number
  pending: number
  withdrawn: number
  creators: number
}

export type WalletEntry = {
  id: string
  kind: 'top_up' | 'withdrawal' | 'adjustment'
  amount: number
  reference: string | null
  note: string | null
  created_at: string
  created_by_name: string | null
}

/** Money that moved: top-ups, money taken out and paid payouts. */
export type StatementRow = {
  id: string
  at: string
  kind: WalletEntry['kind'] | 'payout'
  label: string
  detail: string | null
  reference: string | null
  /** Signed: + into the float, − out. */
  amount: number
  /** False for payouts made by hand outside KaCyber. */
  from_float: boolean
  by: string | null
}

export type PlatformWallet = {
  viewer: { role: PayoutsViewer['role'] }
  fee_rate: number
  /** owed_* are ledger (after-fee) amounts; the rest is money as paid. */
  totals: {
    topped_up: number
    taken_out: number
    paid_kacyber: number
    paid_manual: number
    in_flight: number
    owed_released: number
    owed_unreleased: number
  }
  statement: StatementRow[]
  campaigns: OwedCampaign[]
}

export function getPlatformWallet(): Promise<PlatformWallet> {
  return call<PlatformWallet>('admin_platform_wallet', {})
}

export type MerchantWalletBalance = {
  available: number
  currency: string
  fetched_at: string
}

export async function getMerchantWalletBalance(): Promise<MerchantWalletBalance> {
  const { data, error } = await supabase.functions.invoke('kacyber-merchant-wallet', { body: undefined })
  if (error) {
    let code = ''
    let providerCode = ''
    let providerStatus: number | null = null
    try {
      const response = (error as { context?: Response }).context
      const body = await response?.json()
      code = body?.error ?? ''
      providerCode = body?.provider_code ?? ''
      providerStatus = body?.provider_status ?? null
    } catch {
      // The function may return a non-JSON error when unavailable.
    }
    if (code === 'not_live') throw new Error('KaCyber is not in live mode.')
    if (code === 'not_configured') throw new Error('KaCyber wallet credentials are not configured.')
    if (code === 'not_admin') throw new Error('Only admins can view the KaCyber wallet.')
    if (code === 'provider_credentials_rejected')
      throw new Error('KaCyber rejected the wallet credentials or application ID.')
    if (code === 'wallet_endpoint_not_found')
      throw new Error('KaCyber wallet endpoint was not found for this application.')
    if (code === 'invalid_provider_response')
      throw new Error('KaCyber returned an unexpected wallet response.')
    if (code === 'provider_unavailable')
      throw new Error(
        `KaCyber wallet request failed (${providerCode || 'unknown'}${providerStatus ? `, HTTP ${providerStatus}` : ''}).`,
      )
    throw new Error(`Could not load the live KaCyber wallet balance${error.message ? `: ${error.message}` : '.'}`)
  }
  return data as MerchantWalletBalance
}

export type FollowUpCreator = {
  creator_id: string
  name: string | null
  follow_up_views: number
  total_views: number | null
  target: number | null
  target_met: boolean | null
}

/** One campaign's payouts and follow-ups, for its admin panel. Money is before the fee. */
export type CampaignPayouts = {
  campaign: {
    id: string
    name: string
    brand_id: string | null
    views_only: boolean
    released: boolean
    released_at: string | null
    target: number | null
  }
  money: { available: number; awaiting_release: number; pending: number; withdrawn: number }
  follow_ups: {
    id: string
    name: string
    status: string
    created_at: string
    deadline: string | null
    created_by: string | null
    creators: FollowUpCreator[] | null
  }[]
  /** Creators with an approved video here who are short of the target. */
  short: number
  /** Of those, how many no follow-up has invited yet. */
  short_not_invited: number
  /** Only for a follow-up: the campaigns its creators count toward. */
  counts_toward: { id: string; name: string }[] | null
  /** Same-brand paying campaigns a new follow-up could count toward. */
  brand_campaigns: { id: string; name: string }[]
}

export function getCampaignPayouts(campaignId: string): Promise<CampaignPayouts> {
  return call<CampaignPayouts>('admin_campaign_payouts', { p_campaign_id: campaignId })
}

export function setCampaignPayoutsReleased(campaignId: string, released: boolean) {
  return call('admin_set_campaign_payouts_released', { p_campaign_id: campaignId, p_released: released })
}

export function recordWalletEntry(input: { kind: WalletEntry['kind']; amount: number; reference: string; note?: string }) {
  return call('admin_record_wallet_entry', {
    p_kind: input.kind,
    p_amount: input.amount,
    p_reference: input.reference,
    p_note: input.note ?? null,
  })
}

export type FollowUpCandidate = {
  creator_id: string
  name: string | null
  email: string | null
  original_id: string
  original_name: string
  total_views: number
  target: number | null
  target_met: boolean | null
  /** The follow-up that already invited them for this original, if any. */
  in_follow_up: string | null
}

export function getFollowUpCandidates(originalIds: string[]): Promise<FollowUpCandidate[]> {
  return call<FollowUpCandidate[]>('admin_follow_up_candidates', { p_original_ids: originalIds })
}

export function createFollowUp(input: {
  name: string
  description?: string
  deadline: string | null
  assignments: { creator_id: string; counts_toward: string }[]
}) {
  return call('admin_create_follow_up', {
    p_name: input.name,
    p_description: input.description ?? null,
    p_deadline: input.deadline,
    p_assignments: input.assignments,
  })
}

export type CampaignPerson = {
  creator_id: string
  name: string | null
  email: string | null
  tiktok: string | null
  applied_at: string | null
  status: string
  admin_status: string | null
  /** Added by an admin (private campaign or follow-up) rather than applying. */
  invited: boolean
  added_by: string | null
  /** Read a notification about this campaign; null when they never got one. */
  invite_seen: boolean | null
  /** Originals: the follow-ups this creator was invited to. */
  in_follow_ups: { id: string; name: string }[] | null
  /** Follow-ups: the original this creator's views count toward. */
  counts_toward: { id: string; name: string } | null
  videos: number
  approved_videos: number
  views_here: number
  last_submitted_at: string | null
  /** Progress on the campaign that pays (the original, for a follow-up). */
  total_views: number | null
  target: number | null
  target_met: boolean | null
  submissions: { id: string; status: string; views: number | null; submitted_at: string | null; url: string | null }[] | null
}

/** Full campaign page: who created and runs it, and everyone on it. */
export type CampaignPeople = {
  campaign: {
    id: string
    name: string
    status: string
    views_only: boolean
    is_private: boolean
    payout: string | null
    created_at: string
    submission_deadline: string | null
    target: number | null
    brand: string | null
    created_by_admin: string | null
    approved_by: string | null
    reviewed_by: string | null
    payouts_released_at: string | null
    payouts_released_by: string | null
  }
  creators: CampaignPerson[]
}

export function getCampaignPeople(campaignId: string): Promise<CampaignPeople> {
  return call<CampaignPeople>('admin_campaign_people', { p_campaign_id: campaignId })
}
