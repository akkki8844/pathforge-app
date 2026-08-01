
-- 1. Drop the overly permissive UPDATE policy on user_credits
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;

-- 2. Create a restricted UPDATE policy: users can only increment credits_used_today
-- We do NOT allow client-side updates anymore for sensitive fields
CREATE POLICY "Users can only read their own credits"
ON public.user_credits FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (false);

-- 3. Admin-only full update policy
CREATE POLICY "Admins can manage all credits"
ON public.user_credits FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Create consume_credit RPC - atomic credit check and increment
CREATE OR REPLACE FUNCTION public.consume_credit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  credit_row RECORD;
  hours_since_reset DOUBLE PRECISION;
BEGIN
  -- Get user's credit record
  SELECT * INTO credit_row
  FROM public.user_credits
  WHERE user_id = auth.uid()
  FOR UPDATE;

  -- If no record, create default
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', 1, 5);
    RETURN true;
  END IF;

  -- Check if reset is needed (24h since last reset)
  hours_since_reset := EXTRACT(EPOCH FROM (now() - credit_row.last_reset_at)) / 3600.0;
  
  IF hours_since_reset >= 24 THEN
    UPDATE public.user_credits
    SET credits_used_today = 1, last_reset_at = now(), updated_at = now()
    WHERE user_id = auth.uid();
    RETURN true;
  END IF;

  -- Check if credits remain
  IF credit_row.credits_used_today >= credit_row.max_daily_credits THEN
    RETURN false;
  END IF;

  -- Increment usage
  UPDATE public.user_credits
  SET credits_used_today = credits_used_today + 1, updated_at = now()
  WHERE user_id = auth.uid();

  RETURN true;
END;
$$;

-- 5. Create get_credits RPC for client to read current state
CREATE OR REPLACE FUNCTION public.get_credits()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  credit_row RECORD;
  hours_since_reset DOUBLE PRECISION;
BEGIN
  SELECT * INTO credit_row
  FROM public.user_credits
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', 0, 5)
    RETURNING * INTO credit_row;
  END IF;

  -- Auto-reset if needed
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
    'last_reset_at', credit_row.last_reset_at
  );
END;
$$;

-- 6. Feature flags: allow all authenticated users to read enabled flags
CREATE POLICY "Authenticated users can read enabled flags"
ON public.feature_flags FOR SELECT
TO authenticated
USING (is_enabled = true);
