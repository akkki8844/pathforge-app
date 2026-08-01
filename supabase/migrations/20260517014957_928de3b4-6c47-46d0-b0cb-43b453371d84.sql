REVOKE SELECT (target_users, created_by) ON public.feature_flags FROM authenticated;
REVOKE SELECT (target_users, created_by) ON public.feature_flags FROM anon;