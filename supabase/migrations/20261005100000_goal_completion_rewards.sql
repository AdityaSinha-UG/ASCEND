-- Goal completion already uses goals.status. Protect that state transition and
-- award its fixed reward atomically through an auth.uid()-scoped RPC.
create or replace function public.guard_goal_completion_updates()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'authenticated'
     and new.status = 'completed'
     and current_setting('ascend.progress_rpc', true) is distinct from 'on' then
    if tg_op = 'INSERT' then
      raise exception 'Goal completion can only be confirmed through ASCEND progression';
    elsif old.status is distinct from 'completed' then
      raise exception 'Goal completion can only be confirmed through ASCEND progression';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_goal_completion_updates() from public, anon, authenticated, service_role;

create trigger goals_guard_completion_state
  before insert or update on public.goals
  for each row execute function public.guard_goal_completion_updates();

create or replace function public.complete_my_goal(
  p_goal_id uuid,
  p_confirmed_path_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := auth.uid();
  goal_row record;
  profile_row record;
  old_xp integer;
  xp_awarded integer := 0;
  completion_xp constant integer := 500;
  completion_stat constant integer := 10;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if p_confirmed_path_ids is null then raise exception 'Path confirmation is required'; end if;

  select g.id, g.status into goal_row
  from public.goals g
  where g.id = p_goal_id and g.user_id = owner_id
  for update;
  if not found then raise exception 'Goal not found'; end if;

  if cardinality(p_confirmed_path_ids) <> (
    select count(distinct selected.id)::integer from unnest(p_confirmed_path_ids) as selected(id)
  ) then raise exception 'Path confirmation contains duplicates or null values'; end if;
  if cardinality(p_confirmed_path_ids) = 0 and exists (
    select 1 from public.paths p where p.goal_id = goal_row.id
  ) then raise exception 'Confirm at least one completed Path'; end if;
  if exists (
    select 1 from unnest(p_confirmed_path_ids) as selected(id)
    left join public.paths p on p.id = selected.id and p.goal_id = goal_row.id
    where p.id is null
  ) then raise exception 'A confirmed Path does not belong to this Goal'; end if;

  select p.xp, p.focus, p.discipline, p.consistency into profile_row
  from public.profiles p where p.id = owner_id for update;
  if not found then raise exception 'Player profile not found'; end if;
  old_xp := profile_row.xp;

  if goal_row.status = 'completed' then
    return jsonb_build_object(
      'goalId', goal_row.id, 'status', 'completed', 'xpAwarded', 0,
      'xp', profile_row.xp, 'level', public.level_from_xp(profile_row.xp),
      'focus', profile_row.focus, 'discipline', profile_row.discipline, 'consistency', profile_row.consistency
    );
  end if;
  if goal_row.status <> 'active' then raise exception 'Only an active Goal can be completed'; end if;

  perform set_config('ascend.progress_rpc', 'on', true);
  update public.goals set status = 'completed' where id = goal_row.id and user_id = owner_id;
  update public.profiles
  set xp = xp + completion_xp,
      focus = least(1000000, focus + completion_stat),
      discipline = least(1000000, discipline + completion_stat),
      consistency = least(1000000, consistency + completion_stat)
  where id = owner_id
  returning xp, focus, discipline, consistency into profile_row;
  xp_awarded := profile_row.xp - old_xp;

  return jsonb_build_object(
    'goalId', goal_row.id, 'status', 'completed', 'xpAwarded', xp_awarded,
    'xp', profile_row.xp, 'level', public.level_from_xp(profile_row.xp),
    'focus', profile_row.focus, 'discipline', profile_row.discipline, 'consistency', profile_row.consistency
  );
end;
$$;
revoke all on function public.complete_my_goal(uuid, uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.complete_my_goal(uuid, uuid[]) to authenticated;

-- Keep the existing ownership, prerequisite, idempotency, and XP logic in the
-- progression RPC. Wrap its result to make all three stat gains depend on the
-- server-owned Quest difficulty, type, and objective workload.
alter function public.complete_my_progress_node(uuid)
  rename to complete_my_progress_node_legacy;
revoke all on function public.complete_my_progress_node_legacy(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.complete_my_progress_node(p_node_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := auth.uid();
  quest_row record;
  before_profile record;
  result jsonb;
  effort integer;
  focus_gain integer;
  discipline_gain integer;
  consistency_gain integer;
  is_quest boolean := false;
  first_completion boolean := false;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;

  select q.id, q.status, q.difficulty, q.type, q.objective
    into quest_row
  from public.quests q
  join public.paths p on p.id = q.path_id
  join public.goals g on g.id = p.goal_id
  where q.id = p_node_id and g.user_id = owner_id
  for update of q;

  is_quest := found;
  if is_quest then
    first_completion := quest_row.status <> 'completed';
    if first_completion then
      select p.focus, p.discipline, p.consistency into before_profile
      from public.profiles p where p.id = owner_id for update;
      if not found then raise exception 'Player profile not found'; end if;
    end if;
  end if;

  result := public.complete_my_progress_node_legacy(p_node_id);

  if is_quest and first_completion and result ->> 'nodeType' = 'quest' then
    effort := case quest_row.difficulty
      when 'easy' then 1 when 'medium' then 2 when 'hard' then 3 else 4 end;
    if quest_row.type = 'main' then effort := effort + 1; end if;
    if char_length(coalesce(quest_row.objective, '')) > 240 then effort := effort + 1; end if;
    focus_gain := greatest(1, (effort + 1) / 2);
    discipline_gain := greatest(1, effort / 2);
    consistency_gain := case when effort >= 4 then 2 else 1 end;

    perform set_config('ascend.progress_rpc', 'on', true);
    update public.profiles
    set focus = least(1000000, before_profile.focus + focus_gain),
        discipline = least(1000000, before_profile.discipline + discipline_gain),
        consistency = least(1000000, before_profile.consistency + consistency_gain)
    where id = owner_id;
    select jsonb_set(
      jsonb_set(
        jsonb_set(result, '{focus}', to_jsonb(p.focus)),
        '{discipline}', to_jsonb(p.discipline)
      ),
      '{consistency}', to_jsonb(p.consistency)
    ) into result from public.profiles p where p.id = owner_id;
  end if;

  return result;
end;
$$;
revoke all on function public.complete_my_progress_node(uuid) from public, anon, authenticated, service_role;
grant execute on function public.complete_my_progress_node(uuid) to authenticated;

-- Preserve the existing contextual question generator and add one stored,
-- research-oriented question per Goal, Path, and Quest (four total each).
alter function public.refresh_goal_help_questions(uuid)
  rename to refresh_goal_help_questions_legacy;
revoke all on function public.refresh_goal_help_questions_legacy(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.refresh_goal_help_questions(p_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := auth.uid();
  goal_title text;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  perform public.refresh_goal_help_questions_legacy(p_goal_id);

  select g.title into goal_title
  from public.goals g where g.id = p_goal_id and g.user_id = owner_id;
  if goal_title is null then raise exception 'Goal not found'; end if;

  insert into public.help_questions (id, goal_id, question, sort_order, is_active)
  values (
    md5('ascend-help:resource:goal:' || p_goal_id::text)::uuid,
    p_goal_id,
    format('Where can I find useful learning resources for "%s"?', goal_title),
    3,
    true
  )
  on conflict (id) do update set question = excluded.question, sort_order = excluded.sort_order, is_active = true;

  insert into public.help_questions (id, path_id, question, sort_order, is_active)
  select md5('ascend-help:resource:path:' || p.id::text)::uuid,
         p.id,
         format('Where can I find a useful website or tutorial for "%s"?', p.title),
         3,
         true
  from public.paths p where p.goal_id = p_goal_id
  on conflict (id) do update set question = excluded.question, sort_order = excluded.sort_order, is_active = true;

  insert into public.help_questions (id, quest_id, question, sort_order, is_active)
  select md5('ascend-help:resource:quest:' || q.id::text)::uuid,
         q.id,
         format('What websites or YouTube resources can help me with "%s"?', q.title),
         3,
         true
  from public.quests q
  join public.paths p on p.id = q.path_id
  where p.goal_id = p_goal_id
  on conflict (id) do update set question = excluded.question, sort_order = excluded.sort_order, is_active = true;
end;
$$;
revoke all on function public.refresh_goal_help_questions(uuid) from public, anon, service_role;
grant execute on function public.refresh_goal_help_questions(uuid) to authenticated;
