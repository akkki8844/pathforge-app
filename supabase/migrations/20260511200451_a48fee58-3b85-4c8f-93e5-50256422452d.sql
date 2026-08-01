-- 1) Safe activity logger (SECURITY DEFINER) — bypasses the service-role-only INSERT policy
--    while still validating action_type and capping payload size.
CREATE OR REPLACE FUNCTION public.log_user_activity(
  _action_type text,
  _page_path   text DEFAULT NULL,
  _details     jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  IF _action_type IS NULL OR _action_type NOT IN (
    'page_view','login','logout','signup','feature_used','credit_consumed',
    'upgrade_clicked','onboarding_step','proof_uploaded','assignment_started',
    'assignment_completed','ai_request','error','click','search'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.user_activity_logs (user_id, action_type, page_path, action_details)
  VALUES (
    uid,
    _action_type,
    CASE WHEN _page_path IS NOT NULL AND length(_page_path) <= 512 THEN _page_path END,
    CASE WHEN _details IS NOT NULL AND pg_column_size(_details) <= 4096 THEN _details END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_user_activity(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_user_activity(text, text, jsonb) TO authenticated;

-- 2) Counsellor deep-dive: returns one JSON blob for a student that the counsellor is linked to.
CREATE OR REPLACE FUNCTION public.get_student_deep_dive(_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Only an admin or a counsellor linked to this student may call this.
  IF NOT (public.is_admin() OR public.teacher_can_view_student(auth.uid(), _student_id)) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  WITH
  recent_activity AS (
    SELECT jsonb_agg(jsonb_build_object(
      'action_type', action_type,
      'page_path',   page_path,
      'details',     action_details,
      'created_at',  created_at
    ) ORDER BY created_at DESC) AS items
    FROM (
      SELECT action_type, page_path, action_details, created_at
      FROM public.user_activity_logs
      WHERE user_id = _student_id
      ORDER BY created_at DESC
      LIMIT 100
    ) s
  ),
  activity_counts AS (
    SELECT
      COUNT(*)                                                        AS total_30d,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS total_7d,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '1 days') AS total_1d,
      COUNT(*) FILTER (WHERE action_type = 'login')                   AS logins_30d,
      COUNT(*) FILTER (WHERE action_type = 'page_view')               AS page_views_30d,
      COUNT(*) FILTER (WHERE action_type = 'ai_request')              AS ai_requests_30d,
      COUNT(*) FILTER (WHERE action_type = 'credit_consumed')         AS credits_consumed_30d,
      MAX(created_at)                                                  AS last_seen
    FROM public.user_activity_logs
    WHERE user_id = _student_id AND created_at >= now() - interval '30 days'
  ),
  ai_by_feature AS (
    SELECT jsonb_agg(jsonb_build_object(
      'feature', feature_type,
      'count',   cnt,
      'tokens',  tokens
    ) ORDER BY cnt DESC) AS items
    FROM (
      SELECT feature_type,
             COUNT(*)::int AS cnt,
             COALESCE(SUM(tokens_used),0)::int AS tokens
      FROM public.ai_usage_logs
      WHERE user_id = _student_id
        AND created_at >= now() - interval '30 days'
      GROUP BY feature_type
      ORDER BY cnt DESC
      LIMIT 20
    ) f
  ),
  credits AS (
    SELECT to_jsonb(uc.*) AS row
    FROM public.user_credits uc
    WHERE uc.user_id = _student_id
    LIMIT 1
  ),
  scores AS (
    SELECT to_jsonb(js.*) AS row
    FROM public.journey_scores js
    WHERE js.user_id = _student_id
    LIMIT 1
  ),
  outcomes AS (
    SELECT jsonb_build_object(
      'courses',          COALESCE(jsonb_array_length(courses),0),
      'projects',         COALESCE(jsonb_array_length(projects),0),
      'leadership_roles', COALESCE(jsonb_array_length(leadership_roles),0),
      'competitions',     COALESCE(jsonb_array_length(competitions),0)
    ) AS row
    FROM public.outcomes_data
    WHERE user_id = _student_id
    LIMIT 1
  ),
  planner_recent AS (
    SELECT jsonb_agg(jsonb_build_object(
      'week_start',     week_start,
      'planned_hours', (
        SELECT COALESCE(SUM((a->>'plannedHours')::numeric),0)
        FROM jsonb_array_elements(activities) a
      ),
      'actual_hours', (
        SELECT COALESCE(SUM((a->>'actualHours')::numeric),0)
        FROM jsonb_array_elements(activities) a
      ),
      'activity_count', jsonb_array_length(activities)
    ) ORDER BY week_start DESC) AS items
    FROM (
      SELECT week_start, activities
      FROM public.weekly_plans
      WHERE user_id = _student_id
      ORDER BY week_start DESC
      LIMIT 6
    ) p
  ),
  notifications_recent AS (
    SELECT jsonb_agg(jsonb_build_object(
      'title',      title,
      'message',    message,
      'is_read',    is_read,
      'created_at', created_at
    ) ORDER BY created_at DESC) AS items
    FROM (
      SELECT title, message, is_read, created_at
      FROM public.notifications
      WHERE user_id = _student_id
      ORDER BY created_at DESC
      LIMIT 20
    ) n
  )
  SELECT jsonb_build_object(
    'activity_summary',     COALESCE(to_jsonb((SELECT a FROM activity_counts a)), '{}'::jsonb),
    'recent_activity',      COALESCE((SELECT items FROM recent_activity), '[]'::jsonb),
    'ai_by_feature',        COALESCE((SELECT items FROM ai_by_feature), '[]'::jsonb),
    'credits',              COALESCE((SELECT row FROM credits), '{}'::jsonb),
    'scores',               COALESCE((SELECT row FROM scores), '{}'::jsonb),
    'outcomes',             COALESCE((SELECT row FROM outcomes), '{}'::jsonb),
    'planner',              COALESCE((SELECT items FROM planner_recent), '[]'::jsonb),
    'notifications',        COALESCE((SELECT items FROM notifications_recent), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_deep_dive(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_deep_dive(uuid) TO authenticated;

-- 3) Recent platform activity for the admin dashboard (last 100 entries, joined with profile)
CREATE OR REPLACE FUNCTION public.admin_get_recent_activity(_limit int DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'created_at') DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'id',          ual.id,
      'user_id',     ual.user_id,
      'username',    p.username,
      'email',       p.email,
      'action_type', ual.action_type,
      'page_path',   ual.page_path,
      'created_at',  ual.created_at
    ) AS row
    FROM public.user_activity_logs ual
    LEFT JOIN public.profiles p ON p.user_id = ual.user_id
    ORDER BY ual.created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500))
  ) s;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_recent_activity(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_activity(int) TO authenticated;
