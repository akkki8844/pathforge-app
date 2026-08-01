
-- 1) Remove fuzzy school-name matching from teacher_can_view_student
CREATE OR REPLACE FUNCTION public.teacher_can_view_student(_teacher_uid uuid, _student_uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    public.is_verified_teacher(_teacher_uid)
    AND (
      EXISTS (
        SELECT 1
        FROM public.teacher_profiles tp
        JOIN public.onboarding_data od ON od.user_id = _student_uid
        WHERE tp.user_id = _teacher_uid
          AND tp.school_id IS NOT NULL
          AND od.school_id = tp.school_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.classes c
        JOIN public.class_members cm ON cm.class_id = c.id
        WHERE c.teacher_id = _teacher_uid AND cm.student_id = _student_uid
      )
    );
$function$;

-- 2) Explicit deny policies for lor-letters bucket writes (service role bypasses RLS)
DROP POLICY IF EXISTS "lor-letters no client insert" ON storage.objects;
DROP POLICY IF EXISTS "lor-letters no client update" ON storage.objects;
DROP POLICY IF EXISTS "lor-letters no client delete" ON storage.objects;

CREATE POLICY "lor-letters no client insert"
  ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id <> 'lor-letters');

CREATE POLICY "lor-letters no client update"
  ON storage.objects FOR UPDATE
  TO authenticated, anon
  USING (bucket_id <> 'lor-letters')
  WITH CHECK (bucket_id <> 'lor-letters');

CREATE POLICY "lor-letters no client delete"
  ON storage.objects FOR DELETE
  TO authenticated, anon
  USING (bucket_id <> 'lor-letters');

-- 3) Prevent proof_url / notes tampering on teacher_verification_requests after submission
CREATE OR REPLACE FUNCTION public.tvr_lock_proof_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_admin() OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.proof_url IS DISTINCT FROM OLD.proof_url
     OR NEW.notes    IS DISTINCT FROM OLD.notes
     OR NEW.status   IS DISTINCT FROM OLD.status
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
  THEN
    RAISE EXCEPTION 'Cannot modify submitted verification fields; contact an administrator.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tvr_lock_proof_fields_trg ON public.teacher_verification_requests;
CREATE TRIGGER tvr_lock_proof_fields_trg
  BEFORE UPDATE ON public.teacher_verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.tvr_lock_proof_fields();
