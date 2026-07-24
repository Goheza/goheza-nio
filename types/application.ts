export type CampaignApplicationStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested'
 

 

// ---- DB-level enum (must match campaign_applications_status_check) ----
// Source of truth: LIVE schema pulled directly from Supabase (shared
// 2nd verification pass) — NOT goheza_migrations.sql, which claimed
// 'revision_requested' was dropped from this table. It wasn't; the live
// check constraint still allows it:
//   status = any (array['pending','approved','rejected','revision_requested'])
export type ApplicationDbStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested'

// ---- UI-level display status ----
export type ApplicationUiStatus = 'Pending Review' | 'Approved' | 'Rejected' | 'Needs Revision'

export type CampaignApplication = {
  id: string
  campaign_id: string
  // Also live-schema-corrected: this column is `creator_id`, not `user_id`.
  // goheza_migrations.sql claimed a rename to user_id happened here — it
  // didn't (or was reverted). Every other creator-facing table (creator_
  // profiles, campaign_submissions, creator_social_accounts) genuinely does
  // use user_id — campaign_applications is the one exception.
  creator_id: string
  status: ApplicationDbStatus
  applied_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  note: string | null
}