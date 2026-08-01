ALTER TABLE public.recommenders
  ADD COLUMN IF NOT EXISTS strength TEXT CHECK (strength IN ('weak','average','strong')),
  ADD COLUMN IF NOT EXISTS strength_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS strength_analyzed_at TIMESTAMPTZ;