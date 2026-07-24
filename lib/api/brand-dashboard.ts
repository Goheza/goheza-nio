import { supabase } from '@/lib/supabase'
import { listCampaignsWithStats } from '@/lib/api/campaigns'
import { getWalletSnapshot } from '@/lib/api/brand-wallet'
import { listNotifications } from '@/lib/api/notifications'
import type { CampaignSummary } from '@/types/campaign'
import type { WalletSnapshot } from '@/types/wallet'
import type { Notification } from '@/types/notification'
import type { CampaignSubmission } from '@/types/submission'
import { BRAND_VISIBLE_SUBMISSION_STATUSES } from '@/lib/api/status-mapping'

export type BrandDashboardData = {
  brandName: string
  activeCampaignsCount: number
  pendingSubmissionsCount: number
  approvedVideosCount: number
  totalSpend: number
  totalViews: number
  wallet: WalletSnapshot
  campaigns: CampaignSummary[]
  recentSubmissions: CampaignSubmission[]
  notifications: Notification[]
}

// NOTE: does not include a views-over-time series (brandViewsTrend in the
// mock data). That depends on the analytics ingestion pipeline, which is
// being handled separately — see open thread from the analytics discussion.
export async function getBrandDashboardData(brandUserId: string): Promise<BrandDashboardData> {
  const [{ data: profile }, campaigns, wallet, notifications, recentSubmissions] = await Promise.all([
    supabase.from('brand_profiles').select('brand_name').eq('user_id', brandUserId).maybeSingle(),
    listCampaignsWithStats(brandUserId),
    getWalletSnapshot(brandUserId),
    listNotifications(brandUserId),
    getRecentSubmissionsForBrand(brandUserId, 4),
  ])

  const activeCampaignsCount = campaigns.filter((c) => c.status === 'Live' || c.status === 'Submission & Review').length
  const totalViews = campaigns.reduce((sum, c) => sum + c.views, 0)
  const totalSpend = campaigns.reduce((sum, c) => sum + c.budgetUsed, 0)
  const approvedVideosCount = campaigns.reduce((sum, c) => sum + c.approvedVideos, 0)

  // Pending count needs the raw submission rows, not just the campaign
  // summaries, so pull it directly.
  const { data: pendingRows, error: pendingError } = await supabase
    .from('campaign_submissions')
    .select('id, campaigns!inner(created_by)')
    .eq('status', 'pending')
    .eq('campaigns.created_by', brandUserId)

  if (pendingError) throw pendingError

  return {
    brandName: profile?.brand_name ?? '',
    activeCampaignsCount,
    pendingSubmissionsCount: pendingRows?.length ?? 0,
    approvedVideosCount,
    totalSpend,
    totalViews,
    wallet,
    campaigns,
    recentSubmissions,
    notifications,
  }
}

async function getRecentSubmissionsForBrand(brandUserId: string, limit: number): Promise<CampaignSubmission[]> {
  const { data: campaignIds, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('created_by', brandUserId)

  if (campaignsError) throw campaignsError
  const ids = (campaignIds ?? []).map((c) => c.id)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('campaign_submissions')
    .select('*')
    .in('campaign_id', ids)
    .in('status', BRAND_VISIBLE_SUBMISSION_STATUSES)
    .order('submitted_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as CampaignSubmission[]
}
