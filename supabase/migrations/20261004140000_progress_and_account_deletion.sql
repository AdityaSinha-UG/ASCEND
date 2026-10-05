-- Persist the three supported player attributes. Level remains derived from XP.
alter table public.profiles
  add column focus integer not null default 0 check (focus >= 0),
  add column discipline integer not null default 0 check (discipline >= 0),
  add column consistency integer not null default 0 check (consistency >= 0);

-- Preserve the existing trusted service-role award entry point while applying
-- the Level 100 XP ceiling without reducing any legacy XP totals.
create or replace function public.award_xp(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  resulting_xp integer;
begin
  if p_user_id is null then raise exception 'A profile user ID is required'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000 then
    raise exception 'XP award must be between 1 and 1000';
  end if;
  update public.profiles set xp = case when xp >= 94500 then xp else least(94500, xp + p_amount) end
  where id = p_user_id returning xp into resulting_xp;
  if not found then raise exception 'Profile not found'; end if;
  return resulting_xp;
end;
$$;
revoke all on function public.award_xp(uuid, integer) from public, anon, authenticated;
grant execute on function public.award_xp(uuid, integer) to service_role;

-- Campaign-generated rewards are currently 25-150 XP. Keep room for future
-- trusted rewards while making the database limit authoritative.
update public.quests set xp_reward = 500 where xp_reward > 500;
alter table public.quests
  add constraint quests_xp_reward_mvp_limit check (xp_reward between 0 and 500);

create or replace function public.level_from_xp(p_xp integer)
returns integer
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if p_xp is null or p_xp <= 0 then return 1; end if;
  if p_xp >= 4500 then return least(100, 10 + ((p_xp - 4500) / 1000)); end if;
  if p_xp >= 3500 then return 9; end if;
  if p_xp >= 2700 then return 8; end if;
  if p_xp >= 2000 then return 7; end if;
  if p_xp >= 1400 then return 6; end if;
  if p_xp >= 900 then return 5; end if;
  if p_xp >= 500 then return 4; end if;
  if p_xp >= 250 then return 3; end if;
  if p_xp >= 100 then return 2; end if;
  return 1;
end;
$$;
revoke all on function public.level_from_xp(integer) from public, anon, authenticated;

-- Prevent direct PostgREST updates from forging quest completion/progress or
-- rewards. The authenticated RPCs below set a transaction-local guard while
-- applying validated state transitions.
create or replace function public.guard_progress_updates()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'authenticated'
     and current_setting('ascend.progress_rpc', true) is distinct from 'on' then
    if tg_table_name = 'paths' and new.status is distinct from old.status then
      raise exception 'Path status can only be changed through ASCEND progression';
    end if;
    if tg_table_name = 'quests' and (
      new.status is distinct from old.status or
      new.progress is distinct from old.progress or
      new.xp_reward is distinct from old.xp_reward
    ) then
      raise exception 'Quest progression and rewards can only be changed through ASCEND progression';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_progress_updates() from public, anon, authenticated, service_role;

create trigger paths_guard_progress_updates
  before update on public.paths
  for each row execute function public.guard_progress_updates();
create trigger quests_guard_progress_updates
  before update on public.quests
  for each row execute function public.guard_progress_updates();

-- Starting either a Path or a Quest is persisted and ownership-checked.
create or replace function public.start_my_progress_node(p_node_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := auth.uid();
  path_row record;
  quest_row record;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  perform set_config('ascend.progress_rpc', 'on', true);

  select p.id, p.goal_id, p.status into path_row
  from public.paths p join public.goals g on g.id = p.goal_id
  where p.id = p_node_id and g.user_id = owner_id
  for update of p;

  if found then
    if path_row.status = 'completed' then raise exception 'This Path is already completed'; end if;
    if path_row.status = 'locked' then raise exception 'Complete the previous Path before starting this Path'; end if;
    update public.paths set status = 'in_progress' where id = path_row.id;
    return jsonb_build_object('nodeId', path_row.id, 'nodeType', 'path', 'status', 'in_progress');
  end if;

  select q.id, q.path_id, q.status, q.prerequisites, q.parent_quest_id
    into quest_row
  from public.quests q
  join public.paths p on p.id = q.path_id
  join public.goals g on g.id = p.goal_id
  where q.id = p_node_id and g.user_id = owner_id
  for update of q;
  if not found then raise exception 'Quest not found'; end if;
  if quest_row.status = 'completed' then raise exception 'This Quest is already completed'; end if;
  if quest_row.status = 'locked' then raise exception 'Complete the prerequisites before starting this Quest'; end if;
  if exists (
    select 1 from unnest(quest_row.prerequisites) as dependency(id)
    left join public.quests prerequisite on prerequisite.id = dependency.id and prerequisite.path_id = quest_row.path_id
    where prerequisite.id is null or prerequisite.status <> 'completed'
  ) then raise exception 'Complete the prerequisites before starting this Quest'; end if;
  if quest_row.parent_quest_id is not null and not exists (
    select 1 from public.quests parent where parent.id = quest_row.parent_quest_id and parent.status = 'completed'
  ) then raise exception 'Complete the parent Quest before starting this Quest'; end if;

  update public.quests set status = 'in_progress', progress = greatest(progress, 1) where id = quest_row.id;
  update public.paths set status = 'in_progress' where id = quest_row.path_id and status <> 'completed';
  return jsonb_build_object('nodeId', quest_row.id, 'nodeType', 'quest', 'status', 'in_progress');
end;
$$;
revoke all on function public.start_my_progress_node(uuid) from public, anon, authenticated, service_role;
grant execute on function public.start_my_progress_node(uuid) to authenticated;

-- Completion is serialized by a row lock. Repeated completion is idempotent:
-- the already-completed branch returns current authoritative values and awards 0.
create or replace function public.complete_my_progress_node(p_node_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := auth.uid();
  path_row record;
  quest_row record;
  profile_row record;
  xp_delta integer := 0;
  focus_delta integer := 0;
  discipline_delta integer := 0;
  consistency_delta integer := 0;
  quest_text text;
  old_xp integer;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  perform set_config('ascend.progress_rpc', 'on', true);

  -- Path nodes are campaign roots in the existing frontend model. They are
  -- completable only after their contained Quests have all been completed.
  select p.id, p.goal_id, p.status into path_row
  from public.paths p join public.goals g on g.id = p.goal_id
  where p.id = p_node_id and g.user_id = owner_id
  for update of p;
  if found then
    if path_row.status = 'completed' then raise exception 'This Path is already completed'; end if;
    if exists (select 1 from public.quests q where q.path_id = path_row.id and q.status <> 'completed') then
      raise exception 'Complete this Path Quests before completing the Path';
    end if;
    update public.paths set status = 'completed' where id = path_row.id;
    select xp, focus, discipline, consistency into profile_row
      from public.profiles where id = owner_id;
    return jsonb_build_object(
      'nodeId', path_row.id, 'nodeType', 'path', 'status', 'completed', 'xpAwarded', 0,
      'xp', profile_row.xp, 'level', public.level_from_xp(profile_row.xp),
      'focus', profile_row.focus, 'discipline', profile_row.discipline, 'consistency', profile_row.consistency
    );
  end if;

  select q.id, q.path_id, q.status, q.prerequisites, q.parent_quest_id,
         q.xp_reward, q.difficulty, q.title, q.objective
    into quest_row
  from public.quests q
  join public.paths p on p.id = q.path_id
  join public.goals g on g.id = p.goal_id
  where q.id = p_node_id and g.user_id = owner_id
  for update of q;
  if not found then raise exception 'Quest not found'; end if;

  select xp, focus, discipline, consistency into profile_row
    from public.profiles where id = owner_id for update;
  if not found then raise exception 'Player profile not found'; end if;
  old_xp := profile_row.xp;

  if quest_row.status = 'completed' then
    return jsonb_build_object(
      'nodeId', quest_row.id, 'nodeType', 'quest', 'status', 'completed', 'xpAwarded', 0,
      'xp', profile_row.xp, 'level', public.level_from_xp(profile_row.xp),
      'focus', profile_row.focus, 'discipline', profile_row.discipline, 'consistency', profile_row.consistency
    );
  end if;
  if quest_row.status <> 'in_progress' then raise exception 'Start this Quest before completing it'; end if;
  if exists (
    select 1 from unnest(quest_row.prerequisites) as dependency(id)
    left join public.quests prerequisite on prerequisite.id = dependency.id and prerequisite.path_id = quest_row.path_id
    where prerequisite.id is null or prerequisite.status <> 'completed'
  ) then raise exception 'Complete the prerequisites before completing this Quest'; end if;
  if quest_row.parent_quest_id is not null and not exists (
    select 1 from public.quests parent where parent.id = quest_row.parent_quest_id and parent.status = 'completed'
  ) then raise exception 'Complete the parent Quest before completing this Quest'; end if;
  -- Help questions are written only by trusted campaign generation. This
  -- prevents a browser-created arbitrary Quest from becoming an XP faucet.
  if not exists (
    select 1 from public.help_questions help
    where help.quest_id = quest_row.id and help.is_active
  ) then raise exception 'This Quest is not part of a generated campaign'; end if;

  quest_text := lower(coalesce(quest_row.title, '') || ' ' || coalesce(quest_row.objective, ''));
  focus_delta := case when quest_text ~ '\m(study|learn|practice|research|code|program|write|build|design|analyze|analyse|read|solve|review)\M' then 1 else 0 end;
  discipline_delta := case when quest_row.difficulty in ('hard', 'epic') or quest_text ~ '\m(plan|schedule|daily|weekly|deadline|routine|commit|deliver|finish|habit|train)\M' then 1 else 0 end;
  consistency_delta := 1;
  xp_delta := least(greatest(coalesce(quest_row.xp_reward, 0), 0), 500);

  update public.quests set status = 'completed', progress = 100 where id = quest_row.id;
  update public.profiles
  set xp = case when xp >= 94500 then xp else least(94500, xp + xp_delta) end,
      focus = least(1000000, focus + focus_delta),
      discipline = least(1000000, discipline + discipline_delta),
      consistency = least(1000000, consistency + consistency_delta)
  where id = owner_id
  returning xp, focus, discipline, consistency into profile_row;
  xp_delta := profile_row.xp - old_xp;

  -- Unlock same-Path quests whose prerequisite list is now satisfied.
  update public.quests candidate
  set status = 'available'
  where candidate.path_id = quest_row.path_id
    and candidate.status = 'locked'
    and not exists (
      select 1 from unnest(candidate.prerequisites) as dependency(id)
      left join public.quests prerequisite on prerequisite.id = dependency.id and prerequisite.path_id = candidate.path_id
      where prerequisite.id is null or prerequisite.status <> 'completed'
    )
    and (candidate.parent_quest_id is null or exists (
      select 1 from public.quests parent where parent.id = candidate.parent_quest_id and parent.status = 'completed'
    ));

  if not exists (select 1 from public.quests q where q.path_id = quest_row.path_id and q.status <> 'completed') then
    update public.paths set status = 'completed' where id = quest_row.path_id;
    update public.paths next_path set status = 'available'
    where next_path.id = (
      select p.id from public.paths p
      where p.goal_id = (select current_path.goal_id from public.paths current_path where current_path.id = quest_row.path_id)
        and p.status = 'locked'
      order by p.sort_order, p.id limit 1
      for update
    );
    update public.quests first_quest set status = 'available'
    where first_quest.id = (
      select q.id from public.quests q
      join public.paths p on p.id = q.path_id
      where p.goal_id = (select current_path.goal_id from public.paths current_path where current_path.id = quest_row.path_id)
        and p.status = 'available' and q.status = 'locked'
      order by p.sort_order, q.sort_order, q.id limit 1
    );
  end if;

  return jsonb_build_object(
    'nodeId', quest_row.id, 'nodeType', 'quest', 'status', 'completed', 'xpAwarded', xp_delta,
    'xp', profile_row.xp, 'level', public.level_from_xp(profile_row.xp),
    'focus', profile_row.focus, 'discipline', profile_row.discipline, 'consistency', profile_row.consistency
  );
end;
$$;
revoke all on function public.complete_my_progress_node(uuid) from public, anon, authenticated, service_role;
grant execute on function public.complete_my_progress_node(uuid) to authenticated;

-- Reset remains a separate operation and preserves account identity/avatar.
create or replace function public.reset_my_progress()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  delete from public.goals where user_id = owner_id;
  update public.profiles set xp = 0, focus = 0, discipline = 0, consistency = 0, tutorial_completed = false
    where id = owner_id;
  if not found then raise exception 'Profile not found'; end if;
end;
$$;
revoke all on function public.reset_my_progress() from public, anon, authenticated, service_role;
grant execute on function public.reset_my_progress() to authenticated;

-- Deleting auth.users cascades through profiles and all ASCEND-owned data.
-- The caller can only delete the Auth row identified by their own JWT.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  delete from auth.users where id = owner_id;
  if not found then raise exception 'Account not found'; end if;
end;
$$;
revoke all on function public.delete_my_account() from public, anon, authenticated, service_role;
grant execute on function public.delete_my_account() to authenticated;
