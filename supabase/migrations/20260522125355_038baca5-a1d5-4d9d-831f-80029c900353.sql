
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_vc BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_vc_user(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_vc FROM public.profiles WHERE user_id = _uid), false)
$$;

DO $$
DECLARE new_uid uuid;
BEGIN
  SELECT id INTO new_uid FROM auth.users WHERE email = 'pathforgevc@gmail.com';

  IF new_uid IS NULL THEN
    new_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_anonymous, is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_uid, 'authenticated', 'authenticated',
      'pathforgevc@gmail.com', crypt('pathforge4vc', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (gen_random_uuid(), new_uid,
      jsonb_build_object('sub', new_uid::text, 'email', 'pathforgevc@gmail.com', 'email_verified', true),
      'email', new_uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users SET encrypted_password = crypt('pathforge4vc', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now()
    WHERE id = new_uid;
  END IF;

  INSERT INTO public.profiles (user_id, email, username, is_vc, email_verified_at)
  VALUES (new_uid, 'pathforgevc@gmail.com', 'pathforgevc', true, now())
  ON CONFLICT (user_id) DO UPDATE
    SET is_vc = true,
        username = COALESCE(public.profiles.username, 'pathforgevc'),
        email_verified_at = COALESCE(public.profiles.email_verified_at, now()),
        updated_at = now();

  INSERT INTO public.user_credits (user_id, plan, max_daily_credits, credits_used_today, bonus_credits)
  VALUES (new_uid, 'pro', 999999, 0, 999999)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = 'pro', max_daily_credits = 999999, credits_used_today = 0, bonus_credits = 999999, updated_at = now();

  INSERT INTO public.onboarding_data (
    user_id, onboarding_completed, grade, country, curriculum, intended_major,
    high_school_name, application_year, extracurricular_level
  )
  VALUES (new_uid, true, '12', 'United States', 'Other', 'Computer Science',
    'Pathforge Demo School', 2026, 'High')
  ON CONFLICT (user_id) DO UPDATE SET onboarding_completed = true, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.consume_credit()
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE credit_row RECORD; hours_since_reset DOUBLE PRECISION; effective_limit INTEGER;
BEGIN
  IF public.is_admin() OR public.is_vc_user(auth.uid()) THEN RETURN true; END IF;
  PERFORM public.revert_user_if_expired(auth.uid());
  SELECT * INTO credit_row FROM public.user_credits WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', 1, 3);
    RETURN true;
  END IF;
  hours_since_reset := EXTRACT(EPOCH FROM (now() - credit_row.last_reset_at)) / 3600.0;
  IF hours_since_reset >= 24 THEN
    UPDATE public.user_credits SET credits_used_today = 0, last_reset_at = now(), updated_at = now()
    WHERE user_id = auth.uid() RETURNING * INTO credit_row;
  END IF;
  IF credit_row.bonus_credits > 0 THEN
    UPDATE public.user_credits SET bonus_credits = bonus_credits - 1, updated_at = now() WHERE user_id = auth.uid();
    RETURN true;
  END IF;
  effective_limit := public.effective_daily_credit_limit(auth.uid(), credit_row.plan, credit_row.max_daily_credits);
  IF credit_row.credits_used_today >= effective_limit THEN RETURN false; END IF;
  UPDATE public.user_credits SET credits_used_today = credits_used_today + 1, updated_at = now() WHERE user_id = auth.uid();
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_credits()
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE credit_row RECORD; hours_since_reset DOUBLE PRECISION; effective_limit INTEGER;
BEGIN
  IF public.is_admin() OR public.is_vc_user(auth.uid()) THEN
    RETURN json_build_object('plan','pro','credits_used_today',0,'max_daily_credits',999999,'bonus_credits',999999,'last_reset_at',now(),'is_admin',true);
  END IF;
  PERFORM public.revert_user_if_expired(auth.uid());
  SELECT * INTO credit_row FROM public.user_credits WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', 0, 3) RETURNING * INTO credit_row;
  END IF;
  hours_since_reset := EXTRACT(EPOCH FROM (now() - credit_row.last_reset_at)) / 3600.0;
  IF hours_since_reset >= 24 THEN
    UPDATE public.user_credits SET credits_used_today = 0, last_reset_at = now(), updated_at = now()
    WHERE user_id = auth.uid() RETURNING * INTO credit_row;
  END IF;
  effective_limit := public.effective_daily_credit_limit(auth.uid(), credit_row.plan, credit_row.max_daily_credits);
  RETURN json_build_object('plan', credit_row.plan,
    'credits_used_today', LEAST(credit_row.credits_used_today, effective_limit),
    'max_daily_credits', effective_limit, 'bonus_credits', credit_row.bonus_credits,
    'last_reset_at', credit_row.last_reset_at, 'is_admin', false);
END;
$function$;

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
      AND (search_term = '' OR LOWER(p.email) LIKE LOWER('%' || search_term || '%') OR LOWER(p.username) LIKE LOWER('%' || search_term || '%') OR LOWER(o.high_school_name) LIKE LOWER('%' || search_term || '%'))
      AND (filter_country IS NULL OR o.country = filter_country)
      AND (filter_grade IS NULL OR o.grade = filter_grade)
      AND (filter_major IS NULL OR o.intended_major = filter_major);
    SELECT json_build_object('total', total_count, 'page', page_num, 'page_size', page_size,
        'total_pages', CEIL(total_count::decimal / page_size),
        'users', COALESCE((SELECT json_agg(user_data) FROM (
                SELECT p.user_id, p.email, p.username, p.created_at, o.grade, o.country, o.curriculum, o.intended_major, o.high_school_name, o.onboarding_completed, o.target_universities,
                  (SELECT EXISTS(SELECT 1 FROM public.user_flags uf WHERE uf.user_id = p.user_id AND uf.is_active = true)) AS is_flagged,
                  (SELECT json_agg(json_build_object('type', uf.flag_type, 'reason', uf.reason)) FROM public.user_flags uf WHERE uf.user_id = p.user_id AND uf.is_active = true) AS active_flags
                FROM public.profiles p JOIN auth.users au ON au.id = p.user_id
                LEFT JOIN public.onboarding_data o ON p.user_id = o.user_id
                WHERE COALESCE(au.is_anonymous, false) = false AND COALESCE(p.is_vc, false) = false
                  AND p.email IS NOT NULL AND p.email <> ''
                  AND (search_term = '' OR LOWER(p.email) LIKE LOWER('%' || search_term || '%') OR LOWER(p.username) LIKE LOWER('%' || search_term || '%') OR LOWER(o.high_school_name) LIKE LOWER('%' || search_term || '%'))
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
    SELECT p.user_id, p.email, p.username, uc.plan, uc.max_daily_credits, uc.credits_used_today, uc.bonus_credits, uc.last_reset_at,
      (SELECT COUNT(*) FROM public.ai_usage_logs ail WHERE ail.user_id = p.user_id) AS lifetime_requests,
      (SELECT COUNT(*) FROM public.ai_usage_logs ail WHERE ail.user_id = p.user_id AND ail.created_at >= now() - interval '24 hours') AS requests_24h
    FROM public.profiles p LEFT JOIN public.user_credits uc ON uc.user_id = p.user_id
    WHERE COALESCE(p.is_vc, false) = false
      AND (_search = '' OR LOWER(p.email) LIKE LOWER('%' || _search || '%') OR LOWER(COALESCE(p.username,'')) LIKE LOWER('%' || _search || '%'))
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
    SELECT jsonb_build_object('id', ual.id, 'user_id', ual.user_id, 'username', p.username, 'email', p.email,
      'action_type', ual.action_type, 'page_path', ual.page_path, 'created_at', ual.created_at) AS row
    FROM public.user_activity_logs ual LEFT JOIN public.profiles p ON p.user_id = ual.user_id
    WHERE COALESCE(p.is_vc, false) = false
    ORDER BY ual.created_at DESC LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500))
  ) s;
  RETURN result;
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
    SELECT p.user_id, p.email, p.username, o.grade, o.high_school_name, s.name AS school_name
    FROM public.profiles p LEFT JOIN public.onboarding_data o ON o.user_id = p.user_id
    LEFT JOIN public.schools s ON s.id = o.school_id
    WHERE COALESCE(p.is_vc, false) = false
      AND (is_caller_admin OR o.school_id = caller_school)
      AND (lower(coalesce(p.email,'')) LIKE '%' || q || '%' OR lower(coalesce(p.username,'')) LIKE '%' || q || '%'
        OR lower(coalesce(o.high_school_name,'')) LIKE '%' || q || '%' OR lower(coalesce(s.name,'')) LIKE '%' || q || '%')
    ORDER BY p.created_at DESC LIMIT GREATEST(1, LEAST(_limit, 50))
  ) u;
  RETURN COALESCE(result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fanout_announcement_to_notifications()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _aud TEXT := COALESCE(NEW.target_audience, 'all'); _broadcast_id UUID; _count INT := 0;
BEGIN
  IF NOT NEW.is_active THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = true THEN RETURN NEW; END IF;
  _broadcast_id := NEW.id;
  WITH targets AS (
    SELECT p.user_id FROM public.profiles p LEFT JOIN public.onboarding_data o ON o.user_id = p.user_id
    WHERE COALESCE(p.is_vc, false) = false
      AND CASE _aud WHEN 'onboarded' THEN COALESCE(o.onboarding_completed, false) = true
                    WHEN 'new' THEN COALESCE(o.onboarding_completed, false) = false
                    ELSE true END
  ), inserted AS (
    INSERT INTO public.notifications (user_id, broadcast_id, sender_id, sender_role, title, message)
    SELECT t.user_id, _broadcast_id, NEW.created_by, 'admin', NEW.title, NEW.content
    FROM targets t
    WHERE NOT EXISTS (SELECT 1 FROM public.notifications n WHERE n.broadcast_id = _broadcast_id AND n.user_id = t.user_id)
    RETURNING 1
  )
  SELECT COUNT(*) INTO _count FROM inserted;
  RETURN NEW;
END;
$function$;
