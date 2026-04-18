-- ============================================================================
-- Profile customization + collections + notification preferences.
--
-- Adds to profiles:
--   - about_me             (long-form text; bio stays as the short tagline)
--   - country              (ISO-ish free text; no enforced list)
--   - location             (free text, e.g. city)
--   - social_links         (jsonb array of { platform, url })
--   - notification_prefs   (jsonb of boolean toggles)
--
-- Adds tables:
--   - collections          : user-owned named buckets of content
--   - collection_items     : join table
-- ============================================================================

alter table public.profiles
  add column if not exists about_me text,
  add column if not exists country text,
  add column if not exists location text,
  add column if not exists social_links jsonb not null default '[]'::jsonb,
  add column if not exists notification_prefs jsonb not null default
    '{"tips":true,"follows":true,"likes":false,"email":false}'::jsonb;

-- social_links must be a JSON array; shape of each entry is validated client-side.
alter table public.profiles
  drop constraint if exists profiles_social_links_is_array;
alter table public.profiles
  add constraint profiles_social_links_is_array
  check (jsonb_typeof(social_links) = 'array');

-- ----------------------------------------------------------------------------
-- Collections
-- ----------------------------------------------------------------------------

create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  cover_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists collections_user_idx on public.collections (user_id, created_at desc);

drop trigger if exists collections_touch on public.collections;
create trigger collections_touch before update on public.collections
  for each row execute function public.touch_updated_at();

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  content_id    uuid not null references public.content(id) on delete cascade,
  added_at      timestamptz not null default now(),
  primary key (collection_id, content_id)
);
create index if not exists collection_items_content_idx on public.collection_items (content_id);

alter table public.collections      enable row level security;
alter table public.collection_items enable row level security;

-- Collections: anyone can browse, owner manages.
drop policy if exists "collections_select"       on public.collections;
drop policy if exists "collections_insert_own"   on public.collections;
drop policy if exists "collections_update_own"   on public.collections;
drop policy if exists "collections_delete_own"   on public.collections;
create policy "collections_select"     on public.collections for select using (true);
create policy "collections_insert_own" on public.collections for insert
  with check (user_id = auth.uid());
create policy "collections_update_own" on public.collections for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "collections_delete_own" on public.collections for delete
  using (user_id = auth.uid());

-- Collection items: anyone can read; only the owning user can add/remove.
drop policy if exists "collection_items_select"     on public.collection_items;
drop policy if exists "collection_items_insert_own" on public.collection_items;
drop policy if exists "collection_items_delete_own" on public.collection_items;
create policy "collection_items_select" on public.collection_items for select using (true);
create policy "collection_items_insert_own" on public.collection_items for insert
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id and c.user_id = auth.uid()
    )
  );
create policy "collection_items_delete_own" on public.collection_items for delete
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_items.collection_id and c.user_id = auth.uid()
    )
  );
