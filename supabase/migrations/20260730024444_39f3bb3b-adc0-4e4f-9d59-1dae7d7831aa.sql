CREATE POLICY "level_evaluations_realtime_own_topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() NOT LIKE 'level-eval-%' AND realtime.topic() NOT LIKE 'level_evaluations:%')
  OR realtime.topic() LIKE ('level-eval-' || (auth.uid())::text || '%')
  OR realtime.topic() = ('level_evaluations:' || (auth.uid())::text)
);

CREATE POLICY "proof_submissions_realtime_own_topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() NOT LIKE 'proof-%' AND realtime.topic() NOT LIKE 'proof_submissions:%')
  OR realtime.topic() LIKE ('proof-' || (auth.uid())::text || '%')
  OR realtime.topic() = ('proof_submissions:' || (auth.uid())::text)
  OR is_admin()
);