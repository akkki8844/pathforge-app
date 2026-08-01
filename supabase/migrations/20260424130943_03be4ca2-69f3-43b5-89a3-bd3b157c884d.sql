
-- 1. Private counsellor notes about a student
CREATE TABLE IF NOT EXISTS public.counsellor_student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counsellor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_csn_counsellor ON public.counsellor_student_notes(counsellor_id);
CREATE INDEX IF NOT EXISTS idx_csn_student ON public.counsellor_student_notes(student_id);

ALTER TABLE public.counsellor_student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "counsellor select own notes"
  ON public.counsellor_student_notes FOR SELECT
  USING (
    auth.uid() = counsellor_id
    AND public.teacher_can_view_student(auth.uid(), student_id)
  );

CREATE POLICY "admin select all notes"
  ON public.counsellor_student_notes FOR SELECT
  USING (public.is_admin());

CREATE POLICY "counsellor insert own notes"
  ON public.counsellor_student_notes FOR INSERT
  WITH CHECK (
    auth.uid() = counsellor_id
    AND public.teacher_can_view_student(auth.uid(), student_id)
  );

CREATE POLICY "counsellor update own notes"
  ON public.counsellor_student_notes FOR UPDATE
  USING (auth.uid() = counsellor_id);

CREATE POLICY "counsellor delete own notes"
  ON public.counsellor_student_notes FOR DELETE
  USING (auth.uid() = counsellor_id);

CREATE TRIGGER update_csn_updated_at
  BEFORE UPDATE ON public.counsellor_student_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Counsellor <-> student interactions / contact log
CREATE TABLE IF NOT EXISTS public.counsellor_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counsellor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'note',
  summary TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ci_counsellor ON public.counsellor_interactions(counsellor_id);
CREATE INDEX IF NOT EXISTS idx_ci_student ON public.counsellor_interactions(student_id);
CREATE INDEX IF NOT EXISTS idx_ci_occurred ON public.counsellor_interactions(occurred_at DESC);

ALTER TABLE public.counsellor_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "counsellor select own interactions"
  ON public.counsellor_interactions FOR SELECT
  USING (
    auth.uid() = counsellor_id
    AND public.teacher_can_view_student(auth.uid(), student_id)
  );

CREATE POLICY "admin select all interactions"
  ON public.counsellor_interactions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "counsellor insert own interactions"
  ON public.counsellor_interactions FOR INSERT
  WITH CHECK (
    auth.uid() = counsellor_id
    AND public.teacher_can_view_student(auth.uid(), student_id)
  );

CREATE POLICY "counsellor update own interactions"
  ON public.counsellor_interactions FOR UPDATE
  USING (auth.uid() = counsellor_id);

CREATE POLICY "counsellor delete own interactions"
  ON public.counsellor_interactions FOR DELETE
  USING (auth.uid() = counsellor_id);

-- 3. Counsellor overrides on AI recommendations (visible to student)
CREATE TABLE IF NOT EXISTS public.counsellor_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counsellor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  override_type TEXT NOT NULL DEFAULT 'roadmap',
  title TEXT NOT NULL,
  body TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_co_counsellor ON public.counsellor_overrides(counsellor_id);
CREATE INDEX IF NOT EXISTS idx_co_student ON public.counsellor_overrides(student_id);

ALTER TABLE public.counsellor_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "counsellor select own overrides"
  ON public.counsellor_overrides FOR SELECT
  USING (
    auth.uid() = counsellor_id
    AND public.teacher_can_view_student(auth.uid(), student_id)
  );

CREATE POLICY "student select own overrides"
  ON public.counsellor_overrides FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "admin select all overrides"
  ON public.counsellor_overrides FOR SELECT
  USING (public.is_admin());

CREATE POLICY "counsellor insert own overrides"
  ON public.counsellor_overrides FOR INSERT
  WITH CHECK (
    auth.uid() = counsellor_id
    AND public.teacher_can_view_student(auth.uid(), student_id)
  );

CREATE POLICY "counsellor update own overrides"
  ON public.counsellor_overrides FOR UPDATE
  USING (auth.uid() = counsellor_id);

CREATE POLICY "counsellor delete own overrides"
  ON public.counsellor_overrides FOR DELETE
  USING (auth.uid() = counsellor_id);

CREATE TRIGGER update_co_updated_at
  BEFORE UPDATE ON public.counsellor_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
