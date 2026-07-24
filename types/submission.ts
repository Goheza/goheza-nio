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
}

export type SubmissionDecisionInput = {
  submissionId: string
  reviewedBy: string
  feedback?: string
}