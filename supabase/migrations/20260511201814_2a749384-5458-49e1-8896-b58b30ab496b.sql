
-- Tighten avatars bucket: prevent anonymous listing while still allowing
-- public CDN access to known file URLs (public bucket CDN bypasses RLS).
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Users read own avatar files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Revoke anonymous EXECUTE on SECURITY DEFINER functions; restrict to authenticated users only.
REVOKE EXECUTE ON FUNCTION public.log_user_activity(text, text, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.log_user_activity(text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_student_deep_dive(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_student_deep_dive(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_recent_activity(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_activity(integer) TO authenticated;
