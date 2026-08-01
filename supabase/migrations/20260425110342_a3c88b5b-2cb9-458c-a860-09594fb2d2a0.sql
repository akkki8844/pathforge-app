-- Remove the loose DELETE policy on counsellor_interactions that lets a counsellor
-- delete records for students they no longer supervise. The stricter policy
-- requiring teacher_can_view_student() remains in place.
DROP POLICY IF EXISTS "counsellor delete own interactions" ON public.counsellor_interactions;