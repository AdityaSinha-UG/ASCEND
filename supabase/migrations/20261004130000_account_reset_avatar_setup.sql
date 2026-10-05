-- New Auth profiles begin without an avatar selection. Existing profile
-- avatars are preserved and remain the account's source of truth.
update public.profiles
set avatar_id = 'elephant'
where avatar_id is not null
  and avatar_id not in ('elephant', 'fox', 'monkey', 'panda', 'snow_leopard', 'wolf');

alter table public.profiles
  alter column avatar_id drop default,
  alter column avatar_id drop not null;

alter table public.profiles
  add constraint profiles_avatar_id_official
  check (avatar_id is null or avatar_id in ('elephant', 'fox', 'monkey', 'panda', 'snow_leopard', 'wolf'));

create or replace function public.enforce_one_time_avatar_selection()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.avatar_id is not null and new.avatar_id is distinct from old.avatar_id then
    raise exception 'Avatar selection is permanent';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_one_time_avatar_selection() from public, anon, authenticated;

create trigger profiles_avatar_selection_immutable
  before update of avatar_id on public.profiles
  for each row execute function public.enforce_one_time_avatar_selection();

-- One transaction removes all owned campaign data through existing cascade
-- relationships and resets gameplay progress while retaining account identity.
create or replace function public.reset_my_progress()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  authenticated_user_id uuid := auth.uid();
begin
  if authenticated_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.goals
  where user_id = authenticated_user_id;

  update public.profiles
  set xp = 0,
      tutorial_completed = false
  where id = authenticated_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function public.reset_my_progress() from public, anon, authenticated, service_role;
grant execute on function public.reset_my_progress() to authenticated;
