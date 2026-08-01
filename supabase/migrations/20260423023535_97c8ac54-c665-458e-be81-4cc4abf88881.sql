
-- =====================================================
-- NOTIFICATIONS SYSTEM
-- =====================================================

-- Broadcasts (one record per send action)
CREATE TABLE public.notification_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('admin','counsellor')),
  title text NOT NULL,
  message text NOT NULL,
  audience_type text NOT NULL CHECK (audience_type IN ('all','school','grade','users')),
  audience_school_id uuid,
  audience_grade text,
  audience_user_ids uuid[],
  recipient_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage broadcasts"
  ON public.notification_broadcasts FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Senders view own broadcasts"
  ON public.notification_broadcasts FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

-- Per-recipient notifications (fan-out)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  broadcast_id uuid REFERENCES public.notification_broadcasts(id) ON DELETE CASCADE,
  sender_id uuid,
  sender_role text,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Service role full access notifications"
  ON public.notifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- =====================================================
-- BROADCAST FUNCTION
-- =====================================================
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

  -- Counsellors are restricted to their own school
  IF _is_counsellor AND NOT _is_admin THEN
    _counsellor_school := public.teacher_school_id(_sender);
    IF _counsellor_school IS NULL THEN
      RAISE EXCEPTION 'Counsellor is not linked to a school';
    END IF;
    -- Force school scoping
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
    WHERE od.school_id = _audience_school_id
      AND (NOT _is_counsellor OR _is_admin OR od.school_id = _counsellor_school);
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

  RETURN json_build_object(
    'success', true,
    'broadcast_id', _broadcast_id,
    'recipient_count', _count
  );
END;
$$;

-- =====================================================
-- USER-FACING HELPERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _affected integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
  GET DIAGNOSTICS _affected = ROW_COUNT;
  RETURN _affected;
END;
$$;
