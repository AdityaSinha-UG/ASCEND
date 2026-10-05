-- ASCEND Phase 3 foundation: relational game data with per-user RLS.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  player_id text not null unique
    check (player_id ~ '^[0-9]{8}$'),
  username text not null default 'Player',
  avatar_id text not null default 'elephant',
  xp integer not null default 0 check (xp >= 0),
  tutorial_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'active'
    check (status in ('active', 'completed', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  target_date date,
  unique (id, user_id)
);

create table public.paths (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  title text not null,
  objective text not null default '',
  status text not null default 'available'
    check (status in ('locked', 'available', 'in_progress', 'completed')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (id, goal_id)
);

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  parent_quest_id uuid,
  type text not null default 'main' check (type in ('main', 'sub', 'side')),
  title text not null,
  objective text not null default '',
  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard', 'epic')),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  status text not null default 'available'
    check (status in ('locked', 'available', 'in_progress', 'completed')),
  prerequisites uuid[] not null default '{}',
  progress integer not null default 0 check (progress between 0 and 100),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (id, path_id),
  constraint quests_not_own_parent
    check (parent_quest_id is null or parent_quest_id <> id),
  constraint quests_parent_same_path_fk
    foreign key (parent_quest_id, path_id)
    references public.quests (id, path_id)
    on delete cascade
);

create table public.help_questions (
  id uuid primary key default gen_random_uuid(),
  path_id uuid references public.paths (id) on delete cascade,
  quest_id uuid references public.quests (id) on delete cascade,
  question text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint help_questions_exactly_one_context
    check ((path_id is not null) <> (quest_id is not null))
);

create index goals_user_id_idx on public.goals (user_id);
create index paths_goal_id_sort_idx on public.paths (goal_id, sort_order);
create index quests_path_id_sort_idx on public.quests (path_id, sort_order);
create index quests_parent_quest_id_idx on public.quests (parent_quest_id);
create index help_questions_path_id_sort_idx on public.help_questions (path_id, sort_order)
  where path_id is not null;
create index help_questions_quest_id_sort_idx on public.help_questions (quest_id, sort_order)
  where quest_id is not null;

-- Use a random UUID as the entropy source, then map to the 8-digit range.
-- The unique constraint is authoritative; retry on the extremely unlikely
-- collision before completing Auth user creation.
create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  generated_player_id text;
  entropy bytea;
  attempt integer := 0;
begin
  loop
    entropy := uuid_send(gen_random_uuid());
    generated_player_id := (
      10000000 + (
        (
          get_byte(entropy, 0)::bigint * 16777216 +
          get_byte(entropy, 1)::bigint * 65536 +
          get_byte(entropy, 2)::bigint * 256 +
          get_byte(entropy, 3)::bigint
        ) % 90000000
      )
    )::text;

    begin
      insert into public.profiles (id, player_id, username)
      values (
        new.id,
        generated_player_id,
        coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'Player')
      );
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt >= 10 then
        raise exception 'Could not allocate a unique ASCEND Player ID';
      end if;
    end;
  end loop;

  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();
revoke all on function public.create_profile_for_auth_user()
  from public, anon, authenticated;

create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.id is distinct from old.id or new.player_id is distinct from old.player_id then
    raise exception 'Profile identity and Player ID cannot be changed';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_protect_identity
  before update on public.profiles
  for each row execute function public.protect_profile_identity();

-- Validate array-based prerequisites without adding a join table. Every
-- referenced quest must exist in this same path, and a quest cannot depend on
-- itself. Parent chains must also remain acyclic and within the same path.
create or replace function public.validate_quest_relationships()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  creates_parent_cycle boolean := false;
  prerequisite_count integer;
  distinct_prerequisite_count integer;
begin
  if new.parent_quest_id is not null then
    if new.parent_quest_id = new.id then
      raise exception 'A quest cannot be its own parent';
    end if;

    with recursive parent_chain (id, parent_quest_id, path_id) as (
      select q.id, q.parent_quest_id, q.path_id
      from public.quests q
      where q.id = new.parent_quest_id and q.path_id = new.path_id
      union
      select q.id, q.parent_quest_id, q.path_id
      from public.quests q
      join parent_chain pc on q.id = pc.parent_quest_id and q.path_id = new.path_id
    )
    select exists (select 1 from parent_chain where id = new.id)
      into creates_parent_cycle;

    if creates_parent_cycle then
      raise exception 'Quest parent relationships cannot contain cycles';
    end if;
  end if;

  select count(*), count(distinct prerequisite_id)
    into prerequisite_count, distinct_prerequisite_count
  from unnest(new.prerequisites) as items(prerequisite_id);

  if prerequisite_count <> distinct_prerequisite_count then
    raise exception 'Quest prerequisites cannot contain duplicates';
  end if;

  if exists (
    select 1
    from unnest(new.prerequisites) as items(prerequisite_id)
    left join public.quests prerequisite
      on prerequisite.id = items.prerequisite_id
     and prerequisite.path_id = new.path_id
    where prerequisite.id is null or items.prerequisite_id = new.id
  ) then
    raise exception 'Quest prerequisites must reference other quests in the same path';
  end if;

  return new;
end;
$$;

create trigger quests_validate_relationships
  before insert or update on public.quests
  for each row execute function public.validate_quest_relationships();

-- Arrays do not have element-level foreign keys. Remove references when a
-- prerequisite quest is deleted, including during cascading path/goal deletes.
create or replace function public.remove_deleted_quest_prerequisites()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.quests dependent
  set prerequisites = array_remove(dependent.prerequisites, old.id)
  where dependent.path_id = old.path_id
    and dependent.id <> old.id
    and dependent.prerequisites @> array[old.id];
  return old;
end;
$$;

create trigger quests_remove_deleted_prerequisite
  after delete on public.quests
  for each row execute function public.remove_deleted_quest_prerequisites();
revoke all on function public.remove_deleted_quest_prerequisites()
  from public, anon, authenticated;

-- Only profile identity/display/tutorial fields are directly updatable by an
-- authenticated client. In particular, revoke table-level UPDATE so RLS cannot
-- be used to write profiles.xp directly.
revoke update on table public.profiles from public, anon, authenticated, service_role;
revoke update (xp) on table public.profiles from public, anon, authenticated, service_role;
grant update (username, avatar_id, tutorial_completed)
  on table public.profiles to authenticated, service_role;

-- Award XP atomically from trusted server-side code using the service_role.
-- Never put a service_role credential in browser code.
create or replace function public.award_xp(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  resulting_xp integer;
begin
  if p_user_id is null then
    raise exception 'A profile user ID is required';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000 then
    raise exception 'XP award must be between 1 and 1000';
  end if;

  update public.profiles
  set xp = xp + p_amount
  where id = p_user_id
  returning xp into resulting_xp;

  if not found then
    raise exception 'Profile not found';
  end if;

  return resulting_xp;
end;
$$;

revoke all on function public.award_xp(uuid, integer) from public, anon, authenticated;
grant execute on function public.award_xp(uuid, integer) to service_role;

-- Help content is read-only to normal clients. Trusted server/database
-- administration remains responsible for creating and maintaining it.
revoke all on table public.help_questions from public, anon, authenticated;
grant select on table public.help_questions to authenticated;
grant select, insert, update, delete on table public.help_questions to service_role;

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.paths enable row level security;
alter table public.quests enable row level security;
alter table public.help_questions enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "goals_select_own" on public.goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "goals_insert_own" on public.goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "goals_update_own" on public.goals
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "goals_delete_own" on public.goals
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "paths_select_own" on public.paths
  for select to authenticated using (
    exists (select 1 from public.goals g
      where g.id = paths.goal_id and g.user_id = (select auth.uid()))
  );
create policy "paths_insert_own" on public.paths
  for insert to authenticated with check (
    exists (select 1 from public.goals g
      where g.id = paths.goal_id and g.user_id = (select auth.uid()))
  );
create policy "paths_update_own" on public.paths
  for update to authenticated using (
    exists (select 1 from public.goals g
      where g.id = paths.goal_id and g.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.goals g
      where g.id = paths.goal_id and g.user_id = (select auth.uid()))
  );
create policy "paths_delete_own" on public.paths
  for delete to authenticated using (
    exists (select 1 from public.goals g
      where g.id = paths.goal_id and g.user_id = (select auth.uid()))
  );

create policy "quests_select_own" on public.quests
  for select to authenticated using (
    exists (select 1 from public.paths p
      join public.goals g on g.id = p.goal_id
      where p.id = quests.path_id and g.user_id = (select auth.uid()))
  );
create policy "quests_insert_own" on public.quests
  for insert to authenticated with check (
    exists (select 1 from public.paths p
      join public.goals g on g.id = p.goal_id
      where p.id = quests.path_id and g.user_id = (select auth.uid()))
  );
create policy "quests_update_own" on public.quests
  for update to authenticated using (
    exists (select 1 from public.paths p
      join public.goals g on g.id = p.goal_id
      where p.id = quests.path_id and g.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.paths p
      join public.goals g on g.id = p.goal_id
      where p.id = quests.path_id and g.user_id = (select auth.uid()))
  );
create policy "quests_delete_own" on public.quests
  for delete to authenticated using (
    exists (select 1 from public.paths p
      join public.goals g on g.id = p.goal_id
      where p.id = quests.path_id and g.user_id = (select auth.uid()))
  );

create policy "help_questions_select_own_context" on public.help_questions
  for select to authenticated using (
    (path_id is not null and exists (
      select 1 from public.paths p join public.goals g on g.id = p.goal_id
      where p.id = help_questions.path_id and g.user_id = (select auth.uid())
    )) or
    (quest_id is not null and exists (
      select 1 from public.quests q
      join public.paths p on p.id = q.path_id
      join public.goals g on g.id = p.goal_id
      where q.id = help_questions.quest_id and g.user_id = (select auth.uid())
    ))
  );
