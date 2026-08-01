import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Followup {
  id: string;
  counsellor_id: string;
  student_id: string;
  due_date: string;
  note: string;
  status: "open" | "done" | "skipped";
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from as any)("counsellor_followups")
      .select("*")
      .eq("counsellor_id", user.id)
      .order("due_date", { ascending: true });
    setItems((data as Followup[] | null) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const add = async (input: { student_id: string; due_date: string; note: string }) => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from as any)("counsellor_followups").insert({
      counsellor_id: user.id,
      ...input,
    });
    if (!error) await load();
    return { error };
  };

  const setStatus = async (id: string, status: Followup["status"]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)("counsellor_followups")
      .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
      .eq("id", id);
    await load();
  };

  const remove = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)("counsellor_followups").delete().eq("id", id);
    await load();
  };

  return { items, loading, add, setStatus, remove, reload: load };
}
