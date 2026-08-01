
ALTER TABLE public.recommenders
  ADD COLUMN IF NOT EXISTS brag_sheet_id UUID REFERENCES public.brag_sheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_packet_artifact_id UUID,
  ADD COLUMN IF NOT EXISTS last_packet_at TIMESTAMP WITH TIME ZONE;
