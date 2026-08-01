
-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own credits" ON public.user_credits;

-- Create a restricted INSERT policy that enforces default values
CREATE POLICY "Users can insert their own credits with defaults only"
ON public.user_credits FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'free'
  AND max_daily_credits = 5
  AND credits_used_today = 0
);
