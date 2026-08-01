DROP POLICY IF EXISTS "Users can subscribe to their own advisor_artifacts channel" ON realtime.messages;

CREATE POLICY "Users can subscribe to their own advisor_artifacts channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('advisor_artifacts:' || auth.uid()::text)
);