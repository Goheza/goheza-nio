// ---- DB-level enum (must match campaign_submissions_status_check) ----
// Source of truth: goheza_schema_full.sql —
//   status = any (array['draft','admin_reject','pending',
//                        'revision_requested','approved','rejected'])
// 'admin_review' and 'live' are NOT valid DB values — writing either will
// fail the CHECK constraint at the database level, silently past TypeScript.
export type SubmissionDbStatus =
  | 'draft'
  | 'admin_reject'
  | 'pending'
  | 'revision_requested'
  | 'approved'
  | 'rejected'

// ---- UI-level display status ----
// Note: 'admin_reject' never surfaces to the brand — it's filtered out at the
// query layer, since brands should only ever see submissions Admin already
// vetted. See submissions.ts (listSubmissionsForBrand /
// BRAND_VISIBLE_SUBMISSION_STATUSES).
export type SubmissionUiStatus =
  | 'Pending Review'
  | 'Needs Revision'
  | 'Approved'
  | 'Rejected'

// ---- TikTok publish status (must match campaign_submissions_publish_status_check) ----
// Note: TikTok's own SEND_TO_USER_INBOX state collapses into 'processing'
// here — there's no dedicated DB value for "sitting in the creator's TikTok
// inbox as a draft". The distinction only exists transiently, in the raw
// response of a status check (see lib/tiktok-status.ts), not as a persisted
// column value.
export type PublishStatus = 'not_posted' | 'processing' | 'posted' | 'failed'

export type CampaignSubmission = {
  id: string
  user_id: string
  campaign_id: string
  video_url: string
  caption: string | null
  file_name: string
  file_size: number
  status: SubmissionDbStatus
  submitted_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  campaign_name: string | null
  feedback: string | null
  tiktok_url: string | null
  views: number
  // TikTok publish fields — present on every row via select('*'), typed
  // here so creator-facing code can read them without casting to `any`.
  publish_status: PublishStatus
  tiktok_publish_id: string | null
  tiktok_post_id: string | null
  posted_at: string | null
  publish_error: string | null
}

export type SubmissionDecisionInput = {
  submissionId: string
  reviewedBy: string
  feedback?: string
}