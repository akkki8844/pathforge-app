-- The Journey now runs 15 levels, not 10 (see LEVELS in src/lib/journeyLevels.ts).
-- level_evaluations still had the original CHECK (level BETWEEN 1 AND 10) from
-- 20260729140000_journey_level_evaluations.sql, which would silently reject
-- every evaluate-level call for the five new levels with a constraint
-- violation. CHECK constraints can't be altered in place, so drop and re-add.
ALTER TABLE public.level_evaluations
  DROP CONSTRAINT level_eval_level_check;

ALTER TABLE public.level_evaluations
  ADD CONSTRAINT level_eval_level_check CHECK (level BETWEEN 1 AND 15);
