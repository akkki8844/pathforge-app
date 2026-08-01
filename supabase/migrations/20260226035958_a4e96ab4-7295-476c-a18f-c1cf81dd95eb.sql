-- Drop the dangerous claim_admin_role function that has a hardcoded secret
DROP FUNCTION IF EXISTS public.claim_admin_role(text, text);