export type CreatorEarningStatus = 'accruing' | 'settled' | 'paid'

export type CreatorEarningEntry = {
  id: string
  submissionId: string
  campaignId: string
  campaignName: string
  viewsCounted: number
  grossAmount: number
  platformFee: number
  netAmount: number
  status: CreatorEarningStatus
  createdAt: string
}

export type CreatorEarningsByCampaign = {
  campaignId: string
  campaignName: string
  campaignCover: string | null
  totalNet: number
  totalViews: number
   requiredViews: number | null  
  entries: CreatorEarningEntry[]
}

export type CreatorEarningsByBrand = {
  brandUserId: string
  brandName: string
  brandLogoUrl: string | null
  totalNet: number
  totalViews: number
  campaigns: CreatorEarningsByCampaign[]
}