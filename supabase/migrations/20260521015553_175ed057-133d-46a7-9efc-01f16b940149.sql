-- Restrict feature_flags reads to admins only (target_users column leaked targeted UUIDs)
DROP POLICY IF EXISTS "Authenticated users can read enabled feature flags" ON public.feature_flags;

-- Fix avatars bucket: public display requires reads across users
DROP POLICY IF EXISTS "Users read own avatar files" ON storage.objects;

CREATE POLICY "Anyone can read avatar files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');