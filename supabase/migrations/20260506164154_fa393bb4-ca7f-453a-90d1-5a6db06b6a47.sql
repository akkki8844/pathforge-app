-- 1. Revoke EXECUTE on all public SECURITY DEFINER functions from anon and PUBLIC
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC', fn.nspname, fn.proname, fn.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon', fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;

-- 2. Re-grant EXECUTE on user-callable functions to authenticated only
GRANT EXECUTE ON FUNCTION public.consume_credit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_verified_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_fellow_counsellors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_for_broadcast(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_notification_broadcast(text, text, text, uuid, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_or_create_school(text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_school_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_can_view_student(uuid, uuid) TO authenticated;

-- Admin functions: only admins (which are authenticated) need EXECUTE; the in-function is_admin() check enforces auth
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_comprehensive_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_users(text, text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_users(text, text, text, text, text, uuid, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_schools_with_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_counsellors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_user_ai_usage(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(uuid, text, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_daily_limit(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_counsellor_to_school(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unflag_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_flag_user(uuid, text, text, timestamp with time zone, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_coupon_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_plan_limit(text, integer, boolean) TO authenticated;

-- Service-role-only functions: keep service_role grant (queue / email / billing internals)
GRANT EXECUTE ON FUNCTION public.apply_subscription_credits(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.revert_to_free_plan(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.revert_all_expired_subscriptions() TO service_role;
GRANT EXECUTE ON FUNCTION public.revert_user_if_expired(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_unsubscribe_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_feature_flag(text) TO authenticated, service_role;

-- 3. Tighten platform_settings & feature_flags reads to authenticated only
DROP POLICY IF EXISTS "Authenticated users can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can read platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can read enabled feature flags" ON public.feature_flags;
CREATE POLICY "Authenticated users can read enabled feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (is_enabled = true);
