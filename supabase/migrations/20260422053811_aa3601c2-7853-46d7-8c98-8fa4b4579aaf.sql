-- Harden user_activity_logs against log poisoning by constraining what
-- authenticated users can write. auth.uid() = user_id is already enforced;
-- this adds field-level validation.

-- Add CHECK constraints on the columns themselves (idempotent guards)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_activity_logs_action_type_check'
  ) THEN
    ALTER TABLE public.user_activity_logs
      ADD CONSTRAINT user_activity_logs_action_type_check
      CHECK (
        action_type = ANY (ARRAY[
          'page_view','login','logout','signup','feature_used',
          'credit_consumed','upgrade_clicked','onboarding_step',
          'proof_uploaded','assignment_started','assignment_completed',
          'ai_request','error','click','search'
        ])
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_activity_logs_lengths_check'
  ) THEN
    ALTER TABLE public.user_activity_logs
      ADD CONSTRAINT user_activity_logs_lengths_check
      CHECK (
        (page_path IS NULL OR length(page_path) <= 512)
        AND (user_agent IS NULL OR length(user_agent) <= 512)
        AND (ip_address IS NULL OR length(ip_address) <= 64)
        AND (session_id IS NULL OR length(session_id) <= 128)
        AND (action_details IS NULL OR pg_column_size(action_details) <= 4096)
      );
  END IF;
END $$;

-- Replace the permissive INSERT policy with the same auth check
-- (constraints above now enforce content validity at the row level).
DROP POLICY IF EXISTS "Users can insert their own activity" ON public.user_activity_logs;
CREATE POLICY "Users can insert their own activity"
ON public.user_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);