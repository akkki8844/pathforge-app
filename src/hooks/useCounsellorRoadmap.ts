import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CounsellorRoadmap {
  id: string;
  counsellor_id: string;
  student_id: string;
  monthly_focus: string | null;
  long_term_plan: string | null;
  focus_areas: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoadmapDraft {
  monthly_focus: string;
  long_term_plan: string;
  focus_areas: string[];
  notes: string;
}

const FOCUS_AREA_OPTIONS = [
  "Academics",
  "Standardized Tests",
  "Leadership",
  "Competitions",
  "Research",
  "Community Impact",
  "Essays & Application",
  "Portfolio / Projects",
] as const;

export function getFocusAreaOptions() {
  return FOCUS_AREA_OPTIONS;
}

export function useCounsellorRoadmap(studentId?: string) {
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState<CounsellorRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user || !studentId) {
      setRoadmap(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("counsellor_roadmaps")
      .select("*")
      .eq("counsellor_id", user.id)
      .eq("student_id", studentId)
      .maybeSingle();
    setRoadmap((data as CounsellorRoadmap | null) ?? null);
    setLoading(false);
  }, [user, studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (draft: RoadmapDraft) => {
    if (!user || !studentId) return { error: new Error("Missing context") };
    setSaving(true);
    const payload = {
      counsellor_id: user.id,
      student_id: studentId,
      monthly_focus: draft.monthly_focus.trim() || null,
      long_term_plan: draft.long_term_plan.trim() || null,
      focus_areas: draft.focus_areas,
      notes: draft.notes.trim() || null,
    };
    const { error } = await supabase
      .from("counsellor_roadmaps")
      .upsert(payload, { onConflict: "counsellor_id,student_id" });
    setSaving(false);
    if (!error) await load();
    return { error };
  };

  return { roadmap, loading, saving, save, reload: load };
}
