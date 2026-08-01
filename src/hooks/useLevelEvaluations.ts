import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LevelId, STAGES_PER_LEVEL } from "@/lib/journeyLevels";

export type LevelEvaluationStatus = "generating" | "ready" | "failed";

export interface LevelEvaluation {
  id: string;
  level: number;
  status: LevelEvaluationStatus;
  score: number | null;
  verdict: string | null;
  summary: string | null;
  strengths: string[];
  gaps: string[];
  priorities: string[];
  evidence_count: number;
  model: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/** A level is finished once all 20 of its stages have been banked. */
export function isLevelComplete(level: LevelId, bankedStageIds: string[]): boolean {
  for (let sub = 1; sub <= STAGES_PER_LEVEL; sub++) {
    if (!bankedStageIds.includes(`${level}.${sub}`)) return false;
  }
  return true;
}

/**
 * Level-completion AI reports. Rows are written exclusively by the
 * `evaluate-level` edge function under the service role — the client only ever
 * reads them and asks for a generation, so a student can't grade themselves.
 */
export function useLevelEvaluations() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<LevelEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  // Levels this session has already fired a generation for, so the auto-trigger
  // can't stampede the edge function on every re-render.
  const requested = useRef<Set<number>>(new Set());

  const load = useCallback(async () => {
    if (!user) {
      setEvaluations([]);
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("level_evaluations")
      .select("*")
      .eq("user_id", user.id)
      .order("level", { ascending: true });
    setEvaluations((data ?? []) as LevelEvaluation[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime, so the report panel flips from "generating" to the finished
  // report without the student having to close and reopen the modal.
  useEffect(() => {
    if (!user) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase.channel(`level-eval-${user.id}-${suffix}`);
    try {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "level_evaluations", filter: `user_id=eq.${user.id}` },
        () => load()
      ).subscribe();
    } catch (e) {
      console.warn("level_evaluations realtime unavailable", e);
    }
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const getForLevel = useCallback(
    (level: number): LevelEvaluation | undefined => evaluations.find((e) => e.level === level),
    [evaluations]
  );

  /**
   * Ask the server for this level's report. Safe to call repeatedly — the edge
   * function returns the cached row unless `force` is set.
   */
  const generate = useCallback(async (level: number, force = false): Promise<{ error?: string }> => {
    if (!user) return { error: "Not signed in" };
    requested.current.add(level);

    // Optimistic in-flight state so the panel shows a spinner immediately,
    // rather than an empty box until the round-trip lands.
    if (force || !evaluations.some((e) => e.level === level && e.status === "ready")) {
      setEvaluations((prev) => {
        const next = prev.filter((e) => e.level !== level);
        const existing = prev.find((e) => e.level === level);
        return [...next, {
          ...(existing ?? {} as LevelEvaluation),
          id: existing?.id ?? `pending-${level}`,
          level,
          status: "generating",
          error: null,
        } as LevelEvaluation].sort((a, b) => a.level - b.level);
      });
    }

    try {
      const { data, error } = await supabase.functions.invoke("evaluate-level", {
        body: { level, force },
      });
      if (error) throw error;
      if (data?.evaluation) {
        setEvaluations((prev) => {
          const next = prev.filter((e) => e.level !== level);
          return [...next, data.evaluation as LevelEvaluation].sort((a, b) => a.level - b.level);
        });
      } else {
        await load();
      }
      return {};
    } catch (e: any) {
      console.error("evaluate-level failed", e);
      // The row may never have been written (function unreachable), so surface
      // the failure locally instead of leaving a permanent spinner.
      setEvaluations((prev) =>
        prev.map((ev) =>
          ev.level === level && ev.status === "generating"
            ? { ...ev, status: "failed", error: "Couldn't generate this report. Try again." }
            : ev
        )
      );
      requested.current.delete(level);
      return { error: "Couldn't generate this report. Try again." };
    }
  }, [user, evaluations, load]);

  /**
   * Fire-and-forget generation for a newly finished level. Called from the path
   * once a level's 20th stage is banked; no-ops if a report already exists or
   * one was already requested this session.
   */
  const ensureFor = useCallback((level: number) => {
    if (!user || loading) return;
    if (requested.current.has(level)) return;
    if (evaluations.some((e) => e.level === level && (e.status === "ready" || e.status === "generating"))) {
      requested.current.add(level);
      return;
    }
    void generate(level, false);
  }, [user, loading, evaluations, generate]);

  return { evaluations, loading, getForLevel, generate, ensureFor, reload: load };
}
