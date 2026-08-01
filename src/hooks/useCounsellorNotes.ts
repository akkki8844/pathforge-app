import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CounsellorNote {
  id: string;
  counsellor_id: string;
  student_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/**
 * Private internal notes the counsellor keeps about a student.
 * RLS restricts visibility to the owning counsellor and admins.
 */
export function useCounsellorNotes(studentId: string | undefined) {
  const { user } = useAuth();
  const [items, setItems] = useState<CounsellorNote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !studentId) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from as any)("counsellor_student_notes")
      .select("*")
      .eq("counsellor_id", user.id)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setItems((data as CounsellorNote[] | null) ?? []);
    setLoading(false);
  }, [user, studentId]);

  useEffect(() => { load(); }, [load]);

  const add = async (body: string) => {
    if (!user || !studentId) return { error: new Error("Not signed in") };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from as any)("counsellor_student_notes").insert({
      counsellor_id: user.id,
      student_id: studentId,
      body,
    });
    if (!error) await load();
    return { error };
  };

  const update = async (id: string, body: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from as any)("counsellor_student_notes")
      .update({ body, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) await load();
    return { error };
  };

  const remove = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)("counsellor_student_notes").delete().eq("id", id);
    await load();
  };

  return { items, loading, add, update, remove, reload: load };
}
