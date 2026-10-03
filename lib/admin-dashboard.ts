import { supabase } from '@/lib/supabase'

export type AdminRole = 'moderator' | 'super_admin'

export type AdminDashboardData = {
    adminName: string
    role: AdminRole
    stats: {
        totalBrands: number
        pendingVerifications: number
        totalCreators: number
        suspendedBrands: number
        suspendedCreators: number
        campaignsInReview: number
        liveCampaigns: number
        submissionsNeedingReview: number
    }
    pendingBrandVerifications: Array<{
        id: string
        user_id: string
        brand_name: string | null
        brand_email: string | null
        created_at: string
    }>
    campaignsAwaitingApproval: Array<{
        id: string
        name: string
        status: string
        created_at: string | null
        created_by: string | null
    }>
    recentlySuspended: Array<{
        id: string
        name: string
        type: 'brand' | 'creator'
        suspended_at: string | null
        suspension_reason: string | null
    }>
}

/**
 * Pulls together everything the admin overview page needs in as few
 * round trips as possible. Every query is scoped to what an admin is
 * actually allowed to see (all brands/creators/campaigns — there's no
 * per-row ownership check the way there is for brand/creator pages).
 */
export async function getAdminDashboardData(userId: string): Promise<AdminDashboardData> {
    const [
        { data: adminRow },
        { data: brands, count: totalBrands },
        { data: pendingBrands, count: pendingVerifications },
        { count: totalCreators },
        { count: suspendedBrands },
        { count: suspendedCreators },
        { data: inReviewCampaigns, count: campaignsInReview },
        { count: liveCampaigns },
        { count: submissionsNeedingReview },
        { data: suspendedBrandRows },
        { data: suspendedCreatorRows },
    ] = await Promise.all([
        supabase.from('admins').select('full_name, role').eq('user_id', userId).maybeSingle(),
        supabase.from('brand_profiles').select('id', { count: 'exact', head: true }),
        supabase
            .from('brand_profiles')
            .select('id, user_id, brand_name, brand_email, created_at', { count: 'exact' })
            .eq('is_verified', false)
            .order('created_at', { ascending: true })
            .limit(5),
        supabase.from('creator_profiles').select('id', { count: 'exact', head: true }),
        supabase
            .from('brand_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('account_status', 'suspended'),
        supabase
            .from('creator_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('account_status', 'suspended'),
        supabase
            .from('campaigns')
            .select('id, name, status, created_at, created_by', { count: 'exact' })
            .eq('status', 'inreview')
            .order('created_at', { ascending: true })
            .limit(5),
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'live'),
        supabase
            .from('campaign_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
        supabase
            .from('brand_profiles')
            .select('id, brand_name, suspended_at, suspension_reason')
            .eq('account_status', 'suspended')
            .order('suspended_at', { ascending: false })
            .limit(3),
        supabase
            .from('creator_profiles')
            .select('id, display_name, full_name, suspended_at, suspension_reason')
            .eq('account_status', 'suspended')
            .order('suspended_at', { ascending: false })
            .limit(3),
    ])

    const recentlySuspended: AdminDashboardData['recentlySuspended'] = [
        ...(suspendedBrandRows ?? []).map((b) => ({
            id: b.id as string,
            name: (b.brand_name as string | null) ?? 'Unnamed brand',
            type: 'brand' as const,
            suspended_at: b.suspended_at as string | null,
            suspension_reason: b.suspension_reason as string | null,
        })),
        ...(suspendedCreatorRows ?? []).map((c: any) => ({
            id: c.id as string,
            name: (c.display_name ?? c.full_name ?? 'Unnamed creator') as string,
            type: 'creator' as const,
            suspended_at: c.suspended_at as string | null,
            suspension_reason: c.suspension_reason as string | null,
        })),
    ]
        .sort((a, b) => new Date(b.suspended_at ?? 0).getTime() - new Date(a.suspended_at ?? 0).getTime())
        .slice(0, 5)

    return {
        adminName: adminRow?.full_name ?? 'Admin',
        role: (adminRow?.role as AdminRole) ?? 'moderator',
        stats: {
            totalBrands: totalBrands ?? 0,
            pendingVerifications: pendingVerifications ?? 0,
            totalCreators: totalCreators ?? 0,
            suspendedBrands: suspendedBrands ?? 0,
            suspendedCreators: suspendedCreators ?? 0,
            campaignsInReview: campaignsInReview ?? 0,
            liveCampaigns: liveCampaigns ?? 0,
            submissionsNeedingReview: submissionsNeedingReview ?? 0,
        },
        pendingBrandVerifications: pendingBrands ?? [],
        campaignsAwaitingApproval: inReviewCampaigns ?? [],
        recentlySuspended,
    }
}