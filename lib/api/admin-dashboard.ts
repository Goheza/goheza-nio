import { supabase } from '@/lib/supabase'
import { listSubmissionsForAdminReview } from '@/lib/api/admin-submissions'
import { listPendingCreatorPayouts } from '@/lib/api/admin-wallet'

export type AdminActivityKind = 'brand_signup' | 'creator_signup' | 'submission_new'

export type AdminActivityItem = {
  id: string
  kind: AdminActivityKind
  title: string
  meta: string
  time: string // ISO string; format at render time
}

export type AdminDashboardData = {
  activeBrandsCount: number
  brandsAwaitingVerificationCount: number
  activeCreatorsCount: number
  campaignsRunningCount: number
  campaignsAwaitingApprovalCount: number
  submissionsAwaitingReviewCount: number
  pendingPayoutsTotal: number
  pendingPayoutsCreatorCount: number
  recentActivity: AdminActivityItem[]
}

// NOTE: no growth-over-time chart or revenue chart here — those need
// historical time-series data we don't track (the old mock's adminGrowth/
// adminRevenue arrays were entirely fabricated). Same "coming soon"
// placeholder pattern used for Brand/Creator analytics. The "3 fraud
// alerts" badge is dropped entirely — Moderation has no schema, confirmed
// skipped for now.
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    { count: activeBrandsCount },
    { count: brandsAwaitingVerificationCount },
    { count: activeCreatorsCount },
    { count: campaignsRunningCount },
    { count: campaignsAwaitingApprovalCount },
    submissionsAwaitingReview,
    pendingPayouts,
    recentBrands,
    recentCreators,
  ] = await Promise.all([
    supabase.from('brand_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true).eq('account_status', 'active'),
    supabase.from('brand_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false),
    supabase.from('creator_profiles').select('*', { count: 'exact', head: true }).eq('account_status', 'active'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'inreview'),
    listSubmissionsForAdminReview(),
    listPendingCreatorPayouts(),
    supabase.from('brand_profiles').select('brand_name, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('creator_profiles').select('display_name, full_name, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const activity: AdminActivityItem[] = [
    ...(recentBrands.data ?? []).map((b, i) => ({
      id: `brand-${i}-${b.created_at}`,
      kind: 'brand_signup' as const,
      title: 'New brand signed up',
      meta: b.brand_name ?? 'Unnamed brand',
      time: b.created_at,
    })),
    ...(recentCreators.data ?? []).map((c, i) => ({
      id: `creator-${i}-${c.created_at}`,
      kind: 'creator_signup' as const,
      title: 'New creator onboarded',
      meta: c.display_name || c.full_name || 'Creator',
      time: c.created_at,
    })),
    ...submissionsAwaitingReview.slice(0, 5).map((s) => ({
      id: `submission-${s.id}`,
      kind: 'submission_new' as const,
      title: 'New submission awaiting review',
      meta: `${s.creatorName} → ${s.campaignName}`,
      time: s.submittedAt,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10)

  return {
    activeBrandsCount: activeBrandsCount ?? 0,
    brandsAwaitingVerificationCount: brandsAwaitingVerificationCount ?? 0,
    activeCreatorsCount: activeCreatorsCount ?? 0,
    campaignsRunningCount: campaignsRunningCount ?? 0,
    campaignsAwaitingApprovalCount: campaignsAwaitingApprovalCount ?? 0,
    submissionsAwaitingReviewCount: submissionsAwaitingReview.length,
    pendingPayoutsTotal: pendingPayouts.reduce((sum, p) => sum + p.totalPending, 0),
    pendingPayoutsCreatorCount: pendingPayouts.length,
    recentActivity: activity,
  }
}
