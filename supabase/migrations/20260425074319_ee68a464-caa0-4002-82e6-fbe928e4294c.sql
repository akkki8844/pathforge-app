-- 1. Newsletter subscribers: allow users to read & delete their own row
CREATE POLICY "Users can view their own newsletter subscription"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own newsletter subscription"
ON public.newsletter_subscribers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. Counsellor tables: tighten UPDATE/DELETE to require current student access

-- counsellor_student_notes
DROP POLICY IF EXISTS "Counsellors update own notes" ON public.counsellor_student_notes;
DROP POLICY IF EXISTS "Counsellors delete own notes" ON public.counsellor_student_notes;

CREATE POLICY "Counsellors update own notes"
ON public.counsellor_student_notes
FOR UPDATE
TO authenticated
USING (auth.uid() = counsellor_id AND public.teacher_can_view_student(auth.uid(), student_id))
WITH CHECK (auth.uid() = counsellor_id AND public.teacher_can_view_student(auth.uid(), student_id));

CREATE POLICY "Counsellors delete own notes"
ON public.counsellor_student_notes
FOR DELETE
TO authenticated
USING (auth.uid() = counsellor_id AND public.teacher_can_view_student(auth.uid(), student_id));

-- counsellor_interactions
DROP POLICY IF EXISTS "Counsellors update own interactions" ON public.counsellor_interactions;
DROP POLICY IF EXISTS "Counsellors delete own interactions" ON public.counsellor_interactions;

CREATE POLICY "Counsellors update own interactions"
ON public.counsellor_interactions
FOR UPDATE
TO authenticated
USING (auth.uid() = counsellor_id AND public.teacher_can_view_student(auth.uid(), student_id))
WITH CHECK (auth.uid() = counsellor_id AND public.teacher_can_view_student(auth.uid(), student_id));

CREATE POLICY "Counsellors delete own interactions"
ON public.counsellor_interactions
FOR DELETE
TO authenticated
USING (auth.uid() = counsellor_id AND public.teacher_can_view_student(auth.uid(), student_id));

-- counsellor_overrides
DROP POLICY IF EXISTS "Counsellors update own overrides" ON public.counsellor_overrides;
DROP POLICY IF EXISTS "Counsellors delete own overrides" ON public.counsellor_overrides;

CREATE POLICY "Counsellors update own overrides"
ON public.counsellor_overrides
FOR UPDATE
TO authenticated
USING (auth.uid() = counsellor_id AND public.teacher_can_view_student(auth.uid(), student_id))
WITH CHECK (auth.uid() = counsellor_id AND public.teacher_can_view_student(auth.uid(), student_id));

CREATE POLICY "Counsellors delete own overrides"
ON public.counsellor_overrides
FOR DELETE
TO authenticated
USING (auth.uid() = counsellor_id AND public.teacher_can_view_student(auth.uid(), student_id));