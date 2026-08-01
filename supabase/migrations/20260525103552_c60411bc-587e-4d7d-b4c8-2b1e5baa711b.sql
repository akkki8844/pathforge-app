DROP FUNCTION IF EXISTS public.admin_set_user_plan(uuid, text);
DROP FUNCTION IF EXISTS public.admin_set_user_plan(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.admin_set_user_plan(
  _target_user_id uuid,
  _plan text,
  _bonus_credits integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _grant integer;
  _daily integer := 5;
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

  _grant := CASE
    WHEN _plan = 'free' THEN 0
    WHEN _bonus_credits IS NOT NULL THEN _bonus_credits
    WHEN _plan = 'pro' THEN 100
    WHEN _plan = 'enterprise' THEN 10000
    ELSE 0
  END;

  INSERT INTO public.user_credits (user_id, plan, max_daily_credits, credits_used_today, bonus_credits)
  VALUES (_target_user_id, _plan, _daily, 0, _grant)
  ON CONFLICT (user_id) DO UPDATE
  SET plan = EXCLUDED.plan,
      max_daily_credits = EXCLUDED.max_daily_credits,
      bonus_credits = EXCLUDED.bonus_credits,
      updated_at = now();

  INSERT INTO public.credit_adjustments (target_user_id, admin_user_id, delta, reason)
  VALUES (_target_user_id, auth.uid(), _grant, 'Admin plan change to ' || _plan || ' with ' || _grant::text || ' credits');

  RETURN json_build_object('success', true, 'plan', _plan, 'bonus_credits', _grant);
END;
$function$;

UPDATE public.user_credits
SET plan = 'pro', updated_at = now()
WHERE plan IN ('starter', 'growth', 'power');

DELETE FROM public.ai_plan_limits
WHERE plan IN ('starter', 'growth', 'power');

INSERT INTO public.ai_plan_limits (plan, max_daily_credits)
VALUES ('free', 5), ('pro', 5), ('enterprise', 5)
ON CONFLICT (plan) DO UPDATE
SET max_daily_credits = EXCLUDED.max_daily_credits,
    updated_at = now();

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