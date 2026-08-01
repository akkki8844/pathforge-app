-- 1. Remove the weaker permissive DELETE policy on counsellor_student_notes
-- The stricter "Counsellors delete own notes" policy (with teacher_can_view_student check) remains.
DROP POLICY IF EXISTS "counsellor delete own notes" ON public.counsellor_student_notes;

-- 2. Add a cleanup function for expired/used unsubscribe tokens (service role only)
CREATE OR REPLACE FUNCTION public.cleanup_expired_unsubscribe_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted integer;
BEGIN
  DELETE FROM public.email_unsubscribe_tokens
  WHERE (used_at IS NOT NULL AND used_at < now() - interval '30 days')
     OR (created_at < now() - interval '90 days');
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;

-- 3. Allow service_role to delete expired tokens (no user-facing access added — validation stays server-side)
DROP POLICY IF EXISTS "Service role can delete unsubscribe tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can delete unsubscribe tokens"
ON public.email_unsubscribe_tokens
FOR DELETE
TO service_role
USING (true);