
-- Table to persist admissions form data and analysis results
CREATE TABLE public.admissions_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Analysis',
  sequence_number INTEGER NOT NULL DEFAULT 1,
  -- Form inputs
  gpa TEXT,
  curriculum TEXT,
  sat_score TEXT,
  sat_taken BOOLEAN DEFAULT true,
  act_score TEXT,
  act_taken BOOLEAN DEFAULT false,
  ap_scores TEXT,
  ap_course_count TEXT,
  honors_course_count TEXT,
  class_rank TEXT,
  class_size TEXT,
  extracurricular_level TEXT,
  extracurricular_details TEXT,
  -- Results
  analysis_results JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admissions_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own admissions data"
  ON public.admissions_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own admissions data"
  ON public.admissions_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own admissions data"
  ON public.admissions_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own admissions data"
  ON public.admissions_data FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_admissions_data_updated_at
  BEFORE UPDATE ON public.admissions_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
