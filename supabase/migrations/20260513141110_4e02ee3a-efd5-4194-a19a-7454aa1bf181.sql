REVOKE EXECUTE ON FUNCTION public.admin_list_flagged_prompts(integer, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_targeting_facets() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_email_recipients(text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_review_flagged_prompt(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.teacher_roster() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_flagged_prompts(integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_targeting_facets() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_email_recipients(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_flagged_prompt(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_roster() TO authenticated;