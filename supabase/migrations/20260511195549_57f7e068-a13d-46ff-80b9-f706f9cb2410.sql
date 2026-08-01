-- Allow users to insert their own in-app notifications (for AI task completion alerts)
CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND broadcast_id IS NULL AND sender_id IS NULL);