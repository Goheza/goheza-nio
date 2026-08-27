export type AdminEarningStatus = 'accruing' | 'settled' | 'paid'

export type AdminEarningEntry = {
  id: string
  submissionId: string
  viewsCounted: number
  grossAmount: number
  platformFee: number
  netAmount: number
  status: AdminEarningStatus
  createdAt: string
}

export type AdminCreatorSummary = {
  creatorId: string
  creatorName: string
  totalNet: number
  totalViews: number
  accruingNet: number
  settledNet: number
  paidNet: number
  entries: AdminEarningEntry[]
}

export type AdminCampaignSummary = {
  campaignId: string
  campaignName: string
  campaignCover: string | null
  totalNet: number
  requiredViews: number | null
  creators: AdminCreatorSummary[]
}

export type AdminBrandSummary = {
  brandUserId: string
  brandName: string
  brandLogoUrl: string | null
  totalNet: number
  campaigns: AdminCampaignSummary[]
}