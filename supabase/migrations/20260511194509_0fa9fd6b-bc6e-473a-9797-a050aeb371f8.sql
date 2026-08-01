CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly plans"
ON public.weekly_plans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weekly plans"
ON public.weekly_plans
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly plans"
ON public.weekly_plans
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly plans"
ON public.weekly_plans
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_week
ON public.weekly_plans (user_id, week_start);

DROP TRIGGER IF EXISTS update_weekly_plans_updated_at ON public.weekly_plans;
CREATE TRIGGER update_weekly_plans_updated_at
BEFORE UPDATE ON public.weekly_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();