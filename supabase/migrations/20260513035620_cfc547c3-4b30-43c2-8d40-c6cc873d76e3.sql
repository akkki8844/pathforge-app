
-- 1. Flagged prompts table for auto-moderation
CREATE TABLE IF NOT EXISTS public.flagged_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text,
  feature text NOT NULL,
  prompt text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  ai_verdict text,
  categories text[] DEFAULT '{}',
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  action_taken text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flagged_prompts_created_at
  ON public.flagged_prompts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flagged_prompts_reviewed
  ON public.flagged_prompts (reviewed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flagged_prompts_user
  ON public.flagged_prompts (user_id, created_at DESC);

ALTER TABLE public.flagged_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read flagged_prompts" ON public.flagged_prompts;
CREATE POLICY "Admins read flagged_prompts" ON public.flagged_prompts
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update flagged_prompts" ON public.flagged_prompts;
CREATE POLICY "Admins update flagged_prompts" ON public.flagged_prompts
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins delete flagged_prompts" ON public.flagged_prompts;
CREATE POLICY "Admins delete flagged_prompts" ON public.flagged_prompts
  FOR DELETE TO authenticated USING (public.is_admin());

-- (no insert policy: only service role inserts directly)

-- 2. Admin listing RPC — joins to profiles for email/username
CREATE OR REPLACE FUNCTION public.admin_list_flagged_prompts(_limit integer DEFAULT 100, _only_unreviewed boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) INTO result FROM (
    SELECT
      fp.id,
      fp.user_id,
      COALESCE(p.email, fp.user_email) AS email,
      p.username,
      fp.feature,
      fp.prompt,
      fp.severity,
      fp.ai_verdict,
      fp.categories,
      fp.reviewed,
      fp.reviewed_at,
      fp.action_taken,
      fp.created_at
    FROM public.flagged_prompts fp
    LEFT JOIN public.profiles p ON p.user_id = fp.user_id
    WHERE (_only_unreviewed = false OR fp.reviewed = false)
    ORDER BY fp.created_at DESC
    LIMIT GREATEST(1, LEAST(_limit, 500))
  ) r;

  RETURN result;
END;
$$;

-- 3. Mark a flagged prompt reviewed (admin)
CREATE OR REPLACE FUNCTION public.admin_review_flagged_prompt(_id uuid, _action text DEFAULT 'dismiss')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  UPDATE public.flagged_prompts
  SET reviewed = true,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      action_taken = _action
  WHERE id = _id;

  RETURN json_build_object('success', true);
END;
$$;

-- 4. Fix redeem_coupon — replace fragile RECORD usage with scalars
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
  _existing UUID;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Already redeemed by this user (covers both legacy + managed coupons)
  SELECT id INTO _existing
  FROM public.coupon_redemptions
  WHERE user_id = _uid AND code = _normalized;
  IF _existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already used this coupon');
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
    SELECT id, is_active, expires_at, usage_limit, times_used, credits
    INTO _coupon_id, _coupon_active, _coupon_expires, _coupon_limit, _coupon_used, _coupon_credits
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

    _credits := _coupon_credits;
  END IF;

  -- Grant credits
  INSERT INTO public.user_credits (user_id)
  VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credits
  SET bonus_credits = bonus_credits + _credits, updated_at = now()
  WHERE user_id = _uid;

  INSERT INTO public.coupon_redemptions (user_id, code, credits_granted)
  VALUES (_uid, _normalized, _credits);

  IF _coupon_id IS NOT NULL THEN
    UPDATE public.coupons
    SET times_used = times_used + 1, updated_at = now()
    WHERE id = _coupon_id;
  END IF;

  RETURN json_build_object('success', true, 'credits_granted', _credits, 'code', _normalized);
END;
$$;
