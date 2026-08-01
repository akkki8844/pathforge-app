-- 1. Drop plaintext email column from flagged_prompts
ALTER TABLE public.flagged_prompts DROP COLUMN IF EXISTS user_email;

-- 2. Restrictive SELECT on platform_settings: only admins/service_role
DROP POLICY IF EXISTS "platform_settings_restrict_select" ON public.platform_settings;
CREATE POLICY "platform_settings_restrict_select"
  ON public.platform_settings
  AS RESTRICTIVE
  FOR SELECT
  TO public
  USING (public.is_admin() OR auth.role() = 'service_role');

-- 3. Realtime channel authorization for user_credits topics
-- Topic convention: 'user_credits:<user_id>'
DROP POLICY IF EXISTS "user_credits_realtime_own_topic" ON realtime.messages;
CREATE POLICY "user_credits_realtime_own_topic"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    (realtime.topic() NOT LIKE 'user_credits:%')
    OR (realtime.topic() = 'user_credits:' || auth.uid()::text)
  );