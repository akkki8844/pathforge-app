-- ─────────────────────────────────────────────────────────────
-- 1. SCHOOL DEDUPLICATION
-- ─────────────────────────────────────────────────────────────

-- Normalize whitespace in all school names first
UPDATE public.schools
SET name = regexp_replace(trim(name), '\s+', ' ', 'g'),
    updated_at = now()
WHERE name IS DISTINCT FROM regexp_replace(trim(name), '\s+', ' ', 'g');

-- Canonical Indus school
DO $$
DECLARE
  canonical_id uuid := '9faf5e39-7aac-4583-a28f-61d7bf9d5627';
  duplicate_ids uuid[] := ARRAY[
    'd38038b4-5a5d-4102-8537-581567c26176'::uuid, -- "Indus"
    'bf7d6826-f710-48bb-9e69-29f03a079cdf'::uuid  -- "Indus International School Pune"
  ];
BEGIN
  -- Only proceed if canonical exists
  IF EXISTS (SELECT 1 FROM public.schools WHERE id = canonical_id) THEN
    -- Standardize canonical name
    UPDATE public.schools
    SET name = 'Indus International School, Pune',
        city = COALESCE(city, 'Pune'),
        country = COALESCE(country, 'India'),
        is_verified = true,
        updated_at = now()
    WHERE id = canonical_id;

    -- Remap students
    UPDATE public.onboarding_data
    SET school_id = canonical_id, updated_at = now()
    WHERE school_id = ANY(duplicate_ids);

    -- Remap counsellors
    UPDATE public.teacher_profiles
    SET school_id = canonical_id, updated_at = now()
    WHERE school_id = ANY(duplicate_ids);

    -- Remap classes
    UPDATE public.classes
    SET school_id = canonical_id, updated_at = now()
    WHERE school_id = ANY(duplicate_ids);

    -- Remap teacher verification requests
    UPDATE public.teacher_verification_requests
    SET school_id = canonical_id, updated_at = now()
    WHERE school_id = ANY(duplicate_ids);

    -- Remap notification broadcasts
    UPDATE public.notification_broadcasts
    SET audience_school_id = canonical_id
    WHERE audience_school_id = ANY(duplicate_ids);

    -- Delete the duplicates
    DELETE FROM public.schools WHERE id = ANY(duplicate_ids);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. INVALID USER CLEANUP
-- Delete profiles with no email and no role (orphaned)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  orphan_id uuid;
BEGIN
  FOR orphan_id IN
    SELECT p.user_id
    FROM public.profiles p
    WHERE (p.email IS NULL OR trim(p.email) = '')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id)
  LOOP
    DELETE FROM public.admissions_data WHERE user_id = orphan_id;
    DELETE FROM public.application_entries WHERE user_id = orphan_id;
    DELETE FROM public.full_applications WHERE user_id = orphan_id;
    DELETE FROM public.outcomes_data WHERE user_id = orphan_id;
    DELETE FROM public.readiness_analyses WHERE user_id = orphan_id;
    DELETE FROM public.journey_scores WHERE user_id = orphan_id;
    DELETE FROM public.voice_advisor_sessions WHERE user_id = orphan_id;
    DELETE FROM public.ai_usage_logs WHERE user_id = orphan_id;
    DELETE FROM public.micro_question_responses WHERE user_id = orphan_id;
    DELETE FROM public.proof_submissions WHERE user_id = orphan_id;
    DELETE FROM public.coupon_redemptions WHERE user_id = orphan_id;
    DELETE FROM public.credit_adjustments WHERE target_user_id = orphan_id;
    DELETE FROM public.user_credits WHERE user_id = orphan_id;
    DELETE FROM public.user_activity_logs WHERE user_id = orphan_id;
    DELETE FROM public.user_flags WHERE user_id = orphan_id;
    DELETE FROM public.admin_feedback WHERE user_id = orphan_id;
    DELETE FROM public.assignment_progress WHERE student_id = orphan_id;
    DELETE FROM public.class_members WHERE student_id = orphan_id;
    DELETE FROM public.notifications WHERE user_id = orphan_id;
    DELETE FROM public.credit_gifts WHERE user_id = orphan_id;
    DELETE FROM public.guest_sessions WHERE guest_user_id = orphan_id;
    DELETE FROM public.onboarding_data WHERE user_id = orphan_id;
    DELETE FROM public.profiles WHERE user_id = orphan_id;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. TIGHTEN BROADCAST FUNCTION FOR COUNSELLORS
-- Counsellors: only 'grade' or 'users' (within their school)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_notification_broadcast(
  _title text,
  _message text,
  _audience_type text,
  _audience_school_id uuid DEFAULT NULL,
  _audience_grade text DEFAULT NULL,
  _audience_user_ids uuid[] DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender uuid := auth.uid();
  _is_admin boolean := public.is_admin();
  _is_counsellor boolean := public.is_verified_teacher(_sender);
  _sender_role text;
  _broadcast_id uuid;
  _counsellor_school uuid;
  _count integer := 0;
BEGIN
  IF _sender IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (_is_admin OR _is_counsellor) THEN
    RAISE EXCEPTION 'Access denied: must be admin or verified counsellor';
  END IF;

  _sender_role := CASE WHEN _is_admin THEN 'admin' ELSE 'counsellor' END;

  IF length(trim(_title)) = 0 OR length(trim(_message)) = 0 THEN
    RAISE EXCEPTION 'Title and message are required';
  END IF;

  IF _audience_type NOT IN ('all','school','grade','users') THEN
    RAISE EXCEPTION 'Invalid audience type';
  END IF;

  -- Counsellors: restrict to grade/users within their school
  IF _is_counsellor AND NOT _is_admin THEN
    _counsellor_school := public.teacher_school_id(_sender);
    IF _counsellor_school IS NULL THEN
      RAISE EXCEPTION 'Counsellor is not linked to a school';
    END IF;

    -- Block all-school and all-users targeting
    IF _audience_type IN ('all','school') THEN
      RAISE EXCEPTION 'Counsellors can only send by grade or to specific users within their school';
    END IF;

    -- Force scope to counsellor's school
    IF _audience_type = 'grade' THEN
      _audience_school_id := _counsellor_school;
    END IF;
  END IF;

  INSERT INTO public.notification_broadcasts(
    sender_id, sender_role, title, message,
    audience_type, audience_school_id, audience_grade, audience_user_ids
  ) VALUES (
    _sender, _sender_role, _title, _message,
    _audience_type, _audience_school_id, _audience_grade, _audience_user_ids
  ) RETURNING id INTO _broadcast_id;

  IF _audience_type = 'all' THEN
    INSERT INTO public.notifications(user_id, broadcast_id, sender_id, sender_role, title, message)
    SELECT p.user_id, _broadcast_id, _sender, _sender_role, _title, _message
    FROM public.profiles p;
  ELSIF _audience_type = 'school' THEN
    INSERT INTO public.notifications(user_id, broadcast_id, sender_id, sender_role, title, message)
    SELECT DISTINCT od.user_id, _broadcast_id, _sender, _sender_role, _title, _message
    FROM public.onboarding_data od
    WHERE od.school_id = _audience_school_id;
  ELSIF _audience_type = 'grade' THEN
    INSERT INTO public.notifications(user_id, broadcast_id, sender_id, sender_role, title, message)
    SELECT DISTINCT od.user_id, _broadcast_id, _sender, _sender_role, _title, _message
    FROM public.onboarding_data od
    WHERE od.grade = _audience_grade
      AND (_audience_school_id IS NULL OR od.school_id = _audience_school_id);
  ELSIF _audience_type = 'users' THEN
    IF _audience_user_ids IS NULL OR array_length(_audience_user_ids,1) IS NULL THEN
      RAISE EXCEPTION 'No users selected';
    END IF;
    INSERT INTO public.notifications(user_id, broadcast_id, sender_id, sender_role, title, message)
    SELECT uid, _broadcast_id, _sender, _sender_role, _title, _message
    FROM unnest(_audience_user_ids) AS uid
    WHERE NOT _is_counsellor OR _is_admin OR EXISTS (
      SELECT 1 FROM public.onboarding_data od
      WHERE od.user_id = uid AND od.school_id = _counsellor_school
    );
  END IF;

  GET DIAGNOSTICS _count = ROW_COUNT;

  UPDATE public.notification_broadcasts
  SET recipient_count = _count
  WHERE id = _broadcast_id;

  RETURN json_build_object('broadcast_id', _broadcast_id, 'recipient_count', _count);
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. FELLOW COUNSELLORS WIDGET RPC
-- Returns other verified counsellors at the caller's school
-- ─────────────────────────────────────────────────────────────
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
      p.username,
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