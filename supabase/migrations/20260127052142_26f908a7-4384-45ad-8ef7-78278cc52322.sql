-- Enable FORCE ROW LEVEL SECURITY on all tables
-- This ensures RLS is applied even for service role access, preventing bypasses
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_data FORCE ROW LEVEL SECURITY;
ALTER TABLE public.guest_sessions FORCE ROW LEVEL SECURITY;