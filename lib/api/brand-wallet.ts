import { supabase } from '@/lib/supabase'
import type { Invoice, WalletSnapshot, WalletTransaction } from '@/types/wallet'

// ============================================================================
// Snapshot — available balance is derived from the transaction ledger, not
// stored as a mutable field. Reserved/remaining are derived from campaigns.
// ============================================================================

export async function getWalletSnapshot(brandUserId: string): Promise<WalletSnapshot> {
  const [{ data: transactions, error: txError }, { data: campaigns, error: campaignsError }] =
    await Promise.all([
      supabase.from('brand_wallet_transactions').select('kind, amount').eq('brand_id', brandUserId),
      supabase
        .from('campaigns')
        .select('id, name, status, total_budget_pool, remaining_budget_pool')
        .eq('created_by', brandUserId),
    ])

  if (txError) throw txError
  if (campaignsError) throw campaignsError

  const availableBalance = (transactions ?? []).reduce((sum, t) => {
    return t.kind === 'credit' ? sum + Number(t.amount) : sum - Number(t.amount)
  }, 0)

  const reservedByCampaign = (campaigns ?? []).map((c) => {
    const allocated = c.total_budget_pool ?? 0
    const remaining = c.remaining_budget_pool ?? allocated
    const spent = allocated - remaining
    return {
      id: c.id,
      name: c.name,
      allocated,
      spent,
      remaining,
      active: c.status === 'live' || c.status === 'submission_review',
    }
  })

  const totalReserved = reservedByCampaign.reduce((sum, c) => sum + (c.allocated - c.spent), 0)
  const totalRemaining = reservedByCampaign.reduce((sum, c) => sum + c.remaining, 0)

  return { availableBalance, reservedByCampaign, totalReserved, totalRemaining }
}

// ============================================================================
// Transactions
// ============================================================================

export async function listTransactions(brandUserId: string): Promise<WalletTransaction[]> {
  const { data, error } = await supabase
    .from('brand_wallet_transactions')
    .select('*')
    .eq('brand_id', brandUserId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as WalletTransaction[]
}

// "Add Funds" always writes a transaction — never a direct balance edit.
// Actual payment processing (card charge / invoice) happens before this is
// called; this just records the resulting credit.
export async function addFunds(
  brandUserId: string,
  amount: number,
  description = 'Wallet top-up',
): Promise<WalletTransaction> {
  const { data, error } = await supabase
    .from('brand_wallet_transactions')
    .insert({ brand_id: brandUserId, kind: 'credit', amount, description })
    .select()
    .single()

  if (error) throw error
  return data as WalletTransaction
}

export async function recordCampaignDebit(
  brandUserId: string,
  campaignId: string,
  amount: number,
  description: string,
): Promise<WalletTransaction> {
  const { data, error } = await supabase
    .from('brand_wallet_transactions')
    .insert({ brand_id: brandUserId, kind: 'debit', amount, description, campaign_id: campaignId })
    .select()
    .single()

  if (error) throw error
  return data as WalletTransaction
}

// ============================================================================
// Invoices
// ============================================================================

export async function listInvoices(brandUserId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('brand_invoices')
    .select('*')
    .eq('brand_id', brandUserId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Invoice[]
}
