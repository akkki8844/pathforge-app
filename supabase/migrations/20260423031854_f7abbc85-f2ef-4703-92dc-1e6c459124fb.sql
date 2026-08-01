-- Lock down Realtime channel subscriptions so users can only join their own notifications channel
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior versions to keep migration idempotent
DROP POLICY IF EXISTS "Users can subscribe to own notifications channel" ON realtime.messages;
DROP POLICY IF EXISTS "Users can receive own notifications broadcasts" ON realtime.messages;

-- Allow a user to subscribe to (and receive presence/broadcast on) only their own topic: notifications:<uid>
CREATE POLICY "Users can subscribe to own notifications channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notifications:' || auth.uid()::text
  OR realtime.topic() LIKE 'realtime:public:notifications:user_id=eq.' || auth.uid()::text
);

-- Allow service role full access (for server-side broadcasts)
DROP POLICY IF EXISTS "Service role full access realtime messages" ON realtime.messages;
CREATE POLICY "Service role full access realtime messages"
ON realtime.messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);