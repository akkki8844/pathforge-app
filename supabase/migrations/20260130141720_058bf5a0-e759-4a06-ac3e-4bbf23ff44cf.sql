-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- RLS policies for user_roles table
-- Only admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- Only admins can insert roles
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Only admins can update roles
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Create admin-only policies for viewing all user data
-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- Allow admins to view all onboarding data
CREATE POLICY "Admins can view all onboarding data"
  ON public.onboarding_data FOR SELECT
  TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- Create a view for user statistics (admin only)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'onboarded_users', (SELECT COUNT(*) FROM public.onboarding_data WHERE onboarding_completed = true),
    'pending_onboarding', (SELECT COUNT(*) FROM public.onboarding_data WHERE onboarding_completed = false),
    'users_by_grade', (
      SELECT json_agg(json_build_object('grade', grade, 'count', cnt))
      FROM (SELECT grade, COUNT(*) as cnt FROM public.onboarding_data GROUP BY grade) g
    ),
    'users_by_country', (
      SELECT json_agg(json_build_object('country', country, 'count', cnt))
      FROM (SELECT country, COUNT(*) as cnt FROM public.onboarding_data GROUP BY country) c
    ),
    'recent_signups', (
      SELECT json_agg(json_build_object('email', email, 'created_at', created_at))
      FROM (SELECT email, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 10) r
    )
  ) INTO result;

  RETURN result;
END;
$$;