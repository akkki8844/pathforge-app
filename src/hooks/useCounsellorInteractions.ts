import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type InteractionKind = "call" | "email" | "meeting" | "chat" | "other";

export interface CounsellorInteraction {
  id: string;
  counsellor_id: string;
  student_id: string;
  kind: InteractionKind;
  summary: string;
  occurred_at: string;
  created_at: string;
}

/**
 * Contact log timeline. Powers "last contacted" indicators and the CRM-style
 * interaction history view.
 *
 * Pass a `studentId` for one student's timeline. Omit it to get every
 * interaction this counsellor has logged across their whole roster, which is
 * what the Meetings calendar needs — it plots meetings for all students at
 * once, not one at a time.
 */
export function useCounsellorInteractions(studentId?: string | undefined) {
  const { user } = useAuth();
  const [items, setItems] = useState<CounsellorInteraction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Signed out is a settled state, not a pending one. Returning without
    // clearing the flag left every consumer spinning forever.
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from as any)("counsellor_interactions")
      .select("*")
      .eq("counsellor_id", user.id);
    // No student filter means roster-wide. The counsellor_id filter above (and
    // the table's RLS) still scopes it to this counsellor's own records.
    if (studentId) query = query.eq("student_id", studentId);
    const { data } = await query.order("occurred_at", { ascending: false });
    setItems((data as CounsellorInteraction[] | null) ?? []);
    setLoading(false);
  }, [user, studentId]);

  useEffect(() => { load(); }, [load]);

  const log = async (input: { kind: InteractionKind; summary: string; occurred_at?: string }) => {
    if (!user || !studentId) return { error: new Error("Not signed in") };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from as any)("counsellor_interactions").insert({
      counsellor_id: user.id,
      student_id: studentId,
      kind: input.kind,
      summary: input.summary,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
    });
    if (!error) await load();
    return { error };
  };

  const remove = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)("counsellor_interactions").delete().eq("id", id);
    await load();
  };

  const lastContacted = items[0]?.occurred_at ?? null;

  return { items, loading, log, remove, reload: load, lastContacted };
}
