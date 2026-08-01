-- Restrict platform_settings reads to admins only
DROP POLICY IF EXISTS "Authenticated users can read platform settings" ON public.platform_settings;

-- Restrict admin_feedback realtime topic to admins only
CREATE POLICY "Admins can subscribe to admin_feedback realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() LIKE 'admin_feedback%' OR realtime.topic() LIKE 'realtime:public:admin_feedback%')
  AND public.is_admin()
);