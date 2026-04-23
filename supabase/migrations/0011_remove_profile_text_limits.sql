-- Remove strict profile text length limits so long bios/about sections can be stored.
alter table public.profiles
  drop constraint if exists profiles_bio_length;

alter table public.profiles
  drop constraint if exists profiles_about_me_length;
