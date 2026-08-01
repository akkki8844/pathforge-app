-- Per-prompt advisor cost now scales with plan tier and reasoning effort,
-- instead of a flat 1 credit for everyone. Free stays flat at 1 (its daily
-- allowance is 3 credits — scaling it would make effort unusable). Pro
-- starts at 5, Max at 10; each effort step up ("none" -> "low" -> "medium"
-- -> "high") adds 2.

CREATE OR REPLACE FUNCTION public.advisor_credit_cost(_plan text, _effort text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(COALESCE(_plan, 'free')) = 'max' THEN
      10 + 2 * (CASE lower(COALESCE(_effort, 'none'))
                  WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 ELSE 0 END)
    WHEN lower(COALESCE(_plan, 'free')) IN ('pro', 'starter', 'growth', 'power') THEN
      5 + 2 * (CASE lower(COALESCE(_effort, 'none'))
                 WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 ELSE 0 END)
    ELSE 1
  END;
$$;

-- Wraps consume_credits() so the edge function doesn't have to compute (and
-- can't be tricked into under-reporting) the cost itself — plan is read
-- server-side from user_credits, not trusted from the request.
CREATE OR REPLACE FUNCTION public.consume_advisor_credit(_effort text DEFAULT 'none')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid  UUID := auth.uid();
  _plan TEXT;
  _cost INTEGER;
  _ok   BOOLEAN;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF public.is_admin() OR public.is_vc_user(_uid) THEN
    RETURN json_build_object('success', true, 'cost', 0);
  END IF;

  PERFORM public.revert_user_if_expired(_uid);
  SELECT plan INTO _plan FROM public.user_credits WHERE user_id = _uid;
  _cost := public.advisor_credit_cost(_plan, _effort);

  _ok := public.consume_credits(_cost);
  RETURN json_build_object('success', _ok, 'cost', _cost);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_advisor_credit(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.consume_advisor_credit(text) TO authenticated;
