import type { Campaign, CampaignDbStatus, CampaignPhase, CampaignUiStatus } from '@/types/campaign'
import type { SubmissionDbStatus, SubmissionUiStatus } from '@/types/submission'
import type { ApplicationDbStatus } from '@/types/application'

// ============================================================================
// Campaign status
//
// NOTE: campaigns has 8 possible DB statuses, but the UI's CampaignStatus
// type (brand-data.ts) only recognizes 5: Draft, Submission & Review, Live,
// Completed, Paused. Three DB statuses have no dedicated UI bucket and are
// currently collapsed into the closest existing one — FLAGGED, not a
// confirmed design decision:
//   - 'inreview'  -> 'Draft'      (campaign brief awaiting admin approval,
//                                   not yet visible to creators)
//   - 'cancelled' -> 'Completed'  (terminal state, closest visual bucket)
//   - 'expired'   -> 'Completed'  (terminal state, closest visual bucket)
// If you want dedicated pills/labels for any of these, either widen
// CampaignStatus + StatusPill to support them, or tell me how you'd rather
// they display and I'll adjust this mapping.
// ============================================================================

const CAMPAIGN_STATUS_TO_UI: Record<CampaignDbStatus, CampaignUiStatus> = {
  draft: 'Draft',
  inreview: 'Draft',
  submission_review: 'Submission & Review',
  live: 'Live',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Completed',
  expired: 'Completed',
}

// Reverse mapping is lossy (multiple DB statuses collapse to one UI status),
// so this only covers the unambiguous cases. Don't use this to round-trip
// a UI status back to 'inreview', 'cancelled', or 'expired'.
// const CAMPAIGN_STATUS_FROM_UI: Record<CampaignUiStatus, CampaignDbStatus> = {
//   Draft: 'draft',
//   'Submission & Review': 'submission_review',
//   Live: 'live',
//   Paused: 'paused',
//   Completed: 'completed',
// }

export function campaignStatusToUi(status: CampaignDbStatus): CampaignUiStatus {
  return CAMPAIGN_STATUS_TO_UI[status]
}

// export function campaignStatusFromUi(status: CampaignUiStatus): CampaignDbStatus {
//   return CAMPAIGN_STATUS_FROM_UI[status]
// }

// True for campaigns that haven't been published yet (draft or awaiting
// admin approval). PhaseTimeline has no representation for this state —
// callers should check this before rendering it.
export function isPrePublishStatus(status: CampaignDbStatus): boolean {
  return status === 'draft' || status === 'inreview'
}

// Derived lifecycle phase, matching Phase in brand-data.ts exactly.
// Returns null for pre-publish campaigns (draft/inreview) since PhaseTimeline
// has no step for those — check isPrePublishStatus() first.
export function campaignPhase(status: CampaignDbStatus): CampaignPhase | null {
  switch (status) {
    case 'draft':
    case 'inreview':
      return null
    case 'submission_review':
      return 'submission'
    case 'live':
    case 'paused':
      return 'live'
    case 'completed':
    case 'cancelled':
    case 'expired':
      return 'completed'
  }
}

// ============================================================================
// Submission status
// ============================================================================

const SUBMISSION_STATUS_TO_UI: Partial<Record<SubmissionDbStatus, SubmissionUiStatus>> = {
  pending: 'Pending Review',
  revision_requested: 'Needs Revision',
  approved: 'Approved',
  rejected: 'Rejected',
  // 'draft' and 'admin_reject' intentionally have no UI mapping — a draft
  // hasn't been submitted yet, and admin_reject should never reach the brand.
}

const SUBMISSION_STATUS_FROM_UI: Record<SubmissionUiStatus, SubmissionDbStatus> = {
  'Pending Review': 'pending',
  'Needs Revision': 'revision_requested',
  Approved: 'approved',
  Rejected: 'rejected',
}

export function submissionStatusToUi(status: SubmissionDbStatus): SubmissionUiStatus | null {
  return SUBMISSION_STATUS_TO_UI[status] ?? null
}

export function submissionStatusFromUi(status: SubmissionUiStatus): SubmissionDbStatus {
  return SUBMISSION_STATUS_FROM_UI[status]
}

// Creator-facing mapping — unlike brands, creators DO need to see their own
// submission's status if Admin rejected it outright (admin_reject). It
// collapses to a label a creator already understands rather than exposing
// the internal admin/brand distinction, which isn't meaningful to them.
// (Previously also special-cased an 'admin_review' status here — that was
// never a valid DB value per the schema's check constraint, so it's removed;
// see types/submission.ts.)
export function submissionStatusToCreatorUi(status: SubmissionDbStatus): SubmissionUiStatus | null {
  if (status === 'admin_reject') return 'Rejected'
  return submissionStatusToUi(status)
}

// Statuses a brand is ever allowed to see. Used as a query filter, not just
// a display concern — 'draft' and 'admin_reject' are excluded at the DB
// query level in submissions.ts, this is the single source of truth for
// which statuses that filter includes.
export const BRAND_VISIBLE_SUBMISSION_STATUSES: SubmissionDbStatus[] = [
  'pending',
  'revision_requested',
  'approved',
  'rejected',
]

// Applications precede submissions — a creator must be approved onto a
// campaign before their submission is meaningful. Collapsed 'Selected' and
// 'Approved' from the UI mock into a single 'approved' DB status (see
// migration 0002 for the flagged reasoning).
//
// ⚠️ SAME BUG AS SubmissionDbStatus HAD: goheza_migrations.sql explicitly
// backfills and drops 'revision_requested' from campaign_applications —
// "that status only ever applied at the submission stage" — and the actual
// schema's check constraint only allows
// array['pending','approved','rejected']. If ApplicationDbStatus (in
// types/application.ts, not reviewed yet) still includes
// 'revision_requested', it has the identical problem: TypeScript will
// accept a value Postgres will reject. Send that file and I'll fix both
// together.
export const APPLICATION_STATUS_TO_UI: Record<ApplicationDbStatus, 'Pending Review' | 'Approved' | 'Rejected' | 'Needs Revision'> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  revision_requested: 'Needs Revision',
}

// ============================================================================
// Derived campaign progress helpers
// ============================================================================

export function effectiveApprovalCap(campaign: Pick<Campaign, 'approval_cap' | 'num_creators'>): number {
  return campaign.approval_cap ?? campaign.num_creators ?? 0
}

export function submissionSlotCap(campaign: Pick<Campaign, 'approval_cap' | 'num_creators'>): number {
  return effectiveApprovalCap(campaign) * 2
}