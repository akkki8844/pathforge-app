import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FeedbackRow {
  id: string;
  teacher_id: string;
  student_id: string;
  subject_type: string;
  subject_ref: string | null;
  body: string;
  rating: number | null;
  created_at: string;
}

export function useTeacherFeedback(studentId?: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    let q = supabase.from("teacher_feedback")
      .select("id,teacher_id,student_id,subject_type,subject_ref,body,rating,created_at")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    if (studentId) q = q.eq("student_id", studentId);
    const { data } = await q;
    setItems((data ?? []) as FeedbackRow[]);
    setLoading(false);
  }, [user, studentId]);

  useEffect(() => { load(); }, [load]);

  const create = async (input: Omit<FeedbackRow, "id" | "teacher_id" | "created_at">) => {
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await supabase.from("teacher_feedback").insert({
      teacher_id: user.id,
      student_id: input.student_id,
      subject_type: input.subject_type,
      subject_ref: input.subject_ref,
      body: input.body,
      rating: input.rating,
    });
    if (!error) await load();
    return { error };
  };

  return { items, loading, create, reload: load };
}

export function useStudentFeedback(subjectType?: string, subjectRef?: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setItems([]); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase.from("teacher_feedback")
        .select("id,teacher_id,student_id,subject_type,subject_ref,body,rating,created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (subjectType) q = q.eq("subject_type", subjectType);
      if (subjectRef) q = q.eq("subject_ref", subjectRef);
      const { data } = await q;
      if (!cancelled) {
        setItems((data ?? []) as FeedbackRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, subjectType, subjectRef]);

  return { items, loading };
}
