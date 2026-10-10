-- Support tickets (brand + creator, managed by admins)
-- ASSUMES: public.admins has a `user_id uuid` column. Change is_admin() if not.
-- ASSUMES: public.update_updated_at_column() exists (used by public.campaigns).

-- ---------------------------------------------------------------- helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------- tables
create table public.support_tickets (
  id            uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity,
  created_by    uuid not null references auth.users(id) on delete cascade,
  user_role     text not null check (user_role in ('brand', 'creator')),
  campaign_id   uuid references public.campaigns(id) on delete set null,
  category      text not null check (category in
                  ('campaign', 'creators', 'billing', 'payout', 'account', 'bug', 'other')),
  subject       text not null check (char_length(subject) between 3 and 140),
  status        text not null default 'open' check (status in
                  ('open', 'in_progress', 'awaiting_user', 'resolved', 'closed')),
  priority      text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  assigned_to   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create table public.support_ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid not null references auth.users(id),
  from_admin  boolean not null default false,
  is_internal boolean not null default false,  -- admin-only notes, hidden from users
  body        text not null check (char_length(btrim(body)) > 0),
  attachments jsonb not null default '[]',     -- [{ path, name, size, type }]
  created_at  timestamptz not null default now()
);

create index idx_support_tickets_created_by on public.support_tickets (created_by, updated_at desc);
create index idx_support_tickets_status     on public.support_tickets (status, updated_at desc);
create index idx_support_messages_ticket    on public.support_ticket_messages (ticket_id, created_at);

-- ---------------------------------------------------------------- triggers
create trigger update_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.update_updated_at_column();

-- Non-admins may only close a ticket or reopen a resolved/closed one.
-- (current_user = 'authenticated' only for direct client writes; the
-- security-definer message trigger below runs as the function owner, so it is exempt.)
create or replace function public.support_tickets_before_update()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if new.created_by    is distinct from old.created_by
    or new.user_role     is distinct from old.user_role
    or new.campaign_id   is distinct from old.campaign_id
    or new.category      is distinct from old.category
    or new.subject       is distinct from old.subject
    or new.priority      is distinct from old.priority
    or new.assigned_to   is distinct from old.assigned_to
    or new.ticket_number is distinct from old.ticket_number
    or new.created_at    is distinct from old.created_at then
      raise exception 'You can only change the status of a ticket.';
    end if;

    if new.status is distinct from old.status then
      if new.status = 'closed' then
        null; -- allowed from any state
      elsif new.status = 'open' and old.status in ('resolved', 'closed') then
        null; -- reopen
      else
        raise exception 'You can only close or reopen a ticket.';
      end if;
    end if;
  end if;

  if new.status = 'resolved' and old.status <> 'resolved' then
    new.resolved_at := now();
  elsif new.status <> 'resolved' and old.status = 'resolved' then
    new.resolved_at := null;
  end if;

  return new;
end;
$$;

create trigger support_tickets_before_update
  before update on public.support_tickets
  for each row execute function public.support_tickets_before_update();

-- New public message moves the ticket along.
create or replace function public.support_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_internal then
    return new;
  end if;

  update public.support_tickets
  set status = case
        when new.from_admin and status = 'open' then 'in_progress'
        when not new.from_admin and status in ('awaiting_user', 'resolved') then 'open'
        else status
      end,
      updated_at = now()
  where id = new.ticket_id;

  return new;
end;
$$;

create trigger support_on_message
  after insert on public.support_ticket_messages
  for each row execute function public.support_on_message();

-- ---------------------------------------------------------------- RLS
alter table public.support_tickets         enable row level security;
alter table public.support_ticket_messages enable row level security;

-- tickets
create policy "tickets: owner or admin can read"
  on public.support_tickets for select to authenticated
  using (created_by = auth.uid() or public.is_admin());

create policy "tickets: owner can create"
  on public.support_tickets for insert to authenticated
  with check (
    created_by = auth.uid()
    and status = 'open'
    and priority = 'normal'
    and assigned_to is null
  );

create policy "tickets: owner or admin can update"
  on public.support_tickets for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

-- owner can delete only a ticket that has no messages (used to roll back a failed create)
create policy "tickets: owner can delete empty ticket"
  on public.support_tickets for delete to authenticated
  using (
    (created_by = auth.uid() and not exists (
      select 1 from public.support_ticket_messages m where m.ticket_id = support_tickets.id
    ))
    or public.is_admin()
  );

-- messages
create policy "messages: owner (public only) or admin can read"
  on public.support_ticket_messages for select to authenticated
  using (
    public.is_admin()
    or (
      not is_internal
      and exists (
        select 1 from public.support_tickets t
        where t.id = ticket_id and t.created_by = auth.uid()
      )
    )
  );

create policy "messages: owner or admin can write"
  on public.support_ticket_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (public.is_admin() and from_admin)
      or (
        not from_admin
        and not is_internal
        and exists (
          select 1 from public.support_tickets t
          where t.id = ticket_id and t.created_by = auth.uid() and t.status <> 'closed'
        )
      )
    )
  );

-- ---------------------------------------------------------------- realtime
alter publication supabase_realtime add table public.support_tickets;
alter publication supabase_realtime add table public.support_ticket_messages;

-- ---------------------------------------------------------------- storage
-- Private bucket. Path layout: {ticket_owner_id}/{ticket_id}/{uuid}-{filename}
-- Admins upload under the ticket owner's folder so the owner can read the file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "support attachments: read own folder or admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "support attachments: upload to own folder or admin"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "support attachments: delete own folder or admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'support-attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );