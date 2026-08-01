
-- =========================
-- 1. Managed coupons table
-- =========================
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  expires_at TIMESTAMPTZ,
  usage_limit INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage coupons"
  ON public.coupons FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 2. Updated redeem_coupon to support managed coupons
-- =========================
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
  _existing UUID;
  _coupon RECORD;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Legacy hardcoded codes
  _credits := CASE _normalized
    WHEN 'TEST4DEVS' THEN 100
    WHEN 'PF4U'      THEN 100
    WHEN 'CREDS4U'   THEN 100
    ELSE NULL
  END;

  -- Managed coupon lookup
  IF _credits IS NULL THEN
    SELECT * INTO _coupon FROM public.coupons
    WHERE upper(code) = _normalized FOR UPDATE;

    IF NOT FOUND OR NOT _coupon.is_active THEN
      RETURN json_build_object('success', false, 'error', 'Invalid coupon code');
    END IF;

    IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
      RETURN json_build_object('success', false, 'error', 'Coupon has expired');
    END IF;

    IF _coupon.usage_limit IS NOT NULL AND _coupon.times_used >= _coupon.usage_limit THEN
      RETURN json_build_object('success', false, 'error', 'Coupon usage limit reached');
    END IF;

    _credits := _coupon.credits;
  END IF;

  -- Already redeemed by this user?
  SELECT id INTO _existing
  FROM public.coupon_redemptions
  WHERE user_id = _uid AND code = _normalized;

  IF _existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already used this coupon');
  END IF;

  INSERT INTO public.user_credits (user_id)
  VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credits
  SET bonus_credits = bonus_credits + _credits, updated_at = now()
  WHERE user_id = _uid;

  INSERT INTO public.coupon_redemptions (user_id, code, credits_granted)
  VALUES (_uid, _normalized, _credits);

  -- Increment managed coupon usage
  IF _coupon.id IS NOT NULL THEN
    UPDATE public.coupons SET times_used = times_used + 1, updated_at = now()
    WHERE id = _coupon.id;
  END IF;

  RETURN json_build_object('success', true, 'credits_granted', _credits, 'code', _normalized);
END;
$$;

-- =========================
-- 3. Credit adjustments log
-- =========================
CREATE TABLE IF NOT EXISTS public.credit_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL,
  admin_user_id UUID NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage adjustments"
  ON public.credit_adjustments FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users view own adjustments"
  ON public.credit_adjustments FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id);

-- =========================
-- 4. Admin credit adjust function
-- =========================
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
  _target_user_id UUID,
  _delta INTEGER,
  _reason TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_bonus INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  INSERT INTO public.user_credits (user_id)
  VALUES (_target_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credits
  SET bonus_credits = GREATEST(0, bonus_credits + _delta),
      updated_at = now()
  WHERE user_id = _target_user_id
  RETURNING bonus_credits INTO _new_bonus;

  INSERT INTO public.credit_adjustments (target_user_id, admin_user_id, delta, reason)
  VALUES (_target_user_id, auth.uid(), _delta, _reason);

  RETURN json_build_object('success', true, 'new_bonus_credits', _new_bonus);
END;
$$;

-- =========================
-- 5. Admin assign counsellor to school
-- =========================
CREATE OR REPLACE FUNCTION public.admin_assign_counsellor_to_school(
  _teacher_user_id UUID,
  _school_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  UPDATE public.teacher_profiles
  SET school_id = _school_id, updated_at = now()
  WHERE user_id = _teacher_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teacher profile not found';
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- =========================
-- 6. Admin list functions for the panel
-- =========================
CREATE OR REPLACE FUNCTION public.admin_list_schools_with_counts()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT json_agg(row_to_json(s)) INTO result FROM (
    SELECT
      s.id, s.name, s.country, s.city, s.domain, s.is_verified, s.created_at,
      (SELECT COUNT(*) FROM public.onboarding_data o WHERE o.school_id = s.id) AS student_count,
      (SELECT COUNT(*) FROM public.teacher_profiles tp WHERE tp.school_id = s.id) AS counsellor_count
    FROM public.schools s
    ORDER BY s.created_at DESC
  ) s;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_counsellors()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result FROM (
    SELECT tp.user_id, tp.title, tp.school_id, tp.verified, tp.years_experience,
           p.email, p.username, s.name AS school_name
    FROM public.teacher_profiles tp
    LEFT JOIN public.profiles p ON p.user_id = tp.user_id
    LEFT JOIN public.schools s ON s.id = tp.school_id
    ORDER BY tp.created_at DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
