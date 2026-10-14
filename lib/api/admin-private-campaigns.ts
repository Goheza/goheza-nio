import { supabase } from '@/lib/supabase'
import type { Campaign } from '@/types/campaign'

export type PrivateCampaignRow = {
    id: string
    name: string
    campaign_type: string | null
    status: string
    num_creators: number | null
    created_at: string | null
    cover_image_url: string | null
    image_url: string | null
    admin_created_by: string | null
}

/** { [brandUserId]: number of private campaigns } */
export async function getPrivateCampaignCounts(): Promise<Record<string, number>> {
    const { data, error } = await supabase.from('campaigns').select('created_by').eq('is_private', true)
    if (error) throw new Error(error.message)

    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
        if (row.created_by) counts[row.created_by] = (counts[row.created_by] ?? 0) + 1
    }
    return counts
}

export async function listBrandPrivateCampaigns(brandUserId: string): Promise<PrivateCampaignRow[]> {
    const { data, error } = await supabase
        .from('campaigns')
        .select(
            'id, name, campaign_type, status, num_creators, created_at, cover_image_url, image_url, admin_created_by'
        )
        .eq('created_by', brandUserId)
        .eq('is_private', true)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as PrivateCampaignRow[]
}

export type PrivateCampaignDetail = {
    campaign: Campaign
    stats: { received: number; approved: number; views: number }
}

/** Raw campaign row + submission stats. Does not filter by owner, so the page can warn on mismatches. */
export async function getPrivateCampaignDetail(campaignId: string): Promise<PrivateCampaignDetail | null> {
    const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', campaignId).maybeSingle()
    if (error) throw new Error(error.message)
    if (!campaign) return null

    const { data: subs, error: subsError } = await supabase
        .from('campaign_submissions')
        .select('status, views')
        .eq('campaign_id', campaignId)
    if (subsError) throw new Error(subsError.message)

    let approved = 0
    let views = 0
    for (const s of subs ?? []) {
        if (s.status === 'approved') {
            approved += 1
            views += s.views ?? 0
        }
    }

    return { campaign: campaign as Campaign, stats: { received: subs?.length ?? 0, approved, views } }
}