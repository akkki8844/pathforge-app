-- Proof submissions table
CREATE TABLE public.proof_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  task_title TEXT NOT NULL,
  task_context TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ai_confidence NUMERIC,
  ai_reasoning TEXT,
  ai_extracted_text TEXT,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT proof_status_check CHECK (status IN ('pending','verifying','approved','rejected','needs_review'))
);

CREATE INDEX idx_proof_user_task ON public.proof_submissions(user_id, task_id);
CREATE INDEX idx_proof_status ON public.proof_submissions(status) WHERE status = 'needs_review';

ALTER TABLE public.proof_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own proof submissions"
  ON public.proof_submissions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users insert own proof submissions"
  ON public.proof_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own proof submissions"
  ON public.proof_submissions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins update proof submissions"
  ON public.proof_submissions FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Service role full access proof"
  ON public.proof_submissions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_proof_updated
  BEFORE UPDATE ON public.proof_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proof-uploads',
  'proof-uploads',
  false,
  10485760,
  ARRAY['image/png','image/jpeg','image/jpg','image/webp','application/pdf']
);

CREATE POLICY "Users upload own proof files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'proof-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own proof files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'proof-uploads'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );

CREATE POLICY "Users delete own proof files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'proof-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );