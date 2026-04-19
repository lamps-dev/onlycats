-- ============================================================================
-- Comments (threaded) + reposts (with optional quote + media overlay text).
--
-- Comments are public-read, self-write, self-delete (mods can also delete).
-- Reposts are public-read, self-write, one per (user, content).
-- Both respect bans/timeouts via is_user_banned / is_user_timed_out.
-- ============================================================================

-- --- Comments ---------------------------------------------------------------

create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  content_id   uuid not null references public.content(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  parent_id    uuid references public.comments(id) on delete cascade,
  body         text not null check (length(body) between 1 and 2000),
  edited_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists comments_content_created_idx on public.comments (content_id, created_at asc);
create index if not exists comments_parent_idx          on public.comments (parent_id);
create index if not exists comments_user_idx            on public.comments (user_id);

create trigger comments_touch before update on public.comments
  for each row execute function public.touch_updated_at();

-- Content comment counter
alter table public.content
  add column if not exists comment_count integer not null default 0;

create or replace function public.sync_comment_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.content set comment_count = comment_count + 1 where id = NEW.content_id;
  elsif TG_OP = 'DELETE' then
    update public.content set comment_count = greatest(comment_count - 1, 0) where id = OLD.content_id;
  end if;
  return null;
end $$;

drop trigger if exists comments_count on public.comments;
create trigger comments_count after insert or delete on public.comments
  for each row execute function public.sync_comment_count();

-- --- Reposts ----------------------------------------------------------------

create table if not exists public.reposts (
  id            uuid primary key default gen_random_uuid(),
  content_id    uuid not null references public.content(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  quote_text    text check (quote_text is null or length(quote_text) between 1 and 2000),
  overlay_text  text check (overlay_text is null or length(overlay_text) between 1 and 200),
  created_at    timestamptz not null default now(),
  unique (content_id, user_id)
);
create index if not exists reposts_user_created_idx    on public.reposts (user_id, created_at desc);
create index if not exists reposts_content_created_idx on public.reposts (content_id, created_at desc);

-- Content repost counter
alter table public.content
  add column if not exists repost_count integer not null default 0;

create or replace function public.sync_repost_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.content set repost_count = repost_count + 1 where id = NEW.content_id;
  elsif TG_OP = 'DELETE' then
    update public.content set repost_count = greatest(repost_count - 1, 0) where id = OLD.content_id;
  end if;
  return null;
end $$;

drop trigger if exists reposts_count on public.reposts;
create trigger reposts_count after insert or delete on public.reposts
  for each row execute function public.sync_repost_count();

-- --- RLS --------------------------------------------------------------------

alter table public.comments enable row level security;
alter table public.reposts  enable row level security;

-- comments: public read
drop policy if exists "comments_select" on public.comments;
create policy "comments_select" on public.comments for select using (true);

-- comments: user can post as themselves, blocked if banned/timed-out
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments for insert
  with check (
    user_id = auth.uid()
    and not public.is_user_banned(auth.uid())
    and not public.is_user_timed_out(auth.uid())
  );

-- comments: user can edit their own
drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- comments: user can delete their own (mod deletes go through API/service role)
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments for delete
  using (user_id = auth.uid());

-- reposts: public read
drop policy if exists "reposts_select" on public.reposts;
create policy "reposts_select" on public.reposts for select using (true);

-- reposts: user can repost as themselves, blocked if banned/timed-out
drop policy if exists "reposts_insert_own" on public.reposts;
create policy "reposts_insert_own" on public.reposts for insert
  with check (
    user_id = auth.uid()
    and not public.is_user_banned(auth.uid())
    and not public.is_user_timed_out(auth.uid())
  );

-- reposts: user can update their own quote/overlay after the fact
drop policy if exists "reposts_update_own" on public.reposts;
create policy "reposts_update_own" on public.reposts for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reposts: user can delete their own (un-repost)
drop policy if exists "reposts_delete_own" on public.reposts;
create policy "reposts_delete_own" on public.reposts for delete
  using (user_id = auth.uid());
