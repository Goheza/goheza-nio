import { supabase } from '@/lib/supabase'
import type { CampaignApplication } from '@/types/application'

export async function applyToCampaign(campaignId: string, creatorId: string): Promise<CampaignApplication> {
  const { data, error } = await supabase
    .from('campaign_applications')
    .insert({ campaign_id: campaignId, creator_id: creatorId, status: 'pending' })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already applied to this campaign.')
    }
    throw error
  }
  return data as CampaignApplication
}

export async function getApplication(campaignId: string, creatorId: string): Promise<CampaignApplication | null> {
  const { data, error } = await supabase
    .from('campaign_applications')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('creator_id', creatorId)
    .maybeSingle()

  if (error) throw error
  return data as CampaignApplication | null
}

export async function listApplicationsForCreator(creatorId: string): Promise<CampaignApplication[]> {
  const { data, error } = await supabase
    .from('campaign_applications')
    .select('*')
    .eq('creator_id', creatorId)
    .order('applied_at', { ascending: false })

  if (error) throw error
  return data as CampaignApplication[]
}
