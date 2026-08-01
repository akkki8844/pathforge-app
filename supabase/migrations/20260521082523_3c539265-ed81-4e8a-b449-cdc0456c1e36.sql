-- Consolidate plans to free / pro / enterprise
DELETE FROM public.ai_plan_limits WHERE plan IN ('starter','growth','power');
INSERT INTO public.ai_plan_limits (plan, max_daily_credits) VALUES
  ('free', 5),
  ('pro', 100),
  ('enterprise', 10000)
ON CONFLICT (plan) DO UPDATE SET max_daily_credits = EXCLUDED.max_daily_credits, updated_at = now();

-- Migrate any users still on the old tiers to pro
UPDATE public.user_credits
SET plan = 'pro', max_daily_credits = 100, updated_at = now()
WHERE plan IN ('starter','growth','power');