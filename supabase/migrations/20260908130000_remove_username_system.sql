-- Remove the username system.
--
-- Pathforge had two names for a person: `profiles.username` (set once at
-- signup-ish time, never editable in the UI) and `profiles.full_name`. Every
-- surface then had to pick one, so the same student showed up as a handle in
-- one place and a real name in another, and Settings displayed a field the
-- user could look at but not change.
--
-- From here there is exactly one display identity — `profiles.full_name` —
-- plus the sign-in email. This migration backfills the name, rewrites every
-- function that projected or matched on `username`, and then drops the column.
--
-- The drop is guarded: if any function body in `public` still mentions
-- `username` after the rewrites, the migration raises instead of dropping, so
-- a definition that drifted in the live database fails loudly here rather than
-- silently at runtime.

-- ---------------------------------------------------------------- backfill --
-- A username was the only name many accounts ever set, so it becomes the full
-- name wherever there isn't one already. Nothing is invented for accounts that
-- had neither; those keep a NULL name and fall back to their email.
UPDATE public.profiles
SET full_name = btrim(username),
    updated_at = now()
WHERE COALESCE(btrim(full_name), '') = ''
  AND COALESCE(btrim(username), '') <> '';

-- --------------------------------------------------------------- directory --
-- Return type changes, so these must be dropped rather than replaced.
DROP FUNCTION IF EXISTS public.comms_directory(uuid[]);

CREATE FUNCTION public.comms_directory(_user_ids uuid[])
RETURNS TABLE (
  user_id    uuid,
  full_name  text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    -- Bounded so a caller cannot ask for the whole user table in one round
    -- trip. 200 comfortably covers the distinct senders in a loaded thread
    -- plus a team's member list.
    AND p.user_id = ANY (_user_ids[1:200])
    AND (
      p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.conversation_members a
        JOIN public.conversation_members b ON b.conversation_id = a.conversation_id
        WHERE a.user_id = auth.uid() AND b.user_id = p.user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.team_members a
        JOIN public.team_members b ON b.team_id = a.team_id
        WHERE a.user_id = auth.uid() AND b.user_id = p.user_id
      )
      OR public.teacher_can_view_student(auth.uid(), p.user_id)
      OR public.teacher_can_view_student(p.user_id, auth.uid())
    );
$$;

COMMENT ON FUNCTION public.comms_directory(uuid[]) IS
  'Display fields (name, avatar) for user ids the caller shares a conversation or team with. Never returns email. Exists because profiles RLS deliberately does not let students read each other.';

REVOKE ALL ON FUNCTION public.comms_directory(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comms_directory(uuid[]) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.comms_search_people(text, integer);

CREATE FUNCTION public.comms_search_people(_query text, _limit integer DEFAULT 20)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND length(btrim(coalesce(_query, ''))) >= 2
    AND p.user_id <> auth.uid()
    AND COALESCE(p.is_vc, false) = false
    AND lower(coalesce(p.full_name, '')) LIKE '%' || lower(btrim(_query)) || '%'
    AND public.comms_can_reach(p.user_id, auth.uid())
  ORDER BY
    (lower(coalesce(p.full_name, '')) LIKE lower(btrim(_query)) || '%') DESC,
    lower(coalesce(p.full_name, '')) ASC
  LIMIT GREATEST(1, LEAST(coalesce(_limit, 20), 50));
$$;

COMMENT ON FUNCTION public.comms_search_people(text, integer) IS
  'People search for New Chat and team invites. Matches full name only, requires 2+ characters, and filters every candidate through comms_can_reach.';

REVOKE ALL ON FUNCTION public.comms_search_people(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comms_search_people(text, integer) TO authenticated, service_role;

-- ----------------------------------------------------------------- roster --
DROP FUNCTION IF EXISTS public.teacher_roster();

CREATE FUNCTION public.teacher_roster()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
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
    p.full_name,
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
  ORDER BY COALESCE(js.overall_score, 0) DESC, COALESCE(p.full_name, p.email, od.user_id::text) ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_roster() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_roster() TO authenticated;

-- ------------------------------------------------------ fellow counsellors --
CREATE OR REPLACE FUNCTION public.list_fellow_counsellors()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _school uuid;
  result json;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.is_verified_teacher(_uid) THEN
    RAISE EXCEPTION 'Access denied: verified counsellor only';
  END IF;

  _school := public.teacher_school_id(_uid);
  IF _school IS NULL THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(row_to_json(c)) INTO result FROM (
    SELECT
      tp.user_id,
      tp.title,
      tp.school_role,
      tp.subject,
      tp.years_experience,
      p.full_name,
      p.email,
      s.name AS school_name,
      tp.created_at
    FROM public.teacher_profiles tp
    LEFT JOIN public.profiles p ON p.user_id = tp.user_id
    LEFT JOIN public.schools s ON s.id = tp.school_id
    WHERE tp.school_id = _school
      AND tp.user_id <> _uid
      AND tp.verified = true
    ORDER BY tp.created_at ASC
  ) c;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ------------------------------------------------------------ leaderboard --
CREATE OR REPLACE FUNCTION public.get_journey_leaderboard(
  scope text DEFAULT 'global'::text,
  limit_count integer DEFAULT 1000
)
RETURNS TABLE(
  rank integer,
  display_name text,
  grade text,
  school_name text,
  diamonds integer,
  streak integer,
  hearts integer,
  is_me boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid UUID := auth.uid();
  my_school UUID;
  my_grade TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT od.school_id, od.grade INTO my_school, my_grade
  FROM public.onboarding_data od
  WHERE od.user_id = uid;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.user_id,
      -- Never fall back to email. A student who has not set a name gets a
      -- stable, non-identifying handle instead.
      COALESCE(
        NULLIF(btrim(p.full_name), ''),
        'Student-' || upper(substr(md5(p.user_id::text), 1, 4))
      ) AS display_name,
      od.grade AS grade_val,
      s.name AS school_name,
      od.school_id,
      COALESCE(js.diamonds, 0)::INTEGER AS diamonds,
      COALESCE(js.hearts, 5)::INTEGER AS hearts,
      CASE
        WHEN js.user_id IS NULL OR COALESCE(jsonb_array_length(js.completed_milestones), 0) = 0 THEN 0
        ELSE LEAST(
          GREATEST(1, CEIL(GREATEST(1, EXTRACT(EPOCH FROM (now() - COALESCE(js.started_at, js.created_at, now()))) / 604800.0))::INTEGER),
          CEIL(COALESCE(jsonb_array_length(js.completed_milestones), 0)::NUMERIC / 1.5)::INTEGER
        )
      END AS streak
    FROM public.profiles p
    -- INNER JOIN, deliberately: it drops guest sessions AND any profile row
    -- whose auth user no longer exists.
    JOIN auth.users u
      ON u.id = p.user_id
     AND COALESCE(u.is_anonymous, false) = false
    LEFT JOIN public.journey_scores js ON js.user_id = p.user_id
    LEFT JOIN public.onboarding_data od ON od.user_id = p.user_id
    LEFT JOIN public.schools s ON s.id = od.school_id
    WHERE COALESCE(p.is_vc, false) = false
  ),
  filtered AS (
    SELECT * FROM base b
    WHERE
      CASE scope
        WHEN 'school' THEN my_school IS NOT NULL AND b.school_id = my_school
        WHEN 'grade'  THEN my_grade  IS NOT NULL AND b.grade_val = my_grade
        ELSE TRUE
      END
  ),
  ranked AS (
    SELECT ROW_NUMBER() OVER (
             ORDER BY f.diamonds DESC, f.streak DESC, f.hearts DESC, lower(f.display_name) ASC, f.user_id ASC
           )::INTEGER AS rank,
           f.user_id, f.display_name, f.grade_val, f.school_name, f.diamonds, f.streak, f.hearts
    FROM filtered f
  )
  SELECT r.rank, r.display_name, r.grade_val, r.school_name, r.diamonds, r.streak, r.hearts,
         (r.user_id = uid) AS is_me
  FROM ranked r
  ORDER BY r.rank ASC
  LIMIT GREATEST(1, LEAST(limit_count, 10000));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_journey_leaderboard(text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_journey_leaderboard(text, integer) TO authenticated;

-- ------------------------------------------------------ recommender invite --
CREATE OR REPLACE FUNCTION public.get_recommender_invite(_token text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _row public.recommender_invites%ROWTYPE;
  _student_name text;
BEGIN
  SELECT * INTO _row
  FROM public.recommender_invites
  WHERE token = _token;

  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT COALESCE(NULLIF(TRIM(p.full_name), ''), 'A student')
  INTO _student_name
  FROM public.profiles p
  WHERE p.user_id = _row.user_id;

  RETURN json_build_object(
    'found', true,
    'student_name', COALESCE(_student_name, 'A student'),
    'recommender_name', _row.recommender_name,
    'recommender_email', _row.recommender_email,
    'relationship', _row.relationship,
    'status', _row.status,
    'expires_at', _row.expires_at,
    'submitted_at', _row.submitted_at
  );
END;
$function$;

-- ------------------------------------------------------------ admin panel --
CREATE OR REPLACE FUNCTION public.admin_search_users(search_term text DEFAULT ''::text, filter_country text DEFAULT NULL::text, filter_grade text DEFAULT NULL::text, filter_major text DEFAULT NULL::text, page_num integer DEFAULT 1, page_size integer DEFAULT 20)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result json; total_count integer; offset_val integer;
BEGIN
    IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied: Admin role required'; END IF;
    offset_val := (page_num - 1) * page_size;
    SELECT COUNT(*) INTO total_count FROM public.profiles p
    JOIN auth.users au ON au.id = p.user_id
    LEFT JOIN public.onboarding_data o ON p.user_id = o.user_id
    WHERE COALESCE(au.is_anonymous, false) = false AND COALESCE(p.is_vc, false) = false
      AND p.email IS NOT NULL AND p.email <> ''
      AND (search_term = '' OR LOWER(p.email) LIKE LOWER('%' || search_term || '%') OR LOWER(COALESCE(p.full_name,'')) LIKE LOWER('%' || search_term || '%') OR LOWER(o.high_school_name) LIKE LOWER('%' || search_term || '%'))
      AND (filter_country IS NULL OR o.country = filter_country)
      AND (filter_grade IS NULL OR o.grade = filter_grade)
      AND (filter_major IS NULL OR o.intended_major = filter_major);
    SELECT json_build_object('total', total_count, 'page', page_num, 'page_size', page_size,
        'total_pages', CEIL(total_count::decimal / page_size),
        'users', COALESCE((SELECT json_agg(user_data) FROM (
                SELECT p.user_id, p.email, p.full_name, p.created_at, o.grade, o.country, o.curriculum, o.intended_major, o.high_school_name, o.onboarding_completed, o.target_universities,
                  (SELECT EXISTS(SELECT 1 FROM public.user_flags uf WHERE uf.user_id = p.user_id AND uf.is_active = true)) AS is_flagged,
                  (SELECT json_agg(json_build_object('type', uf.flag_type, 'reason', uf.reason)) FROM public.user_flags uf WHERE uf.user_id = p.user_id AND uf.is_active = true) AS active_flags
                FROM public.profiles p JOIN auth.users au ON au.id = p.user_id
                LEFT JOIN public.onboarding_data o ON p.user_id = o.user_id
                WHERE COALESCE(au.is_anonymous, false) = false AND COALESCE(p.is_vc, false) = false
                  AND p.email IS NOT NULL AND p.email <> ''
                  AND (search_term = '' OR LOWER(p.email) LIKE LOWER('%' || search_term || '%') OR LOWER(COALESCE(p.full_name,'')) LIKE LOWER('%' || search_term || '%') OR LOWER(o.high_school_name) LIKE LOWER('%' || search_term || '%'))
                  AND (filter_country IS NULL OR o.country = filter_country)
                  AND (filter_grade IS NULL OR o.grade = filter_grade)
                  AND (filter_major IS NULL OR o.intended_major = filter_major)
                ORDER BY p.created_at DESC LIMIT page_size OFFSET offset_val
            ) user_data), '[]'::json)) INTO result;
    RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_user_ai_usage(_search text DEFAULT ''::text, _limit integer DEFAULT 50)
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied: Admin role required'; END IF;
  SELECT json_agg(row_to_json(u)) INTO result FROM (
    SELECT p.user_id, p.email, p.full_name, uc.plan, uc.max_daily_credits, uc.credits_used_today, uc.bonus_credits, uc.last_reset_at,
      (SELECT COUNT(*) FROM public.ai_usage_logs ail WHERE ail.user_id = p.user_id) AS lifetime_requests,
      (SELECT COUNT(*) FROM public.ai_usage_logs ail WHERE ail.user_id = p.user_id AND ail.created_at >= now() - interval '24 hours') AS requests_24h
    FROM public.profiles p LEFT JOIN public.user_credits uc ON uc.user_id = p.user_id
    WHERE COALESCE(p.is_vc, false) = false
      AND (_search = '' OR LOWER(p.email) LIKE LOWER('%' || _search || '%') OR LOWER(COALESCE(p.full_name,'')) LIKE LOWER('%' || _search || '%'))
    ORDER BY requests_24h DESC NULLS LAST, p.created_at DESC LIMIT _limit
  ) u;
  RETURN COALESCE(result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_recent_activity(_limit integer DEFAULT 100)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'access denied'; END IF;
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'created_at') DESC), '[]'::jsonb) INTO result FROM (
    SELECT jsonb_build_object('id', ual.id, 'user_id', ual.user_id, 'full_name', p.full_name, 'email', p.email,
      'action_type', ual.action_type, 'page_path', ual.page_path, 'created_at', ual.created_at) AS row
    FROM public.user_activity_logs ual LEFT JOIN public.profiles p ON p.user_id = ual.user_id
    WHERE COALESCE(p.is_vc, false) = false
    ORDER BY ual.created_at DESC LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500))
  ) s;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_flagged_prompts(_limit integer DEFAULT 100, _only_unreviewed boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) INTO result FROM (
    SELECT
      fp.id,
      fp.user_id,
      COALESCE(p.email, fp.user_email) AS email,
      p.full_name,
      fp.feature,
      fp.prompt,
      fp.severity,
      fp.ai_verdict,
      fp.categories,
      fp.reviewed,
      fp.reviewed_at,
      fp.action_taken,
      fp.created_at
    FROM public.flagged_prompts fp
    LEFT JOIN public.profiles p ON p.user_id = fp.user_id
    WHERE (_only_unreviewed = false OR fp.reviewed = false)
    ORDER BY fp.created_at DESC
    LIMIT GREATEST(1, LEAST(_limit, 500))
  ) r;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_counsellors()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result FROM (
    SELECT tp.user_id, tp.title, tp.school_id, tp.verified, tp.years_experience,
           tp.invite_status, tp.invite_accepted_at, tp.onboarding_completed,
           tp.created_at,
           p.email, p.full_name, s.name AS school_name
    FROM public.teacher_profiles tp
    LEFT JOIN public.profiles p ON p.user_id = tp.user_id
    LEFT JOIN public.schools s ON s.id = tp.school_id
    ORDER BY tp.created_at DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_users_for_broadcast(_query text, _limit integer DEFAULT 20)
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result JSON; is_caller_admin BOOLEAN; caller_school UUID; q TEXT := lower(coalesce(trim(_query), ''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF length(q) < 1 THEN RETURN '[]'::json; END IF;
  is_caller_admin := public.is_admin();
  IF NOT is_caller_admin THEN
    IF NOT public.is_verified_teacher(auth.uid()) THEN RAISE EXCEPTION 'Access denied'; END IF;
    caller_school := public.teacher_school_id(auth.uid());
    IF caller_school IS NULL THEN RETURN '[]'::json; END IF;
  END IF;
  SELECT json_agg(row_to_json(u)) INTO result FROM (
    SELECT p.user_id, p.email, p.full_name, o.grade, o.high_school_name, s.name AS school_name
    FROM public.profiles p LEFT JOIN public.onboarding_data o ON o.user_id = p.user_id
    LEFT JOIN public.schools s ON s.id = o.school_id
    WHERE COALESCE(p.is_vc, false) = false
      AND (is_caller_admin OR o.school_id = caller_school)
      AND (lower(coalesce(p.email,'')) LIKE '%' || q || '%' OR lower(coalesce(p.full_name,'')) LIKE '%' || q || '%'
        OR lower(coalesce(o.high_school_name,'')) LIKE '%' || q || '%' OR lower(coalesce(s.name,'')) LIKE '%' || q || '%')
    ORDER BY p.created_at DESC LIMIT GREATEST(1, LEAST(_limit, 50))
  ) u;
  RETURN COALESCE(result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_coupon_redemptions(
  _code text DEFAULT NULL,
  _limit integer DEFAULT 200
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _normalized TEXT := NULLIF(upper(btrim(COALESCE(_code, ''))), '');
  result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) INTO result FROM (
    SELECT cr.user_id, cr.code, cr.credits_granted, cr.redeemed_at,
           p.email, p.full_name,
           co.plan_grant, co.plan_grant_duration_days,
           uc.plan AS current_plan, uc.plan_expires_at AS current_plan_expires_at,
           uc.free_plan_grant AS pending_plan_grant
    FROM public.coupon_redemptions cr
    LEFT JOIN public.profiles p ON p.user_id = cr.user_id
    LEFT JOIN public.coupons co ON upper(co.code) = upper(cr.code)
    LEFT JOIN public.user_credits uc ON uc.user_id = cr.user_id
    WHERE _normalized IS NULL OR upper(cr.code) = _normalized
    ORDER BY cr.redeemed_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(_limit, 200), 1000))
  ) r;

  RETURN result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_list_coupon_redemptions(text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_list_coupon_redemptions(text, integer) TO authenticated;

-- admin_get_coupon_stats projects the same three profile columns in its
-- per-redemption breakdown; rebuild it without the handle.
DO $do$
DECLARE
  _def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO _def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_get_coupon_stats'
  LIMIT 1;

  IF _def IS NOT NULL AND _def LIKE '%p.username%' THEN
    EXECUTE replace(_def, 'p.email, p.full_name, p.username,', 'p.email, p.full_name,');
  END IF;
END
$do$;

-- The admin "edit user" form now edits the full name. The parameter name
-- changes, so the old signature has to go first.
DROP FUNCTION IF EXISTS public.admin_update_user_profile(uuid, text, app_role);

CREATE FUNCTION public.admin_update_user_profile(
  _target_user_id uuid,
  _full_name text DEFAULT NULL,
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

  IF _full_name IS NOT NULL THEN
    UPDATE public.profiles
    SET full_name = NULLIF(btrim(_full_name), ''), updated_at = now()
    WHERE user_id = _target_user_id;
  END IF;

  IF _role IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = _target_user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _role);
  END IF;

  RETURN json_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_update_user_profile(uuid, text, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(uuid, text, app_role) TO authenticated;

-- ---------------------------------------------------------- the handle goes --
-- Nothing checks availability of a name nobody can set.
DROP FUNCTION IF EXISTS public.is_username_available(text);

-- Guard. If a definition in the live database still reads the column, stop
-- here with the offending names rather than dropping the column out from
-- under it.
DO $do$
DECLARE
  _leftover text;
BEGIN
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO _leftover
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND pg_get_functiondef(p.oid) ~* '\musername\M'
    -- Comments mentioning the word are not references.
    AND regexp_replace(pg_get_functiondef(p.oid), '--[^\n]*', '', 'g') ~* '\musername\M';

  IF _leftover IS NOT NULL THEN
    RAISE EXCEPTION 'profiles.username is still referenced by: %', _leftover;
  END IF;
END
$do$;

DROP INDEX IF EXISTS public.idx_profiles_username;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_unique;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS username;
