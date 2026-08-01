-- Normalize school names for safe matching without changing user-entered display text
CREATE OR REPLACE FUNCTION public.normalized_school_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(lower(regexp_replace(trim(COALESCE(_name, '')), '[^a-z0-9]+', '', 'g')), '');
$$;

-- Counselor/student access now works when a student selected a school record OR typed the same school name.
CREATE OR REPLACE FUNCTION public.teacher_can_view_student(_teacher_uid uuid, _student_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_verified_teacher(_teacher_uid)
    AND (
      EXISTS (
        SELECT 1
        FROM public.teacher_profiles tp
        JOIN public.onboarding_data od ON od.user_id = _student_uid
        LEFT JOIN public.schools s ON s.id = tp.school_id
        WHERE tp.user_id = _teacher_uid
          AND tp.school_id IS NOT NULL
          AND (
            od.school_id = tp.school_id
            OR public.normalized_school_name(od.high_school_name) = public.normalized_school_name(s.name)
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.classes c
        JOIN public.class_members cm ON cm.class_id = c.id
        WHERE c.teacher_id = _teacher_uid AND cm.student_id = _student_uid
      )
    );
$$;

-- One secure, consistent source for counselor roster pages.
CREATE OR REPLACE FUNCTION public.teacher_roster()
RETURNS TABLE(
  user_id uuid,
  email text,
  username text,
  grade text,
  intended_major text,
  high_school_name text,
  target_universities text[],
  overall_score integer,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.is_verified_teacher(_uid) THEN
    RAISE EXCEPTION 'Access denied: verified counsellor only';
  END IF;

  RETURN QUERY
  WITH linked AS (
    SELECT DISTINCT od.user_id
    FROM public.onboarding_data od
    WHERE public.teacher_can_view_student(_uid, od.user_id)
  )
  SELECT
    od.user_id,
    p.email,
    p.username,
    od.grade,
    od.intended_major,
    od.high_school_name,
    od.target_universities,
    COALESCE(js.overall_score, 0)::integer AS overall_score,
    CASE
      WHEN COALESCE(js.overall_score, 0) >= 70 THEN 'top'
      WHEN COALESCE(js.overall_score, 0) < 30 THEN 'behind'
      ELSE 'steady'
    END AS status
  FROM linked l
  JOIN public.onboarding_data od ON od.user_id = l.user_id
  LEFT JOIN public.profiles p ON p.user_id = od.user_id
  LEFT JOIN public.journey_scores js ON js.user_id = od.user_id
  ORDER BY COALESCE(js.overall_score, 0) DESC, COALESCE(p.username, p.email, od.user_id::text) ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.normalized_school_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_roster() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalized_school_name(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_roster() TO authenticated;

-- Harden admin email targeting: no anonymous/guest accounts, no empty emails, and no staff roles in student/user campaign targeting.
CREATE OR REPLACE FUNCTION public.admin_resolve_email_recipients(_target_kind text, _filter jsonb)
RETURNS TABLE(user_id uuid, email text, grade text, school text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _grades text[];
  _schools text[];
  _user_ids uuid[];
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  _grades := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_filter->'grades', '[]'::jsonb)));
  _schools := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_filter->'schools', '[]'::jsonb)));
  _user_ids := ARRAY(SELECT (jsonb_array_elements_text(COALESCE(_filter->'userIds', '[]'::jsonb)))::uuid);

  RETURN QUERY
  SELECT DISTINCT
    p.user_id,
    LOWER(COALESCE(NULLIF(p.email, ''), au.email)) AS email,
    od.grade,
    COALESCE(s.name, od.high_school_name) AS school
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN public.onboarding_data od ON od.user_id = p.user_id
  LEFT JOIN public.schools s ON s.id = od.school_id
  WHERE COALESCE(au.is_anonymous, false) = false
    AND COALESCE(NULLIF(p.email, ''), au.email) IS NOT NULL
    AND COALESCE(NULLIF(p.email, ''), au.email) <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.user_id AND ur.role IN ('admin', 'teacher')
    )
    AND CASE _target_kind
      WHEN 'all' THEN TRUE
      WHEN 'grade' THEN od.grade = ANY(_grades)
      WHEN 'school' THEN COALESCE(s.name, od.high_school_name) = ANY(_schools)
      WHEN 'individual' THEN p.user_id = ANY(_user_ids)
      ELSE FALSE
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_targeting_facets()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  WITH eligible AS (
    SELECT p.user_id, od.grade, COALESCE(s.name, od.high_school_name) AS school
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.user_id
    LEFT JOIN public.onboarding_data od ON od.user_id = p.user_id
    LEFT JOIN public.schools s ON s.id = od.school_id
    WHERE COALESCE(au.is_anonymous, false) = false
      AND p.email IS NOT NULL
      AND p.email <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p.user_id AND ur.role IN ('admin', 'teacher')
      )
  )
  SELECT jsonb_build_object(
    'grades', COALESCE((SELECT jsonb_agg(DISTINCT grade ORDER BY grade) FROM eligible WHERE grade IS NOT NULL AND grade <> ''), '[]'::jsonb),
    'schools', COALESCE((SELECT jsonb_agg(DISTINCT school ORDER BY school) FROM eligible WHERE school IS NOT NULL AND school <> ''), '[]'::jsonb),
    'totalUsers', (SELECT COUNT(*) FROM eligible)
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_email_recipients(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_targeting_facets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_email_recipients(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_targeting_facets() TO authenticated, service_role;

-- Keep legacy user-management function overloads aligned with the newer no-guest rule.
CREATE OR REPLACE FUNCTION public.admin_search_users(
    search_term text DEFAULT '',
    filter_country text DEFAULT NULL,
    filter_grade text DEFAULT NULL,
    filter_major text DEFAULT NULL,
    page_num integer DEFAULT 1,
    page_size integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
    total_count integer;
    offset_val integer;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    offset_val := (page_num - 1) * page_size;

    SELECT COUNT(*) INTO total_count
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.user_id
    LEFT JOIN public.onboarding_data o ON p.user_id = o.user_id
    WHERE COALESCE(au.is_anonymous, false) = false
      AND p.email IS NOT NULL
      AND p.email <> ''
      AND (search_term = '' OR LOWER(p.email) LIKE LOWER('%' || search_term || '%') OR LOWER(p.username) LIKE LOWER('%' || search_term || '%') OR LOWER(o.high_school_name) LIKE LOWER('%' || search_term || '%'))
      AND (filter_country IS NULL OR o.country = filter_country)
      AND (filter_grade IS NULL OR o.grade = filter_grade)
      AND (filter_major IS NULL OR o.intended_major = filter_major);

    SELECT json_build_object(
        'total', total_count,
        'page', page_num,
        'page_size', page_size,
        'total_pages', CEIL(total_count::decimal / page_size),
        'users', COALESCE((
            SELECT json_agg(user_data)
            FROM (
                SELECT p.user_id, p.email, p.username, p.created_at, o.grade, o.country, o.curriculum, o.intended_major, o.high_school_name, o.onboarding_completed, o.target_universities,
                  (SELECT EXISTS(SELECT 1 FROM public.user_flags uf WHERE uf.user_id = p.user_id AND uf.is_active = true)) AS is_flagged,
                  (SELECT json_agg(json_build_object('type', uf.flag_type, 'reason', uf.reason)) FROM public.user_flags uf WHERE uf.user_id = p.user_id AND uf.is_active = true) AS active_flags
                FROM public.profiles p
                JOIN auth.users au ON au.id = p.user_id
                LEFT JOIN public.onboarding_data o ON p.user_id = o.user_id
                WHERE COALESCE(au.is_anonymous, false) = false
                  AND p.email IS NOT NULL
                  AND p.email <> ''
                  AND (search_term = '' OR LOWER(p.email) LIKE LOWER('%' || search_term || '%') OR LOWER(p.username) LIKE LOWER('%' || search_term || '%') OR LOWER(o.high_school_name) LIKE LOWER('%' || search_term || '%'))
                  AND (filter_country IS NULL OR o.country = filter_country)
                  AND (filter_grade IS NULL OR o.grade = filter_grade)
                  AND (filter_major IS NULL OR o.intended_major = filter_major)
                ORDER BY p.created_at DESC
                LIMIT page_size OFFSET offset_val
            ) user_data
        ), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;