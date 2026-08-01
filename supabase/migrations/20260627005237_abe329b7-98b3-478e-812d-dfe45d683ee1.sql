
-- Pinning + projects for advisor conversations
ALTER TABLE public.voice_advisor_sessions
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS project_id UUID;

CREATE TABLE IF NOT EXISTS public.advisor_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_projects TO authenticated;
GRANT ALL ON public.advisor_projects TO service_role;

ALTER TABLE public.advisor_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own advisor projects"
  ON public.advisor_projects FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_advisor_projects_user ON public.advisor_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_vas_project ON public.voice_advisor_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_vas_pinned ON public.voice_advisor_sessions(user_id, pinned) WHERE pinned = true;
