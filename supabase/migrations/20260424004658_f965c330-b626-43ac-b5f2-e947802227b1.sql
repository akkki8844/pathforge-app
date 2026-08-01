-- Tighten newsletter_subscribers SELECT policy: scope to authenticated role only
-- so anon users can never even attempt to read, regardless of is_admin() behavior.
DROP POLICY IF EXISTS "Admins can view subscribers" ON public.newsletter_subscribers;

CREATE POLICY "Admins can view subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (public.is_admin());