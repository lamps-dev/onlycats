-- ============================================================================
-- Moderation: user sanctions (timeout / ban) and IP sanctions.
--
-- Roles:
--   - moderator, owner : can issue time-limited sanctions & lift their own
--   - owner only       : can issue permanent sanctions (no appeal) and lift any
--
-- Enforcement is layered:
--   - API middleware blocks banned users and banned IPs at the edge.
--   - RLS helper functions `is_user_banned()` / `is_user_timed_out()` are
--     referenced by insert policies on content-producing tables so Supabase
--     direct writes are blocked too.
-- ============================================================================

-- --- Sanctions tables -------------------------------------------------------

create table if not exists public.user_sanctions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('timeout', 'ban')),
  permanent   boolean not null default false,
  reason      text,
  issued_by   uuid references public.profiles(id) on delete set null,
  issued_at   timestamptz not null default now(),
  expires_at  timestamptz,
  lifted_at   timestamptz,
  lifted_by   uuid references public.profiles(id) on delete set null,
  check (permanent = false or expires_at is null),
  check (permanent = true  or expires_at is not null)
);
create index if not exists user_sanctions_user_active_idx
  on public.user_sanctions (user_id)
  where lifted_at is null;
create index if not exists user_sanctions_expires_idx
  on public.user_sanctions (expires_at)
  where lifted_at is null and permanent = false;

create table if not exists public.ip_sanctions (
  id          uuid primary key default gen_random_uuid(),
  ip          inet not null,
  permanent   boolean not null default false,
  reason      text,
  issued_by   uuid references public.profiles(id) on delete set null,
  issued_at   timestamptz not null default now(),
  expires_at  timestamptz,
  lifted_at   timestamptz,
  lifted_by   uuid references public.profiles(id) on delete set null,
  check (permanent = false or expires_at is null),
  check (permanent = true  or expires_at is not null)
);
create index if not exists ip_sanctions_ip_active_idx
  on public.ip_sanctions (ip)
  where lifted_at is null;

-- --- Auto IP capture --------------------------------------------------------

create table if not exists public.user_ip_log (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  ip          inet not null,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  hit_count   integer not null default 1,
  primary key (user_id, ip)
);
create index if not exists user_ip_log_user_last_idx on public.user_ip_log (user_id, last_seen desc);
create index if not exists user_ip_log_ip_idx        on public.user_ip_log (ip);

-- Upsert helper: bump last_seen + hit_count for (user, ip). Called from the
-- API's requireUser middleware. Security-definer because user_ip_log has no
-- user-facing policies.
create or replace function public.bump_user_ip(p_user uuid, p_ip inet)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_ip_log (user_id, ip)
  values (p_user, p_ip)
  on conflict (user_id, ip) do update
    set last_seen = now(),
        hit_count = public.user_ip_log.hit_count + 1;
end $$;

-- --- Helper functions used by RLS ------------------------------------------

create or replace function public.is_user_banned(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_sanctions s
    where s.user_id = uid
      and s.kind = 'ban'
      and s.lifted_at is null
      and (s.permanent or s.expires_at > now())
  );
$$;

create or replace function public.is_user_timed_out(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_sanctions s
    where s.user_id = uid
      and s.kind = 'timeout'
      and s.lifted_at is null
      and (s.permanent or s.expires_at > now())
  );
$$;

-- --- RLS on new tables ------------------------------------------------------

alter table public.user_sanctions enable row level security;
alter table public.ip_sanctions   enable row level security;
alter table public.user_ip_log    enable row level security;

-- Users may read their own sanctions (so the app can show a banned screen).
drop policy if exists "user_sanctions_select_self" on public.user_sanctions;
create policy "user_sanctions_select_self" on public.user_sanctions for select
  using (user_id = auth.uid());

-- ip_sanctions and user_ip_log: no user-facing policies. Only the API (service role) reads/writes.

-- --- Tighten insert policies on content-producing tables --------------------
-- Replace existing policies so bans/timeouts block direct supabase-js writes.

drop policy if exists "content_insert_own" on public.content;
create policy "content_insert_own" on public.content for insert
  with check (
    creator_id = auth.uid()
    and not public.is_user_banned(auth.uid())
    and not public.is_user_timed_out(auth.uid())
  );

drop policy if exists "followers_insert_own" on public.followers;
create policy "followers_insert_own" on public.followers for insert
  with check (
    user_id = auth.uid()
    and not public.is_user_banned(auth.uid())
  );

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes for insert
  with check (
    user_id = auth.uid()
    and not public.is_user_banned(auth.uid())
  );

drop policy if exists "tips_insert_own" on public.tips;
create policy "tips_insert_own" on public.tips for insert
  with check (
    sender_id = auth.uid()
    and not public.is_user_banned(auth.uid())
  );

-- Collections and collection_items (from 0003) should also respect bans.
drop policy if exists "collections_insert_own" on public.collections;
create policy "collections_insert_own" on public.collections for insert
  with check (
    user_id = auth.uid()
    and not public.is_user_banned(auth.uid())
  );

drop policy if exists "collection_items_insert_own" on public.collection_items;
create policy "collection_items_insert_own" on public.collection_items for insert
  with check (
    not public.is_user_banned(auth.uid())
    and exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id and c.user_id = auth.uid()
    )
  );
