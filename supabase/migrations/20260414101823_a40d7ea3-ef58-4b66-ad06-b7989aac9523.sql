
-- Add restrictive policy to prevent non-admin users from inserting roles
CREATE POLICY "Non-admins cannot insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Add restrictive policy to prevent non-admin users from updating roles
CREATE POLICY "Non-admins cannot update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Add restrictive policy to prevent non-admin users from deleting roles
CREATE POLICY "Non-admins cannot delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Allow users to read their own activity logs
CREATE POLICY "Users can view their own activity logs"
ON public.user_activity_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own activity logs
CREATE POLICY "Users can delete their own activity logs"
ON public.user_activity_logs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
