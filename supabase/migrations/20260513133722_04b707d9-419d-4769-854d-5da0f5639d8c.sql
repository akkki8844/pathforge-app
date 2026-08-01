CREATE OR REPLACE FUNCTION public.admin_search_users(
  search_term text DEFAULT ''::text,
  filter_country text DEFAULT NULL::text,
  filter_grade text DEFAULT NULL::text,
  filter_major text DEFAULT NULL::text,
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

    SELECT COUNT(*) INTO total_count
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.user_id
    LEFT JOIN public.onboarding_data o ON p.user_id = o.user_id
    WHERE COALESCE(au.is_anonymous, false) = false
      AND p.email IS NOT NULL
      AND p.email <> ''
      AND (
        search_term = '' OR
        LOWER(p.email) LIKE LOWER('%' || search_term || '%') OR
        LOWER(p.username) LIKE LOWER('%' || search_term || '%') OR
        LOWER(o.high_school_name) LIKE LOWER('%' || search_term || '%')
      )
      AND (filter_country IS NULL OR o.country = filter_country)
      AND (filter_grade IS NULL OR o.grade = filter_grade)
      AND (filter_major IS NULL OR o.intended_major = filter_major);

    SELECT json_build_object(
        'total', total_count,
        'page', page_num,
        'page_size', page_size,
        'total_pages', CEIL(total_count::DECIMAL / page_size),
        'users', (
            SELECT json_agg(user_data)
            FROM (
                SELECT
                    p.user_id,
                    p.email,
                    p.username,
                    p.created_at,
                    o.grade,
                    o.country,
                    o.curriculum,
                    o.intended_major,
                    o.high_school_name,
                    o.onboarding_completed,
                    o.target_universities,
                    (SELECT EXISTS(SELECT 1 FROM public.user_flags uf WHERE uf.user_id = p.user_id AND uf.is_active = true)) as is_flagged,
                    (SELECT json_agg(json_build_object('type', uf.flag_type, 'reason', uf.reason))
                     FROM public.user_flags uf WHERE uf.user_id = p.user_id AND uf.is_active = true) as active_flags
                FROM public.profiles p
                JOIN auth.users au ON au.id = p.user_id
                LEFT JOIN public.onboarding_data o ON p.user_id = o.user_id
                WHERE COALESCE(au.is_anonymous, false) = false
                  AND p.email IS NOT NULL
                  AND p.email <> ''
                  AND (
                    search_term = '' OR
                    LOWER(p.email) LIKE LOWER('%' || search_term || '%') OR
                    LOWER(p.username) LIKE LOWER('%' || search_term || '%') OR
                    LOWER(o.high_school_name) LIKE LOWER('%' || search_term || '%')
                  )
                  AND (filter_country IS NULL OR o.country = filter_country)
                  AND (filter_grade IS NULL OR o.grade = filter_grade)
                  AND (filter_major IS NULL OR o.intended_major = filter_major)
                ORDER BY p.created_at DESC
                LIMIT page_size
                OFFSET offset_val
            ) user_data
        )
    ) INTO result;

    RETURN result;
END;
$function$;