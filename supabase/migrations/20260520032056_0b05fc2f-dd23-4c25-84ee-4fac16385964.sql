-- 1. Restrict storage policies to authenticated role only (remove public/anon access)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN (
        'Users can delete their own avatar',
        'Users can update their own avatar',
        'Users can upload their own avatar',
        'Users delete own proof files',
        'Users read own avatar files',
        'Users read own proof files',
        'Users upload own proof files'
      )
  LOOP
    EXECUTE format('ALTER POLICY %I ON storage.objects TO authenticated', pol.policyname);
  END LOOP;
END$$;

-- 2. Revoke EXECUTE from anon on user-scoped SECURITY DEFINER functions in public schema.
--    Keep EXECUTE for authenticated (and service_role) so the app keeps working.
REVOKE EXECUTE ON FUNCTION public.consume_credit() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_credits() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_user_activity(text, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.search_users_for_broadcast(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_fellow_counsellors() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_student_deep_dive(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revert_to_free_plan(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revert_user_if_expired(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.apply_subscription_credits(uuid, text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.revert_all_expired_subscriptions() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, public;

-- Admin-only RPCs
REVOKE EXECUTE ON FUNCTION public.admin_search_users(text, text, text, text, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_schools_with_counts() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_counsellors() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_user_ai_usage(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_reset_user_state(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_reset_user_usage(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_daily_limit(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_update_user_profile(uuid, text, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user_data(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_user_details(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_unflag_user(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_update_plan_limit(text, integer, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_get_recent_activity(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_assign_counsellor_to_school(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_comprehensive_admin_stats() FROM anon, public;