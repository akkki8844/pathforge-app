import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Admin-tunable weight categories (must match AdminAIControl.tsx)
export interface ScoringWeights {
  academics: number;
  competitions: number;
  activities: number;
  leadership: number;
  test_prep: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  academics: 30,
  competitions: 20,
  activities: 20,
  leadership: 15,
  test_prep: 15,
};

const RECORD_NAME = "scoring_weights_v1";

/**
 * Loads admin-managed scoring weights from `managed_content` and applies them
 * to student-side calculations (Outcomes CRS, Journey Score, etc.).
 * Falls back to defaults silently when the row is absent or unreadable.
 */
export function useScoringWeights() {
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_SCORING_WEIGHTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("managed_content")
        .select("data")
        .eq("content_type", "ai_weights")
        .eq("name", RECORD_NAME)
        .eq("is_active", true)
        .maybeSingle();
      if (!cancelled && data?.data) {
        setWeights({ ...DEFAULT_SCORING_WEIGHTS, ...(data.data as Partial<ScoringWeights>) });
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { weights, loading };
}
