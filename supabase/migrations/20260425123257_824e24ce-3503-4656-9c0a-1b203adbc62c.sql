-- Add a restrictive INSERT policy so only service_role can insert into email_send_log.
-- Restrictive policies AND with permissive ones, blocking authenticated users
-- from poisoning the log even if a future permissive INSERT policy is added.
CREATE POLICY "Restrict inserts to service role"
ON public.email_send_log
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');