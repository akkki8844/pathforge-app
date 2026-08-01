-- Relax credits check so plan-grant-only coupons can exist (credits = 0)
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_credits_check;
ALTER TABLE public.coupons ADD CONSTRAINT coupons_credits_check CHECK (credits >= 0);

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS plan_grant text,
  ADD COLUMN IF NOT EXISTS plan_grant_duration_days integer;

ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

INSERT INTO public.coupons (code, credits, usage_limit, expires_at, is_active, plan_grant, plan_grant_duration_days, notes, created_by)
VALUES ('PRO4PROS', 0, NULL, NULL, true, 'pro', 30, 'Unlimited 1-month Pro upgrade coupon',
        '56fabe8c-5851-482d-8d80-273dc1455a63'::uuid)
ON CONFLICT (code) DO UPDATE SET
  plan_grant = EXCLUDED.plan_grant,
  plan_grant_duration_days = EXCLUDED.plan_grant_duration_days,
  usage_limit = NULL,
  expires_at = NULL,
  is_active = true,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _normalized TEXT := upper(trim(_code));
  _credits INTEGER;
  _coupon_id UUID;
  _coupon_active BOOLEAN;
  _coupon_expires TIMESTAMPTZ;
  _coupon_limit INTEGER;
  _coupon_used INTEGER;
  _coupon_credits INTEGER;
  _coupon_plan TEXT;
  _coupon_plan_days INTEGER;
  _existing UUID;
  _new_expiry TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id INTO _existing
  FROM public.coupon_redemptions
  WHERE user_id = _uid AND code = _normalized;
  IF _existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already used this coupon');
  END IF;

  _credits := CASE _normalized
    WHEN 'TEST4DEVS' THEN 100
    WHEN 'PF4U'      THEN 100
    WHEN 'CREDS4U'   THEN 100
    ELSE NULL
  END;

  IF _credits IS NULL THEN
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
  END IF;

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
    UPDATE public.user_credits
    SET plan = _coupon_plan,
        plan_expires_at = _new_expiry,
        max_daily_credits = CASE WHEN _coupon_plan = 'pro' THEN 100 ELSE max_daily_credits END,
        updated_at = now()
    WHERE user_id = _uid;
  END IF;

  INSERT INTO public.coupon_redemptions (user_id, code, credits_granted)
  VALUES (_uid, _normalized, _credits);

  IF _coupon_id IS NOT NULL THEN
    UPDATE public.coupons
    SET times_used = times_used + 1, updated_at = now()
    WHERE id = _coupon_id;
  END IF;

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

CREATE OR REPLACE FUNCTION public.get_credits()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.user_credits;
  _is_admin BOOLEAN := false;
  _is_vc BOOLEAN := false;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT public.is_admin() INTO _is_admin;
  SELECT COALESCE(is_vc, false) INTO _is_vc FROM public.profiles WHERE user_id = _uid;

  UPDATE public.user_credits
  SET plan = 'free',
      max_daily_credits = COALESCE((SELECT max_daily_credits FROM public.ai_plan_limits WHERE plan = 'free'), 5),
      plan_expires_at = NULL,
      updated_at = now()
  WHERE user_id = _uid
    AND plan_expires_at IS NOT NULL
    AND plan_expires_at < now()
    AND plan <> 'free';

  INSERT INTO public.user_credits (user_id)
  VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credits
  SET credits_used_today = 0,
      last_reset_at = now(),
      updated_at = now()
  WHERE user_id = _uid
    AND (last_reset_at IS NULL OR last_reset_at < (now() - interval '24 hours'));

  SELECT * INTO _row FROM public.user_credits WHERE user_id = _uid;

  IF _is_admin OR _is_vc THEN
    RETURN json_build_object(
      'plan', COALESCE(_row.plan, 'admin'),
      'credits_used_today', 0,
      'max_daily_credits', 999999,
      'bonus_credits', 999999,
      'last_reset_at', COALESCE(_row.last_reset_at, now()),
      'is_admin', true,
      'plan_expires_at', _row.plan_expires_at
    );
  END IF;

  RETURN json_build_object(
    'plan', COALESCE(_row.plan, 'free'),
    'credits_used_today', COALESCE(_row.credits_used_today, 0),
    'max_daily_credits', COALESCE(_row.max_daily_credits, 5),
    'bonus_credits', COALESCE(_row.bonus_credits, 0),
    'last_reset_at', COALESCE(_row.last_reset_at, now()),
    'is_admin', false,
    'plan_expires_at', _row.plan_expires_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_credits() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_credits() TO authenticated;