DROP FUNCTION IF EXISTS public.get_journey_leaderboard(text, integer);

CREATE FUNCTION public.get_journey_leaderboard(scope text DEFAULT 'global'::text, limit_count integer DEFAULT 25)
 RETURNS TABLE(rank integer, display_name text, grade text, school_name text, diamonds integer, streak integer, hearts integer, is_me boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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
      COALESCE(NULLIF(p.username,''), split_part(COALESCE(p.email,''),'@',1), 'Student') AS display_name,
      od.grade,
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
    LEFT JOIN public.journey_scores js ON js.user_id = p.user_id
    LEFT JOIN public.onboarding_data od ON od.user_id = p.user_id
    LEFT JOIN public.schools s ON s.id = od.school_id
    WHERE COALESCE(p.is_vc,false) = false
  ),
  filtered AS (
    SELECT * FROM base
    WHERE
      CASE scope
        WHEN 'school' THEN my_school IS NOT NULL AND school_id = my_school
        WHEN 'grade'  THEN my_grade  IS NOT NULL AND grade = my_grade
        ELSE TRUE
      END
  ),
  ranked AS (
    SELECT ROW_NUMBER() OVER (ORDER BY diamonds DESC, streak DESC, hearts DESC, display_name ASC)::INTEGER AS rank,
           user_id, display_name, grade, school_name, diamonds, streak, hearts
    FROM filtered
  )
  SELECT r.rank, r.display_name, r.grade, r.school_name, r.diamonds, r.streak, r.hearts, (r.user_id = uid) AS is_me
  FROM ranked r
  ORDER BY r.rank ASC
  LIMIT GREATEST(1, LEAST(limit_count, 100));
END;
$function$;