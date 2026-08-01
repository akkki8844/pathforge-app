-- Drop misleading UPDATE policy on user_credits.
-- All credit mutations are performed by SECURITY DEFINER functions
-- (consume_credit, apply_subscription_credits, revert_*, get_credits)
-- which bypass RLS, plus an existing "Admins can manage all credits" ALL policy.
-- The previous policy "Users can only read their own credits" was a no-op
-- (WITH CHECK false) that silently blocked everything and was misleading.
DROP POLICY IF EXISTS "Users can only read their own credits" ON public.user_credits;