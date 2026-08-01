CREATE POLICY "Deny anon read on email_campaign_recipients"
ON public.email_campaign_recipients
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);