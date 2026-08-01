
-- Email campaigns: an admin-initiated broadcast
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'custom', -- 'custom' | 'announcement' | 'feature-release' | 'template'
  template_key TEXT,                       -- preset template id used to seed (informational)
  subject TEXT NOT NULL,
  heading TEXT NOT NULL,
  preview_text TEXT,
  body TEXT NOT NULL,                      -- plain text with double-newlines splitting paragraphs
  cta_label TEXT,
  cta_url TEXT,
  target_kind TEXT NOT NULL,               -- 'all' | 'grade' | 'school' | 'individual'
  target_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  total_queued INTEGER NOT NULL DEFAULT 0,
  total_skipped INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',    -- 'draft' | 'sending' | 'sent' | 'failed'
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON public.email_campaigns (created_at DESC);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage email_campaigns" ON public.email_campaigns;
CREATE POLICY "Admins manage email_campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id UUID,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',   -- 'queued' | 'failed' | 'skipped'
  message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecr_campaign ON public.email_campaign_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS idx_ecr_email ON public.email_campaign_recipients (recipient_email);

ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage campaign recipients" ON public.email_campaign_recipients;
CREATE POLICY "Admins manage campaign recipients" ON public.email_campaign_recipients
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER trg_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Resolve admin email targeting filters into a list of (user_id, email).
-- target_kind: 'all' | 'grade' | 'school' | 'individual'
-- filter: { grades?: text[], schools?: text[], userIds?: uuid[] }
CREATE OR REPLACE FUNCTION public.admin_resolve_email_recipients(
  _target_kind TEXT,
  _filter JSONB
)
RETURNS TABLE (user_id UUID, email TEXT, grade TEXT, school TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _grades TEXT[];
  _schools TEXT[];
  _user_ids UUID[];
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  _grades := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_filter->'grades', '[]'::jsonb)));
  _schools := ARRAY(SELECT jsonb_array_elements_text(COALESCE(_filter->'schools', '[]'::jsonb)));
  _user_ids := ARRAY(SELECT (jsonb_array_elements_text(COALESCE(_filter->'userIds', '[]'::jsonb)))::uuid);

  RETURN QUERY
  SELECT DISTINCT
    p.user_id,
    LOWER(COALESCE(NULLIF(p.email, ''), au.email)) AS email,
    od.grade,
    od.high_school_name AS school
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN public.onboarding_data od ON od.user_id = p.user_id
  WHERE COALESCE(NULLIF(p.email, ''), au.email) IS NOT NULL
    AND CASE _target_kind
      WHEN 'all' THEN TRUE
      WHEN 'grade' THEN od.grade = ANY(_grades)
      WHEN 'school' THEN od.high_school_name = ANY(_schools)
      WHEN 'individual' THEN p.user_id = ANY(_user_ids)
      ELSE FALSE
    END;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_email_recipients(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_email_recipients(TEXT, JSONB) TO authenticated, service_role;

-- Convenience: list distinct grades and schools for the targeting UI.
CREATE OR REPLACE FUNCTION public.admin_list_targeting_facets()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT jsonb_build_object(
    'grades', COALESCE((SELECT jsonb_agg(DISTINCT g ORDER BY g) FROM (SELECT grade AS g FROM public.onboarding_data WHERE grade IS NOT NULL AND grade <> '') s), '[]'::jsonb),
    'schools', COALESCE((SELECT jsonb_agg(DISTINCT s ORDER BY s) FROM (SELECT high_school_name AS s FROM public.onboarding_data WHERE high_school_name IS NOT NULL AND high_school_name <> '') x), '[]'::jsonb),
    'totalUsers', (SELECT COUNT(*) FROM public.profiles)
  )
  INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_targeting_facets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_targeting_facets() TO authenticated, service_role;
