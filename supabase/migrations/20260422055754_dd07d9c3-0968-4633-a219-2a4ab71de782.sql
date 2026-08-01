-- Coupon redemption system
-- Tracks one-time coupon use per user; grants bonus credits via SECURITY DEFINER RPC
-- to bypass the restrictive update policy on user_credits.

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  credits_granted INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions"
  ON public.coupon_redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No direct insert/update/delete policies — only the RPC may write.

CREATE OR REPLACE FUNCTION public.redeem_coupon(_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _normalized TEXT := upper(trim(_code));
  _credits INTEGER;
  _existing UUID;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Whitelist of valid codes -> credits granted
  _credits := CASE _normalized
    WHEN 'TEST4DEVS' THEN 100
    WHEN 'PF4U'      THEN 100
    WHEN 'CREDS4U'   THEN 100
    ELSE NULL
  END;

  IF _credits IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid coupon code');
  END IF;

  -- Already redeemed by this user?
  SELECT id INTO _existing
  FROM public.coupon_redemptions
  WHERE user_id = _uid AND code = _normalized;

  IF _existing IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already used this coupon');
  END IF;

  -- Ensure user_credits row exists
  INSERT INTO public.user_credits (user_id)
  VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  -- Grant bonus credits (bypasses restrictive policy via SECURITY DEFINER)
  UPDATE public.user_credits
  SET bonus_credits = bonus_credits + _credits,
      updated_at = now()
  WHERE user_id = _uid;

  -- Record redemption
  INSERT INTO public.coupon_redemptions (user_id, code, credits_granted)
  VALUES (_uid, _normalized, _credits);

  RETURN json_build_object('success', true, 'credits_granted', _credits, 'code', _normalized);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT) TO authenticated;