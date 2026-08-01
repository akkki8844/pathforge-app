-- Fix 1: feature_flags target_users exposure
-- Replace broad SELECT policy with one that hides the target_users column from non-admins via a security-definer evaluator.
-- Simplest fix: drop the authenticated read policy. Clients should use evaluate_feature_flag() RPC instead, which is already SECURITY DEFINER.
DROP POLICY IF EXISTS "Authenticated users can read enabled flags" ON public.feature_flags;

-- Fix 2: Set search_path on pgmq wrapper functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;