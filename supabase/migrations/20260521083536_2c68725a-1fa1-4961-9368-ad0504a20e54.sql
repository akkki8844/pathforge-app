CREATE TABLE IF NOT EXISTS public.requirements_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  college text NOT NULL,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requirements_reports_user ON public.requirements_reports(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_requirements_reports_user_college ON public.requirements_reports(user_id, college);

ALTER TABLE public.requirements_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own requirements reports" ON public.requirements_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own requirements reports" ON public.requirements_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own requirements reports" ON public.requirements_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own requirements reports" ON public.requirements_reports FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage requirements reports" ON public.requirements_reports FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_requirements_reports_updated_at
  BEFORE UPDATE ON public.requirements_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.requirements_reports;