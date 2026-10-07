-- OAuth state for social connects (TikTok, Instagram).
--
-- Run this on the Supabase project BEFORE deploying the code that uses it
-- (lib/server/oauth-state.ts). Without the table, "Connect TikTok/Instagram"
-- returns 500 until it exists.
--
-- Safe to run more than once. Only the server (service role) touches it:
-- RLS is on with no policies, and anon/authenticated have no grants.

create table if not exists public.oauth_states (
  state         text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  provider      text not null check (provider in ('tiktok', 'instagram')),
  code_verifier text,
  client        text not null default 'web' check (client in ('web', 'app')),
  return_to     text,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '10 minutes'
);

create index if not exists oauth_states_expires_at_idx on public.oauth_states (expires_at);

alter table public.oauth_states enable row level security;
revoke all on public.oauth_states from anon, authenticated;
grant all on public.oauth_states to service_role;

-- Rows are deleted when used. Abandoned ones (user closed the TikTok page)
-- just expire; clear them out now and then:
--   delete from public.oauth_states where expires_at < now() - interval '1 day';
