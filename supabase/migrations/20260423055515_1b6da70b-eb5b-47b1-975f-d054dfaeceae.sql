-- Counsellor roadmaps: per-student strategy plans authored by counsellors
CREATE TABLE IF NOT EXISTS public.counsellor_roadmaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  counsellor_id UUID NOT NULL,
  student_id UUID NOT NULL,
  monthly_focus TEXT,
  long_term_plan TEXT,
  focus_areas TEXT[] DEFAULT '{}'::text[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (counsellor_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_counsellor_roadmaps_student ON public.counsellor_roadmaps(student_id);
CREATE INDEX IF NOT EXISTS idx_counsellor_roadmaps_counsellor ON public.counsellor_roadmaps(counsellor_id);

ALTER TABLE public.counsellor_roadmaps ENABLE ROW LEVEL SECURITY;

-- Counsellor full access for their own authored roadmaps, only for linked students
CREATE POLICY "Counsellor manages own roadmaps for linked students"
ON public.counsellor_roadmaps
FOR ALL
TO authenticated
USING (
  counsellor_id = auth.uid()
  AND public.teacher_can_view_student(auth.uid(), student_id)
)
WITH CHECK (
  counsellor_id = auth.uid()
  AND public.teacher_can_view_student(auth.uid(), student_id)
);

-- Students can read their own roadmap
CREATE POLICY "Student reads own roadmap"
ON public.counsellor_roadmaps
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins view all roadmaps"
ON public.counsellor_roadmaps
FOR SELECT
TO authenticated
USING (public.is_admin());

-- updated_at trigger
DROP TRIGGER IF EXISTS update_counsellor_roadmaps_updated_at ON public.counsellor_roadmaps;
CREATE TRIGGER update_counsellor_roadmaps_updated_at
BEFORE UPDATE ON public.counsellor_roadmaps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();