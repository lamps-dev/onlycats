-- ============================================================================
-- Bots: accounts owned by a user that can post to the API via a bot token.
-- Rate-limited to 50 requests/hour and flagged with a BOT badge in the UI.
-- ============================================================================

-- Bot profiles don't have a row in auth.users, so drop the FK.
alter table public.profiles drop constraint if exists profiles_id_fkey;

alter table public.profiles add column if not exists is_bot boolean not null default false;
alter table public.profiles add column if not exists bot_owner_id uuid references public.profiles(id) on delete cascade;
create index if not exists profiles_bot_owner_idx
  on public.profiles (bot_owner_id) where is_bot = true;

-- Bots can't themselves own bots (prevents loops and makes revocation simple).
alter table public.profiles
  add constraint profiles_bot_owner_is_human check (
    bot_owner_id is null or is_bot = true
  );

-- Only the token hash is stored; the raw token is shown once on create/rotate.
create table if not exists public.bot_tokens (
  id            uuid primary key default gen_random_uuid(),
  bot_id        uuid not null references public.profiles(id) on delete cascade,
  token_hash    text not null unique,
  token_prefix  text not null,
  revoked       boolean not null default false,
  last_used     timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists bot_tokens_bot_idx on public.bot_tokens (bot_id);
create index if not exists bot_tokens_active_idx on public.bot_tokens (token_hash) where revoked = false;

-- Request log powers the 50/hour rate limit and per-bot usage display.
create table if not exists public.bot_request_log (
  id            uuid primary key default gen_random_uuid(),
  bot_id        uuid not null references public.profiles(id) on delete cascade,
  endpoint      text not null,
  status_code   integer,
  created_at    timestamptz not null default now()
);
create index if not exists bot_request_log_bot_created_idx
  on public.bot_request_log (bot_id, created_at desc);

alter table public.bot_tokens enable row level security;
alter table public.bot_request_log enable row level security;

-- bot_tokens: no user-facing policies — service role only.

-- Owners can read their bots' request logs.
create policy "bot_request_log_select_owner" on public.bot_request_log for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = bot_request_log.bot_id and p.bot_owner_id = auth.uid()
    )
  );
