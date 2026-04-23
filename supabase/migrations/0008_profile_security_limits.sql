-- ============================================================================
-- Profile security hardening
-- Enforces length limits and social link count at the database layer.
-- ============================================================================

alter table public.profiles
  drop constraint if exists profiles_bio_max_length,
  drop constraint if exists profiles_about_me_max_length,
  drop constraint if exists profiles_social_links_max_count;

alter table public.profiles
  add constraint profiles_bio_max_length
    check (bio is null or char_length(bio) <= 160),
  add constraint profiles_about_me_max_length
    check (about_me is null or char_length(about_me) <= 1000),
  add constraint profiles_social_links_max_count
    check (jsonb_array_length(social_links) <= 5);
