-- Add missing UPDATE and DELETE policies for guest_sessions table
CREATE POLICY "Users can update their own guest session"
ON public.guest_sessions FOR UPDATE
USING (auth.uid() = guest_user_id);

CREATE POLICY "Users can delete their own guest session"
ON public.guest_sessions FOR DELETE
USING (auth.uid() = guest_user_id);