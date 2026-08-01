-- Add new columns for enhanced onboarding survey
ALTER TABLE public.onboarding_data 
ADD COLUMN IF NOT EXISTS weekly_hours_available text,
ADD COLUMN IF NOT EXISTS preferred_work_types text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS biggest_constraint text,
ADD COLUMN IF NOT EXISTS major_confidence integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS open_to_adjacent_majors boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS major_reason text,
ADD COLUMN IF NOT EXISTS primary_motivation text,
ADD COLUMN IF NOT EXISTS biggest_fear text,
ADD COLUMN IF NOT EXISTS gpa_range text;

-- Create table for progressive micro-questions responses
CREATE TABLE IF NOT EXISTS public.micro_question_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_key TEXT NOT NULL,
  response TEXT NOT NULL,
  context_type TEXT,
  context_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on micro_question_responses
ALTER TABLE public.micro_question_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for micro_question_responses
CREATE POLICY "Users can view their own micro-question responses"
ON public.micro_question_responses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own micro-question responses"
ON public.micro_question_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create table for voice advisor conversation history
CREATE TABLE IF NOT EXISTS public.voice_advisor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transcript TEXT NOT NULL,
  advisor_response TEXT NOT NULL,
  topics_discussed TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on voice_advisor_sessions
ALTER TABLE public.voice_advisor_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_advisor_sessions
CREATE POLICY "Users can view their own voice sessions"
ON public.voice_advisor_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice sessions"
ON public.voice_advisor_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);