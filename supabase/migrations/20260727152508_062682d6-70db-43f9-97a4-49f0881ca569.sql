CREATE OR REPLACE FUNCTION public.monthly_credit_allowance(_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE lower(COALESCE(_plan, 'free'))
    WHEN 'pro'    THEN 250
    WHEN 'starter' THEN 250
    WHEN 'growth' THEN 250
    WHEN 'power'  THEN 250
    WHEN 'max'    THEN 750
    ELSE 0
  END;
$function$;