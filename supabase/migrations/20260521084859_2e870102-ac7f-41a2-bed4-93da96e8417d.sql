
-- 1. ai_usage_logs: only service role may INSERT (logged via edge functions)
DROP POLICY IF EXISTS "Users can insert their own AI usage" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Users can insert their own ai usage" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Users can insert own ai usage" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Insert own ai usage" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Authenticated insert ai_usage_logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "ai_usage_logs_insert_own" ON public.ai_usage_logs;

-- Explicit restrictive policy: deny all authenticated/anon INSERTs (service role bypasses RLS)
CREATE POLICY "ai_usage_logs_no_client_insert"
ON public.ai_usage_logs
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- 2. coupon_redemptions: redemptions must only be created via redeem_coupon() SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Users can insert their own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Users can create their own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Users insert own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "coupon_redemptions_insert_own" ON public.coupon_redemptions;

CREATE POLICY "coupon_redemptions_no_client_insert"
ON public.coupon_redemptions
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- 3. requirements_reports: remove from realtime publication. RLS still protects DB reads;
-- broadcasted realtime events were unrestricted by topic, so disable until proper topic auth is wired.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'requirements_reports'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.requirements_reports';
  END IF;
END$$;
