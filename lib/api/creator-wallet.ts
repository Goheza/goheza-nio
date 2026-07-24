import { supabase } from '@/lib/supabase'
import type { CreatorWalletSnapshot, CreatorWalletTransaction } from '@/types/wallet'

// ============================================================================
// Snapshot — balances are derived from the transaction ledger.
//
// Available balance = settled credits - settled debits
// Pending balance   = pending credits
// ============================================================================

export async function getWalletSnapshot(
  creatorUserId: string,
): Promise<CreatorWalletSnapshot> {
  const { data: transactions, error } = await supabase
    .from('creator_wallet_transactions')
    .select('kind, status, amount')
    .eq('creator_id', creatorUserId)

  if (error) throw error

  const availableBalance = (transactions ?? []).reduce((sum, t) => {
    if (t.status !== 'settled') return sum

    return t.kind === 'credit'
      ? sum + Number(t.amount)
      : sum - Number(t.amount)
  }, 0)

  const pendingBalance = (transactions ?? []).reduce((sum, t) => {
    if (t.status !== 'pending') return sum
    if (t.kind !== 'credit') return sum

    return sum + Number(t.amount)
  }, 0)


  /**
   * Will be implemented
   */
  const totalWithdrawn = 0;

  return {
    availableBalance,
    pendingBalance,
    totalWithdrawn
  }
}

// ============================================================================
// Transactions
// ============================================================================

export async function listTransactions(
  creatorUserId: string,
): Promise<CreatorWalletTransaction[]> {
  const { data, error } = await supabase
    .from('creator_wallet_transactions')
    .select('*')
    .eq('creator_id', creatorUserId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data as CreatorWalletTransaction[]
}

// ============================================================================
// Credits
//
// Records a creator earning.
//
// By default earnings are created as 'pending'. A future settlement job can
// update them to 'settled' once the payout window has passed.
// ============================================================================

export async function recordCredit(
  creatorUserId: string,
  amount: number,
  description: string,
  submissionId?: string,
): Promise<CreatorWalletTransaction> {
  const { data, error } = await supabase
    .from('creator_wallet_transactions')
    .insert({
      creator_id: creatorUserId,
      kind: 'credit',
      status: 'pending',
      amount,
      description,
      submission_id: submissionId ?? null,
    })
    .select()
    .single()

  if (error) throw error

  return data as CreatorWalletTransaction
}

// ============================================================================
// Debits
//
// Withdrawals are always settled immediately because they draw from the
// creator's available balance.
// ============================================================================

export async function recordDebit(
  creatorUserId: string,
  amount: number,
  description: string,
): Promise<CreatorWalletTransaction> {
  const { data, error } = await supabase
    .from('creator_wallet_transactions')
    .insert({
      creator_id: creatorUserId,
      kind: 'debit',
      status: 'settled',
      amount,
      description,
    })
    .select()
    .single()

  if (error) throw error

  return data as CreatorWalletTransaction
}

export async function requestWithdrawal(userId:string,amount:number) {
  /**
   * To be implemented
   */
}