-- Self-serve downgrade: a user on Pro/Max (via coupon claim or a paid
-- subscription that has since lapsed) can move back down to a lower tier
-- without a payment gateway. Moving UP still requires a coupon claim or a
-- real Paddle checkout — this only ever lowers the tier.
--
-- If a real Paddle subscription is currently active, we don't silently
-- switch underneath it (they'd keep being billed for the old tier) — point
-- them at Manage Subscription instead, which cancels the subscription too.
CREATE OR REPLACE FUNCTION public.switch_plan(_target_plan text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _current TEXT;
  _current_rank INT;
  _target_rank INT;
  _has_paid_sub BOOLEAN;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF _target_plan NOT IN ('free', 'pro', 'max') THEN
    RETURN json_build_object('success', false, 'error', 'Not a valid plan');
  END IF;

  SELECT plan INTO _current FROM public.user_credits WHERE user_id = _uid;
  _current := COALESCE(_current, 'free');

  _current_rank := CASE _current WHEN 'free' THEN 0 WHEN 'pro' THEN 1 WHEN 'max' THEN 2 ELSE 0 END;
  _target_rank  := CASE _target_plan WHEN 'free' THEN 0 WHEN 'pro' THEN 1 WHEN 'max' THEN 2 END;

  IF _target_rank >= _current_rank THEN
    RETURN json_build_object('success', false, 'error', 'Redeem a coupon or upgrade to move to a higher plan');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _uid
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) INTO _has_paid_sub;

  IF _has_paid_sub THEN
    RETURN json_build_object('success', false, 'error', 'You have an active subscription — cancel it from Manage Subscription first');
  END IF;

  UPDATE public.user_credits
  SET plan = _target_plan,
      plan_expires_at = CASE WHEN _target_plan = 'free' THEN NULL ELSE plan_expires_at END,
      credits_used_month = 0,
      month_reset_at = now(),
      updated_at = now()
  WHERE user_id = _uid;

  RETURN json_build_object('success', true, 'plan', _target_plan);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.switch_plan(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.switch_plan(text) TO authenticated;
