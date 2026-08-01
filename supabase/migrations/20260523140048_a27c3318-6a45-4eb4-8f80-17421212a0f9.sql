UPDATE auth.users
SET encrypted_password = crypt(encode(gen_random_bytes(24), 'base64'), gen_salt('bf')),
    updated_at = now()
WHERE email = 'pathforgeadmin@gmail.com';

DELETE FROM auth.sessions
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'pathforgeadmin@gmail.com');

DELETE FROM auth.refresh_tokens
WHERE user_id IN (SELECT id::text FROM auth.users WHERE email = 'pathforgeadmin@gmail.com');