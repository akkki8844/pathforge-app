CREATE OR REPLACE FUNCTION public.admin_set_user_plan(_target_user_id uuid, _plan text, _bonus_credits integer DEFAULT NULL)
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

  IF _plan NOT IN ('free','starter','growth','power') THEN
    RAISE EXCEPTION 'Invalid plan: %', _plan;
  END IF;

  _grant := CASE
    WHEN _plan = 'free' THEN 0
    WHEN _bonus_credits IS NOT NULL AND _bonus_credits >= 0 THEN _bonus_credits
    WHEN _plan = 'starter' THEN 25
    WHEN _plan = 'growth'  THEN 50
    WHEN _plan = 'power'   THEN 100
    ELSE 0
  END;

  _daily := 5;

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
$function$;

-- Ensure realtime is enabled for user_credits so client-side meters refresh
-- immediately when admins make adjustments.
ALTER TABLE public.user_credits REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_credits'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credits';
  END IF;
END$$;