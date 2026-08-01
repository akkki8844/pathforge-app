-- 1) Remove duplicate weak UPDATE policy on counsellor_interactions
DROP POLICY IF EXISTS "counsellor update own interactions" ON public.counsellor_interactions;

-- 2) Allow admins to read suppressed_emails for operational visibility
DROP POLICY IF EXISTS "Admins can view suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Admins can view suppressed emails"
ON public.suppressed_emails
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 3) Allow admins to read email_unsubscribe_tokens for support/troubleshooting
DROP POLICY IF EXISTS "Admins can view unsubscribe tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Admins can view unsubscribe tokens"
ON public.email_unsubscribe_tokens
FOR SELECT
TO authenticated
USING (public.is_admin());