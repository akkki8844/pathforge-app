import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FocusItem {
  id: string;
  counsellor_id: string;
  focus_date: string;
  title: string;
  related_student_id: string | null;
  done: boolean;
  created_at: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function useCounselorDailyFocus() {
  const { user } = useAuth();
  const [items, setItems] = useState<FocusItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from as any)("counsellor_daily_focus")
      .select("*")
      .eq("counsellor_id", user.id)
      .eq("focus_date", todayISO())
      .order("created_at", { ascending: true });
    setItems((data as FocusItem[] | null) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const add = async (title: string, related_student_id?: string) => {
    if (!user || !title.trim()) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)("counsellor_daily_focus").insert({
      counsellor_id: user.id,
      focus_date: todayISO(),
      title: title.trim(),
      related_student_id: related_student_id ?? null,
    });
    await load();
  };

  const toggle = async (id: string, done: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)("counsellor_daily_focus")
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq("id", id);
    await load();
  };

  const remove = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)("counsellor_daily_focus").delete().eq("id", id);
    await load();
  };

  return { items, loading, add, toggle, remove, reload: load };
}
