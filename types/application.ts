export type CampaignApplicationStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested'
 
export type CampaignApplication = {
    id: string
    campaign_id: string
    creator_id: string
    status: CampaignApplicationStatus
    applied_at: string
    reviewed_by: string | null
    reviewed_at: string | null
    note: string | null
}
 