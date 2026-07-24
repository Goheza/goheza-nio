import { supabase } from '@/lib/supabase'

export type PendingPayoutRow = {
  creatorId: string
  creatorName: string
  transactionIds: string[]
  totalPending: number
}

// Groups every pending (unsettled) creator earning by creator — this is
// the weekly payout batch the workflow doc describes Admin processing.
// Treasury actions (manual top-up/freeze/refund) are intentionally not
// built here — confirmed skipped for now.
export async function listPendingCreatorPayouts(): Promise<PendingPayoutRow[]> {
  const { data, error } = await supabase
    .from('creator_wallet_transactions')
    .select('id, creator_id, amount, creator_profiles(display_name, full_name)')
    .eq('kind', 'credit')
    .eq('status', 'pending')

  if (error) throw error

  type Row = {
    id: string
    creator_id: string
    amount: number
    creator_profiles: { display_name: string | null; full_name: string } | null
  }

  const grouped = new Map<string, PendingPayoutRow>()
  for (const t of (data as Row[]) ?? []) {
    const existing = grouped.get(t.creator_id)
    const name = t.creator_profiles?.display_name || t.creator_profiles?.full_name || 'Creator'
    if (existing) {
      existing.transactionIds.push(t.id)
      existing.totalPending += Number(t.amount)
    } else {
      grouped.set(t.creator_id, {
        creatorId: t.creator_id,
        creatorName: name,
        transactionIds: [t.id],
        totalPending: Number(t.amount),
      })
    }
  }

  return Array.from(grouped.values()).sort((a, b) => b.totalPending - a.totalPending)
}

// Settles every pending transaction for one creator in a single batch —
// moves them from pending to settled, which is what makes that money show
// up in the creator's "Available Balance" (see creator-wallet.ts).
export async function settleCreatorPayouts(transactionIds: string[]): Promise<void> {
  if (transactionIds.length === 0) return
  const { error } = await supabase
    .from('creator_wallet_transactions')
    .update({ status: 'settled', settled_at: new Date().toISOString() })
    .in('id', transactionIds)

  if (error) throw error
}
