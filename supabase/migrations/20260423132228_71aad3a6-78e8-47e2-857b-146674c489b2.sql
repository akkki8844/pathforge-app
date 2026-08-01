-- 1. Follow-ups table
CREATE TABLE public.counsellor_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  counsellor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  due_date DATE NOT NULL,
  note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.counsellor_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Counsellor manages own followups for linked students"
  ON public.counsellor_followups FOR ALL TO authenticated
  USING (counsellor_id = auth.uid() AND public.teacher_can_view_student(auth.uid(), student_id))
  WITH CHECK (counsellor_id = auth.uid() AND public.teacher_can_view_student(auth.uid(), student_id));

CREATE POLICY "Students view followups about them"
  ON public.counsellor_followups FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Admins view all followups"
  ON public.counsellor_followups FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE INDEX idx_followups_counsellor_due ON public.counsellor_followups(counsellor_id, due_date);
CREATE INDEX idx_followups_student ON public.counsellor_followups(student_id);

CREATE TRIGGER tg_followups_updated
  BEFORE UPDATE ON public.counsellor_followups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Daily focus (counselor-curated)
CREATE TABLE public.counsellor_daily_focus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  counsellor_id UUID NOT NULL,
  focus_date DATE NOT NULL,
  title TEXT NOT NULL,
  related_student_id UUID,
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.counsellor_daily_focus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Counsellor manages own daily focus"
  ON public.counsellor_daily_focus FOR ALL TO authenticated
  USING (counsellor_id = auth.uid())
  WITH CHECK (counsellor_id = auth.uid());

CREATE INDEX idx_focus_counsellor_date ON public.counsellor_daily_focus(counsellor_id, focus_date);

CREATE TRIGGER tg_focus_updated
  BEFORE UPDATE ON public.counsellor_daily_focus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Audience search RPC (counselor-callable; school-scoped for counselors, global for admins)
CREATE OR REPLACE FUNCTION public.search_users_for_broadcast(_query TEXT, _limit INT DEFAULT 20)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  is_caller_admin BOOLEAN;
  caller_school UUID;
  q TEXT := lower(coalesce(trim(_query), ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF length(q) < 1 THEN
    RETURN '[]'::json;
  END IF;

  is_caller_admin := public.is_admin();

  IF NOT is_caller_admin THEN
    -- counselor path: must be verified teacher
    IF NOT public.is_verified_teacher(auth.uid()) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
    caller_school := public.teacher_school_id(auth.uid());
    IF caller_school IS NULL THEN
      RETURN '[]'::json;
    END IF;
  END IF;

  SELECT json_agg(row_to_json(u)) INTO result FROM (
    SELECT
      p.user_id,
      p.email,
      p.username,
      o.grade,
      o.high_school_name,
      s.name AS school_name
    FROM public.profiles p
    LEFT JOIN public.onboarding_data o ON o.user_id = p.user_id
    LEFT JOIN public.schools s ON s.id = o.school_id
    WHERE
      (is_caller_admin OR o.school_id = caller_school)
      AND (
        lower(coalesce(p.email,'')) LIKE '%' || q || '%'
        OR lower(coalesce(p.username,'')) LIKE '%' || q || '%'
        OR lower(coalesce(o.high_school_name,'')) LIKE '%' || q || '%'
        OR lower(coalesce(s.name,'')) LIKE '%' || q || '%'
      )
    ORDER BY p.created_at DESC
    LIMIT GREATEST(1, LEAST(_limit, 50))
  ) u;

  RETURN COALESCE(result, '[]'::json);
END;
$$;