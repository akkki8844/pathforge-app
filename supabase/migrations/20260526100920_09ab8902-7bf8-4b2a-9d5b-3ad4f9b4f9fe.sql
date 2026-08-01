
-- Prevent privilege escalation: users must not be able to flip is_vc or email_verified_at on their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_vc IS NOT DISTINCT FROM (SELECT p.is_vc FROM public.profiles p WHERE p.user_id = auth.uid())
  AND email_verified_at IS NOT DISTINCT FROM (SELECT p.email_verified_at FROM public.profiles p WHERE p.user_id = auth.uid())
);
