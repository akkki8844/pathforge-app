-- Final credit model.
--
--   Free : 3 credits per DAY   (rolling 24h, unchanged cadence)
--   Pro  : 250 credits per MONTH
--   Max  : 750 credits per MONTH
--
-- Before this, three different cadences were in play: the database enforced a
-- daily limit for everyone, plans.ts advertised a weekly allotment, and the
-- public pricing page sold monthly buckets. Users were shown numbers that the
-- backend never enforced. This makes the database the single source of truth
-- and the UI reads from it.
--
-- There are no paying accounts yet, so this deliberately does no backfill and
-- touches no existing user rows — pro/max buckets initialise lazily on first
-- read via the month_reset_at NULL check.

ALTER TABLE public.user_credits
  -- Credits spent inside the current monthly window. Only meaningful for plans
  -- with a monthly allowance; free accounts keep using credits_used_today.
  ADD COLUMN IF NOT EXISTS credits_used_month INTEGER NOT NULL DEFAULT 0,
  -- Start of the current monthly window. NULL means "never initialised", which
  -- is how an account that upgrades mid-month gets a fresh full bucket.
  ADD COLUMN IF NOT EXISTS month_reset_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Plan allowances. Returning 0 means "this plan has no monthly bucket, fall
-- back to the daily limit" — that is the free tier and anything unrecognised.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.monthly_credit_allowance(_plan TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(COALESCE(_plan, 'free'))
    WHEN 'pro'    THEN 250
    WHEN 'starter' THEN 250
    WHEN 'growth' THEN 250
    WHEN 'power'  THEN 250
    WHEN 'max'    THEN 750
    ELSE 0
  END;
$$;

-- Free is a flat 3/day. The previous version handed out 5 to verified emails
-- and 3 to unverified, which meant the pricing page could not state a single
-- honest number for the free tier.
CREATE OR REPLACE FUNCTION public.effective_daily_credit_limit(_user_id UUID, _plan TEXT, _stored_limit INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(COALESCE(_plan, 'free')) = 'free' THEN 3
    ELSE COALESCE(_stored_limit, 3)
  END;
$$;

-- ---------------------------------------------------------------------------
-- Roll the monthly window forward if it has lapsed, and initialise it the
-- first time a paid account is seen. Returns the freshened row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.roll_credit_windows(_user_id UUID)
RETURNS public.user_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r        public.user_credits;
  allowance INTEGER;
BEGIN
  SELECT * INTO r FROM public.user_credits WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Daily window (free tier, and the fallback for anything unrecognised).
  IF EXTRACT(EPOCH FROM (now() - r.last_reset_at)) / 3600.0 >= 24 THEN
    UPDATE public.user_credits
      SET credits_used_today = 0, last_reset_at = now(), updated_at = now()
      WHERE user_id = _user_id RETURNING * INTO r;
  END IF;

  allowance := public.monthly_credit_allowance(r.plan);

  IF allowance > 0 THEN
    -- Lazy init on first read, then a rolling 30-day window. Anchored to the
    -- account rather than the calendar so an upgrade on the 28th still buys a
    -- full month rather than three days.
    IF r.month_reset_at IS NULL
       OR EXTRACT(EPOCH FROM (now() - r.month_reset_at)) / 86400.0 >= 30 THEN
      UPDATE public.user_credits
        SET credits_used_month = 0, month_reset_at = now(), updated_at = now()
        WHERE user_id = _user_id RETURNING * INTO r;
    END IF;
  END IF;

  RETURN r;
END;
$$;

-- ---------------------------------------------------------------------------
-- get_credits: reports whichever bucket actually governs this account. The
-- credits_used_today / max_daily_credits keys are kept as the generic
-- "used / capacity" pair so existing clients keep working; `period` tells the
-- UI whether to say "today" or "this month".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_credits()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r         public.user_credits;
  allowance INTEGER;
  cap       INTEGER;
  used      INTEGER;
  period    TEXT;
  reset_at  TIMESTAMPTZ;
BEGIN
  IF public.is_admin() THEN
    RETURN json_build_object(
      'plan', 'admin', 'credits_used_today', 0, 'max_daily_credits', 999999,
      'bonus_credits', 0, 'last_reset_at', now(), 'period', 'month',
      'period_reset_at', now() + INTERVAL '30 days', 'is_admin', true
    );
  END IF;

  PERFORM public.revert_user_if_expired(auth.uid());

  SELECT * INTO r FROM public.user_credits WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', 0, 3) RETURNING * INTO r;
  END IF;

  r := public.roll_credit_windows(auth.uid());
  allowance := public.monthly_credit_allowance(r.plan);

  IF allowance > 0 THEN
    cap := allowance;
    used := LEAST(COALESCE(r.credits_used_month, 0), cap);
    period := 'month';
    reset_at := COALESCE(r.month_reset_at, now()) + INTERVAL '30 days';
  ELSE
    cap := public.effective_daily_credit_limit(auth.uid(), r.plan, r.max_daily_credits);
    used := LEAST(r.credits_used_today, cap);
    period := 'day';
    reset_at := r.last_reset_at + INTERVAL '24 hours';
  END IF;

  RETURN json_build_object(
    'plan', r.plan,
    'credits_used_today', used,
    'max_daily_credits', cap,
    'bonus_credits', r.bonus_credits,
    'last_reset_at', r.last_reset_at,
    'period', period,
    'period_reset_at', reset_at,
    'is_admin', false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- consume_credits: spend `amount`, bonus credits first, then the governing
-- bucket. All-or-nothing — a partial spend would leave the caller charged for
-- work it could not complete.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_credits(amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r          public.user_credits;
  needed     INTEGER := GREATEST(1, COALESCE(amount, 1));
  allowance  INTEGER;
  cap        INTEGER;
  used       INTEGER;
  remaining  INTEGER;
  from_bonus INTEGER;
  from_plan  INTEGER;
BEGIN
  IF public.is_admin() OR public.is_vc_user(auth.uid()) THEN RETURN true; END IF;
  PERFORM public.revert_user_if_expired(auth.uid());

  SELECT * INTO r FROM public.user_credits WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', needed, 3);
    RETURN true;
  END IF;

  r := public.roll_credit_windows(auth.uid());
  allowance := public.monthly_credit_allowance(r.plan);

  IF allowance > 0 THEN
    cap := allowance;
    used := COALESCE(r.credits_used_month, 0);
  ELSE
    cap := public.effective_daily_credit_limit(auth.uid(), r.plan, r.max_daily_credits);
    used := r.credits_used_today;
  END IF;

  remaining := GREATEST(0, cap - used);
  IF r.bonus_credits + remaining < needed THEN RETURN false; END IF;

  from_bonus := LEAST(needed, r.bonus_credits);
  from_plan  := needed - from_bonus;

  IF allowance > 0 THEN
    UPDATE public.user_credits
      SET bonus_credits = bonus_credits - from_bonus,
          credits_used_month = COALESCE(credits_used_month, 0) + from_plan,
          updated_at = now()
      WHERE user_id = auth.uid();
  ELSE
    UPDATE public.user_credits
      SET bonus_credits = bonus_credits - from_bonus,
          credits_used_today = credits_used_today + from_plan,
          updated_at = now()
      WHERE user_id = auth.uid();
  END IF;

  RETURN true;
END;
$$;

-- Single-credit path delegates, so the two can never drift apart.
CREATE OR REPLACE FUNCTION public.consume_credit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.consume_credits(1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.monthly_credit_allowance(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roll_credit_windows(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits(INTEGER) TO authenticated;
