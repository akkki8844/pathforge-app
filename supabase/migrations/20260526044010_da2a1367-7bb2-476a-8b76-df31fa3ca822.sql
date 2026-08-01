-- Revoke column-level SELECT for sensitive fields from end users.
-- Admins query via service role / SECURITY DEFINER and are unaffected.

REVOKE SELECT (ip_address, user_agent) ON public.user_activity_logs FROM authenticated, anon;

REVOKE SELECT (referred_email) ON public.referrals FROM authenticated, anon;