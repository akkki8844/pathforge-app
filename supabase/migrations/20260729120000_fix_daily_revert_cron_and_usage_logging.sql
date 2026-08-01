-- The nightly cron (revert-expired-subscriptions-daily, 3am) was reverting
-- any coupon-granted plan to free after ~1 day, because it only checked the
-- Paddle `subscriptions` table and never looked at `plan_expires_at`. This
-- undid the earlier fix in revert_user_if_expired(), since that fix only
-- covers the on-demand check (get_credits/consume_credits), not the cron.
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
    SET plan = 'free', bonus_credits = 0, plan_expires_at = NULL, updated_at = now()
    WHERE uc.plan <> 'free'
      AND NOT EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.user_id = uc.user_id
          AND s.status IN ('active', 'trialing')
          AND (s.current_period_end IS NULL OR s.current_period_end > now())
      )
      AND (uc.plan_expires_at IS NULL OR uc.plan_expires_at <= now())
    RETURNING 1
  )
  SELECT COUNT(*) INTO reverted_count FROM expired;
  RETURN reverted_count;
END;
$function$;

-- consume_credits/consume_credit never wrote to ai_usage_logs, so the Usage
-- tab's activity graph and per-feature breakdown had no data to read no
-- matter what the UI did. Add feature-tagged logging on every successful
-- consumption; callers that don't pass a feature type fall back to 'general'.
CREATE OR REPLACE FUNCTION public.consume_credits(amount integer, _feature_type text DEFAULT 'general')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r          public.user_credits;
  needed     INTEGER := GREATEST(1, COALESCE(amount, 1));
  allowance  INTEGER;
  cap        INTEGER;
  used       INTEGER;
  remaining  INTEGER;
  from_bonus INTEGER;
  from_plan  INTEGER;
BEGIN
  IF public.is_admin() OR public.is_vc_user(auth.uid()) THEN RETURN true; END IF;
  PERFORM public.revert_user_if_expired(auth.uid());

  SELECT * INTO r FROM public.user_credits WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', needed, 3);
    INSERT INTO public.ai_usage_logs (user_id, feature_type, tokens_used)
    VALUES (auth.uid(), COALESCE(_feature_type, 'general'), needed);
    RETURN true;
  END IF;

  r := public.roll_credit_windows(auth.uid());
  allowance := public.monthly_credit_allowance(r.plan);

  IF allowance > 0 THEN
    cap := allowance;
    used := COALESCE(r.credits_used_month, 0);
  ELSE
    cap := public.effective_daily_credit_limit(auth.uid(), r.plan, r.max_daily_credits);
    used := r.credits_used_today;
  END IF;

  remaining := GREATEST(0, cap - used);
  IF r.bonus_credits + remaining < needed THEN RETURN false; END IF;

  from_bonus := LEAST(needed, r.bonus_credits);
  from_plan  := needed - from_bonus;

  IF allowance > 0 THEN
    UPDATE public.user_credits
      SET bonus_credits = bonus_credits - from_bonus,
          credits_used_month = COALESCE(credits_used_month, 0) + from_plan,
          updated_at = now()
      WHERE user_id = auth.uid();
  ELSE
    UPDATE public.user_credits
      SET bonus_credits = bonus_credits - from_bonus,
          credits_used_today = credits_used_today + from_plan,
          updated_at = now()
      WHERE user_id = auth.uid();
  END IF;

  INSERT INTO public.ai_usage_logs (user_id, feature_type, tokens_used)
  VALUES (auth.uid(), COALESCE(_feature_type, 'general'), needed);

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_credit(_feature_type text DEFAULT 'general')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.consume_credits(1, _feature_type);
END;
$function$;
