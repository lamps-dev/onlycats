-- ============================================================================
-- Adds a `role` column on `profiles` for moderation.
--   - 'user'      : default
--   - 'moderator' : can delete any post
--   - 'owner'     : single account — can promote/demote moderators
--
-- The owner is seeded automatically by the API on startup based on a Discord
-- OAuth provider_id match, so you do NOT need to hand-set it here. This
-- migration only adds the column + policies.
-- ============================================================================

alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'moderator', 'owner'));

create index if not exists profiles_role_idx on public.profiles (role);

-- Keep the existing "profiles_update_own" policy for the general case, but
-- prevent clients from editing their own role column via PostgREST. Role
-- changes must go through the backend (service role bypasses RLS).
--
-- We do this by dropping the broad update policy and recreating it so it only
-- applies when the role column is not being changed. Supabase policies can't
-- easily express "column-level NEW vs OLD"; instead we rely on column-level
-- privileges: revoke update(role) from authenticated and anon.
revoke update (role) on public.profiles from anon, authenticated;
