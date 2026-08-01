
-- 1) Tighten newsletter_subscribers INSERT policy
-- Drop the unrestricted public INSERT policy and replace with one
-- that only allows authenticated users subscribing with their own email.
-- Anonymous subscriptions still work via the newsletter-subscribe edge
-- function which uses the service role and bypasses RLS.
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;

CREATE POLICY "Authenticated users subscribe with own email"
ON public.newsletter_subscribers
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND email IS NOT NULL
  AND length(trim(email)) > 0
  AND length(email) <= 255
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND lower(email) = lower((SELECT email FROM public.profiles WHERE user_id = auth.uid()))
);

-- 2) Add explicit UPDATE policy for proof-uploads storage bucket
-- Scoped strictly to file owner (folder name = user id).
DROP POLICY IF EXISTS "Users update own proof files" ON storage.objects;

CREATE POLICY "Users update own proof files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'proof-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'proof-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
