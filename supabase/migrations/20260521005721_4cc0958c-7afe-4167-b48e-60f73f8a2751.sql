
-- 1) Personalized journey roadmap cache
CREATE TABLE IF NOT EXISTS public.journey_personalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  major text NOT NULL,
  country text,
  curriculum text,
  grade text,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, major)
);

ALTER TABLE public.journey_personalizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own journey personalization"
  ON public.journey_personalizations;
CREATE POLICY "Users manage own journey personalization"
ON public.journey_personalizations
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_journey_personalizations_user
  ON public.journey_personalizations (user_id);

-- 2) Proof submissions: support link-only + note
ALTER TABLE public.proof_submissions
  ADD COLUMN IF NOT EXISTS proof_url  text,
  ADD COLUMN IF NOT EXISTS proof_note text,
  ALTER COLUMN file_path DROP NOT NULL,
  ALTER COLUMN file_type DROP NOT NULL;

ALTER TABLE public.proof_submissions
  DROP CONSTRAINT IF EXISTS proof_submissions_has_evidence;
ALTER TABLE public.proof_submissions
  ADD CONSTRAINT proof_submissions_has_evidence
  CHECK (file_path IS NOT NULL OR proof_url IS NOT NULL);

-- 3) Reset retired majors
UPDATE public.onboarding_data
SET intended_major = 'Undecided'
WHERE intended_major IN (
  'Accounting','Agricultural Science','Cognitive Science','Criminology',
  'Digital Media','Ecology','Industrial Design','International Business',
  'Materials Science','Music','Philosophy','Physical Therapy',
  'Sports Management','Theater/Drama','Veterinary Science'
);

UPDATE public.readiness_analyses
SET intended_major = NULL
WHERE intended_major IN (
  'Accounting','Agricultural Science','Cognitive Science','Criminology',
  'Digital Media','Ecology','Industrial Design','International Business',
  'Materials Science','Music','Philosophy','Physical Therapy',
  'Sports Management','Theater/Drama','Veterinary Science'
);
