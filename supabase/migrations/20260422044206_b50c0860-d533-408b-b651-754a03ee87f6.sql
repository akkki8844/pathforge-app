-- Extend teacher_profiles with onboarding fields
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS years_experience text,
  ADD COLUMN IF NOT EXISTS specializations text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS countries_expertise text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS grade_levels_taught text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS services_offered text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS curriculum_expertise text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS students_handled_range text,
  ADD COLUMN IF NOT EXISTS school_role text,
  ADD COLUMN IF NOT EXISTS school_website text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Verification requests table
CREATE TABLE IF NOT EXISTS public.teacher_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_user_id uuid NOT NULL,
  school_id uuid,
  proof_type text NOT NULL,
  proof_url text,
  proof_file_path text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher creates own verification request"
  ON public.teacher_verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (teacher_user_id = auth.uid());

CREATE POLICY "Teacher reads own verification requests"
  ON public.teacher_verification_requests FOR SELECT
  TO authenticated
  USING (teacher_user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Teacher updates own pending request"
  ON public.teacher_verification_requests FOR UPDATE
  TO authenticated
  USING (teacher_user_id = auth.uid() AND status = 'pending')
  WITH CHECK (teacher_user_id = auth.uid());

CREATE POLICY "Admins manage verification requests"
  ON public.teacher_verification_requests FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER update_teacher_verification_requests_updated_at
  BEFORE UPDATE ON public.teacher_verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Private storage bucket for verification proof
INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-verification', 'teacher-verification', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Teachers upload own verification files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'teacher-verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Teachers read own verification files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'teacher-verification'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );

CREATE POLICY "Teachers delete own verification files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'teacher-verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );