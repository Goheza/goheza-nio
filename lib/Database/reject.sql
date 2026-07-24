-- ============================================================
-- ADD CAMPAIGN REJECTION REASON
-- Flagged in goheza_roles_and_features.md as a missing column:
-- admins can send a campaign back from `inreview` to `draft`,
-- but there was nowhere to record why. Needed for the admin
-- campaign-review page's Reject action.
-- ============================================================

BEGIN;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS rejection_reason text NULL;

COMMIT;