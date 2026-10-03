-- ============================================================
-- GOHEZA — FULL CORRECTED SCHEMA
-- Reflects: brand/creator/admin verification & suspension audit
-- trails, TikTok-connection gate for creators, and the
-- applications-table cleanup (no revision_requested, user_id
-- naming consistency).
--
-- NOTE: handle_brand_onboarding_complete(), handle_brand_verified(),
-- and update_updated_at_column() are referenced by triggers below
-- but their bodies were not shared — assumed to already exist.
-- ============================================================

-- ============================================================
-- BRAND PROFILES
-- ============================================================
create table public.brand_profiles (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  brand_name text null,
  brand_email text null,
  created_at timestamp with time zone null default now(),
  contact text null,
  asset_url text null,
  logo_url text null,
  phone text null,
  is_verified boolean not null default false,
  website text null,
  country text null,
  goals text null,
  account_status text not null default 'active'::text,
  verified_by uuid null,
  verified_at timestamp with time zone null,
  suspended_by uuid null,
  suspended_at timestamp with time zone null,
  suspension_reason text null,
  constraint brand_profiles_pkey primary key (id),
  constraint brand_profiles_user_id_key unique (user_id),
  constraint brand_profiles_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint brand_profiles_verified_by_fkey foreign KEY (verified_by) references auth.users (id),
  constraint brand_profiles_suspended_by_fkey foreign KEY (suspended_by) references auth.users (id),
  constraint brand_profiles_account_status_check check (
    (
      account_status = any (array['active'::text, 'suspended'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists brand_profiles_user_id_idx on public.brand_profiles using btree (user_id) TABLESPACE pg_default;

create trigger trg_brand_onboarding_complete
after INSERT
or
update on brand_profiles for EACH row
execute FUNCTION handle_brand_onboarding_complete ();

create trigger trg_brand_verified
after
update on brand_profiles for EACH row
execute FUNCTION handle_brand_verified ();

-- ============================================================
-- CREATOR PROFILES
-- ============================================================
create table public.creator_profiles (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  full_name text not null,
  email text not null,
  bio text null,
  avatar_url text null,
  created_at timestamp with time zone not null default now(),
  payment_method text null,
  country text null,
  sociallinks text null,
  phone text null,
  payment_account_name text null,
  payment_account_number text null,
  payment_frequency text null,
  payment_mobilemoney_number text null,
  has_payment_details boolean not null default false,
  payment_bank_name text null,
  payment_mobilemoney_name text null,
  display_name text null,
  username text null,
  city text null,
  languages text[] not null default '{}'::text[],
  content_niches text[] not null default '{}'::text[],
  referral_source text null,
  account_status text not null default 'active'::text,
  has_tiktok_connected boolean not null default false,
  suspended_by uuid null,
  suspended_at timestamp with time zone null,
  suspension_reason text null,
  constraint creator_profiles_pkey primary key (id),
  constraint creator_profiles_user_id_key unique (user_id),
  constraint creator_profiles_username_key unique (username),
  constraint creator_profiles_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint creator_profiles_suspended_by_fkey foreign KEY (suspended_by) references auth.users (id),
  constraint content_niches_max_six check (
    (
      (array_length(content_niches, 1) is null)
      or (array_length(content_niches, 1) <= 6)
    )
  ),
  constraint creator_profiles_account_status_check check (
    (
      account_status = any (array['active'::text, 'suspended'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists creator_profiles_user_id_idx on public.creator_profiles using btree (user_id) TABLESPACE pg_default;

-- Keeps has_tiktok_connected in sync automatically whenever a
-- TikTok row is added to creator_social_accounts.
create or replace function public.handle_creator_tiktok_connected()
returns trigger as $$
begin
  if NEW.platform = 'tiktok' then
    update public.creator_profiles
    set has_tiktok_connected = true
    where user_id = NEW.user_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_creator_tiktok_connected
after insert on public.creator_social_accounts
for each row
execute function public.handle_creator_tiktok_connected();

-- ============================================================
-- CREATOR SOCIAL ACCOUNTS
-- ============================================================
create table if not exists public.creator_social_accounts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  platform text not null,
  access_token_tiktok text not null,
  refresh_token_tiktok text not null,

  status text not null default 'connected',
  external_username text null,
  connected_at timestamp with time zone not null default now(),
  constraint creator_social_accounts_pkey primary key (id),
  constraint creator_social_accounts_user_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint creator_social_accounts_platform_check check (
    platform = any (array['tiktok','instagram','youtube','facebook','x','linkedin']::text[])
  ),
  constraint creator_social_accounts_unique unique (user_id, platform)
);

-- ============================================================
-- ADMINS
-- ============================================================
create table public.admins (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  full_name text null,
  email text null,
  role text not null default 'moderator'::text,
  created_at timestamp with time zone null default now(),
  constraint admins_pkey primary key (id),
  constraint admins_email_key unique (email),
  constraint admins_user_id_key unique (user_id),
  constraint admins_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint admins_role_check check (
    role = any (array['moderator'::text, 'super_admin'::text])
  )
) TABLESPACE pg_default;

create index IF not exists idx_admins_user_id on public.admins using btree (user_id) TABLESPACE pg_default;

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create table public.campaigns (
  id uuid not null default gen_random_uuid (),
  name text not null,
  requirements text[] not null default '{}'::text[],
  payout text not null,
  assets jsonb null default '[]'::jsonb,
  description text null,
  status text not null default 'inreview'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  created_by uuid null,
  approved_by uuid null,
  reviewed_by uuid null,
  image_url text null,
  timeline text null default 'Flexible'::text,
  budget text null,
  quality_standard text null,
  estimated_views integer null,
  objectives text[] null default '{}'::text[],
  additional_information text null,
  target_countries text[] null default '{}'::text[],
  num_creators integer null,
  max_pay text null,
  flat_fee text null,
  max_submissions integer not null default 0,
  cover_image_url text null,
  expires_at timestamp with time zone null,
  campaign_type text null default 'standard'::text,
  total_budget_pool numeric null,
  remaining_budget_pool numeric null,
  cost_per_1k_views integer null,
  required_views integer null,
  accumulated_views integer null default 0,
  min_creators integer null,
  payout_type text null,
  pool_status text null default 'healthy'::text,
  brief_assets jsonb not null default '[]'::jsonb,
  submission_deadline timestamp with time zone null,
  live_starts_at timestamp with time zone null,
  live_ends_at timestamp with time zone null,
  dos text[] not null default '{}'::text[],
  donts text[] not null default '{}'::text[],
  type_specific_details jsonb not null default '{}'::jsonb,
  approval_cap integer null,
  constraint campaigns_pkey primary key (id),
  constraint campaigns_approved_by_fkey foreign KEY (approved_by) references auth.users (id),
  constraint campaigns_created_by_brand_fkey foreign KEY (created_by) references brand_profiles (user_id) on delete set null,
  constraint campaigns_reviewed_by_fkey foreign KEY (reviewed_by) references auth.users (id),
  constraint campaigns_status_check check (
    (
      status = any (
        array[
          'draft'::text,
          'inreview'::text,
          'submission_review'::text,
          'live'::text,
          'paused'::text,
          'completed'::text,
          'cancelled'::text,
          'expired'::text
        ]
      )
    )
  ),
  constraint max_submissions_non_negative check ((max_submissions >= 0))
) TABLESPACE pg_default;

create index IF not exists idx_campaigns_status on public.campaigns using btree (status) TABLESPACE pg_default;

create index IF not exists idx_campaigns_created_by on public.campaigns using btree (created_by) TABLESPACE pg_default;

create trigger update_campaigns_updated_at BEFORE
update on campaigns for EACH row
execute FUNCTION update_updated_at_column ();

-- ============================================================
-- CAMPAIGN APPLICATIONS
-- (creator_id renamed to user_id; revision_requested removed —
-- that status only ever applied at the submission stage)
-- ============================================================
create table public.campaign_applications (
  id uuid not null default gen_random_uuid (),
  campaign_id uuid not null,
  user_id uuid not null,
  status text not null default 'pending'::text,
  applied_at timestamp with time zone not null default now(),
  reviewed_by uuid null,
  reviewed_at timestamp with time zone null,
  note text null,
  constraint campaign_applications_pkey primary key (id),
  constraint campaign_applications_unique unique (campaign_id, user_id),
  constraint campaign_applications_campaign_fkey foreign KEY (campaign_id) references campaigns (id) on delete CASCADE,
  constraint campaign_applications_user_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint campaign_applications_reviewed_by_fkey foreign KEY (reviewed_by) references auth.users (id),
  constraint campaign_applications_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'approved'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_campaign_applications_campaign_id on public.campaign_applications using btree (campaign_id) TABLESPACE pg_default;

create index IF not exists idx_campaign_applications_user_id on public.campaign_applications using btree (user_id) TABLESPACE pg_default;

-- ============================================================
-- CAMPAIGN SUBMISSIONS
-- ============================================================
create table public.campaign_submissions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  campaign_id uuid not null,
  video_url text not null,
  caption text null,
  file_name text not null,
  file_size bigint not null,
  status text not null default 'draft'::text,
  submitted_at timestamp with time zone not null default now(),
  reviewed_by uuid null,
  reviewed_at timestamp with time zone null,
  campaign_name text null,
  feedback text null,
  tiktok_url text null,
  views integer not null default 0,
  constraint campaign_submissions_pkey primary key (id),
  constraint campaign_submissions_campaign_fkey foreign KEY (campaign_id) references campaigns (id) on delete CASCADE,
  constraint campaign_submissions_creator_fkey foreign KEY (user_id) references creator_profiles (user_id),
  constraint campaign_submissions_reviewed_by_fkey foreign KEY (reviewed_by) references auth.users (id),
  constraint campaign_submissions_user_fkey foreign KEY (user_id) references auth.users (id),
  constraint campaign_submissions_status_check check (
    (
      status = any (
        array[
          'draft'::text,
          'admin_reject'::text,
          'pending'::text,
          'revision_requested'::text,
          'approved'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_campaign_submissions_user_id on public.campaign_submissions using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_campaign_submissions_campaign_id on public.campaign_submissions using btree (campaign_id) TABLESPACE pg_default;

create index IF not exists idx_campaign_submissions_status on public.campaign_submissions using btree (status) TABLESPACE pg_default;