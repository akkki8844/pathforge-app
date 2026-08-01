
-- ============================================================
-- Admin User Management — full action suite
-- ============================================================

-- Enriched user details: include credits, role, school, last activity, recent activity feed
CREATE OR REPLACE FUNCTION public.admin_get_user_details(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT json_build_object(
    'profile', (SELECT row_to_json(p) FROM public.profiles p WHERE p.user_id = target_user_id),
    'role', (
      SELECT CASE
        WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = target_user_id AND ur.role = 'admin') THEN 'admin'
        WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = target_user_id AND ur.role = 'teacher') THEN 'counsellor'
        ELSE 'student'
      END
    ),
    'onboarding', (SELECT row_to_json(o) FROM public.onboarding_data o WHERE o.user_id = target_user_id),
    'school', (
      SELECT row_to_json(s) FROM public.schools s
      WHERE s.id = (SELECT school_id FROM public.onboarding_data WHERE user_id = target_user_id)
         OR s.id = (SELECT school_id FROM public.teacher_profiles WHERE user_id = target_user_id)
      LIMIT 1
    ),
    'teacher_profile', (SELECT row_to_json(tp) FROM public.teacher_profiles tp WHERE tp.user_id = target_user_id),
    'credits', (SELECT row_to_json(c) FROM public.user_credits c WHERE c.user_id = target_user_id),
    'subscription', (
      SELECT row_to_json(s) FROM public.subscriptions s
      WHERE s.user_id = target_user_id
        AND s.status IN ('active','trialing')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
      ORDER BY s.created_at DESC LIMIT 1
    ),
    'outcomes', (SELECT row_to_json(od) FROM public.outcomes_data od WHERE od.user_id = target_user_id),
    'journey', (SELECT row_to_json(js) FROM public.journey_scores js WHERE js.user_id = target_user_id),
    'last_active_at', (
      SELECT MAX(ts) FROM (
        SELECT MAX(created_at) AS ts FROM public.user_activity_logs WHERE user_id = target_user_id
        UNION ALL SELECT MAX(created_at) FROM public.ai_usage_logs WHERE user_id = target_user_id
        UNION ALL SELECT MAX(created_at) FROM public.voice_advisor_sessions WHERE user_id = target_user_id
      ) x
    ),
    'recent_activity', (
      SELECT json_agg(json_build_object(
        'action_type', action_type, 'page_path', page_path, 'created_at', created_at
      ))
      FROM (
        SELECT action_type, page_path, created_at
        FROM public.user_activity_logs
        WHERE user_id = target_user_id
        ORDER BY created_at DESC LIMIT 15
      ) ra
    ),
    'advisor_sessions', (
      SELECT json_agg(json_build_object(
        'id', id, 'name', name, 'topics', topics_discussed, 'created_at', created_at
      ))
      FROM (SELECT * FROM public.voice_advisor_sessions WHERE user_id = target_user_id ORDER BY created_at DESC LIMIT 10) s
    ),
    'readiness_analyses', (
      SELECT json_agg(json_build_object(
        'id', id, 'name', name, 'major', intended_major, 'created_at', created_at
      ))
      FROM (SELECT * FROM public.readiness_analyses WHERE user_id = target_user_id ORDER BY created_at DESC) r
    ),
    'application_entries', (
      SELECT json_agg(json_build_object(
        'id', id, 'section', section_id, 'created_at', created_at
      ))
      FROM (SELECT * FROM public.application_entries WHERE user_id = target_user_id ORDER BY created_at DESC) a
    ),
    'flags', (
      SELECT json_agg(row_to_json(uf))
      FROM (SELECT * FROM public.user_flags WHERE user_id = target_user_id ORDER BY created_at DESC) uf
    ),
    'ai_usage', (
      SELECT json_build_object(
        'total_requests', COUNT(*),
        'total_tokens', COALESCE(SUM(tokens_used), 0),
        'by_feature', (
          SELECT json_agg(json_build_object('feature', feature_type, 'count', cnt))
          FROM (SELECT feature_type, COUNT(*) AS cnt FROM public.ai_usage_logs WHERE user_id = target_user_id GROUP BY feature_type) f
        )
      )
      FROM public.ai_usage_logs WHERE user_id = target_user_id
    ),
    'feedback', (
      SELECT json_agg(row_to_json(fb))
      FROM (SELECT * FROM public.admin_feedback WHERE user_id = target_user_id ORDER BY created_at DESC) fb
    )
  ) INTO result;

  RETURN result;
END;
$function$;

-- ============================================================
-- Admin moderation actions
-- ============================================================

-- Ban / suspend / warn a user (creates a user_flags record)
CREATE OR REPLACE FUNCTION public.admin_flag_user(
  _target_user_id uuid,
  _flag_type text,         -- 'warning' | 'suspension' | 'ban'
  _reason text,
  _expires_at timestamptz DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  IF _flag_type NOT IN ('warning','suspension','ban') THEN
    RAISE EXCEPTION 'Invalid flag_type. Must be warning, suspension, or ban.';
  END IF;

  -- Deactivate existing same-type flags so we don't stack duplicates
  UPDATE public.user_flags
  SET is_active = false, updated_at = now()
  WHERE user_id = _target_user_id AND flag_type = _flag_type AND is_active = true;

  INSERT INTO public.user_flags (user_id, flag_type, reason, notes, expires_at, flagged_by, is_active)
  VALUES (_target_user_id, _flag_type, _reason, _notes, _expires_at, auth.uid(), true)
  RETURNING id INTO _new_id;

  RETURN json_build_object('success', true, 'flag_id', _new_id);
END;
$function$;

-- Lift active flags
CREATE OR REPLACE FUNCTION public.admin_unflag_user(
  _target_user_id uuid,
  _flag_type text DEFAULT NULL  -- NULL = clear ALL active flags
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _affected int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  UPDATE public.user_flags
  SET is_active = false, updated_at = now()
  WHERE user_id = _target_user_id
    AND is_active = true
    AND (_flag_type IS NULL OR flag_type = _flag_type);

  GET DIAGNOSTICS _affected = ROW_COUNT;
  RETURN json_build_object('success', true, 'cleared', _affected);
END;
$function$;

-- ============================================================
-- Hard-delete a user's domain data (auth.users wipe still requires service role on edge)
-- This wipes EVERYTHING in public schema for that user, so the account is effectively gone
-- from the product even if the auth row lingers briefly.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_delete_user_data(_target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot delete their own account here';
  END IF;

  DELETE FROM public.admissions_data WHERE user_id = _target_user_id;
  DELETE FROM public.application_entries WHERE user_id = _target_user_id;
  DELETE FROM public.full_applications WHERE user_id = _target_user_id;
  DELETE FROM public.outcomes_data WHERE user_id = _target_user_id;
  DELETE FROM public.readiness_analyses WHERE user_id = _target_user_id;
  DELETE FROM public.journey_scores WHERE user_id = _target_user_id;
  DELETE FROM public.voice_advisor_sessions WHERE user_id = _target_user_id;
  DELETE FROM public.ai_usage_logs WHERE user_id = _target_user_id;
  DELETE FROM public.micro_question_responses WHERE user_id = _target_user_id;
  DELETE FROM public.proof_submissions WHERE user_id = _target_user_id;
  DELETE FROM public.coupon_redemptions WHERE user_id = _target_user_id;
  DELETE FROM public.credit_adjustments WHERE target_user_id = _target_user_id;
  DELETE FROM public.user_credits WHERE user_id = _target_user_id;
  DELETE FROM public.user_activity_logs WHERE user_id = _target_user_id;
  DELETE FROM public.user_flags WHERE user_id = _target_user_id;
  DELETE FROM public.admin_feedback WHERE user_id = _target_user_id;
  DELETE FROM public.assignment_progress WHERE student_id = _target_user_id;
  DELETE FROM public.class_members WHERE student_id = _target_user_id;
  DELETE FROM public.teacher_assignments WHERE teacher_id = _target_user_id;
  DELETE FROM public.teacher_feedback WHERE teacher_id = _target_user_id OR student_id = _target_user_id;
  DELETE FROM public.teacher_verification_requests WHERE teacher_user_id = _target_user_id;
  DELETE FROM public.teacher_profiles WHERE user_id = _target_user_id;
  DELETE FROM public.classes WHERE teacher_id = _target_user_id;
  DELETE FROM public.subscriptions WHERE user_id = _target_user_id;
  DELETE FROM public.guest_sessions WHERE guest_user_id = _target_user_id;
  DELETE FROM public.onboarding_data WHERE user_id = _target_user_id;
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  DELETE FROM public.profiles WHERE user_id = _target_user_id;

  RETURN json_build_object('success', true);
END;
$function$;

-- ============================================================
-- Reset user product state (keep account, wipe progress)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reset_user_state(_target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  DELETE FROM public.outcomes_data WHERE user_id = _target_user_id;
  DELETE FROM public.readiness_analyses WHERE user_id = _target_user_id;
  DELETE FROM public.admissions_data WHERE user_id = _target_user_id;
  DELETE FROM public.application_entries WHERE user_id = _target_user_id;
  DELETE FROM public.full_applications WHERE user_id = _target_user_id;
  DELETE FROM public.journey_scores WHERE user_id = _target_user_id;
  DELETE FROM public.voice_advisor_sessions WHERE user_id = _target_user_id;
  DELETE FROM public.micro_question_responses WHERE user_id = _target_user_id;
  DELETE FROM public.proof_submissions WHERE user_id = _target_user_id;

  -- Reset onboarding flag so they re-onboard
  UPDATE public.onboarding_data
  SET onboarding_completed = false, updated_at = now()
  WHERE user_id = _target_user_id;

  -- Reset credits to free tier baseline
  UPDATE public.user_credits
  SET plan = 'free',
      max_daily_credits = 5,
      credits_used_today = 0,
      bonus_credits = 0,
      last_reset_at = now(),
      updated_at = now()
  WHERE user_id = _target_user_id;

  RETURN json_build_object('success', true);
END;
$function$;

-- ============================================================
-- Edit basic user details (email/username on profile, role)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  _target_user_id uuid,
  _username text DEFAULT NULL,
  _role app_role DEFAULT NULL  -- if provided, replaces user's role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  IF _username IS NOT NULL THEN
    UPDATE public.profiles
    SET username = _username, updated_at = now()
    WHERE user_id = _target_user_id;
  END IF;

  IF _role IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = _target_user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _role);
  END IF;

  RETURN json_build_object('success', true);
END;
$function$;
