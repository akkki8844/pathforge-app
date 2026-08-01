ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_token text,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_confirmation_token
  ON public.newsletter_subscribers (confirmation_token)
  WHERE confirmation_token IS NOT NULL;

-- Backfill: treat all existing subscribers as confirmed (they were inserted under the prior policy).
UPDATE public.newsletter_subscribers SET confirmed_at = COALESCE(confirmed_at, created_at) WHERE confirmed_at IS NULL;