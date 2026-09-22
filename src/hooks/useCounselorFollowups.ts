import { useCallback, useEffect, useState } from "react";
import { counsellorDb } from "@/integrations/supabase/counsellor";
import { useAuth } from "@/contexts/AuthContext";

export interface Followup {
  id: string;
  counsellor_id: string;
  student_id: string;
  due_date: string;
  note: string;
  status: "open" | "done" | "skipped";
  /**
   * When it was ticked off, or null while it is still open.
   *
   * `setStatus` below has always written this column; it was simply missing
   * from the interface, which nothing noticed while every query went through
   * an `as any`.
   */
  completed_at: string | null;
  created_at: string;
}

/** All follow-ups the current counselor owns. Cast to any on the typed client until types regen. */
export function useCounselorFollowups() {
  const { user } = useAuth();
  const [items, setItems] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await counsellorDb.from("counsellor_followups")
      .select("*")
      .eq("counsellor_id", user.id)
      .order("due_date", { ascending: true });
    setItems((data as Followup[] | null) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const add = async (input: { student_id: string; due_date: string; note: string }) => {
    if (!user) return;
    const { error } = await counsellorDb.from("counsellor_followups").insert({
      counsellor_id: user.id,
      ...input,
    });
    if (!error) await load();
    return { error };
  };

  const setStatus = async (id: string, status: Followup["status"]) => {
    await counsellorDb.from("counsellor_followups")
      .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
      .eq("id", id);
    await load();
  };

  const remove = async (id: string) => {
    await counsellorDb.from("counsellor_followups").delete().eq("id", id);
    await load();
  };

  return { items, loading, add, setStatus, remove, reload: load };
}
