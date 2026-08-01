
-- 1) Credit gifts notification table
CREATE TABLE IF NOT EXISTS public.credit_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  admin_user_id UUID,
  amount INTEGER NOT NULL,
  message TEXT,
  seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_credit_gifts_user_unseen
  ON public.credit_gifts (user_id) WHERE seen = false;

ALTER TABLE public.credit_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients view own gifts"
  ON public.credit_gifts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Recipients mark own gifts seen"
  ON public.credit_gifts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage gifts"
  ON public.credit_gifts FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2) Update admin_adjust_credits to record a gift on positive deltas
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(_target_user_id uuid, _delta integer, _reason text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Notify user when credits are gifted (positive delta only)
  IF _delta > 0 THEN
    INSERT INTO public.credit_gifts (user_id, admin_user_id, amount, message)
    VALUES (_target_user_id, auth.uid(), _delta, _reason);
  END IF;

  RETURN json_build_object('success', true, 'new_bonus_credits', _new_bonus);
END;
$function$;

-- 3) Allow admins to read coupon redemptions
DROP POLICY IF EXISTS "Admins view all redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins view all redemptions"
  ON public.coupon_redemptions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 4) Coupon analytics function
CREATE OR REPLACE FUNCTION public.admin_get_coupon_stats()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT json_build_object(
    'totals', json_build_object(
      'coupons_total', (SELECT COUNT(*) FROM public.coupons),
      'coupons_active', (SELECT COUNT(*) FROM public.coupons WHERE is_active = true
                        AND (expires_at IS NULL OR expires_at > now())),
      'coupons_expired', (SELECT COUNT(*) FROM public.coupons WHERE expires_at IS NOT NULL AND expires_at <= now()),
      'redemptions_total', (SELECT COUNT(*) FROM public.coupon_redemptions),
      'credits_distributed', (SELECT COALESCE(SUM(credits_granted), 0) FROM public.coupon_redemptions)
    ),
    'per_coupon', (
      SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) FROM (
        SELECT
          c.id, c.code, c.credits, c.usage_limit, c.times_used, c.is_active,
          c.expires_at, c.created_at, c.notes,
          (SELECT COALESCE(SUM(cr.credits_granted), 0)
             FROM public.coupon_redemptions cr WHERE cr.code = c.code) AS credits_distributed,
          (SELECT COUNT(*) FROM public.coupon_redemptions cr WHERE cr.code = c.code) AS redemptions
        FROM public.coupons c
        ORDER BY c.created_at DESC
      ) c
    ),
    'recent_redemptions', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) FROM (
        SELECT cr.code, cr.credits_granted, cr.redeemed_at, p.email
        FROM public.coupon_redemptions cr
        LEFT JOIN public.profiles p ON p.user_id = cr.user_id
        ORDER BY cr.redeemed_at DESC
        LIMIT 25
      ) r
    )
  ) INTO result;

  RETURN result;
END;
$function$;
