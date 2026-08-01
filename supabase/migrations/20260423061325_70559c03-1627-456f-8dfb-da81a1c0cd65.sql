-- College application strategy tracker per (counsellor, student, college)
CREATE TABLE public.counsellor_app_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counsellor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  college_name TEXT NOT NULL,
  fit_tier TEXT NOT NULL DEFAULT 'match' CHECK (fit_tier IN ('reach','match','safety')),
  stage TEXT NOT NULL DEFAULT 'researching' CHECK (stage IN ('researching','planning','drafting','submitted','admitted','rejected','waitlisted','withdrawn')),
  strategy_notes TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (counsellor_id, student_id, college_name)
);

ALTER TABLE public.counsellor_app_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Counsellor manages strategies for linked students"
ON public.counsellor_app_strategies FOR ALL TO authenticated
USING (counsellor_id = auth.uid() AND public.teacher_can_view_student(auth.uid(), student_id))
WITH CHECK (counsellor_id = auth.uid() AND public.teacher_can_view_student(auth.uid(), student_id));

CREATE POLICY "Student reads own strategies"
ON public.counsellor_app_strategies FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Admins view all strategies"
ON public.counsellor_app_strategies FOR SELECT TO authenticated
USING (public.is_admin());

CREATE TRIGGER update_counsellor_app_strategies_updated_at
BEFORE UPDATE ON public.counsellor_app_strategies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_counsellor_app_strategies_lookup
ON public.counsellor_app_strategies (counsellor_id, student_id);