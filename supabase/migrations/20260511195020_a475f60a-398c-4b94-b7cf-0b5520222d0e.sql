ALTER TABLE public.outcomes_data
ADD COLUMN IF NOT EXISTS service_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS internships JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS research_outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS creative_works JSONB NOT NULL DEFAULT '[]'::jsonb;