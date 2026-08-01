CREATE TABLE public.user_google_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scope TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  google_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own google token"
ON public.user_google_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own google token"
ON public.user_google_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own google token"
ON public.user_google_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own google token"
ON public.user_google_tokens FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_google_tokens_updated_at
BEFORE UPDATE ON public.user_google_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();