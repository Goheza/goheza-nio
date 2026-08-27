import { supabase } from '@/lib/supabase'

export type AdminPendingWithdrawal = {
  id: string
  creatorId: string
  creatorName: string
  amount: number
  status: 'requested' | 'processing'
  requestedAt: string
  paymentTrigger: 'required_views' | 'weekly' | 'monthly' | 'campaign_end' | null
}

export async function listPendingWithdrawals(): Promise<AdminPendingWithdrawal[]> {
  const { data: withdrawals, error } = await supabase
    .from('creator_withdrawals')
    .select('id, user_id, amount, status, requested_at')
    .in('status', ['requested', 'processing'])
    .order('requested_at', { ascending: true })

  if (error) throw error
  const rows = withdrawals ?? []
  if (rows.length === 0) return []

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)))
  const { data: profiles, error: profilesError } = await supabase
    .from('creator_profiles')
    .select('user_id, display_name, full_name, payment_trigger')
    .in('user_id', userIds)

  if (profilesError) throw profilesError
  const profileByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p]))

  return rows.map((r) => {
    const profile = profileByUserId.get(r.user_id)
    return {
      id: r.id,
      creatorId: r.user_id,
      creatorName: profile?.display_name || profile?.full_name || 'Creator',
      amount: Number(r.amount),
      status: r.status as 'requested' | 'processing',
      requestedAt: r.requested_at,
      paymentTrigger: (profile?.payment_trigger as AdminPendingWithdrawal['paymentTrigger']) ?? null,
    }
  })
}

export async function settleWithdrawal(withdrawalId: string, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('creator_withdrawals')
    .update({
      status: 'paid',
      processed_by: adminId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', withdrawalId)

  if (error) throw error
}