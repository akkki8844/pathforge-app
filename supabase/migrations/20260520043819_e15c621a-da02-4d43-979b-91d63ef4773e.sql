
-- 1) email_send_log: ensure anon/public role is also blocked from SELECT
DROP POLICY IF EXISTS "Block anon reads on email_send_log" ON public.email_send_log;
CREATE POLICY "Block anon reads on email_send_log"
ON public.email_send_log
AS RESTRICTIVE
FOR SELECT
TO public
USING (is_admin() OR auth.role() = 'service_role');

REVOKE SELECT ON public.email_send_log FROM anon;

-- 2) feature_flags: hide target_users column from non-admin authenticated users
REVOKE SELECT (target_users) ON public.feature_flags FROM authenticated, anon;

-- 3) notification_broadcasts: hide audience_user_ids column from non-admin senders
REVOKE SELECT (audience_user_ids) ON public.notification_broadcasts FROM authenticated, anon;
