-- Campaign Paths and Quests are authored by the authenticated server campaign
-- pipeline. Browser sessions may read/delete their own campaign records, but
-- cannot insert or rewrite progression structure and rewards.
revoke insert, update on table public.paths, public.quests
  from public, anon, authenticated;
grant select, insert, update, delete on table public.paths, public.quests
  to service_role;

drop policy if exists "paths_insert_own" on public.paths;
drop policy if exists "paths_update_own" on public.paths;
drop policy if exists "quests_insert_own" on public.quests;
drop policy if exists "quests_update_own" on public.quests;

-- Keep the existing contextual question generator, but remove pg_temp from
-- its SECURITY DEFINER search path so caller-created temporary objects cannot
-- shadow names resolved by the function.
alter function public.refresh_goal_help_questions(uuid)
  set search_path = pg_catalog, public;

-- Match the campaign endpoint's accepted Goal title range for new/changed
-- rows while leaving any pre-existing row untouched by migration validation.
alter table public.goals
  add constraint goals_title_campaign_length
  check (char_length(btrim(title)) between 3 and 300) not valid;

-- The array-based prerequisite references are validated for same-Path
-- ownership by the foundation trigger. Also reject cycles across updates.
create or replace function public.reject_quest_prerequisite_cycles()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    with recursive prerequisite_chain (id) as (
      select dependency.id
      from unnest(new.prerequisites) as dependency(id)
      union
      select nested_dependency.id
      from prerequisite_chain chain
      join public.quests current_quest
        on current_quest.id = chain.id
       and current_quest.path_id = new.path_id
      cross join lateral unnest(current_quest.prerequisites) as nested_dependency(id)
    )
    select 1 from prerequisite_chain where id = new.id
  ) then
    raise exception 'Quest prerequisites cannot contain cycles';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_quest_prerequisite_cycles()
  from public, anon, authenticated, service_role;

create trigger quests_reject_prerequisite_cycles
  before insert or update of prerequisites, path_id on public.quests
  for each row execute function public.reject_quest_prerequisite_cycles();
