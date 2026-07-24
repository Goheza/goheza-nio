import { supabase } from '@/lib/supabase'

//@/lib/supabase

export type AdminUserRow = {
  id: string
  userId: string
  type: 'Brand' | 'Creator'
  name: string
  handle: string | null
  country: string | null
  status: 'Active' | 'Suspended' | 'Pending'
  amount: number // spent (brand) or earned (creator)
  joined: string
}

export async function listAllUsersForAdmin(): Promise<AdminUserRow[]> {
  const [{ data: brands, error: brandsError }, { data: creators, error: creatorsError }] = await Promise.all([
    supabase.from('brand_profiles').select('*'),
    supabase.from('creator_profiles').select('*'),
  ])

  if (brandsError) throw brandsError
  if (creatorsError) throw creatorsError

  const brandIds = (brands ?? []).map((b) => b.user_id)
  const creatorIds = (creators ?? []).map((c) => c.user_id)

  const [{ data: brandTx, error: brandTxError }, { data: creatorTx, error: creatorTxError }] = await Promise.all([
    brandIds.length
      ? supabase.from('brand_wallet_transactions').select('brand_id, kind, amount').in('brand_id', brandIds)
      : Promise.resolve({ data: [], error: null }),
    creatorIds.length
      ? supabase.from('creator_wallet_transactions').select('creator_id, kind, amount').in('creator_id', creatorIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (brandTxError) throw brandTxError
  if (creatorTxError) throw creatorTxError

  const spentByBrand = new Map<string, number>()
  for (const t of brandTx ?? []) {
    if (t.kind === 'debit') spentByBrand.set(t.brand_id, (spentByBrand.get(t.brand_id) ?? 0) + Number(t.amount))
  }
  const earnedByCreator = new Map<string, number>()
  for (const t of creatorTx ?? []) {
    if (t.kind === 'credit') earnedByCreator.set(t.creator_id, (earnedByCreator.get(t.creator_id) ?? 0) + Number(t.amount))
  }

  const brandRows: AdminUserRow[] = (brands ?? []).map((b) => ({
    id: `brand-${b.user_id}`,
    userId: b.user_id,
    type: 'Brand',
    name: b.brand_name ?? 'Unnamed brand',
    handle: null,
    country: b.country,
    status: b.account_status === 'suspended' ? 'Suspended' : b.is_verified ? 'Active' : 'Pending',
    amount: spentByBrand.get(b.user_id) ?? 0,
    joined: b.created_at,
  }))

  const creatorRows: AdminUserRow[] = (creators ?? []).map((c) => ({
    id: `creator-${c.user_id}`,
    userId: c.user_id,
    type: 'Creator',
    name: c.display_name || c.full_name,
    handle: c.username ? `@${c.username}` : null,
    country: c.country,
    status: c.account_status === 'suspended' ? 'Suspended' : 'Active',
    amount: earnedByCreator.get(c.user_id) ?? 0,
    joined: c.created_at,
  }))

  return [...brandRows, ...creatorRows].sort(
    (a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime(),
  )
}

// This is the write that fires the brand-verified email trigger built
// earlier (migration 0004) — no extra wiring needed here, Postgres handles
// it automatically the moment this update lands.
export async function verifyBrand(userId: string): Promise<void> {
  const { error } = await supabase.from('brand_profiles').update({ is_verified: true }).eq('user_id', userId)
  if (error) throw error
}

export async function suspendUser(userId: string, type: 'Brand' | 'Creator'): Promise<void> {
  const table = type === 'Brand' ? 'brand_profiles' : 'creator_profiles'
  const { error } = await supabase.from(table).update({ account_status: 'suspended' }).eq('user_id', userId)
  if (error) throw error
}

export async function reactivateUser(userId: string, type: 'Brand' | 'Creator'): Promise<void> {
  const table = type === 'Brand' ? 'brand_profiles' : 'creator_profiles'
  const { error } = await supabase.from(table).update({ account_status: 'active' }).eq('user_id', userId)
  if (error) throw error
}
