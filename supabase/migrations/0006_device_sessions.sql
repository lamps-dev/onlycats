-- ============================================================================
-- Device sessions: long-lived per-device cookie tracking. Lets users see all
-- devices their account is signed in on, and revoke individual or all others.
--
-- The raw cookie value is never stored — only a SHA-256 hash. The backend
-- writes and reads via the service role, so no user-facing RLS policies.
-- ============================================================================

create table if not exists public.device_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  token_hash   text not null unique,
  label        text,
  ip           inet,
  user_agent   text,
  last_seen    timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz
);

create index if not exists device_sessions_user_active_idx
  on public.device_sessions (user_id, last_seen desc)
  where revoked_at is null;

create index if not exists device_sessions_revoked_idx
  on public.device_sessions (revoked_at)
  where revoked_at is not null;

alter table public.device_sessions enable row level security;

-- No user-facing policies; API uses service role. This intentionally blocks
-- direct supabase-js reads/writes so the cookie hash stays server-side.
