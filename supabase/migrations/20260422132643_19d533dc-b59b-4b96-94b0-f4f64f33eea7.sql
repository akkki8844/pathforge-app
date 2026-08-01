
-- Admins bypass credits: get_credits returns unlimited; consume_credit short-circuits true.
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
  -- Admin bypass: unlimited, never charged.
  IF public.is_admin() THEN
    RETURN json_build_object(
      'plan', 'admin',
      'credits_used_today', 0,
      'max_daily_credits', 999999,
      'bonus_credits', 0,
      'last_reset_at', now(),
      'is_admin', true
    );
  END IF;

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
    'last_reset_at', credit_row.last_reset_at,
    'is_admin', false
  );
END;
$function$;

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
  -- Admin bypass: never consume.
  IF public.is_admin() THEN
    RETURN true;
  END IF;

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

  IF credit_row.bonus_credits > 0 THEN
    UPDATE public.user_credits
    SET bonus_credits = bonus_credits - 1, updated_at = now()
    WHERE user_id = auth.uid();
    RETURN true;
  END IF;

  IF credit_row.credits_used_today >= credit_row.max_daily_credits THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
  SET credits_used_today = credits_used_today + 1, updated_at = now()
  WHERE user_id = auth.uid();
  RETURN true;
END;
$function$;

-- Enhanced user search: filter by role, school, onboarding, sort options.
CREATE OR REPLACE FUNCTION public.admin_search_users(
  search_term text DEFAULT ''::text,
  filter_country text DEFAULT NULL::text,
  filter_grade text DEFAULT NULL::text,
  filter_major text DEFAULT NULL::text,
  filter_role text DEFAULT NULL::text,
  filter_school_id uuid DEFAULT NULL::uuid,
  filter_onboarded text DEFAULT NULL::text,
  sort_by text DEFAULT 'created_desc'::text,
  page_num integer DEFAULT 1,
  page_size integer DEFAULT 20
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  total_count INTEGER;
  offset_val INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  offset_val := (page_num - 1) * page_size;

  WITH base AS (
    SELECT
      p.user_id, p.email, p.username, p.created_at,
      o.grade, o.country, o.curriculum, o.intended_major, o.high_school_name,
      o.onboarding_completed, o.target_universities, o.school_id AS student_school_id,
      tp.school_id AS teacher_school_id,
      CASE
        WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin') THEN 'admin'
        WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'teacher') THEN 'counsellor'
        ELSE 'student'
      END AS role,
      EXISTS(SELECT 1 FROM public.user_flags uf WHERE uf.user_id = p.user_id AND uf.is_active = true) AS is_flagged,
      (SELECT COUNT(*) FROM public.ai_usage_logs ail WHERE ail.user_id = p.user_id) AS ai_requests
    FROM public.profiles p
    LEFT JOIN public.onboarding_data o ON p.user_id = o.user_id
    LEFT JOIN public.teacher_profiles tp ON p.user_id = tp.user_id
  ), filtered AS (
    SELECT * FROM base
    WHERE (
      search_term = '' OR
      LOWER(email) LIKE LOWER('%' || search_term || '%') OR
      LOWER(COALESCE(username,'')) LIKE LOWER('%' || search_term || '%') OR
      LOWER(COALESCE(high_school_name,'')) LIKE LOWER('%' || search_term || '%')
    )
    AND (filter_country IS NULL OR country = filter_country)
    AND (filter_grade IS NULL OR grade = filter_grade)
    AND (filter_major IS NULL OR intended_major = filter_major)
    AND (filter_role IS NULL OR role = filter_role)
    AND (filter_school_id IS NULL OR student_school_id = filter_school_id OR teacher_school_id = filter_school_id)
    AND (
      filter_onboarded IS NULL
      OR (filter_onboarded = 'yes' AND onboarding_completed = true)
      OR (filter_onboarded = 'no' AND (onboarding_completed IS NULL OR onboarding_completed = false))
    )
  )
  SELECT COUNT(*) INTO total_count FROM filtered;

  SELECT json_build_object(
    'total', total_count,
    'page', page_num,
    'page_size', page_size,
    'total_pages', CEIL(total_count::DECIMAL / page_size),
    'users', (
      SELECT json_agg(row_to_json(u)) FROM (
        SELECT * FROM (
          WITH base AS (
            SELECT
              p.user_id, p.email, p.username, p.created_at,
              o.grade, o.country, o.curriculum, o.intended_major, o.high_school_name,
              o.onboarding_completed, o.target_universities, o.school_id AS student_school_id,
              tp.school_id AS teacher_school_id,
              CASE
                WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin') THEN 'admin'
                WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'teacher') THEN 'counsellor'
                ELSE 'student'
              END AS role,
              EXISTS(SELECT 1 FROM public.user_flags uf WHERE uf.user_id = p.user_id AND uf.is_active = true) AS is_flagged,
              (SELECT COUNT(*) FROM public.ai_usage_logs ail WHERE ail.user_id = p.user_id) AS ai_requests
            FROM public.profiles p
            LEFT JOIN public.onboarding_data o ON p.user_id = o.user_id
            LEFT JOIN public.teacher_profiles tp ON p.user_id = tp.user_id
          )
          SELECT * FROM base
          WHERE (
            search_term = '' OR
            LOWER(email) LIKE LOWER('%' || search_term || '%') OR
            LOWER(COALESCE(username,'')) LIKE LOWER('%' || search_term || '%') OR
            LOWER(COALESCE(high_school_name,'')) LIKE LOWER('%' || search_term || '%')
          )
          AND (filter_country IS NULL OR country = filter_country)
          AND (filter_grade IS NULL OR grade = filter_grade)
          AND (filter_major IS NULL OR intended_major = filter_major)
          AND (filter_role IS NULL OR role = filter_role)
          AND (filter_school_id IS NULL OR student_school_id = filter_school_id OR teacher_school_id = filter_school_id)
          AND (
            filter_onboarded IS NULL
            OR (filter_onboarded = 'yes' AND onboarding_completed = true)
            OR (filter_onboarded = 'no' AND (onboarding_completed IS NULL OR onboarding_completed = false))
          )
          ORDER BY
            CASE WHEN sort_by = 'created_asc' THEN created_at END ASC,
            CASE WHEN sort_by = 'ai_desc' THEN ai_requests END DESC,
            CASE WHEN sort_by = 'email_asc' THEN email END ASC,
            CASE WHEN sort_by NOT IN ('created_asc','ai_desc','email_asc') THEN created_at END DESC
          LIMIT page_size OFFSET offset_val
        ) inner_q
      ) u
    )
  ) INTO result;

  RETURN result;
END;
$function$;
