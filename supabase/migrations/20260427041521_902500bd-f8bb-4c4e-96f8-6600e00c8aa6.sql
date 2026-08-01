-- 1. Add invite_status columns
ALTER TABLE public.teacher_profiles
  ADD COLUMN IF NOT EXISTS invite_status text NOT NULL DEFAULT 'pending'
    CHECK (invite_status IN ('pending', 'accepted')),
  ADD COLUMN IF NOT EXISTS invite_accepted_at timestamptz;

-- 2. Backfill: any existing counsellor who has signed in OR completed onboarding is "accepted"
UPDATE public.teacher_profiles tp
SET invite_status = 'accepted',
    invite_accepted_at = COALESCE(tp.invite_accepted_at, u.last_sign_in_at, tp.updated_at, now())
FROM auth.users u
WHERE tp.user_id = u.id
  AND (u.last_sign_in_at IS NOT NULL OR tp.onboarding_completed = true)
  AND tp.invite_status = 'pending';

-- 3. Trigger function: when auth.users.last_sign_in_at transitions from NULL to non-null,
-- mark the matching teacher_profile as accepted.
CREATE OR REPLACE FUNCTION public.mark_counsellor_invite_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL
     AND (OLD.last_sign_in_at IS NULL OR OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at) THEN
    UPDATE public.teacher_profiles
    SET invite_status = 'accepted',
        invite_accepted_at = COALESCE(invite_accepted_at, NEW.last_sign_in_at),
        updated_at = now()
    WHERE user_id = NEW.id
      AND invite_status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_counsellor_invite_accepted ON auth.users;
CREATE TRIGGER trg_mark_counsellor_invite_accepted
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.mark_counsellor_invite_accepted();

-- 4. Update admin_list_counsellors to surface invite_status + invite_accepted_at
CREATE OR REPLACE FUNCTION public.admin_list_counsellors()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result JSON;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result FROM (
    SELECT tp.user_id, tp.title, tp.school_id, tp.verified, tp.years_experience,
           tp.invite_status, tp.invite_accepted_at, tp.onboarding_completed,
           tp.created_at,
           p.email, p.username, s.name AS school_name
    FROM public.teacher_profiles tp
    LEFT JOIN public.profiles p ON p.user_id = tp.user_id
    LEFT JOIN public.schools s ON s.id = tp.school_id
    ORDER BY tp.created_at DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$function$;