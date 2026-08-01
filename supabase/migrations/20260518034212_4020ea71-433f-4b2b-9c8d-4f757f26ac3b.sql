ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ;

UPDATE public.profiles p
SET email_verified_at = au.email_confirmed_at
FROM auth.users au
WHERE p.user_id = au.id
  AND p.email_verified_at IS NULL
  AND au.email_confirmed_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash
  ON public.email_verification_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_created
  ON public.email_verification_tokens(user_id, created_at DESC);

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage email verification tokens" ON public.email_verification_tokens;
CREATE POLICY "Service role can manage email verification tokens"
ON public.email_verification_tokens
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.user_credits
  ALTER COLUMN max_daily_credits SET DEFAULT 3;

DROP POLICY IF EXISTS "Users can insert their own credits with defaults only" ON public.user_credits;
CREATE POLICY "Users can insert their own credits with defaults only"
ON public.user_credits
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'free'
  AND max_daily_credits = 3
  AND credits_used_today = 0
  AND bonus_credits = 0
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, email_verified_at)
  VALUES (NEW.id, NEW.email, NULL)
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now();

  INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
  VALUES (NEW.id, 'free', 0, 3)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.email_is_verified(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.email_verified_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.effective_daily_credit_limit(_user_id UUID, _plan TEXT, _stored_limit INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _plan = 'free' AND COALESCE(_stored_limit, 5) <= 5 THEN
      CASE WHEN public.email_is_verified(_user_id) THEN 5 ELSE 3 END
    ELSE COALESCE(_stored_limit, 3)
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_credits()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  credit_row RECORD;
  hours_since_reset DOUBLE PRECISION;
  effective_limit INTEGER;
BEGIN
  IF public.is_admin() THEN
    RETURN json_build_object(
      'plan', 'admin',
      'credits_used_today', 0,
      'max_daily_credits', 999999,
      'bonus_credits', 0,
      'last_reset_at', now(),
      'is_admin', true
    );
  END IF;

  PERFORM public.revert_user_if_expired(auth.uid());

  SELECT * INTO credit_row FROM public.user_credits WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', 0, 3)
    RETURNING * INTO credit_row;
  END IF;

  hours_since_reset := EXTRACT(EPOCH FROM (now() - credit_row.last_reset_at)) / 3600.0;
  IF hours_since_reset >= 24 THEN
    UPDATE public.user_credits
    SET credits_used_today = 0, last_reset_at = now(), updated_at = now()
    WHERE user_id = auth.uid()
    RETURNING * INTO credit_row;
  END IF;

  effective_limit := public.effective_daily_credit_limit(auth.uid(), credit_row.plan, credit_row.max_daily_credits);

  RETURN json_build_object(
    'plan', credit_row.plan,
    'credits_used_today', LEAST(credit_row.credits_used_today, effective_limit),
    'max_daily_credits', effective_limit,
    'bonus_credits', credit_row.bonus_credits,
    'last_reset_at', credit_row.last_reset_at,
    'is_admin', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_credit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  credit_row RECORD;
  hours_since_reset DOUBLE PRECISION;
  effective_limit INTEGER;
BEGIN
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  PERFORM public.revert_user_if_expired(auth.uid());

  SELECT * INTO credit_row FROM public.user_credits
  WHERE user_id = auth.uid() FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, plan, credits_used_today, max_daily_credits)
    VALUES (auth.uid(), 'free', 1, 3);
    RETURN true;
  END IF;

  hours_since_reset := EXTRACT(EPOCH FROM (now() - credit_row.last_reset_at)) / 3600.0;
  IF hours_since_reset >= 24 THEN
    UPDATE public.user_credits
    SET credits_used_today = 0, last_reset_at = now(), updated_at = now()
    WHERE user_id = auth.uid()
    RETURNING * INTO credit_row;
  END IF;

  IF credit_row.bonus_credits > 0 THEN
    UPDATE public.user_credits
    SET bonus_credits = bonus_credits - 1, updated_at = now()
    WHERE user_id = auth.uid();
    RETURN true;
  END IF;

  effective_limit := public.effective_daily_credit_limit(auth.uid(), credit_row.plan, credit_row.max_daily_credits);

  IF credit_row.credits_used_today >= effective_limit THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
  SET credits_used_today = credits_used_today + 1, updated_at = now()
  WHERE user_id = auth.uid();
  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.email_is_verified(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_daily_credit_limit(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credit() TO authenticated;