-- ============================================
-- DATABASE TABLES FOR DATA PERSISTENCE
-- ============================================

-- 1. OUTCOMES DATA: Store courses, projects, leadership roles, competitions
CREATE TABLE public.outcomes_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  grade_level TEXT NOT NULL DEFAULT '11',
  target_tier TEXT NOT NULL DEFAULT 'top-20',
  test_type TEXT DEFAULT 'none',
  test_score TEXT DEFAULT '',
  courses JSONB DEFAULT '[]'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  leadership_roles JSONB DEFAULT '[]'::jsonb,
  competitions JSONB DEFAULT '[]'::jsonb,
  task_states JSONB DEFAULT '{}'::jsonb,
  follow_pathforge BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on outcomes_data
ALTER TABLE public.outcomes_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outcomes_data
CREATE POLICY "Users can view their own outcomes data"
  ON public.outcomes_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outcomes data"
  ON public.outcomes_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outcomes data"
  ON public.outcomes_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outcomes data"
  ON public.outcomes_data FOR DELETE
  USING (auth.uid() = user_id);

-- 2. READINESS ANALYSES: Store each analysis run
CREATE TABLE public.readiness_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  sequence_number INTEGER NOT NULL DEFAULT 1,
  intended_major TEXT NOT NULL,
  target_universities TEXT,
  short_term_goals TEXT,
  report_card_text TEXT,
  analysis_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on readiness_analyses
ALTER TABLE public.readiness_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for readiness_analyses
CREATE POLICY "Users can view their own readiness analyses"
  ON public.readiness_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own readiness analyses"
  ON public.readiness_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own readiness analyses"
  ON public.readiness_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- 3. APPLICATION BUILDER DATA: Store refined application content
CREATE TABLE public.application_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section_id TEXT NOT NULL,
  input_text TEXT NOT NULL,
  refined_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, section_id)
);

-- Enable RLS on application_entries
ALTER TABLE public.application_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for application_entries
CREATE POLICY "Users can view their own application entries"
  ON public.application_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own application entries"
  ON public.application_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own application entries"
  ON public.application_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own application entries"
  ON public.application_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at on outcomes_data
CREATE TRIGGER update_outcomes_data_updated_at
  BEFORE UPDATE ON public.outcomes_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on application_entries
CREATE TRIGGER update_application_entries_updated_at
  BEFORE UPDATE ON public.application_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();