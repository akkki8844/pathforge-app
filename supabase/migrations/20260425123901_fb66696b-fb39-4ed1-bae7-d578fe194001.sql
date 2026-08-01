-- Drop the weaker policies that only check counsellor_id ownership
DROP POLICY IF EXISTS "counsellor update own overrides" ON public.counsellor_overrides;
DROP POLICY IF EXISTS "counsellor delete own overrides" ON public.counsellor_overrides;