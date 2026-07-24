import { supabase } from '@/lib/supabase'
import { listApplicationsForCreator } from '@/lib/api/campaign-applications'
import { browseCampaigns, getCampaignsByIds } from '@/lib/api/creator-campaigns'
import { listSubmissionsForCreator } from '@/lib/api/creator-submissions'
import type { CreatorCampaignSummary } from '@/types/campaign'
import type {  SubmissionDbStatus} from '@/types/submission'

export type CreatorDashboardSubmission = {
    id: string
    campaign_id: string
    campaign_name: string | null
    status:  SubmissionDbStatus,
    submitted_at: string
    views: number
}

export type CreatorDashboardData = {
    creatorName: string
    activeApplicationsCount: number
    pendingReviewCount: number
    lifetimeEarnings: number
    submissions: CreatorDashboardSubmission[]
    suggestedCampaigns: CreatorCampaignSummary[]
}

// activeApplicationsCount = approved applications (campaigns the creator is
// actually cleared to work on right now).
// pendingReviewCount = anything sitting in someone else's queue: pending
// applications waiting on the brand, plus submissions still in
// admin_review or pending (waiting on admin/brand respectively).
export async function getCreatorDashboardData(creatorId: string): Promise<CreatorDashboardData> {
    const [{ data: profile }, applications, submissions] = await Promise.all([
        supabase
            .from('creator_profiles')
            .select('display_name, full_name, country')
            .eq('user_id', creatorId)
            .maybeSingle(),
        listApplicationsForCreator(creatorId),
        listSubmissionsForCreator(creatorId),
    ])

    const campaignIds = Array.from(
        new Set([...applications.map((a) => a.campaign_id), ...submissions.map((s) => s.campaign_id)])
    )

    const [campaignsById, openCampaigns] = await Promise.all([
        getCampaignsByIds(campaignIds),
        browseCampaigns(profile?.country ?? null),
    ])

    const activeApplicationsCount = applications.filter((a) => a.status === 'approved').length
    const pendingReviewCount =
        applications.filter((a) => a.status === 'pending').length +
        submissions.filter((s) => s.status === 'revision_requested' || s.status === 'pending').length

    const lifetimeEarnings = submissions
        .filter((s) => s.status === 'approved')
        .reduce((sum, s) => {
            const campaign = campaignsById[s.campaign_id]
            const rate = campaign?.rewardPerK ?? 0
            const max = campaign?.maxPerCreator ? Number(campaign.maxPerCreator) : Infinity
            return sum + Math.min((s.views / 1000) * rate, max)
        }, 0)

    const dashboardSubmissions: CreatorDashboardSubmission[] = submissions
        .slice()
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        .map((s) => ({
            id: s.id,
            campaign_id: s.campaign_id,
            campaign_name: campaignsById[s.campaign_id]?.name ?? null,
            status: s.status,
            submitted_at: s.submitted_at,
            views: s.views,
        }))

    const appliedIds = new Set(applications.map((a) => a.campaign_id))
    const suggestedCampaigns = openCampaigns.filter((c) => !appliedIds.has(c.id)).slice(0, 3)

    return {
        creatorName: profile?.display_name || profile?.full_name || '',
        activeApplicationsCount,
        pendingReviewCount,
        lifetimeEarnings,
        submissions: dashboardSubmissions,
        suggestedCampaigns,
    }
}