-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-heal legacy goals whose titles were corrupted to 'I Mastery' or 'I Journey'
-- ─────────────────────────────────────────────────────────────────────────────

update public.goals
   set title = case
     when description ilike '%python%' then 'Learn Python Foundation'
     when description ilike '%japanese%' or description ilike '%jlpt%' then 'Learn Japanese'
     else coalesce(nullif(trim(split_part(description, E'\n', 1)), ''), 'Personal Journey')
   end
 where title ~* '^(i\s+)?(mastery|journey|prep)(\s+(mastery|journey|prep))?$'
    or title ~* '^I\s+(Mastery|Journey|Prep)$';
