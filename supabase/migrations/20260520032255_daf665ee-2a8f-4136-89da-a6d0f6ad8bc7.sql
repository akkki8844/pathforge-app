CREATE OR REPLACE FUNCTION public.admin_set_user_plan(_target_user_id uuid, _plan text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _grant integer;
  _daily integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  IF _plan NOT IN ('free','starter','growth','power') THEN
    RAISE EXCEPTION 'Invalid plan: %', _plan;
  END IF;

  -- Plan -> monthly bonus pool. Free uses daily limit, no bonus.
  _grant := CASE _plan
    WHEN 'starter' THEN 25
    WHEN 'growth'  THEN 50
    WHEN 'power'   THEN 100
    ELSE 0
  END;

  _daily := CASE WHEN _plan = 'free' THEN 5 ELSE 5 END;

  INSERT INTO public.user_credits (user_id, plan, max_daily_credits, credits_used_today, bonus_credits)
  VALUES (_target_user_id, _plan, _daily, 0, _grant)
  ON CONFLICT (user_id) DO UPDATE
  SET plan = _plan,
      max_daily_credits = _daily,
      bonus_credits = CASE WHEN _plan = 'free' THEN 0 ELSE _grant END,
      updated_at = now();

  INSERT INTO public.credit_adjustments (target_user_id, admin_user_id, delta, reason)
  VALUES (_target_user_id, auth.uid(), _grant, 'Admin plan change to ' || _plan);

  RETURN json_build_object('success', true, 'plan', _plan, 'bonus_credits', _grant);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(uuid, text) TO authenticated;