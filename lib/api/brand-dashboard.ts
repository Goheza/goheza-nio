import { supabase } from '@/lib/supabase'
import { listCampaignsWithStats } from '@/lib/api/campaigns'
import { listNotifications } from '@/lib/api/notifications'
import type { CampaignSummary } from '@/types/campaign'
import type { Notification } from '@/types/notification'
import type { CampaignSubmission } from '@/types/submission'
import { BRAND_VISIBLE_SUBMISSION_STATUSES } from '@/lib/api/status-mapping'
import { logError, logInfo, toMessage } from '@/lib/logger'

export type BrandDashboardData = {
    brandName: string
    activeCampaignsCount: number
    pendingSubmissionsCount: number
    approvedVideosCount: number
    totalSpend: number
    totalViews: number
    campaigns: CampaignSummary[]
    recentSubmissions: CampaignSubmission[]
    notifications: Notification[]
}

/**
 * Runs one named step. On failure it logs the real error and rethrows a proper
 * Error whose message says WHICH step failed, e.g.
 *   "listNotifications: relation \"notifications\" does not exist | code=42P01"
 */
async function step<T>(name: string, work: PromiseLike<T>): Promise<T> {
    const t0 = performance.now()
    try {
        const result = await work
        logInfo('Dashboard', `${name} ok (${Math.round(performance.now() - t0)}ms)`)
        return result
    } catch (err) {
        logError(`getBrandDashboardData.${name}`, err)
        throw Object.assign(new Error(`${name}: ${toMessage(err)}`), { cause: err })
    }
}

/** Turns a supabase { data, error } result into data-or-throw. */
function unwrap<T>(res: { data: T; error: any }): T {
    if (res.error) throw res.error
    return res.data
}

// NOTE: does not include a views-over-time series (brandViewsTrend in the
// mock data). That depends on the analytics ingestion pipeline, which is
// being handled separately — see open thread from the analytics discussion.
export async function getBrandDashboardData(brandUserId: string): Promise<BrandDashboardData> {
    logInfo('Dashboard', 'loading for user', brandUserId)

    // Every step logs its own failure, so if several fail you see all of them.
    const [profile, campaigns, notifications, recentSubmissions, pendingRows] = await Promise.all([
        step(
            'brand_profiles',
            supabase.from('brand_profiles').select('brand_name').eq('user_id', brandUserId).maybeSingle().then(unwrap),
        ),
        step('listCampaignsWithStats', listCampaignsWithStats(brandUserId)),
        step('listNotifications', listNotifications(brandUserId)),
        step('getRecentSubmissionsForBrand', getRecentSubmissionsForBrand(brandUserId, 4)),
        // Pending count needs the raw submission rows, not just the campaign summaries.
        step(
            'pendingSubmissions',
            supabase
                .from('campaign_submissions')
                .select('id, campaigns!inner(created_by)')
                .eq('status', 'pending')
                .eq('campaigns.created_by', brandUserId)
                .then(unwrap),
        ),
    ])

    const activeCampaignsCount = campaigns.filter(
        (c) => c.status === 'Live' || c.status === 'Submission & Review',
    ).length
    const totalViews = campaigns.reduce((sum, c) => sum + c.views, 0)
    const totalSpend = campaigns.reduce((sum, c) => sum + c.budgetUsed, 0)
    const approvedVideosCount = campaigns.reduce((sum, c) => sum + c.approvedVideos, 0)

    return {
        brandName: profile?.brand_name ?? '',
        activeCampaignsCount,
        pendingSubmissionsCount: pendingRows?.length ?? 0,
        approvedVideosCount,
        totalSpend,
        totalViews,
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