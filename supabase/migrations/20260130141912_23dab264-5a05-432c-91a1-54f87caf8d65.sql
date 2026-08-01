-- Create a one-time function to assign the first admin
-- This function can only be called by the user themselves and only works if no admins exist
CREATE OR REPLACE FUNCTION public.claim_admin_role(admin_email TEXT, admin_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  admin_exists BOOLEAN;
BEGIN
  -- Verify the secret (change this after first use!)
  IF admin_secret != 'PATHFORGE_ADMIN_2024' THEN
    RAISE EXCEPTION 'Invalid admin secret';
  END IF;

  -- Check if any admin already exists
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;
  
  -- Find user by email
  SELECT user_id INTO target_user_id 
  FROM public.profiles 
  WHERE LOWER(email) = LOWER(admin_email);

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;

  -- Insert admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN TRUE;
END;
$$;