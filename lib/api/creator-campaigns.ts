import { supabase } from '@/lib/supabase'
import type { Campaign, CreatorCampaignSummary } from '@/types/campaign'
import type { BriefAsset } from '@/lib/api/storage'

type CampaignWithBrand = Campaign & {
    brand_profiles: { brand_name: string | null; logo_url: string | null } | null
}

function toCreatorSummary(c: CampaignWithBrand): CreatorCampaignSummary {
    return {
        id: c.id,
        name: c.name,
        brief: c.description,
        type: c.campaign_type,
        cover: c.cover_image_url ?? c.image_url,
        countries: c.target_countries && c.target_countries.length > 0 ? c.target_countries : 'global',
        rewardPerK: c.cost_per_1k_views ?? 0,
        maxPerCreator: c.max_pay,
        creatorsNeeded: c.num_creators ?? 0,
        submissionDeadline: c.submission_deadline,
        dos: c.dos,
        donts: c.donts,
        brandName: c.brand_profiles?.brand_name ?? null,
        brandLogoUrl: c.brand_profiles?.logo_url ?? null,
        deliverables: c.requirements ?? [],
        briefAssets: Array.isArray(c.brief_assets) ? (c.brief_assets as BriefAsset[]) : [],
    }
}

// Campaigns open for submissions right now. Country filtering: a campaign
// with an empty target_countries is global (visible to everyone); otherwise
// only shown if the creator's country is in the list. No category/platform
// filter — neither column exists (see CreatorCampaignSummary).
export async function browseCampaigns(creatorCountry?: string | null): Promise<CreatorCampaignSummary[]> {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*, requirements, brief_assets, brand_profiles!campaigns_created_by_brand_fkey(brand_name, logo_url)')
        .eq('status', 'submission_review')
        .order('created_at', { ascending: false })

    if (error) throw error

    const rows = (data as CampaignWithBrand[]) ?? []
    const filtered = creatorCountry
        ? rows.filter((c) => !c.target_countries?.length || c.target_countries.includes(creatorCountry))
        : rows

    return filtered.map(toCreatorSummary)
}

export async function getCampaignForCreator(id: string): Promise<CreatorCampaignSummary | null> {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*, brand_profiles!campaigns_created_by_brand_fkey(brand_name, logo_url)')
        .eq('id', id)
        .maybeSingle()

    if (error) throw error
    return data ? toCreatorSummary(data as CampaignWithBrand) : null
}

export async function getCampaignsByIds(ids: string[]): Promise<Record<string, CreatorCampaignSummary>> {
    if (ids.length === 0) return {}
    const { data, error } = await supabase
        .from('campaigns')
        .select('*, brand_profiles!campaigns_created_by_brand_fkey(brand_name, logo_url)')
        .in('id', ids)

    if (error) throw error
    const rows = (data as CampaignWithBrand[]) ?? []
    const map: Record<string, CreatorCampaignSummary> = {}
    for (const row of rows) map[row.id] = toCreatorSummary(row)
    return map
}
