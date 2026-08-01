-- Subscriptions table for Paddle
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  paddle_subscription_id text NOT NULL UNIQUE,
  paddle_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, environment)
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_paddle_id ON public.subscriptions(paddle_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Add bonus_credits to user_credits (plan credits stack on top of free 5/day)
ALTER TABLE public.user_credits 
  ADD COLUMN IF NOT EXISTS bonus_credits integer NOT NULL DEFAULT 0;

-- Helper: check active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'live'
)
RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;

-- Update consume_credit to use bonus_credits first, then daily allowance
CREATE OR REPLACE FUNCTION public.consume_credit()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  credit_row RECORD;
  hours_since_reset DOUBLE PRECISION;
BEGIN
  SELECT * INTO credit_row FROM public.user_credits
  WHERE user_id = auth.uid() FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', 1, 5);
    RETURN true;
  END IF;

  hours_since_reset := EXTRACT(EPOCH FROM (now() - credit_row.last_reset_at)) / 3600.0;
  IF hours_since_reset >= 24 THEN
    UPDATE public.user_credits
    SET credits_used_today = 0, last_reset_at = now(), updated_at = now()
    WHERE user_id = auth.uid()
    RETURNING * INTO credit_row;
  END IF;

  -- Use bonus credits first (from active subscription)
  IF credit_row.bonus_credits > 0 THEN
    UPDATE public.user_credits
    SET bonus_credits = bonus_credits - 1, updated_at = now()
    WHERE user_id = auth.uid();
    RETURN true;
  END IF;

  -- Fall back to daily free allowance
  IF credit_row.credits_used_today >= credit_row.max_daily_credits THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
  SET credits_used_today = credits_used_today + 1, updated_at = now()
  WHERE user_id = auth.uid();
  RETURN true;
END;
$$;

-- Update get_credits to expose bonus_credits
CREATE OR REPLACE FUNCTION public.get_credits()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  credit_row RECORD;
  hours_since_reset DOUBLE PRECISION;
BEGIN
  SELECT * INTO credit_row FROM public.user_credits WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', 0, 5)
    RETURNING * INTO credit_row;
  END IF;

  hours_since_reset := EXTRACT(EPOCH FROM (now() - credit_row.last_reset_at)) / 3600.0;
  IF hours_since_reset >= 24 THEN
    UPDATE public.user_credits
    SET credits_used_today = 0, last_reset_at = now(), updated_at = now()
    WHERE user_id = auth.uid()
    RETURNING * INTO credit_row;
  END IF;

  RETURN json_build_object(
    'plan', credit_row.plan,
    'credits_used_today', credit_row.credits_used_today,
    'max_daily_credits', credit_row.max_daily_credits,
    'bonus_credits', credit_row.bonus_credits,
    'last_reset_at', credit_row.last_reset_at
  );
END;
$$;

-- RPC for webhook to grant plan credits + update plan label
CREATE OR REPLACE FUNCTION public.apply_subscription_credits(
  target_user_id uuid,
  plan_name text,
  credits_to_grant integer
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, plan, max_daily_credits, credits_used_today, bonus_credits)
  VALUES (target_user_id, plan_name, 5, 0, credits_to_grant)
  ON CONFLICT (user_id) DO UPDATE
  SET plan = plan_name,
      bonus_credits = public.user_credits.bonus_credits + credits_to_grant,
      updated_at = now();
END;
$$;

-- user_credits needs unique constraint on user_id for upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_credits_user_id_key'
  ) THEN
    ALTER TABLE public.user_credits ADD CONSTRAINT user_credits_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- RPC for webhook to revert to free plan
CREATE OR REPLACE FUNCTION public.revert_to_free_plan(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE public.user_credits
  SET plan = 'free', bonus_credits = 0, updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;