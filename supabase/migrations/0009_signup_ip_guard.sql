-- ============================================================================
-- Signup anti-abuse: allow only one account creation per IP address.
-- ============================================================================

create table if not exists public.signup_ip_guard (
  ip             inet primary key,
  first_user_id  uuid,
  created_at     timestamptz not null default now()
);

alter table public.signup_ip_guard enable row level security;
-- No user-facing policies. API service role is authoritative writer/reader.
