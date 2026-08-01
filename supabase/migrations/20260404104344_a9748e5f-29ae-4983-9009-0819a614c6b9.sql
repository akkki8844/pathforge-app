-- Fix 1: Restrict feature_flags SELECT to admins only, create RPC for regular users
DROP POLICY IF EXISTS "Everyone can read feature flags" ON public.feature_flags;

CREATE POLICY "Admins can read all feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Create RPC to evaluate a feature flag for the current user without exposing target_users
CREATE OR REPLACE FUNCTION public.evaluate_feature_flag(flag_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flag_record RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_enabled, rollout_percentage, target_users
  INTO flag_record
  FROM public.feature_flags
  WHERE name = flag_name;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF NOT flag_record.is_enabled THEN
    RETURN false;
  END IF;

  -- If target_users is set and non-empty, check membership
  IF flag_record.target_users IS NOT NULL AND array_length(flag_record.target_users, 1) > 0 THEN
    RETURN auth.uid()::text = ANY(flag_record.target_users);
  END IF;

  RETURN true;
END;
$$;

-- Fix 2: Add auth requirement to is_username_available
CREATE OR REPLACE FUNCTION public.is_username_available(check_username text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE LOWER(username) = LOWER(check_username)
  );
END;
$$;