-- PATH365 — grants a full year of Pro.
--
-- Also brings redeem_coupon in line with the monthly credit model introduced in
-- 20260727130000. That migration moved paid plans off the daily bucket and onto
-- credits_used_month / month_reset_at, but redeem_coupon was still doing:
--
--     max_daily_credits = CASE WHEN _coupon_plan = 'pro' THEN 100 ... END
--
-- which writes a number nothing reads any more. A user redeeming a plan coupon
-- got the plan but kept whatever credit window they were already in, so someone
-- who had already spent their free daily allowance saw an upgrade that appeared
-- to do nothing. Plan grants now open a fresh monthly window instead.

INSERT INTO public.coupons (
  code, credits, usage_limit, expires_at, is_active,
  plan_grant, plan_grant_duration_days, notes, created_by
)
VALUES (
  'PATH365', 0, NULL, NULL, true,
  'pro', 365, 'Grants Pathforge Pro for one full year (365 days).',
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
  _new_expiry TIMESTAMPTZ;
  _allowance INTEGER;
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

  IF _coupon_plan IS NOT NULL AND _coupon_plan_days IS NOT NULL THEN
    _new_expiry := now() + (_coupon_plan_days || ' days')::interval;
    _allowance  := public.monthly_credit_allowance(_coupon_plan);

    UPDATE public.user_credits
    SET plan = _coupon_plan,
        plan_expires_at = _new_expiry,
        -- Open a fresh monthly window so the plan's allowance is spendable
        -- immediately, rather than inheriting a window the user already
        -- partially burned through on a lower tier.
        credits_used_month = CASE WHEN _allowance > 0 THEN 0 ELSE credits_used_month END,
        month_reset_at     = CASE WHEN _allowance > 0 THEN now() ELSE month_reset_at END,
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
    'plan_granted', _coupon_plan,
    'plan_expires_at', _new_expiry,
    'code', _normalized
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_coupon(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO authenticated;
