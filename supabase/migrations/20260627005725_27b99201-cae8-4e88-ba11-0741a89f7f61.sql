
CREATE OR REPLACE FUNCTION public.admin_set_user_plan(_target_user_id uuid, _plan text, _bonus_credits integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _grant integer;
  _daily integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  _plan := lower(trim(_plan));

  IF _plan NOT IN ('free', 'pro', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid plan: %. Valid plans are free, pro, enterprise.', _plan;
  END IF;

  IF _bonus_credits IS NOT NULL AND _bonus_credits < 0 THEN
    RAISE EXCEPTION 'Credits must be zero or greater';
  END IF;

  -- Pull daily allowance from plan-limit config so all gates respect the new plan.
  SELECT max_daily_credits INTO _daily FROM public.ai_plan_limits WHERE plan = _plan;
  IF _daily IS NULL THEN
    _daily := CASE _plan WHEN 'enterprise' THEN 100 WHEN 'pro' THEN 25 ELSE 5 END;
  END IF;

  _grant := CASE
    WHEN _plan = 'free' THEN 0
    WHEN _bonus_credits IS NOT NULL THEN _bonus_credits
    WHEN _plan = 'pro' THEN 100
    WHEN _plan = 'enterprise' THEN 10000
    ELSE 0
  END;

  INSERT INTO public.user_credits (user_id, plan, max_daily_credits, credits_used_today, bonus_credits, plan_expires_at, last_reset_at)
  VALUES (_target_user_id, _plan, _daily, 0, _grant, NULL, now())
  ON CONFLICT (user_id) DO UPDATE
  SET plan = EXCLUDED.plan,
      max_daily_credits = EXCLUDED.max_daily_credits,
      bonus_credits = EXCLUDED.bonus_credits,
      credits_used_today = 0,
      plan_expires_at = NULL,
      last_reset_at = now(),
      updated_at = now();

  INSERT INTO public.credit_adjustments (target_user_id, admin_user_id, delta, reason)
  VALUES (_target_user_id, auth.uid(), _grant, 'Admin plan change to ' || _plan || ' with ' || _grant::text || ' credits');

  RETURN json_build_object('success', true, 'plan', _plan, 'bonus_credits', _grant, 'max_daily_credits', _daily);
END;
$function$;
