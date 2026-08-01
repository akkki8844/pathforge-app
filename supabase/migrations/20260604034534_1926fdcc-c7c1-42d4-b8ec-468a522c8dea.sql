
CREATE TABLE public.brag_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Brag Sheet',
  intended_major TEXT,
  career_goals TEXT,
  top_accomplishments TEXT,
  challenges_overcome TEXT,
  character_traits TEXT,
  anecdotes TEXT,
  leadership_examples TEXT,
  community_impact TEXT,
  why_this_recommender TEXT,
  extra_context TEXT,
  last_pdf_artifact_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brag_sheets TO authenticated;
GRANT ALL ON public.brag_sheets TO service_role;

ALTER TABLE public.brag_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own brag sheets" ON public.brag_sheets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX brag_sheets_user_idx ON public.brag_sheets(user_id, created_at DESC);

CREATE TRIGGER update_brag_sheets_updated_at
  BEFORE UPDATE ON public.brag_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
