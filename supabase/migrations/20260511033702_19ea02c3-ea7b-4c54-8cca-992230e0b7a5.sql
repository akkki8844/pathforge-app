CREATE TABLE public.linkedin_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  linkedin_url TEXT NOT NULL,
  profile_text TEXT NOT NULL,
  grow_plan JSONB,
  grow_plan_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.linkedin_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own linkedin import"
ON public.linkedin_imports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own linkedin import"
ON public.linkedin_imports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own linkedin import"
ON public.linkedin_imports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own linkedin import"
ON public.linkedin_imports FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_linkedin_imports_updated_at
BEFORE UPDATE ON public.linkedin_imports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();