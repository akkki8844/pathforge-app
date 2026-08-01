-- Gamification: diamonds + hearts on journey_scores
ALTER TABLE public.journey_scores
  ADD COLUMN IF NOT EXISTS diamonds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hearts INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS hearts_refilled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS submitted_stage_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Credit consumption with variable amount.
CREATE OR REPLACE FUNCTION public.consume_credits(amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  credit_row RECORD;
  hours_since_reset DOUBLE PRECISION;
  effective_limit INTEGER;
  needed INTEGER := GREATEST(1, COALESCE(amount, 1));
  available INTEGER;
  daily_remaining INTEGER;
  taken_from_bonus INTEGER;
  taken_from_daily INTEGER;
BEGIN
  IF public.is_admin() OR public.is_vc_user(auth.uid()) THEN RETURN true; END IF;
  PERFORM public.revert_user_if_expired(auth.uid());
  SELECT * INTO credit_row FROM public.user_credits WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', needed, 5)
    RETURNING * INTO credit_row;
    RETURN true;
  END IF;
  hours_since_reset := EXTRACT(EPOCH FROM (now() - credit_row.last_reset_at)) / 3600.0;
  IF hours_since_reset >= 24 THEN
    UPDATE public.user_credits SET credits_used_today = 0, last_reset_at = now(), updated_at = now()
    WHERE user_id = auth.uid() RETURNING * INTO credit_row;
  END IF;
  effective_limit := public.effective_daily_credit_limit(auth.uid(), credit_row.plan, credit_row.max_daily_credits);
  daily_remaining := GREATEST(0, effective_limit - credit_row.credits_used_today);
  available := credit_row.bonus_credits + daily_remaining;
  IF available < needed THEN RETURN false; END IF;
  taken_from_bonus := LEAST(needed, credit_row.bonus_credits);
  taken_from_daily := needed - taken_from_bonus;
  UPDATE public.user_credits
    SET bonus_credits = bonus_credits - taken_from_bonus,
        credits_used_today = credits_used_today + taken_from_daily,
        updated_at = now()
    WHERE user_id = auth.uid();
  RETURN true;
END;
$$;

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  referred_user_id UUID,
  referred_email TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id);

CREATE POLICY "Users create own referral codes"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referrer_user_id AND referred_user_id IS NULL AND accepted_at IS NULL);

-- Get or create the caller's primary referral code
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT code INTO v_code FROM public.referrals
    WHERE referrer_user_id = uid AND referred_user_id IS NULL
    ORDER BY created_at ASC LIMIT 1;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.referrals (referrer_user_id, code) VALUES (uid, v_code);
  RETURN v_code;
END;
$$;

-- Stats for referrer panel
CREATE OR REPLACE FUNCTION public.get_my_referral_stats()
RETURNS JSON
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'invited', (SELECT COUNT(*) FROM public.referrals WHERE referrer_user_id = auth.uid()),
    'accepted', (SELECT COUNT(*) FROM public.referrals WHERE referrer_user_id = auth.uid() AND accepted_at IS NOT NULL)
  );
$$;

-- Leaderboard RPC (no PII; respects ranges)
CREATE OR REPLACE FUNCTION public.get_journey_leaderboard(
  scope TEXT DEFAULT 'global',
  limit_count INTEGER DEFAULT 25
)
RETURNS TABLE(
  rank INTEGER,
  display_name TEXT,
  grade TEXT,
  school_name TEXT,
  diamonds INTEGER,
  hearts INTEGER,
  is_me BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid UUID := auth.uid();
  my_school UUID;
  my_grade TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT od.school_id, od.grade INTO my_school, my_grade
    FROM public.onboarding_data od WHERE od.user_id = uid;

  RETURN QUERY
  WITH base AS (
    SELECT
      js.user_id,
      COALESCE(NULLIF(p.username,''), split_part(COALESCE(p.email,''),'@',1), 'Student') AS display_name,
      od.grade,
      s.name AS school_name,
      od.school_id,
      COALESCE(js.diamonds,0)::INTEGER AS diamonds,
      COALESCE(js.hearts,5)::INTEGER  AS hearts
    FROM public.journey_scores js
    JOIN public.profiles p ON p.user_id = js.user_id
    LEFT JOIN public.onboarding_data od ON od.user_id = js.user_id
    LEFT JOIN public.schools s ON s.id = od.school_id
    WHERE COALESCE(p.is_vc,false) = false
  ),
  filtered AS (
    SELECT * FROM base
    WHERE
      CASE scope
        WHEN 'school' THEN my_school IS NOT NULL AND school_id = my_school
        WHEN 'grade'  THEN my_grade  IS NOT NULL AND grade = my_grade
        ELSE TRUE
      END
  ),
  ranked AS (
    SELECT ROW_NUMBER() OVER (ORDER BY diamonds DESC, hearts DESC, display_name ASC)::INTEGER AS rank,
           user_id, display_name, grade, school_name, diamonds, hearts
    FROM filtered
  )
  SELECT r.rank, r.display_name, r.grade, r.school_name, r.diamonds, r.hearts, (r.user_id = uid) AS is_me
  FROM ranked r
  ORDER BY r.rank ASC
  LIMIT GREATEST(1, LEAST(limit_count, 100));
END;
$$;

-- Submit stage atomically: mark milestones completed, +5 diamonds, dedupe stage
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
  IF NOT already THEN awarded := 5; END IF;

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
      updated_at = now()
  WHERE user_id = uid;

  RETURN json_build_object('awarded_diamonds', awarded, 'already_submitted', already);
END;
$$;

-- Decrement a heart (called by verify-proof on rejection via service role; also exposed for self-calls)
CREATE OR REPLACE FUNCTION public.journey_decrement_heart(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  remaining INTEGER;
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.journey_scores (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.journey_scores
    SET hearts = GREATEST(0, COALESCE(hearts,5) - 1), updated_at = now()
    WHERE user_id = _user_id
    RETURNING hearts INTO remaining;
  RETURN remaining;
END;
$$;