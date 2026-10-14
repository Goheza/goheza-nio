import { supabase } from '@/lib/supabase'

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