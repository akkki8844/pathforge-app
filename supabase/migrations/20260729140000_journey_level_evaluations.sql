-- Level-completion AI evaluation.
--
-- Per-stage evidence is already auto-verified by `verify-proof` (pass/fail on a
-- single upload). That tells a student whether one artefact counted; it never
-- tells them how the *level* went as a body of work. This table holds the
-- report the `evaluate-level` edge function produces once all 20 stages of a
-- Level are banked: a graded read across every piece of evidence in that level,
-- plus what to carry into the next one.
--
-- One row per (user, level). Regenerating overwrites in place — a level's
-- evidence set is fixed once banked, so history here is noise, not signal.

CREATE TABLE public.level_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  level INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating',
  -- 0-100. Deliberately the same scale as journey_scores.overall_score so a
  -- student can read the two side by side without converting.
  score INTEGER,
  -- One-line headline, e.g. "Strong build, thin on external validation."
  verdict TEXT,
  summary TEXT,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- What to prioritize in the next Level, ordered most-important-first.
  priorities JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- How many pieces of evidence the verdict was actually drawn from. Surfaced
  -- in the UI so a thin report is visibly thin rather than falsely confident.
  evidence_count INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT level_eval_level_check CHECK (level BETWEEN 1 AND 10),
  CONSTRAINT level_eval_status_check CHECK (status IN ('generating', 'ready', 'failed')),
  CONSTRAINT level_eval_score_check CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  CONSTRAINT level_eval_unique_per_level UNIQUE (user_id, level)
);

CREATE INDEX idx_level_eval_user ON public.level_evaluations(user_id, level);

ALTER TABLE public.level_evaluations ENABLE ROW LEVEL SECURITY;

-- Read-only for students. Writes go exclusively through the `evaluate-level`
-- edge function under the service role, so a student cannot hand themselves a
-- 100 by POSTing straight at PostgREST.
CREATE POLICY "Users view own level evaluations"
  ON public.level_evaluations FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Service role full access level evaluations"
  ON public.level_evaluations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_level_eval_updated
  BEFORE UPDATE ON public.level_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime, so an open report modal flips from "generating" to the finished
-- report on its own instead of the student having to reopen it.
ALTER PUBLICATION supabase_realtime ADD TABLE public.level_evaluations;
