
-- Journey scores table for multi-category progress tracking
CREATE TABLE public.journey_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  journey_started BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE,
  
  -- Multi-category scores (0-100 each)
  academics_score INTEGER NOT NULL DEFAULT 0,
  activities_score INTEGER NOT NULL DEFAULT 0,
  leadership_score INTEGER NOT NULL DEFAULT 0,
  competitions_score INTEGER NOT NULL DEFAULT 0,
  test_prep_score INTEGER NOT NULL DEFAULT 0,
  
  -- Overall composite score
  overall_score INTEGER NOT NULL DEFAULT 0,
  
  -- Roadmap data (generated plan stored as JSON)
  roadmap JSONB DEFAULT '{}',
  
  -- Completed milestones tracking
  completed_milestones JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_journey UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.journey_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_scores FORCE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own journey"
  ON public.journey_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journey"
  ON public.journey_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journey"
  ON public.journey_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_journey_scores_updated_at
  BEFORE UPDATE ON public.journey_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
