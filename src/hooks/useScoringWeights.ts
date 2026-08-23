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

/**
 * Default weights.
 *
 * These are *relative*, not percentages. They happen to sum to 100 because
 * that reads clearly in the admin UI, but nothing downstream may assume it:
 * consumers must normalize by the sum (see `normalizeWeights` in
 * `@/lib/outcomesScoring`). The Outcomes score used to treat them as absolute
 * percentages, so an admin who set all five to 30 made every student saturate
 * at 100, and all five to 5 capped everyone at 25.
 *
 * The shape — academics heaviest, then competitions and activities, then
 * leadership and testing — mirrors the `national` row of
 * `collegeCalibration.WEIGHTS`, which is what the dashboard reads against.
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  academics: 30,
  competitions: 20,
  activities: 20,
  leadership: 15,
  test_prep: 15,
};

const RECORD_NAME = "scoring_weights_v1";

const WEIGHT_KEYS = Object.keys(DEFAULT_SCORING_WEIGHTS) as (keyof ScoringWeights)[];

/**
 * Coerce whatever the admin row holds into usable weights.
 *
 * The row is free-form JSON, so a typo, a string, or a negative number all
 * reach the student side. A NaN weight silently poisoned every downstream
 * score to NaN; a negative one could push a category's contribution below
 * zero. Anything unusable falls back to that key's default rather than to
 * zero, so a single bad field cannot delete a whole category from the model.
 */
function sanitize(raw: Partial<ScoringWeights> | null | undefined): ScoringWeights {
  const out = { ...DEFAULT_SCORING_WEIGHTS };
  if (!raw || typeof raw !== "object") return out;
  for (const key of WEIGHT_KEYS) {
    const v = Number((raw as Record<string, unknown>)[key]);
    if (Number.isFinite(v) && v >= 0) out[key] = v;
  }
  // An all-zero set has no meaningful normalization and would make every
  // reading zero. Treat it as "unset".
  if (WEIGHT_KEYS.every((k) => out[k] === 0)) return { ...DEFAULT_SCORING_WEIGHTS };
  return out;
}

/**
 * Loads admin-managed scoring weights from `managed_content` and applies them
 * to student-side calculations (Outcomes reading, Journey Score, etc.).
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
        setWeights(sanitize(data.data as Partial<ScoringWeights>));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { weights, loading };
}
