-- Explicitly block client-side INSERTs into flagged_prompts.
-- Only the service role (which bypasses RLS) should write to this table.
CREATE POLICY "No client inserts to flagged_prompts"
ON public.flagged_prompts
FOR INSERT
TO authenticated, anon
WITH CHECK (false);