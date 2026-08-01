
UPDATE auth.users
SET encrypted_password = crypt('pathforge4vc', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    banned_until = NULL,
    updated_at = now()
WHERE email = 'pathforgevc@gmail.com';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'teacher'::public.app_role
FROM auth.users WHERE email = 'pathforgevc@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.teacher_profiles (user_id, verified, verified_at, onboarding_completed, invite_status)
SELECT id, true, now(), true, 'accepted'
FROM auth.users WHERE email = 'pathforgevc@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET verified = true,
    verified_at = COALESCE(public.teacher_profiles.verified_at, now()),
    invite_status = 'accepted';
