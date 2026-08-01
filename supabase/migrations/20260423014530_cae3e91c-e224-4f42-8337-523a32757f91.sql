
-- Plan limits configuration table
CREATE TABLE IF NOT EXISTS public.ai_plan_limits (
  plan text PRIMARY KEY,
  max_daily_credits integer NOT NULL DEFAULT 5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.ai_plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage plan limits"
ON public.ai_plan_limits FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated read plan limits"
ON public.ai_plan_limits FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.ai_plan_limits (plan, max_daily_credits) VALUES
  ('free', 5),
  ('starter', 25),
  ('growth', 50),
  ('power', 100)
ON CONFLICT (plan) DO NOTHING;

-- Set per-user daily credit cap (override)
CREATE OR REPLACE FUNCTION public.admin_set_user_daily_limit(
  _target_user_id uuid,
  _max_daily_credits integer
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  IF _max_daily_credits < 0 OR _max_daily_credits > 100000 THEN
    RAISE EXCEPTION 'Invalid limit value';
  END IF;

  INSERT INTO public.user_credits (user_id, max_daily_credits)
  VALUES (_target_user_id, _max_daily_credits)
  ON CONFLICT (user_id) DO UPDATE
  SET max_daily_credits = EXCLUDED.max_daily_credits, updated_at = now();

  RETURN json_build_object('success', true, 'max_daily_credits', _max_daily_credits);
END;
$$;

-- Reset a user's daily usage counter
CREATE OR REPLACE FUNCTION public.admin_reset_user_usage(_target_user_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  UPDATE public.user_credits
  SET credits_used_today = 0, last_reset_at = now(), updated_at = now()
  WHERE user_id = _target_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Update plan limit and (optionally) cascade to all users on that plan
CREATE OR REPLACE FUNCTION public.admin_update_plan_limit(
  _plan text,
  _max_daily_credits integer,
  _cascade boolean DEFAULT false
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _affected integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  IF _max_daily_credits < 0 OR _max_daily_credits > 100000 THEN
    RAISE EXCEPTION 'Invalid limit value';
  END IF;

  INSERT INTO public.ai_plan_limits (plan, max_daily_credits, updated_at, updated_by)
  VALUES (_plan, _max_daily_credits, now(), auth.uid())
  ON CONFLICT (plan) DO UPDATE
  SET max_daily_credits = EXCLUDED.max_daily_credits,
      updated_at = now(),
      updated_by = auth.uid();

  IF _cascade THEN
    UPDATE public.user_credits
    SET max_daily_credits = _max_daily_credits, updated_at = now()
    WHERE plan = _plan;
    GET DIAGNOSTICS _affected = ROW_COUNT;
  END IF;

  RETURN json_build_object('success', true, 'cascaded_users', _affected);
END;
$$;

-- Get aggregated usage per user (for admin dashboard)
CREATE OR REPLACE FUNCTION public.admin_list_user_ai_usage(
  _search text DEFAULT '',
  _limit integer DEFAULT 50
) RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT json_agg(row_to_json(u)) INTO result FROM (
    SELECT
      p.user_id,
      p.email,
      p.username,
      uc.plan,
      uc.max_daily_credits,
      uc.credits_used_today,
      uc.bonus_credits,
      uc.last_reset_at,
      (SELECT COUNT(*) FROM public.ai_usage_logs ail WHERE ail.user_id = p.user_id) AS lifetime_requests,
      (SELECT COUNT(*) FROM public.ai_usage_logs ail
        WHERE ail.user_id = p.user_id AND ail.created_at >= now() - interval '24 hours') AS requests_24h
    FROM public.profiles p
    LEFT JOIN public.user_credits uc ON uc.user_id = p.user_id
    WHERE _search = '' OR LOWER(p.email) LIKE LOWER('%' || _search || '%')
       OR LOWER(COALESCE(p.username,'')) LIKE LOWER('%' || _search || '%')
    ORDER BY requests_24h DESC NULLS LAST, p.created_at DESC
    LIMIT _limit
  ) u;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
