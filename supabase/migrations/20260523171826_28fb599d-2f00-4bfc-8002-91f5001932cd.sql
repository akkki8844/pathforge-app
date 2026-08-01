
-- 1) Realtime: restrict advisor_artifacts topic to owner
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to their own advisor_artifacts channel" ON realtime.messages;
CREATE POLICY "Users can subscribe to their own advisor_artifacts channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = 'advisor_artifacts:' || auth.uid()::text)
  OR (realtime.topic() NOT LIKE 'advisor_artifacts:%')
);

-- 2) Storage: add UPDATE policy for advisor-uploads scoped to owner folder
DROP POLICY IF EXISTS "Users can update their own advisor uploads" ON storage.objects;
CREATE POLICY "Users can update their own advisor uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'advisor-uploads' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'advisor-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
