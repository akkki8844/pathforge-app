-- Restrict lor-letters bucket to service-role access only.
-- Owner-style student access for their own folder (read-only), no anon/auth writes.
DROP POLICY IF EXISTS "lor-letters owner can read own" ON storage.objects;
DROP POLICY IF EXISTS "lor-letters deny anon" ON storage.objects;

CREATE POLICY "lor-letters owner can read own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lor-letters'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
-- No INSERT/UPDATE/DELETE policies for authenticated or anon => denied by default.
-- Edge function uses service role and bypasses RLS.