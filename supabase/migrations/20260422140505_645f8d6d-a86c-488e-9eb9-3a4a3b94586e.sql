CREATE POLICY "Teachers update own verification files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'teacher-verification'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
)
WITH CHECK (
  bucket_id = 'teacher-verification'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.is_admin()
  )
);