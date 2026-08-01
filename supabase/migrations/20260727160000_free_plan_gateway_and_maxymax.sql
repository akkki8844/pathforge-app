-- Fixes the actual reason PATH365 (and PRO4PROS before it) never stuck:
-- `revert_user_if_expired` only ever checked the `subscriptions` table (Paddle)
-- for an active subscription. A coupon-granted plan has no Paddle row, so the
-- very next `get_credits()` call after redemption — which the client always
-- fires to refresh the UI — saw "no active subscription" and reverted the
-- user straight back to free. `plan_expires_at` was written and then ignored.
--
-- This also changes the redemption model per product request: redeeming a
-- plan-grant coupon no longer flips the plan on immediately. It unlocks that
-- plan at $0 on the pricing page; the user still clicks "buy" (free, no
-- payment gateway) to activate it. That click is `claim_free_plan()`. This
-- also makes "already have this plan" a real, checkable state so the pricing
-- page can stop offering to sell it again.

-- ---------------------------------------------------------------------------
-- 1. Root-cause fix: a coupon-granted plan with a future plan_expires_at now
--    counts as "active" even with zero rows in `subscriptions`.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revert_user_if_expired(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_active boolean;
  current_plan text;
  current_expiry timestamptz;
BEGIN
  SELECT plan, plan_expires_at INTO current_plan, current_expiry
  FROM public.user_credits WHERE user_id = target_user_id;
  IF current_plan IS NULL OR current_plan = 'free' THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = target_user_id
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) INTO has_active;

  IF NOT has_active AND current_expiry IS NOT NULL AND current_expiry > now() THEN
    has_active := true;
  END IF;

  IF NOT has_active THEN
    UPDATE public.user_credits
    SET plan = 'free', bonus_credits = 0, plan_expires_at = NULL, updated_at = now()
    WHERE user_id = target_user_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Pending free-plan unlock, separate from the live plan.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS free_plan_grant text,
  ADD COLUMN IF NOT EXISTS free_plan_grant_days integer;

-- ---------------------------------------------------------------------------
-- 3. MAXYMAX — same shape as PATH365, but for Max.
-- ---------------------------------------------------------------------------
INSERT INTO public.coupons (
  code, credits, usage_limit, expires_at, is_active,
  plan_grant, plan_grant_duration_days, notes, created_by
)
VALUES (
  'MAXYMAX', 0, NULL, NULL, true,
  'max', 365, 'Grants Pathforge Max for one full year (365 days).',
  '56fabe8c-5851-482d-8d80-273dc1455a63'::uuid
)
ON CONFLICT (code) DO UPDATE SET
  credits                  = EXCLUDED.credits,
  plan_grant               = EXCLUDED.plan_grant,
  plan_grant_duration_days = EXCLUDED.plan_grant_duration_days,
  usage_limit              = NULL,
  expires_at               = NULL,
  is_active                = true,
  notes                    = EXCLUDED.notes,
  updated_at               = now();

-- ---------------------------------------------------------------------------
-- 4. redeem_coupon: a plan_grant coupon now unlocks instead of applying.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _normalized TEXT := upper(trim(_code));
  _coupon_id UUID;
  _coupon_active BOOLEAN;
  _coupon_expires TIMESTAMPTZ;
  _coupon_limit INTEGER;
  _coupon_used INTEGER;
  _coupon_credits INTEGER;
  _coupon_plan TEXT;
  _coupon_plan_days INTEGER;
  _credits INTEGER;
  _existing UUID;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF _normalized IS NULL OR length(_normalized) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid coupon code');
  END IF;

  SELECT id INTO _existing
  FROM public.coupon_redemptions
  WHERE user_id = _uid AND code = _normalized;
  IF _existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already used this coupon');
  END IF;

  SELECT id, is_active, expires_at, usage_limit, times_used, credits, plan_grant, plan_grant_duration_days
  INTO _coupon_id, _coupon_active, _coupon_expires, _coupon_limit, _coupon_used, _coupon_credits, _coupon_plan, _coupon_plan_days
  FROM public.coupons
  WHERE upper(code) = _normalized
  FOR UPDATE;

  IF _coupon_id IS NULL OR NOT _coupon_active THEN
    RETURN json_build_object('success', false, 'error', 'Invalid coupon code');
  END IF;

  IF _coupon_expires IS NOT NULL AND _coupon_expires < now() THEN
    RETURN json_build_object('success', false, 'error', 'Coupon has expired');
  END IF;

  IF _coupon_limit IS NOT NULL AND _coupon_used >= _coupon_limit THEN
    RETURN json_build_object('success', false, 'error', 'Coupon usage limit reached');
  END IF;

  _credits := COALESCE(_coupon_credits, 0);

  INSERT INTO public.user_credits (user_id)
  VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  IF _credits > 0 THEN
    UPDATE public.user_credits
    SET bonus_credits = bonus_credits + _credits, updated_at = now()
    WHERE user_id = _uid;
  END IF;

  -- Unlock only. The plan is not applied until the user claims it for $0 on
  -- /pricing — see claim_free_plan().
  IF _coupon_plan IS NOT NULL AND _coupon_plan_days IS NOT NULL THEN
    UPDATE public.user_credits
    SET free_plan_grant = _coupon_plan,
        free_plan_grant_days = _coupon_plan_days,
        updated_at = now()
    WHERE user_id = _uid;
  END IF;

  INSERT INTO public.coupon_redemptions (user_id, code, credits_granted)
  VALUES (_uid, _normalized, _credits);

  UPDATE public.coupons
  SET times_used = times_used + 1, updated_at = now()
  WHERE id = _coupon_id;

  RETURN json_build_object(
    'success', true,
    'credits_granted', _credits,
    'plan_unlocked', _coupon_plan,
    'plan_unlocked_days', _coupon_plan_days,
    'code', _normalized
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_coupon(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. claim_free_plan: the "buy" step for a coupon-unlocked plan. No payment
--    gateway involved — this is only reachable once a coupon set
--    free_plan_grant, so the price on the tier the user is claiming is $0.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_free_plan()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  r public.user_credits;
  _allowance INTEGER;
  _new_expiry TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO r FROM public.user_credits WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND OR r.free_plan_grant IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No free plan unlock available');
  END IF;

  _new_expiry := now() + (r.free_plan_grant_days || ' days')::interval;
  _allowance  := public.monthly_credit_allowance(r.free_plan_grant);

  UPDATE public.user_credits
  SET plan = r.free_plan_grant,
      plan_expires_at = _new_expiry,
      credits_used_month = CASE WHEN _allowance > 0 THEN 0 ELSE credits_used_month END,
      month_reset_at     = CASE WHEN _allowance > 0 THEN now() ELSE month_reset_at END,
      free_plan_grant = NULL,
      free_plan_grant_days = NULL,
      updated_at = now()
  WHERE user_id = _uid;

  RETURN json_build_object('success', true, 'plan', r.free_plan_grant, 'plan_expires_at', _new_expiry);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_free_plan() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_free_plan() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. get_credits: surface plan_expires_at (so the client can tell an active
--    coupon-granted plan from an expired one) and the pending free-plan
--    unlock (so /pricing can show $0 and a claim button).
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
      'period_reset_at', now() + INTERVAL '30 days', 'is_admin', true,
      'plan_expires_at', null, 'free_plan_grant', null, 'free_plan_grant_days', null
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
    'is_admin', false,
    'plan_expires_at', r.plan_expires_at,
    'free_plan_grant', r.free_plan_grant,
    'free_plan_grant_days', r.free_plan_grant_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_credits() TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Backfill: everyone who already redeemed a plan-grant coupon under the
--    broken flow gets the plan they were promised, applied directly (not as
--    a pending unlock — they already went through redemption once).
-- ---------------------------------------------------------------------------
WITH grant_rows AS (
  SELECT DISTINCT ON (cr.user_id)
    cr.user_id,
    c.plan_grant,
    cr.redeemed_at + (c.plan_grant_duration_days || ' days')::interval AS target_expiry
  FROM public.coupon_redemptions cr
  JOIN public.coupons c ON upper(c.code) = cr.code
  WHERE c.plan_grant IS NOT NULL
    AND c.plan_grant_duration_days IS NOT NULL
  ORDER BY cr.user_id, target_expiry DESC
)
UPDATE public.user_credits uc
SET plan = g.plan_grant,
    plan_expires_at = g.target_expiry,
    credits_used_month = 0,
    month_reset_at = now(),
    free_plan_grant = NULL,
    free_plan_grant_days = NULL,
    updated_at = now()
FROM grant_rows g
WHERE uc.user_id = g.user_id
  AND g.target_expiry > now()
  AND (uc.plan IS DISTINCT FROM g.plan_grant OR uc.plan_expires_at IS NULL OR uc.plan_expires_at < g.target_expiry);
