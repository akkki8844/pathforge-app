-- ============================================================
-- 1. Platform settings (admin-tunable defaults)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  email_sender_name TEXT NOT NULL DEFAULT 'Pathforge',
  default_announcement_audience TEXT NOT NULL DEFAULT 'all',
  default_announcement_priority TEXT NOT NULL DEFAULT 'info',
  signups_enabled BOOLEAN NOT NULL DEFAULT true,
  guest_mode_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

INSERT INTO public.platform_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins update platform settings"
  ON public.platform_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. Schools: case-insensitive find-or-create helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.link_or_create_school(
  _name TEXT,
  _country TEXT DEFAULT NULL,
  _city TEXT DEFAULT NULL,
  _verified BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _id UUID;
  _normalized TEXT := trim(_name);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF _normalized IS NULL OR length(_normalized) < 2 THEN
    RETURN NULL;
  END IF;

  -- Match case-insensitively, prefer country match if provided
  SELECT id INTO _id
  FROM public.schools
  WHERE LOWER(name) = LOWER(_normalized)
    AND (_country IS NULL OR country IS NULL OR LOWER(country) = LOWER(_country))
  ORDER BY is_verified DESC, created_at ASC
  LIMIT 1;

  IF _id IS NOT NULL THEN
    -- Promote to verified if caller verified it (e.g. picked from curated list)
    IF _verified THEN
      UPDATE public.schools SET is_verified = true, updated_at = now()
      WHERE id = _id AND is_verified = false;
    END IF;
    RETURN _id;
  END IF;

  INSERT INTO public.schools (name, country, city, is_verified, created_by)
  VALUES (_normalized, NULLIF(trim(_country),''), NULLIF(trim(_city),''), COALESCE(_verified,false), auth.uid())
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- ============================================================
-- 3. Announcement → notifications fanout
-- ============================================================
CREATE OR REPLACE FUNCTION public.fanout_announcement_to_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _aud TEXT := COALESCE(NEW.target_audience, 'all');
  _broadcast_id UUID;
  _count INT := 0;
BEGIN
  -- Only fan out when the announcement is (or just became) active
  IF NOT NEW.is_active THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = true THEN
    -- Already fanned out; don't duplicate on edits
    RETURN NEW;
  END IF;

  -- Use announcement id as broadcast id for de-dup
  _broadcast_id := NEW.id;

  WITH targets AS (
    SELECT p.user_id
    FROM public.profiles p
    LEFT JOIN public.onboarding_data o ON o.user_id = p.user_id
    WHERE
      CASE _aud
        WHEN 'onboarded' THEN COALESCE(o.onboarding_completed, false) = true
        WHEN 'new' THEN COALESCE(o.onboarding_completed, false) = false
        ELSE true
      END
  ), inserted AS (
    INSERT INTO public.notifications (user_id, broadcast_id, sender_id, sender_role, title, message)
    SELECT t.user_id, _broadcast_id, NEW.created_by, 'admin', NEW.title, NEW.content
    FROM targets t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.broadcast_id = _broadcast_id AND n.user_id = t.user_id
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO _count FROM inserted;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcement_fanout_insert ON public.admin_announcements;
CREATE TRIGGER announcement_fanout_insert
  AFTER INSERT ON public.admin_announcements
  FOR EACH ROW EXECUTE FUNCTION public.fanout_announcement_to_notifications();

DROP TRIGGER IF EXISTS announcement_fanout_update ON public.admin_announcements;
CREATE TRIGGER announcement_fanout_update
  AFTER UPDATE OF is_active ON public.admin_announcements
  FOR EACH ROW
  WHEN (OLD.is_active = false AND NEW.is_active = true)
  EXECUTE FUNCTION public.fanout_announcement_to_notifications();

-- ============================================================
-- 4. Backfill schools from existing onboarding data
-- ============================================================
DO $$
DECLARE
  r RECORD;
  _id UUID;
  _name TEXT;
BEGIN
  FOR r IN
    SELECT user_id, high_school_name, country
    FROM public.onboarding_data
    WHERE school_id IS NULL
      AND high_school_name IS NOT NULL
      AND length(trim(high_school_name)) >= 2
      AND lower(trim(high_school_name)) NOT IN ('not collected','not specified','school','none','n/a')
  LOOP
    _name := trim(r.high_school_name);

    -- Try existing case-insensitive match first
    SELECT id INTO _id FROM public.schools
    WHERE LOWER(name) = LOWER(_name)
    ORDER BY is_verified DESC, created_at ASC
    LIMIT 1;

    IF _id IS NULL THEN
      INSERT INTO public.schools (name, country, is_verified, created_by)
      VALUES (_name, NULLIF(trim(r.country),''), false, r.user_id)
      RETURNING id INTO _id;
    END IF;

    UPDATE public.onboarding_data
    SET school_id = _id, updated_at = now()
    WHERE user_id = r.user_id;
  END LOOP;
END $$;