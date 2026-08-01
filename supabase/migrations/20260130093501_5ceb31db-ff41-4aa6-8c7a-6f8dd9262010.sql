-- Add name column to voice_advisor_sessions for renaming conversations
ALTER TABLE public.voice_advisor_sessions 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add conversation_id to group messages in a session
ALTER TABLE public.voice_advisor_sessions 
ADD COLUMN IF NOT EXISTS conversation_id UUID DEFAULT gen_random_uuid();

-- Add UPDATE policy for voice_advisor_sessions (for renaming)
CREATE POLICY "Users can update their own voice sessions" 
ON public.voice_advisor_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add name column to readiness_analyses for renaming (if not exists)
-- Already has name column, just ensure UPDATE policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'readiness_analyses' 
    AND policyname = 'Users can update their own readiness analyses'
  ) THEN
    CREATE POLICY "Users can update their own readiness analyses"
    ON public.readiness_analyses
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;