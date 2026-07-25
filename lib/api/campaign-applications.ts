import { supabase } from '@/lib/supabase'
import type { CampaignApplication } from '@/types/application'

export async function applyToCampaign(campaignId: string, creatorId: string): Promise<CampaignApplication> {
    // Insert the application first — if this fails (e.g. duplicate), we
    // shouldn't have wasted a TikTok API call.
    const { data: application, error } = await supabase
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

    // Best-effort stat snapshot — a creator who hasn't connected TikTok yet,
    // or whose fetch fails for any reason, should still be able to apply.
    // The application row above is already committed regardless of this.
    try {
        const { data: creatorProfile } = await supabase
            .from('creator_profiles')
            .select('id')
            .eq('user_id', creatorId)
            .maybeSingle()

        if (creatorProfile) {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (session) {
                const res = await fetch('/api/tiktok/insights/creator', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ creatorProfileId: creatorProfile.id }),
                })
                const json = await res.json()

                if (res.ok && json.tiktok) {
                    await supabase
                        .from('campaign_applications')
                        .update({
                            tiktok_follower_count: json.tiktok.follower_count ?? null,
                            tiktok_likes_count: json.tiktok.likes_count ?? null,
                            tiktok_video_count: json.tiktok.video_count ?? null,
                            tiktok_stats_synced_at: new Date().toISOString(),
                        })
                        .eq('id', application.id)
                }
            }
        }
    } catch (err) {
        console.error('Failed to snapshot TikTok stats at apply-time:', err)
        // Swallowed deliberately — application already succeeded.
    }

    return application as CampaignApplication
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
