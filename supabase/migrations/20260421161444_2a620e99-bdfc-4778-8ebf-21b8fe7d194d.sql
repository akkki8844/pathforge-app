
-- Schools
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  domain TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_schools_name ON public.schools (LOWER(name));
CREATE INDEX idx_schools_domain ON public.schools (LOWER(domain));

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read schools"
  ON public.schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can suggest a school"
  ON public.schools FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND is_verified = false);
CREATE POLICY "Admins manage schools"
  ON public.schools FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- onboarding_data.school_id
ALTER TABLE public.onboarding_data ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_school ON public.onboarding_data (school_id);

-- Teacher profiles
CREATE TABLE public.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Counselor',
  subject TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_teacher_profiles_school ON public.teacher_profiles (school_id);
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- Classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  grade_level TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_classes_teacher ON public.classes (teacher_id);
CREATE INDEX idx_classes_invite ON public.classes (invite_code);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Class members
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  joined_via TEXT NOT NULL DEFAULT 'invite' CHECK (joined_via IN ('school_auto','invite')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
CREATE INDEX idx_class_members_student ON public.class_members (student_id);
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- Teacher assignments
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('student','class')),
  target_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('activity','project','competition','task')),
  title TEXT NOT NULL,
  instructions TEXT,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assignments_teacher ON public.teacher_assignments (teacher_id);
CREATE INDEX idx_assignments_target ON public.teacher_assignments (target_type, target_id);
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- Assignment progress
CREATE TABLE public.assignment_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.teacher_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','submitted','completed')),
  student_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);
CREATE INDEX idx_progress_student ON public.assignment_progress (student_id);
ALTER TABLE public.assignment_progress ENABLE ROW LEVEL SECURITY;

-- Teacher feedback
CREATE TABLE public.teacher_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('essay','activity','journey','general')),
  subject_ref TEXT,
  body TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_student ON public.teacher_feedback (student_id);
CREATE INDEX idx_feedback_teacher ON public.teacher_feedback (teacher_id);
ALTER TABLE public.teacher_feedback ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_teacher(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'teacher');
$$;

CREATE OR REPLACE FUNCTION public.is_verified_teacher(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teacher_profiles WHERE user_id = _user_id AND verified = true);
$$;

CREATE OR REPLACE FUNCTION public.teacher_school_id(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM public.teacher_profiles WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_view_student(_teacher_uid UUID, _student_uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_verified_teacher(_teacher_uid)
    AND (
      EXISTS (
        SELECT 1 FROM public.teacher_profiles tp
        JOIN public.onboarding_data od ON od.school_id = tp.school_id
        WHERE tp.user_id = _teacher_uid AND od.user_id = _student_uid AND tp.school_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM public.classes c
        JOIN public.class_members cm ON cm.class_id = c.id
        WHERE c.teacher_id = _teacher_uid AND cm.student_id = _student_uid
      )
    );
$$;

-- Policies on new tables
CREATE POLICY "Teacher reads own profile" ON public.teacher_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Teacher inserts own profile" ON public.teacher_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Teacher updates own profile" ON public.teacher_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins manage teacher profiles" ON public.teacher_profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Teacher manages own classes" ON public.classes FOR ALL TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Students read classes they belong to" ON public.classes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.class_members WHERE class_id = classes.id AND student_id = auth.uid()));
CREATE POLICY "Admins manage classes" ON public.classes FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Teacher manages members of own classes" ON public.class_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes WHERE id = class_members.class_id AND teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.classes WHERE id = class_members.class_id AND teacher_id = auth.uid()));
CREATE POLICY "Students read own membership" ON public.class_members FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "Students join via invite" ON public.class_members FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teacher manages own assignments" ON public.teacher_assignments FOR ALL TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Students read assignments addressed to them" ON public.teacher_assignments FOR SELECT TO authenticated
  USING (
    (target_type = 'student' AND target_id = auth.uid())
    OR (target_type = 'class' AND EXISTS (SELECT 1 FROM public.class_members WHERE class_id = teacher_assignments.target_id AND student_id = auth.uid()))
  );

CREATE POLICY "Student manages own progress" ON public.assignment_progress FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Teacher reads progress of own assignments" ON public.assignment_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teacher_assignments WHERE id = assignment_progress.assignment_id AND teacher_id = auth.uid()));

CREATE POLICY "Teacher manages own feedback" ON public.teacher_feedback FOR ALL TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Student reads feedback for them" ON public.teacher_feedback FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Teacher-read policies on existing student data tables
CREATE POLICY "Verified teachers read linked student onboarding"
  ON public.onboarding_data FOR SELECT TO authenticated
  USING (public.teacher_can_view_student(auth.uid(), user_id));
CREATE POLICY "Verified teachers read linked student journey"
  ON public.journey_scores FOR SELECT TO authenticated
  USING (public.teacher_can_view_student(auth.uid(), user_id));
CREATE POLICY "Verified teachers read linked student outcomes"
  ON public.outcomes_data FOR SELECT TO authenticated
  USING (public.teacher_can_view_student(auth.uid(), user_id));
CREATE POLICY "Verified teachers read linked student application entries"
  ON public.application_entries FOR SELECT TO authenticated
  USING (public.teacher_can_view_student(auth.uid(), user_id));
CREATE POLICY "Verified teachers read linked student readiness analyses"
  ON public.readiness_analyses FOR SELECT TO authenticated
  USING (public.teacher_can_view_student(auth.uid(), user_id));
CREATE POLICY "Verified teachers read linked student admissions data"
  ON public.admissions_data FOR SELECT TO authenticated
  USING (public.teacher_can_view_student(auth.uid(), user_id));
CREATE POLICY "Verified teachers read linked student profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.teacher_can_view_student(auth.uid(), user_id));

-- Triggers for updated_at
CREATE TRIGGER trg_schools_updated BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_teacher_profiles_updated BEFORE UPDATE ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_classes_updated BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON public.teacher_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_feedback_updated BEFORE UPDATE ON public.teacher_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
