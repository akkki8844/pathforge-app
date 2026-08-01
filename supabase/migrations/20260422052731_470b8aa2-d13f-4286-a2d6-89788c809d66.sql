-- 1. Lock down user_credits

-- Restrict INSERT to authenticated users only (still enforces defaults)
DROP POLICY IF EXISTS "Users can insert their own credits with defaults only" ON public.user_credits;
CREATE POLICY "Users can insert their own credits with defaults only"
ON public.user_credits
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'free'
  AND max_daily_credits = 5
  AND credits_used_today = 0
  AND bonus_credits = 0
);

-- Restrict admin policy to authenticated role explicitly
DROP POLICY IF EXISTS "Admins can manage all credits" ON public.user_credits;
CREATE POLICY "Admins can manage all credits"
ON public.user_credits
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Restrict SELECT to authenticated
DROP POLICY IF EXISTS "Users can view their own credits" ON public.user_credits;
CREATE POLICY "Users can view their own credits"
ON public.user_credits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Explicit restrictive UPDATE policy: non-admin users CANNOT update directly.
-- All credit changes must go through SECURITY DEFINER RPCs (consume_credit, apply_subscription_credits, revert_to_free_plan).
CREATE POLICY "Block direct user updates to credits"
ON public.user_credits
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 2. Add admin SELECT on email_send_log for auditing
CREATE POLICY "Admins can read email send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (is_admin());