import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FitTier = "reach" | "match" | "safety";
export type AppStage =
  | "researching"
  | "planning"
  | "drafting"
  | "submitted"
  | "admitted"
  | "rejected"
  | "waitlisted"
  | "withdrawn";

export interface AppStrategy {
  id: string;
  counsellor_id: string;
  student_id: string;
  college_name: string;
  fit_tier: FitTier;
  stage: AppStage;
  strategy_notes: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppStrategyDraft {
  college_name: string;
  fit_tier: FitTier;
  stage: AppStage;
  strategy_notes: string;
  deadline: string | null;
}

export const FIT_TIERS: FitTier[] = ["reach", "match", "safety"];
export const APP_STAGES: AppStage[] = [
  "researching",
  "planning",
  "drafting",
  "submitted",
  "admitted",
  "waitlisted",
  "rejected",
  "withdrawn",
];

export function stageLabel(s: AppStage): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function tierLabel(t: FitTier): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function useAppStrategies(studentId?: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<AppStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user || !studentId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("counsellor_app_strategies")
      .select("*")
      .eq("counsellor_id", user.id)
      .eq("student_id", studentId)
      .order("deadline", { ascending: true, nullsFirst: false });
    setItems((data as AppStrategy[] | null) ?? []);
    setLoading(false);
  }, [user, studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (draft: AppStrategyDraft) => {
    if (!user || !studentId) return { error: new Error("Missing context") };
    setBusy(true);
    const { error } = await supabase.from("counsellor_app_strategies").insert({
      counsellor_id: user.id,
      student_id: studentId,
      college_name: draft.college_name.trim(),
      fit_tier: draft.fit_tier,
      stage: draft.stage,
      strategy_notes: draft.strategy_notes.trim() || null,
      deadline: draft.deadline || null,
    });
    setBusy(false);
    if (!error) await load();
    return { error };
  };

  const update = async (id: string, patch: Partial<AppStrategyDraft>) => {
    setBusy(true);
    const { error } = await supabase
      .from("counsellor_app_strategies")
      .update({
        ...(patch.college_name !== undefined ? { college_name: patch.college_name.trim() } : {}),
        ...(patch.fit_tier !== undefined ? { fit_tier: patch.fit_tier } : {}),
        ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
        ...(patch.strategy_notes !== undefined
          ? { strategy_notes: patch.strategy_notes.trim() || null }
          : {}),
        ...(patch.deadline !== undefined ? { deadline: patch.deadline || null } : {}),
      })
      .eq("id", id);
    setBusy(false);
    if (!error) await load();
    return { error };
  };

  const remove = async (id: string) => {
    setBusy(true);
    const { error } = await supabase.from("counsellor_app_strategies").delete().eq("id", id);
    setBusy(false);
    if (!error) await load();
    return { error };
  };

  return { items, loading, busy, add, update, remove, reload: load };
}
