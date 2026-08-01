import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type OverridePriority = "low" | "medium" | "high" | "urgent";
export type OverrideType = "priority" | "roadmap_note" | "task" | "warning";

export interface CounsellorOverride {
  id: string;
  counsellor_id: string;
  student_id: string;
  override_type: OverrideType;
  title: string;
  body: string | null;
  priority: OverridePriority;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Counsellor authority layer: manual overrides that overrule AI recommendations
 * and surface directly on the student's dashboard.
 *
 * Two modes:
 *   - counsellor (default): items the calling counsellor created for a student
 *   - student: active overrides FOR the calling student (read-only)
 */
export function useCounsellorOverrides(
  studentId: string | undefined,
  mode: "counsellor" | "student" = "counsellor",
) {
  const { user } = useAuth();
  const [items, setItems] = useState<CounsellorOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from as any)("counsellor_overrides")
      .select("*")
      .order("created_at", { ascending: false });
    if (mode === "counsellor") {
      if (!studentId) { setItems([]); setLoading(false); return; }
      q = q.eq("counsellor_id", user.id).eq("student_id", studentId);
    } else {
      // Student view: only active overrides addressed to me
      q = q.eq("student_id", user.id).eq("is_active", true);
    }
    const { data } = await q;
    setItems((data as CounsellorOverride[] | null) ?? []);
    setLoading(false);
  }, [user, studentId, mode]);

  useEffect(() => { load(); }, [load]);

  const create = async (input: {
    override_type: OverrideType;
    title: string;
    body?: string;
    priority?: OverridePriority;
  }) => {
    if (!user || !studentId) return { error: new Error("Not signed in") };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from as any)("counsellor_overrides").insert({
      counsellor_id: user.id,
      student_id: studentId,
      override_type: input.override_type,
      title: input.title,
      body: input.body ?? null,
      priority: input.priority ?? "medium",
      is_active: true,
    });
    if (!error) await load();
    return { error };
  };

  const update = async (id: string, patch: Partial<Pick<CounsellorOverride, "title" | "body" | "priority" | "is_active">>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from as any)("counsellor_overrides")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) await load();
    return { error };
  };

  const remove = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)("counsellor_overrides").delete().eq("id", id);
    await load();
  };

  return { items, loading, create, update, remove, reload: load };
}
