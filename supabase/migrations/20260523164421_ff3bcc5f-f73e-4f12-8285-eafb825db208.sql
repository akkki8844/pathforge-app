
-- Advisor settings, memories, artifacts + storage buckets

CREATE TABLE IF NOT EXISTS public.advisor_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT DEFAULT '',
  occupation TEXT DEFAULT '',
  traits TEXT DEFAULT '',
  extra_notes TEXT DEFAULT '',
  model TEXT DEFAULT 'google/gemini-3-flash-preview',
  reasoning_effort TEXT DEFAULT 'none',
  temperature NUMERIC(3,2) DEFAULT 0.4,
  max_response_tokens INT DEFAULT 1500,
  memory_enabled BOOLEAN DEFAULT TRUE,
  voice_name TEXT DEFAULT 'default',
  autoplay_voice BOOLEAN DEFAULT FALSE,
  show_suggestions BOOLEAN DEFAULT TRUE,
  show_artifact_previews BOOLEAN DEFAULT TRUE,
  history_retention_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.advisor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_advisor_settings_select" ON public.advisor_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_advisor_settings_insert" ON public.advisor_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_advisor_settings_update" ON public.advisor_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_advisor_settings_delete" ON public.advisor_settings FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.advisor_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advisor_memories_user ON public.advisor_memories(user_id, created_at DESC);

ALTER TABLE public.advisor_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_advisor_memories_all" ON public.advisor_memories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.advisor_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('plan','document','pdf','slides')),
  title TEXT NOT NULL,
  content_markdown TEXT,
  content_json JSONB,
  file_path TEXT,
  file_mime TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advisor_artifacts_user ON public.advisor_artifacts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisor_artifacts_conv ON public.advisor_artifacts(conversation_id);

ALTER TABLE public.advisor_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_advisor_artifacts_all" ON public.advisor_artifacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.advisor_artifacts;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('advisor-uploads', 'advisor-uploads', false)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('advisor-artifacts', 'advisor-artifacts', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "advisor_uploads_owner_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'advisor-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "advisor_uploads_owner_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'advisor-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "advisor_uploads_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'advisor-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "advisor_artifacts_owner_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'advisor-artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "advisor_artifacts_owner_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'advisor-artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "advisor_artifacts_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'advisor-artifacts' AND auth.uid()::text = (storage.foldername(name))[1]);
