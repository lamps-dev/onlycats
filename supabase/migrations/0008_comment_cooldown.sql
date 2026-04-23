-- ============================================================================
-- Anti-spam: enforce a short cooldown between comments from the same user.
--
-- This protects against rapid-fire comment spam even when writes are sent
-- directly to Supabase (outside the web client).
-- ============================================================================

create or replace function public.enforce_comment_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  last_comment_at timestamptz;
  cooldown_seconds integer := 10;
begin
  select c.created_at
    into last_comment_at
  from public.comments c
  where c.user_id = NEW.user_id
  order by c.created_at desc
  limit 1;

  if last_comment_at is not null and now() < last_comment_at + make_interval(secs => cooldown_seconds) then
    raise exception 'Please wait % seconds between comments.', cooldown_seconds
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

drop trigger if exists comments_cooldown on public.comments;
create trigger comments_cooldown
before insert on public.comments
for each row execute function public.enforce_comment_cooldown();
