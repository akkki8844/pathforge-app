-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text;

-- Add unique constraint for username
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Create an index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Create function to check username availability
CREATE OR REPLACE FUNCTION public.is_username_available(check_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE LOWER(username) = LOWER(check_username)
  )
$$;

-- Allow RLS policies to work with username updates
-- Users can now update their own username as long as it's unique

-- Create table for guest sessions to persist data
CREATE TABLE IF NOT EXISTS public.guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on guest_sessions
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for guest_sessions
CREATE POLICY "Users can view their own guest session"
ON public.guest_sessions
FOR SELECT
USING (auth.uid() = guest_user_id);

CREATE POLICY "Users can insert their own guest session"
ON public.guest_sessions
FOR INSERT
WITH CHECK (auth.uid() = guest_user_id);

-- Modify onboarding_data to work with anonymous users
-- The existing RLS policies using auth.uid() will work with anonymous users too

-- Create trigger for updated_at on guest_sessions
CREATE TRIGGER update_guest_sessions_updated_at
BEFORE UPDATE ON public.guest_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();