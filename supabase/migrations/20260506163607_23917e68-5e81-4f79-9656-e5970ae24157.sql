-- 1. Lock down credit RPCs to service_role only
REVOKE EXECUTE ON FUNCTION public.apply_subscription_credits(uuid, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_subscription_credits(uuid, text, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_credits(uuid, text, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.revert_to_free_plan(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revert_to_free_plan(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revert_to_free_plan(uuid) TO service_role;

-- 2. Platform settings: allow read for client-side flag evaluation (only non-sensitive flags exist)
DROP POLICY IF EXISTS "Authenticated users can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can read platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated, anon
USING (true);

-- 3. Feature flags: allow everyone to read enabled flags
DROP POLICY IF EXISTS "Anyone can read enabled feature flags" ON public.feature_flags;
CREATE POLICY "Anyone can read enabled feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated, anon
USING (is_enabled = true);
