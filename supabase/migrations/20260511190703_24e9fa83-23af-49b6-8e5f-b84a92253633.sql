CREATE TABLE public.profile_extracted_data (
  user_id uuid PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'linkedin',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_extracted_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own extracted profile"
ON public.profile_extracted_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own extracted profile"
ON public.profile_extracted_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own extracted profile"
ON public.profile_extracted_data FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own extracted profile"
ON public.profile_extracted_data FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_profile_extracted_data_updated_at
BEFORE UPDATE ON public.profile_extracted_data
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();