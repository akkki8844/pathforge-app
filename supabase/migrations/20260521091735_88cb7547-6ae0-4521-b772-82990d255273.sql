
CREATE OR REPLACE FUNCTION public.refund_credit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET daily_credits_used = GREATEST(0, COALESCE(daily_credits_used, 0) - 1)
  WHERE id = v_user;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_credit() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.refund_credit() TO authenticated;
