-- Add explicit duration and campaign assessment metadata without invalidating
-- existing Goals or changing their ownership/RLS model.
alter table public.goals
  add column timeframe_value integer,
  add column timeframe_unit text,
  add column timeframe_context text,
  add column campaign_analysis jsonb not null default '{}'::jsonb;

alter table public.goals
  add constraint goals_timeframe_fields_valid check (
    (timeframe_value is null and timeframe_unit is null and timeframe_context is null)
    or (
      timeframe_value between 1 and 3650
      and timeframe_unit in ('days', 'weeks', 'months', 'years')
      and (
        (timeframe_unit = 'days' and timeframe_value <= 1095)
        or (timeframe_unit = 'weeks' and timeframe_value <= 520)
        or (timeframe_unit = 'months' and timeframe_value <= 120)
        or (timeframe_unit = 'years' and timeframe_value <= 10)
      )
      and timeframe_context in ('preparation', 'learning', 'development', 'habit', 'goal')
    )
  ),
  add constraint goals_campaign_analysis_object check (jsonb_typeof(campaign_analysis) = 'object');

-- Help questions can belong to the Goal, a Path, or a Quest. Existing Path and
-- Quest rows remain valid; the check still requires exactly one context.
alter table public.help_questions
  add column goal_id uuid references public.goals(id) on delete cascade;

alter table public.help_questions
  drop constraint help_questions_exactly_one_context,
  add constraint help_questions_exactly_one_context check (
    num_nonnulls(goal_id, path_id, quest_id) = 1
  );

create index help_questions_goal_id_sort_idx on public.help_questions (goal_id, sort_order)
  where goal_id is not null;

drop policy if exists "help_questions_select_own_context" on public.help_questions;
create policy "help_questions_select_own_context" on public.help_questions
  for select to authenticated
  using (
    exists (
      select 1 from public.goals g
      where g.id = help_questions.goal_id and g.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.paths p
      join public.goals g on g.id = p.goal_id
      where p.id = help_questions.path_id and g.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.quests q
      join public.paths p on p.id = q.path_id
      join public.goals g on g.id = p.goal_id
      where q.id = help_questions.quest_id and g.user_id = (select auth.uid())
    )
  );

-- This authenticated RPC creates only the product's fixed question templates
-- for the caller's own campaign. It accepts no question text and does not grant
-- table INSERT/UPDATE/DELETE privileges to normal clients.
create or replace function public.refresh_goal_help_questions(p_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  goal_title text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select g.title into goal_title
  from public.goals g
  where g.id = p_goal_id and g.user_id = auth.uid();
  if goal_title is null then
    raise exception 'goal not found';
  end if;

  insert into public.help_questions (id, goal_id, question, sort_order, is_active)
  select md5('ascend-help:goal:' || p_goal_id::text || ':' || q.idx::text)::uuid,
         p_goal_id,
         format(q.template, goal_title),
         q.idx,
         true
  from (values
    (0, 'What is one practical first step toward "%s"?'),
    (1, 'What would meaningful progress on "%s" look like this week?'),
    (2, 'How can I keep "%s" realistic within my timeframe?')
  ) as q(idx, template)
  on conflict (id) do update set question = excluded.question, sort_order = excluded.sort_order, is_active = true;

  insert into public.help_questions (id, path_id, question, sort_order, is_active)
  select md5('ascend-help:path:' || p.id::text || ':' || q.idx::text)::uuid,
         p.id,
         format(q.template, p.title),
         q.idx,
         true
  from public.paths p
  join public.goals g on g.id = p.goal_id
  cross join (values
    (0, 'What should I understand before starting "%s"?'),
    (1, 'Which skill should I prioritize in "%s"?'),
    (2, 'How can I tell I am ready to move on from "%s"?')
  ) as q(idx, template)
  where p.goal_id = p_goal_id and g.user_id = auth.uid()
  on conflict (id) do update set question = excluded.question, sort_order = excluded.sort_order, is_active = true;

  insert into public.help_questions (id, quest_id, question, sort_order, is_active)
  select md5('ascend-help:quest:' || quest.id::text || ':' || q.idx::text)::uuid,
         quest.id,
         format(q.template, quest.title),
         q.idx,
         true
  from public.quests quest
  join public.paths p on p.id = quest.path_id
  join public.goals g on g.id = p.goal_id
  cross join (values
    (0, 'What should I know before starting "%s"?'),
    (1, 'What is the first concrete action for "%s"?'),
    (2, 'What can I try if I get stuck on "%s"?')
  ) as q(idx, template)
  where p.goal_id = p_goal_id and g.user_id = auth.uid()
  on conflict (id) do update set question = excluded.question, sort_order = excluded.sort_order, is_active = true;
end;
$$;

revoke all on function public.refresh_goal_help_questions(uuid) from public, anon;
grant execute on function public.refresh_goal_help_questions(uuid) to authenticated;

-- XP and timeframe writes remain server-authoritative. Normal authenticated
-- clients retain SELECT-only table access to help_questions.
