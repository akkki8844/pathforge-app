
CREATE TABLE public.recommenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  position text,
  subject text,
  school text,
  relationship_duration text,
  status text NOT NULL DEFAULT 'not_requested',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommenders_status_check CHECK (status IN ('not_requested','requested','accepted','drafting','submitted'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommenders TO authenticated;
GRANT ALL ON public.recommenders TO service_role;

ALTER TABLE public.recommenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recommenders" ON public.recommenders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX recommenders_user_id_idx ON public.recommenders(user_id, created_at DESC);

CREATE TRIGGER update_recommenders_updated_at
  BEFORE UPDATE ON public.recommenders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
