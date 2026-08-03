import type { BriefAsset } from '@/lib/api/storage'
// inside CreateCampaignInput:

// ---- DB-level enums (must match campaigns_status_check in the migration) ----
export type CampaignDbStatus =
    | 'draft'
    | 'inreview'
    | 'submission_review'
    | 'live'
    | 'paused'
    | 'completed'
    | 'cancelled'
    | 'expired'

// ---- UI-level display status (matches labels used across brand-ui components) ----
export type CampaignUiStatus =
    | 'Draft'
    | 'In Review'
    | 'Submission & Review'
    | 'Live'
    | 'Paused'
    | 'Completed'
    | 'Cancelled'
    | 'Expired'

export type CampaignType = 'creator' | 'referral' | 'logo' | 'clipping' | 'ambassador' | 'event'

export type CampaignPhase = 'draft' | 'review' | 'submission' | 'live' | 'completed'

// ---- Type-specific brief details, stored in campaigns.type_specific_details jsonb ----
export type CreatorTypeDetails = {
    objectives?: string
    additionalInstructions?: string
}

export type LogoTypeDetails = {
    placementGuidelines?: string
    additionalInstructions?: string
}

export type ClippingTypeDetails = {
    downloadLinks?: string
    postingGuidelines?: string
    captions?: string[]
    hashtags?: string
}

export type ReferralTypeDetails = {
    referralLink?: string
    couponCode?: string
    landingPageUrl?: string
    rewardDescription?: string
    instructions?: string
}

export type TypeSpecificDetails =
    | ({ type: 'creator' } & CreatorTypeDetails)
    | ({ type: 'logo' } & LogoTypeDetails)
    | ({ type: 'clipping' } & ClippingTypeDetails)
    | ({ type: 'referral' } & ReferralTypeDetails)
    | { type: 'ambassador' }
    | { type: 'event' }

export type Campaign = {
    id: string
    name: string
    requirements: string[]
    payout: string
    assets: unknown[]
    description: string | null
    status: CampaignDbStatus
    created_at: string
    updated_at: string
    created_by: string | null
    approved_by: string | null
    reviewed_by: string | null
    image_url: string | null
    timeline: string | null
    budget: string | null
    quality_standard: string | null
    estimated_views: number | null
    objectives: string[]
    additional_information: string | null
    dos: string[]
    donts: string[]
    target_countries: string[]
    num_creators: number | null
    max_pay: string | null
    flat_fee: string | null
    max_submissions: number
    cover_image_url: string | null
    expires_at: string | null
    campaign_type: CampaignType
    total_budget_pool: number | null
    remaining_budget_pool: number | null
    cost_per_1k_views: number | null
    required_views: number | null
    brief_assets:unknown[],
    accumulated_views: number
    min_creators: number | null
    payout_type: string | null
    pool_status: string
    submission_deadline: string | null
    live_starts_at: string | null
    live_ends_at: string | null
    type_specific_details: TypeSpecificDetails | Record<string, never>
    approval_cap: number | null
}

// Fields the create-campaign form actually collects; everything else is
// derived/computed (budget pool, accumulated views, approvals, etc.)
export type CreateCampaignInput = {
    campaignType: CampaignType
    name: string
    briefAssets: BriefAsset[]
    brief: string
    visibility: 'global' | 'specific'
    countries: string[]
    coverImageUrl?: string
    dos: string[]
    donts: string[]
    creators: number
    maxPerCreator: number
    rewardPerK: number
    liveDurationDays: number
    typeSpecificDetails: TypeSpecificDetails
    status?: 'draft' | 'inreview'
}

// Aggregated view used by list/dashboard/detail UI — combines the raw
// campaigns row with stats computed from campaign_submissions. Never stored
// as-is; assembled at query time in campaigns.ts.
export type CampaignSummary = {
    id: string
    name: string
    type: CampaignType
    status: CampaignUiStatus
    phase: CampaignPhase
    cover: string | null
    countries: string[] | 'global'
    views: number
    approvedVideos: number
    submissionsReceived: number
    creatorsRequested: number
    approvalCap: number
    budgetUsed: number
    budgetTotal: number
    rewardPerK: number
    liveStartsAt: string | null
    liveEndsAt: string | null
    submissionDeadline: string | null
}

export type CreatorCampaignSummary = {
    id: string
    name: string
    brief: string | null
    type: CampaignType
    cover: string | null
    countries: string[] | 'global'
    rewardPerK: number
    maxPerCreator: string | null
    creatorsNeeded: number
    submissionDeadline: string | null
    dos: string[]
    donts: string[]
    brandName: string | null
    brandLogoUrl: string | null
    deliverables: string[] // was campaigns.requirements — real schema field,
    // literally named for this purpose, previously unused on the creator side
    briefAssets: BriefAsset[] // was campaigns.brief_assets — real schema field
}
