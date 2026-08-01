-- Upgrade user_credits.max_daily_credits from 3 to 5 when email gets confirmed
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
    UPDATE public.user_credits
      SET max_daily_credits = GREATEST(max_daily_credits, 5),
          updated_at = now()
      WHERE user_id = NEW.id
        AND plan = 'free'
        AND max_daily_credits < 5;
    UPDATE public.profiles
      SET email_verified_at = NEW.email_confirmed_at
      WHERE user_id = NEW.id
        AND email_verified_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_confirmation();