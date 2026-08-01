-- 1) Rotate the demo VC account password to a strong random value.
--    The previously committed password ('pathforge4vc') is now invalid.
--    Admins can issue a new password via the admin panel if needed.
DO $$
DECLARE
  vc_uid UUID;
  new_pw TEXT;
BEGIN
  SELECT id INTO vc_uid FROM auth.users WHERE email = 'pathforgevc@gmail.com';
  IF vc_uid IS NOT NULL THEN
    new_pw := encode(gen_random_bytes(24), 'base64');
    UPDATE auth.users
    SET encrypted_password = crypt(new_pw, gen_salt('bf')),
        updated_at = now()
    WHERE id = vc_uid;
  END IF;
END $$;

-- 2) Deactivate leaked / hardcoded coupon codes so they can no longer be redeemed.
UPDATE public.coupons
SET is_active = false, updated_at = now()
WHERE upper(code) IN ('PRO4PROS', 'TEST4DEVS', 'PF4U', 'CREDS4U');

-- 3) Rewrite redeem_coupon to ONLY use the managed coupons table.
--    Removes the hardcoded CASE bypass so admin-managed deactivation/expiry is authoritative.
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
    UPDATE public.user_credits
    SET plan = _coupon_plan,
        plan_expires_at = _new_expiry,
        max_daily_credits = CASE WHEN _coupon_plan = 'pro' THEN 100 ELSE max_daily_credits END,
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