
-- Enable extensions for cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Replace apply_subscription_credits: RESET bonus pool to plan amount (don't accumulate)
CREATE OR REPLACE FUNCTION public.apply_subscription_credits(target_user_id uuid, plan_name text, credits_to_grant integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, plan, max_daily_credits, credits_used_today, bonus_credits)
  VALUES (target_user_id, plan_name, 5, 0, credits_to_grant)
  ON CONFLICT (user_id) DO UPDATE
  SET plan = plan_name,
      max_daily_credits = 5,
      bonus_credits = credits_to_grant,  -- RESET, not accumulate
      updated_at = now();
END;
$function$;

-- Helper: revert a single user if their sub expired
CREATE OR REPLACE FUNCTION public.revert_user_if_expired(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_active boolean;
  current_plan text;
BEGIN
  SELECT plan INTO current_plan FROM public.user_credits WHERE user_id = target_user_id;
  IF current_plan IS NULL OR current_plan = 'free' THEN
    RETURN false;
  END IF;

  -- Check if user has any active (non-expired) subscription in any environment
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = target_user_id
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) INTO has_active;

  IF NOT has_active THEN
    UPDATE public.user_credits
    SET plan = 'free', bonus_credits = 0, updated_at = now()
    WHERE user_id = target_user_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$function$;

-- Replace consume_credit: lazy expiry check + spend bonus first, then daily free
CREATE OR REPLACE FUNCTION public.consume_credit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  credit_row RECORD;
  hours_since_reset DOUBLE PRECISION;
BEGIN
  -- Lazy revert if subscription expired
  PERFORM public.revert_user_if_expired(auth.uid());

  SELECT * INTO credit_row FROM public.user_credits
  WHERE user_id = auth.uid() FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', 1, 5);
    RETURN true;
  END IF;

  hours_since_reset := EXTRACT(EPOCH FROM (now() - credit_row.last_reset_at)) / 3600.0;
  IF hours_since_reset >= 24 THEN
    UPDATE public.user_credits
    SET credits_used_today = 0, last_reset_at = now(), updated_at = now()
    WHERE user_id = auth.uid()
    RETURNING * INTO credit_row;
  END IF;

  -- Spend bonus (monthly bucket) first
  IF credit_row.bonus_credits > 0 THEN
    UPDATE public.user_credits
    SET bonus_credits = bonus_credits - 1, updated_at = now()
    WHERE user_id = auth.uid();
    RETURN true;
  END IF;

  -- Then 5 free daily on top
  IF credit_row.credits_used_today >= credit_row.max_daily_credits THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
  SET credits_used_today = credits_used_today + 1, updated_at = now()
  WHERE user_id = auth.uid();
  RETURN true;
END;
$function$;

-- Replace get_credits: lazy expiry + return bonus_credits
CREATE OR REPLACE FUNCTION public.get_credits()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  credit_row RECORD;
  hours_since_reset DOUBLE PRECISION;
BEGIN
  PERFORM public.revert_user_if_expired(auth.uid());

  SELECT * INTO credit_row FROM public.user_credits WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', 0, 5)
    RETURNING * INTO credit_row;
  END IF;

  hours_since_reset := EXTRACT(EPOCH FROM (now() - credit_row.last_reset_at)) / 3600.0;
  IF hours_since_reset >= 24 THEN
    UPDATE public.user_credits
    SET credits_used_today = 0, last_reset_at = now(), updated_at = now()
    WHERE user_id = auth.uid()
    RETURNING * INTO credit_row;
  END IF;

  RETURN json_build_object(
    'plan', credit_row.plan,
    'credits_used_today', credit_row.credits_used_today,
    'max_daily_credits', credit_row.max_daily_credits,
    'bonus_credits', credit_row.bonus_credits,
    'last_reset_at', credit_row.last_reset_at
  );
END;
$function$;

-- Bulk revert function for cron
CREATE OR REPLACE FUNCTION public.revert_all_expired_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reverted_count integer := 0;
BEGIN
  WITH expired AS (
    UPDATE public.user_credits uc
    SET plan = 'free', bonus_credits = 0, updated_at = now()
    WHERE uc.plan <> 'free'
      AND NOT EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.user_id = uc.user_id
          AND s.status IN ('active', 'trialing')
          AND (s.current_period_end IS NULL OR s.current_period_end > now())
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO reverted_count FROM expired;
  RETURN reverted_count;
END;
$function$;
