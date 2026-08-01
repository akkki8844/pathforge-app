CREATE TABLE public.enterprise_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an enterprise inquiry"
ON public.enterprise_inquiries
FOR INSERT
WITH CHECK (
  length(trim(name)) > 0 AND length(name) <= 200
  AND length(trim(email)) > 0 AND length(email) <= 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (organization IS NULL OR length(organization) <= 200)
  AND length(trim(message)) >= 20 AND length(message) <= 5000
);

CREATE POLICY "Admins can view all enterprise inquiries"
ON public.enterprise_inquiries
FOR SELECT
USING (public.is_admin());

CREATE INDEX idx_enterprise_inquiries_created_at ON public.enterprise_inquiries(created_at DESC);