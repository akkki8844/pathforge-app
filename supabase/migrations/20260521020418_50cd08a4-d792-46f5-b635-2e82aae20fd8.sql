-- Restrict access to the audience_user_ids column on notification_broadcasts
-- so senders cannot enumerate recipient UUIDs via their own broadcasts.
REVOKE SELECT (audience_user_ids) ON public.notification_broadcasts FROM authenticated;
REVOKE SELECT (audience_user_ids) ON public.notification_broadcasts FROM anon;