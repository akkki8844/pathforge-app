CREATE TABLE public.google_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes')
);

ALTER TABLE public.google_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own oauth state"
ON public.google_oauth_states FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own oauth state"
ON public.google_oauth_states FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own oauth state"
ON public.google_oauth_states FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_google_oauth_states_expires_at ON public.google_oauth_states(expires_at);