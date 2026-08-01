-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_id UUID,
  source TEXT DEFAULT 'dashboard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone (incl anon) can subscribe with their email
CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_subscribers
  FOR INSERT
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can view subscribers"
  ON public.newsletter_subscribers
  FOR SELECT
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(email);

-- Full application generations
CREATE TABLE IF NOT EXISTS public.full_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  university TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.full_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own applications"
  ON public.full_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own applications"
  ON public.full_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own applications"
  ON public.full_applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own applications"
  ON public.full_applications FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_full_applications_updated_at
  BEFORE UPDATE ON public.full_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();