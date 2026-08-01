-- Stop "permission denied for function log_user_activity" errors flooding the
-- database log when unauthenticated visitors trigger route activity logging.
-- The function already returns early when auth.uid() IS NULL, so granting EXECUTE
-- to anon is safe and simply lets the no-op path run instead of erroring.
GRANT EXECUTE ON FUNCTION public.log_user_activity(text, text, jsonb) TO anon;