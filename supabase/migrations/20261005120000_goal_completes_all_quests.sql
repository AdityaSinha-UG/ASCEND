-- ─────────────────────────────────────────────────────────────────────────────
-- When a Goal is completed, also mark all its Paths and Quests as completed.
--
-- This updates complete_my_goal to cascade completion down to every path
-- and quest that belongs to the goal, so the database state is authoritative.
-- ─────────────────────────────────────────────────────────────────────────────

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
  owner_id        uuid    := auth.uid();
  goal_row        record;
  profile_row     record;
  old_xp          integer;
  xp_awarded      integer := 0;
  completion_xp   constant integer := 100;
  completion_stat constant integer := 1;
begin
  -- ── Authentication ────────────────────────────────────────────────────────
  if owner_id is null then
    raise exception 'Authentication required';
  end if;

  if p_confirmed_path_ids is null then
    raise exception 'Path confirmation is required';
  end if;

  -- ── Goal ownership + row-level lock ───────────────────────────────────────
  select g.id, g.status
    into goal_row
    from public.goals g
   where g.id = p_goal_id and g.user_id = owner_id
     for update;

  if not found then
    raise exception 'Goal not found';
  end if;

  -- ── Path validation ───────────────────────────────────────────────────────
  if cardinality(p_confirmed_path_ids) <> (
    select count(distinct selected.id)::integer
      from unnest(p_confirmed_path_ids) as selected(id)
  ) then
    raise exception 'Path confirmation contains duplicates or null values';
  end if;

  if cardinality(p_confirmed_path_ids) = 0 and exists (
    select 1 from public.paths p where p.goal_id = goal_row.id
  ) then
    raise exception 'Confirm at least one completed Path';
  end if;

  if exists (
    select 1
      from unnest(p_confirmed_path_ids) as selected(id)
      left join public.paths p on p.id = selected.id and p.goal_id = goal_row.id
     where p.id is null
  ) then
    raise exception 'A confirmed Path does not belong to this Goal';
  end if;

  -- ── Profile lock ──────────────────────────────────────────────────────────
  select p.xp, p.focus, p.discipline, p.consistency
    into profile_row
    from public.profiles p
   where p.id = owner_id
     for update;

  if not found then
    raise exception 'Player profile not found';
  end if;

  old_xp := profile_row.xp;

  -- ── Idempotency: already completed ────────────────────────────────────────
  if goal_row.status = 'completed' then
    return jsonb_build_object(
      'goalId',      goal_row.id,
      'status',      'completed',
      'xpAwarded',   0,
      'xp',          profile_row.xp,
      'level',       public.level_from_xp(profile_row.xp),
      'focus',       profile_row.focus,
      'discipline',  profile_row.discipline,
      'consistency', profile_row.consistency
    );
  end if;

  -- Only active goals can be completed.
  if goal_row.status <> 'active' then
    raise exception 'Only an active Goal can be completed';
  end if;

  -- ── Atomic completion + rewards ───────────────────────────────────────────
  -- Set the session flag so the guard trigger allows the goal status change.
  perform set_config('ascend.progress_rpc', 'on', true);

  -- Complete the goal itself.
  update public.goals
     set status = 'completed'
   where id = goal_row.id and user_id = owner_id;

  -- Cascade: complete every path that belongs to this goal.
  update public.paths
     set status = 'completed'
   where goal_id = goal_row.id
     and status <> 'completed';

  -- Cascade: complete every quest that belongs to any path of this goal.
  update public.quests
     set status = 'completed'
   where path_id in (
     select id from public.paths where goal_id = goal_row.id
   )
     and status <> 'completed';

  -- Award the one-time Goal completion bonus to the player profile.
  update public.profiles
     set xp          = xp + completion_xp,
         focus       = least(1000000, focus       + completion_stat),
         discipline  = least(1000000, discipline  + completion_stat),
         consistency = least(1000000, consistency + completion_stat)
   where id = owner_id
  returning xp, focus, discipline, consistency into profile_row;

  xp_awarded := profile_row.xp - old_xp;

  return jsonb_build_object(
    'goalId',      goal_row.id,
    'status',      'completed',
    'xpAwarded',   xp_awarded,
    'xp',          profile_row.xp,
    'level',       public.level_from_xp(profile_row.xp),
    'focus',       profile_row.focus,
    'discipline',  profile_row.discipline,
    'consistency', profile_row.consistency
  );
end;
$$;

-- Revoke all default grants, then grant only to authenticated role.
revoke all on function public.complete_my_goal(uuid, uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.complete_my_goal(uuid, uuid[]) to authenticated;
