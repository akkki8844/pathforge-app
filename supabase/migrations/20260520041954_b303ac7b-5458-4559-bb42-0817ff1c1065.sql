CREATE OR REPLACE FUNCTION public.get_student_deep_dive(_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

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
  activity_by_day AS (
    SELECT jsonb_agg(jsonb_build_object('day', day, 'count', cnt) ORDER BY day) AS items
    FROM (
      SELECT
        to_char(d::date, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(CASE WHEN ual.created_at::date = d::date THEN 1 ELSE 0 END), 0)::int AS cnt
      FROM generate_series(
        (now() - interval '29 days')::date,
        now()::date,
        interval '1 day'
      ) d
      LEFT JOIN public.user_activity_logs ual
        ON ual.user_id = _student_id
       AND ual.created_at >= now() - interval '30 days'
       AND ual.created_at::date = d::date
      GROUP BY d
    ) x
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
  ),
  engagement AS (
    SELECT jsonb_build_object(
      'applications',         (SELECT COUNT(*)::int FROM public.application_entries WHERE user_id = _student_id),
      'full_applications',    (SELECT COUNT(*)::int FROM public.full_applications  WHERE user_id = _student_id),
      'linkedin_imports',     (SELECT COUNT(*)::int FROM public.linkedin_imports   WHERE user_id = _student_id),
      'readiness_analyses',   (SELECT COUNT(*)::int FROM public.readiness_analyses WHERE user_id = _student_id),
      'admissions_evals',     (SELECT COUNT(*)::int FROM public.admissions_data    WHERE user_id = _student_id)
    ) AS row
  ),
  admissions_recent AS (
    SELECT jsonb_agg(jsonb_build_object(
      'college',      college_name,
      'probability',  probability,
      'verdict',      verdict,
      'created_at',   created_at
    ) ORDER BY created_at DESC) AS items
    FROM (
      SELECT college_name, probability, verdict, created_at
      FROM public.admissions_data
      WHERE user_id = _student_id
      ORDER BY created_at DESC
      LIMIT 5
    ) a
  )
  SELECT jsonb_build_object(
    'activity_summary',     COALESCE(to_jsonb((SELECT a FROM activity_counts a)), '{}'::jsonb),
    'activity_by_day',      COALESCE((SELECT items FROM activity_by_day), '[]'::jsonb),
    'recent_activity',      COALESCE((SELECT items FROM recent_activity), '[]'::jsonb),
    'ai_by_feature',        COALESCE((SELECT items FROM ai_by_feature), '[]'::jsonb),
    'credits',              COALESCE((SELECT row FROM credits), '{}'::jsonb),
    'scores',               COALESCE((SELECT row FROM scores), '{}'::jsonb),
    'outcomes',             COALESCE((SELECT row FROM outcomes), '{}'::jsonb),
    'planner',              COALESCE((SELECT items FROM planner_recent), '[]'::jsonb),
    'notifications',        COALESCE((SELECT items FROM notifications_recent), '[]'::jsonb),
    'engagement',           COALESCE((SELECT row FROM engagement), '{}'::jsonb),
    'admissions_recent',    COALESCE((SELECT items FROM admissions_recent), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_student_deep_dive(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_student_deep_dive(uuid) TO authenticated;