-- ============================================================================
-- OnlyCats initial schema
-- Paste this into the Supabase SQL editor (Dashboard → SQL → New query → Run),
-- or run `supabase db push` if you're using the CLI.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null,
  bio             text,
  avatar_url      text,
  follower_count  integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.content (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  file_url    text not null,
  caption     text,
  like_count  integer not null default 0,
  tip_count   integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index content_creator_created_idx on public.content (creator_id, created_at desc);
create index content_created_idx on public.content (created_at desc);

create table public.followers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, creator_id),
  check (user_id <> creator_id)
);
create index followers_user_idx on public.followers (user_id);
create index followers_creator_idx on public.followers (creator_id);

create table public.likes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  content_id  uuid not null references public.content(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, content_id)
);
create index likes_content_idx on public.likes (content_id);

create table public.tips (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  amount      numeric(10,2) not null check (amount > 0),
  message     text,
  created_at  timestamptz not null default now()
);
create index tips_creator_idx on public.tips (creator_id, created_at desc);
create index tips_sender_idx on public.tips (sender_id, created_at desc);

create table public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  key         text unique not null,
  name        text not null,
  revoked     boolean not null default false,
  last_used   timestamptz,
  created_at  timestamptz not null default now()
);
create index api_keys_user_idx on public.api_keys (user_id);
create index api_keys_key_active_idx on public.api_keys (key) where revoked = false;

create table public.api_usage (
  id           uuid primary key default gen_random_uuid(),
  api_key_id   uuid not null references public.api_keys(id) on delete cascade,
  endpoint     text not null,
  status_code  integer,
  created_at   timestamptz not null default now()
);
create index api_usage_key_created_idx on public.api_usage (api_key_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Triggers: counters + updated_at
-- ----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  NEW.updated_at := now();
  return NEW;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger content_touch before update on public.content
  for each row execute function public.touch_updated_at();

create or replace function public.sync_follower_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = NEW.creator_id;
  elsif TG_OP = 'DELETE' then
    update public.profiles set follower_count = greatest(follower_count - 1, 0) where id = OLD.creator_id;
  end if;
  return null;
end $$;
create trigger followers_count after insert or delete on public.followers
  for each row execute function public.sync_follower_count();

create or replace function public.sync_like_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.content set like_count = like_count + 1 where id = NEW.content_id;
  elsif TG_OP = 'DELETE' then
    update public.content set like_count = greatest(like_count - 1, 0) where id = OLD.content_id;
  end if;
  return null;
end $$;
create trigger likes_count after insert or delete on public.likes
  for each row execute function public.sync_like_count();

create or replace function public.sync_tip_count()
returns trigger language plpgsql security definer as $$
begin
  update public.content set tip_count = tip_count + 1 where id = NEW.content_id;
  return null;
end $$;
-- tips aren't tied to a single content item in the current app, only to a creator.
-- We increment via a function the client can call instead (see below).

-- ----------------------------------------------------------------------------
-- Auto-provision profile on signup
-- Reads display_name / avatar_url from raw_user_meta_data (set on signUp()
-- or provided by the Discord OAuth response).
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    NEW.id,
    coalesce(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return NEW;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.content    enable row level security;
alter table public.followers  enable row level security;
alter table public.likes      enable row level security;
alter table public.tips       enable row level security;
alter table public.api_keys   enable row level security;
alter table public.api_usage  enable row level security;

-- profiles: public read, owner-only write
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- content: public read, creator-only write/delete
create policy "content_select" on public.content for select using (true);
create policy "content_insert_own" on public.content for insert
  with check (creator_id = auth.uid());
create policy "content_update_own" on public.content for update
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "content_delete_own" on public.content for delete
  using (creator_id = auth.uid());

-- followers: public read; user can follow/unfollow with their own user_id only
create policy "followers_select" on public.followers for select using (true);
create policy "followers_insert_own" on public.followers for insert
  with check (user_id = auth.uid());
create policy "followers_delete_own" on public.followers for delete
  using (user_id = auth.uid());

-- likes: public read; user can like/unlike with their own user_id only
create policy "likes_select" on public.likes for select using (true);
create policy "likes_insert_own" on public.likes for insert
  with check (user_id = auth.uid());
create policy "likes_delete_own" on public.likes for delete
  using (user_id = auth.uid());

-- tips: sender OR creator can see; user can create as sender only
create policy "tips_select_participants" on public.tips for select
  using (sender_id = auth.uid() or creator_id = auth.uid());
create policy "tips_insert_own" on public.tips for insert
  with check (sender_id = auth.uid());

-- api_keys: user can CRUD their own; never readable by anon (no public select)
create policy "api_keys_select_own" on public.api_keys for select
  using (user_id = auth.uid());
create policy "api_keys_insert_own" on public.api_keys for insert
  with check (user_id = auth.uid());
create policy "api_keys_update_own" on public.api_keys for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "api_keys_delete_own" on public.api_keys for delete
  using (user_id = auth.uid());

-- api_usage: no user-facing policies. Backend writes/reads via service role
-- which bypasses RLS. A read policy lets users see their own usage stats.
create policy "api_usage_select_own" on public.api_usage for select
  using (
    exists (
      select 1 from public.api_keys k
      where k.id = api_usage.api_key_id and k.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Storage buckets
-- The `avatars` and `content` buckets must be created in the Dashboard
-- (Storage → New bucket → public). Then the policies below let authenticated
-- users upload to their own folder (path prefix = their uid).
-- ----------------------------------------------------------------------------

-- Drop default restrictive policies if they exist, then add ours.
-- (Supabase ships with an "Enable read access to all users" template that's fine
--  to keep; these policies only add write access scoped to the owner.)

create policy "avatars_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_update_own" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_delete_own" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "content_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'content'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "content_update_own" on storage.objects for update
  using (
    bucket_id = 'content'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "content_delete_own" on storage.objects for delete
  using (
    bucket_id = 'content'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
