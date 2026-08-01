ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

COMMENT ON COLUMN public.profiles.full_name IS 'User full name collected at onboarding or via backfill prompt.';