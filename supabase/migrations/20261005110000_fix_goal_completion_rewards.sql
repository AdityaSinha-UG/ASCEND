-- ─────────────────────────────────────────────────────────────────────────────
-- FIX: Goal completion rewards + idempotent re-application of the RPC/trigger.
--
-- Problem: complete_my_goal RPC either did not exist (migration not applied) or
-- used reward values that must be updated.  This migration is safe to run
-- against a database that already has the objects from
-- 20261005100000_goal_completion_rewards.sql, as well as against one that does
-- not yet have them.
--
-- Reward change (Goal completion BONUS only, awarded exactly once):
--   OLD: +500 XP, +10 Focus, +10 Discipline, +10 Consistency
--   NEW: +100 XP, +1  Focus, +1  Discipline, +1  Consistency
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Guard trigger function (idempotent via CREATE OR REPLACE)
--    Prevents the goals.status column from being set to 'completed' by any
--    caller other than the complete_my_goal RPC (which sets the session
--    config flag first).
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

-- Re-attach the trigger (idempotent: drop first, then recreate).
drop trigger if exists goals_guard_completion_state on public.goals;
create trigger goals_guard_completion_state
  before insert or update on public.goals
  for each row execute function public.guard_goal_completion_updates();

-- 2. Ensure the legacy quest-completion node exists so the wrapper in the
--    previous migration (if applied) can still call it.  If the previous
--    migration was NOT applied, complete_my_progress_node_legacy will not
--    exist; we handle that gracefully by only wrapping it if it exists.
--    This block is intentionally left empty — the quest-completion path is
--    not being changed here.

-- 3. Goal-completion RPC with corrected reward values.
--    Security model preserved:
--      • security definer  — runs as the function owner, not the caller
--      • auth.uid() check  — caller must be authenticated and own the goal
--      • ascend.progress_rpc session flag — lets the guard trigger through
--      • idempotency       — already-completed goals return current state
--      • atomic            — single transaction
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
  -- ── Reward constants (Goal-completion bonus, awarded exactly once) ──────
  completion_xp   constant integer := 100;   -- was 500
  completion_stat constant integer := 1;     -- was 10
begin
  -- ── Authentication ───────────────────────────────────────────────────────
  if owner_id is null then
    raise exception 'Authentication required';
  end if;

  if p_confirmed_path_ids is null then
    raise exception 'Path confirmation is required';
  end if;

  -- ── Goal ownership + row-level lock ──────────────────────────────────────
  select g.id, g.status
    into goal_row
    from public.goals g
   where g.id = p_goal_id and g.user_id = owner_id
     for update;

  if not found then
    raise exception 'Goal not found';
  end if;

  -- ── Path validation ───────────────────────────────────────────────────────
  -- Reject duplicate UUIDs in the confirmed list.
  if cardinality(p_confirmed_path_ids) <> (
    select count(distinct selected.id)::integer
      from unnest(p_confirmed_path_ids) as selected(id)
  ) then
    raise exception 'Path confirmation contains duplicates or null values';
  end if;

  -- At least one path must be confirmed if this goal has any paths.
  if cardinality(p_confirmed_path_ids) = 0 and exists (
    select 1 from public.paths p where p.goal_id = goal_row.id
  ) then
    raise exception 'Confirm at least one completed Path';
  end if;

  -- Every confirmed path must actually belong to this goal.
  if exists (
    select 1
      from unnest(p_confirmed_path_ids) as selected(id)
      left join public.paths p on p.id = selected.id and p.goal_id = goal_row.id
     where p.id is null
  ) then
    raise exception 'A confirmed Path does not belong to this Goal';
  end if;

  -- ── Profile lock ─────────────────────────────────────────────────────────
  select p.xp, p.focus, p.discipline, p.consistency
    into profile_row
    from public.profiles p
   where p.id = owner_id
     for update;

  if not found then
    raise exception 'Player profile not found';
  end if;

  old_xp := profile_row.xp;

  -- ── Idempotency: already completed ───────────────────────────────────────
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

  -- ── Atomic completion + reward ────────────────────────────────────────────
  -- Set the session flag so the guard trigger allows this status change.
  perform set_config('ascend.progress_rpc', 'on', true);

  update public.goals
     set status = 'completed'
   where id = goal_row.id and user_id = owner_id;

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
