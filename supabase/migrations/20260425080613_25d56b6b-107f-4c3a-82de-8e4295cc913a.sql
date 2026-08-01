-- 1. Remove loose DELETE policy on counsellor_overrides
DROP POLICY IF EXISTS "counsellor delete own overrides" ON public.counsellor_overrides;

-- 2. Remove loose UPDATE policy on counsellor_student_notes
DROP POLICY IF EXISTS "counsellor update own notes" ON public.counsellor_student_notes;

-- 3. Add service_role DELETE policy on email_send_log for retention purges
CREATE POLICY "Service role can delete email logs"
ON public.email_send_log
FOR DELETE
TO service_role
USING (true);

-- 4. Restrict user_activity_logs INSERT to server-side (service_role) only
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Users insert own activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "users insert own activity logs" ON public.user_activity_logs;

CREATE POLICY "Service role inserts activity logs"
ON public.user_activity_logs
FOR INSERT
TO service_role
WITH CHECK (true);