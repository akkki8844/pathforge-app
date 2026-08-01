
-- 1. email_campaign_recipients: restrictive SELECT (admins/service_role only)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='email_campaign_recipients') THEN
    EXECUTE 'ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Restrict reads to admins and service role" ON public.email_campaign_recipients';
    EXECUTE $p$CREATE POLICY "Restrict reads to admins and service role"
      ON public.email_campaign_recipients AS RESTRICTIVE FOR SELECT TO authenticated
      USING (public.is_admin() OR auth.role() = 'service_role')$p$;
  END IF;
END $$;

-- 2. email_send_log
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='email_send_log') THEN
    EXECUTE 'ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Restrict reads to admins and service role" ON public.email_send_log';
    EXECUTE $p$CREATE POLICY "Restrict reads to admins and service role"
      ON public.email_send_log AS RESTRICTIVE FOR SELECT TO authenticated
      USING (public.is_admin() OR auth.role() = 'service_role')$p$;
  END IF;
END $$;

-- 3. email_unsubscribe_tokens
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='email_unsubscribe_tokens') THEN
    EXECUTE 'ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Restrict reads to admins and service role" ON public.email_unsubscribe_tokens';
    EXECUTE $p$CREATE POLICY "Restrict reads to admins and service role"
      ON public.email_unsubscribe_tokens AS RESTRICTIVE FOR SELECT TO authenticated
      USING (public.is_admin() OR auth.role() = 'service_role')$p$;
  END IF;
END $$;

-- 4. email_verification_tokens
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='email_verification_tokens') THEN
    EXECUTE 'ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Restrict reads to admins and service role" ON public.email_verification_tokens';
    EXECUTE $p$CREATE POLICY "Restrict reads to admins and service role"
      ON public.email_verification_tokens AS RESTRICTIVE FOR SELECT TO authenticated
      USING (public.is_admin() OR auth.role() = 'service_role')$p$;
  END IF;
END $$;

-- 5. suppressed_emails
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='suppressed_emails') THEN
    EXECUTE 'ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Restrict reads to admins and service role" ON public.suppressed_emails';
    EXECUTE $p$CREATE POLICY "Restrict reads to admins and service role"
      ON public.suppressed_emails AS RESTRICTIVE FOR SELECT TO authenticated
      USING (public.is_admin() OR auth.role() = 'service_role')$p$;
  END IF;
END $$;

-- 6. classes: hide invite_code from students via restrictive column check.
-- We add a restrictive policy that blocks non-teacher/non-admin from reading invite_code by enforcing via a security definer function-based approach.
-- Simplest: revoke SELECT on invite_code column and require teachers only.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='classes') THEN
    -- Revoke column-level SELECT on invite_code from authenticated; grant only to service_role
    EXECUTE 'REVOKE SELECT (invite_code) ON public.classes FROM authenticated';
    EXECUTE 'REVOKE SELECT (invite_code) ON public.classes FROM anon';
    -- Grant SELECT on all other columns back to authenticated (safe re-grant)
    EXECUTE 'GRANT SELECT (id, teacher_id, school_id, name, subject, grade_level, description, created_at, updated_at) ON public.classes TO authenticated';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Provide a function for teachers to fetch their own class invite codes
CREATE OR REPLACE FUNCTION public.get_class_invite_code(_class_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = _class_id AND c.teacher_id = auth.uid()
  )) THEN
    RAISE EXCEPTION 'access denied';
  END IF;
  SELECT invite_code INTO _code FROM public.classes WHERE id = _class_id;
  RETURN _code;
END;
$$;

-- 7. notifications: prevent users from setting sender_role on self-inserts
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='notifications' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.notifications', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can insert own self-notifications without spoofing"
ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND broadcast_id IS NULL
  AND sender_id IS NULL
  AND sender_role IS NULL
);
