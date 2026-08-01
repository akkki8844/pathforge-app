CREATE OR REPLACE FUNCTION public.send_notification_broadcast(_title text, _message text, _audience_type text, _audience_school_id uuid DEFAULT NULL::uuid, _audience_grade text DEFAULT NULL::text, _audience_user_ids uuid[] DEFAULT NULL::uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Counsellors: restrict to their own school
  IF _is_counsellor AND NOT _is_admin THEN
    _counsellor_school := public.teacher_school_id(_sender);
    IF _counsellor_school IS NULL THEN
      RAISE EXCEPTION 'Counsellor is not linked to a school';
    END IF;

    -- For counsellors, 'all' means all students at their school
    IF _audience_type = 'all' THEN
      _audience_type := 'school';
      _audience_school_id := _counsellor_school;
    ELSIF _audience_type = 'school' THEN
      _audience_school_id := _counsellor_school;
    ELSIF _audience_type = 'grade' THEN
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
$function$;