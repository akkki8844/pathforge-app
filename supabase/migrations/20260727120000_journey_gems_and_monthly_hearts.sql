-- Journey rewards rework: gems per level, monthly heart allowance with weekly
-- decay, and a capped self-serve reset.
--
-- Old model: +5 "diamonds" per stage, hearts only ever lost on a rejected proof.
-- New model:
--   * Completing a level awards exactly 1 gem.
--   * Every student gets 5 hearts at the start of each calendar month.
--   * Each full week that passes without completing a level costs 1 heart.
--   * A student may reset their hearts back to 5 twice per calendar month.
--
-- The point of the decay is pace, not punishment: resets exist so a bad month
-- doesn't lock anyone out, and the 2/month cap is what keeps the pressure real.

ALTER TABLE public.journey_scores
  -- First day of the month the current allowance belongs to. NULL means the
  -- row predates this migration and will be initialised on first sync.
  ADD COLUMN IF NOT EXISTS hearts_period_start DATE,
  -- Self-serve resets consumed inside hearts_period_start.
  ADD COLUMN IF NOT EXISTS heart_resets_used INTEGER NOT NULL DEFAULT 0,
  -- Last time a level was submitted — the clock the weekly decay runs against.
  ADD COLUMN IF NOT EXISTS last_level_at TIMESTAMPTZ,
  -- How far the weekly decay has already been charged. Advanced in whole weeks
  -- so a student is never billed twice for the same week, no matter how often
  -- the sync runs.
  ADD COLUMN IF NOT EXISTS hearts_decay_anchor TIMESTAMPTZ;

COMMENT ON COLUMN public.journey_scores.diamonds IS
  'Gems. 1 awarded per level completed. Column name kept for back-compat.';

-- ---------------------------------------------------------------------------
-- journey_sync_hearts: bring a row up to date with the calendar.
--
-- Idempotent and safe to call on every page load. Does the monthly refill and
-- the weekly decay in one pass, under a row lock.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.journey_sync_hearts()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid            UUID := auth.uid();
  r              RECORD;
  this_month     DATE := date_trunc('month', now())::DATE;
  anchor         TIMESTAMPTZ;
  weeks_missed   INTEGER := 0;
  new_hearts     INTEGER;
  refilled       BOOLEAN := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  INSERT INTO public.journey_scores (user_id) VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO r FROM public.journey_scores WHERE user_id = uid FOR UPDATE;

  new_hearts := COALESCE(r.hearts, 5);

  -- Monthly refill. Also covers first-ever sync, where the period is NULL.
  IF r.hearts_period_start IS NULL OR r.hearts_period_start < this_month THEN
    new_hearts := 5;
    refilled   := true;
    UPDATE public.journey_scores
      SET hearts_period_start = this_month,
          heart_resets_used   = 0,
          -- Decay restarts from the top of the month, not from whenever the
          -- student happened to open the page.
          hearts_decay_anchor = GREATEST(this_month::TIMESTAMPTZ, COALESCE(last_level_at, this_month::TIMESTAMPTZ))
      WHERE user_id = uid;
    SELECT * INTO r FROM public.journey_scores WHERE user_id = uid FOR UPDATE;
  END IF;

  -- Weekly decay. The clock runs from the later of "last level completed" and
  -- "how far we've already charged", so completing a level resets the week.
  anchor := GREATEST(
    COALESCE(r.hearts_decay_anchor, r.hearts_period_start::TIMESTAMPTZ, now()),
    COALESCE(r.last_level_at, '-infinity'::TIMESTAMPTZ)
  );

  weeks_missed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - anchor)) / 604800)::INTEGER);

  IF weeks_missed > 0 THEN
    new_hearts := GREATEST(0, new_hearts - weeks_missed);
    anchor     := anchor + (weeks_missed * INTERVAL '7 days');
  END IF;

  UPDATE public.journey_scores
    SET hearts              = new_hearts,
        hearts_decay_anchor = anchor,
        updated_at          = now()
    WHERE user_id = uid;

  RETURN json_build_object(
    'hearts',            new_hearts,
    'weeks_missed',      weeks_missed,
    'refilled',          refilled,
    'resets_used',       COALESCE(r.heart_resets_used, 0),
    'resets_remaining',  GREATEST(0, 2 - COALESCE(r.heart_resets_used, 0))
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- journey_reset_hearts: spend one of the two monthly resets.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.journey_reset_hearts()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid  UUID := auth.uid();
  r    RECORD;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  -- Sync first so the reset is counted against the right month.
  PERFORM public.journey_sync_hearts();

  SELECT * INTO r FROM public.journey_scores WHERE user_id = uid FOR UPDATE;

  IF COALESCE(r.heart_resets_used, 0) >= 2 THEN
    RETURN json_build_object(
      'ok', false,
      'reason', 'limit_reached',
      'hearts', r.hearts,
      'resets_remaining', 0
    );
  END IF;

  UPDATE public.journey_scores
    SET hearts              = 5,
        heart_resets_used   = COALESCE(heart_resets_used, 0) + 1,
        -- A reset also restarts the weekly clock; otherwise the hearts you
        -- just bought back would evaporate on the next sync.
        hearts_decay_anchor = now(),
        updated_at          = now()
    WHERE user_id = uid;

  RETURN json_build_object(
    'ok', true,
    'hearts', 5,
    'resets_remaining', GREATEST(0, 2 - (COALESCE(r.heart_resets_used, 0) + 1))
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- journey_submit_stage: 1 gem per level (was 5 diamonds), and stamp the level
-- completion so the weekly heart decay resets.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.journey_submit_stage(
  stage_id TEXT,
  task_ids TEXT[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid UUID := auth.uid();
  row_rec RECORD;
  awarded INTEGER := 0;
  already BOOLEAN := false;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.journey_scores (user_id, journey_started, started_at)
  VALUES (uid, true, now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO row_rec FROM public.journey_scores WHERE user_id = uid FOR UPDATE;
  already := row_rec.submitted_stage_ids ? stage_id;
  IF NOT already THEN awarded := 1; END IF;

  UPDATE public.journey_scores
  SET completed_milestones = (
        SELECT jsonb_agg(DISTINCT x) FROM jsonb_array_elements_text(
          COALESCE(completed_milestones, '[]'::jsonb) ||
          to_jsonb(COALESCE(task_ids, ARRAY[]::TEXT[]))
        ) x
      ),
      submitted_stage_ids = CASE WHEN already THEN submitted_stage_ids
                                 ELSE submitted_stage_ids || to_jsonb(stage_id) END,
      diamonds = COALESCE(diamonds,0) + awarded,
      -- Only a genuinely new level resets the pace clock. Re-submitting an old
      -- one must not buy another week.
      last_level_at       = CASE WHEN already THEN last_level_at       ELSE now() END,
      hearts_decay_anchor = CASE WHEN already THEN hearts_decay_anchor ELSE now() END,
      updated_at = now()
  WHERE user_id = uid;

  RETURN json_build_object(
    'awarded_gems', awarded,
    'awarded_diamonds', awarded,  -- legacy key, kept so older clients don't break
    'already_submitted', already
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.journey_sync_hearts()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.journey_reset_hearts() TO authenticated;
