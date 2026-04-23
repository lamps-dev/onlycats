-- ============================================================================
-- Profile text guardrails to protect direct network writes.
-- Enforces the same limits already used by the web UI.
-- ============================================================================

alter table public.profiles
  drop constraint if exists profiles_bio_length,
  add constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 160) not valid;

alter table public.profiles
  drop constraint if exists profiles_about_me_length,
  add constraint profiles_about_me_length
    check (about_me is null or char_length(about_me) <= 1000) not valid;
