import { useMemo } from "react";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { planTierFromString, tierSatisfies, type PlanTier } from "@/lib/plans";

/**
 * Resolves the current user's plan tier (free / pro / max) from their credit
 * plan, plus a helper to test access against a required tier.
 *
 * Source of truth is the server `plan` string returned by get_credits (surfaced
 * through useCredits). Admins are treated as top tier.
 */
export function usePlanTier() {
  const { creditData } = useCredits();
  const { isAdmin } = useAuth();

  const tier: PlanTier = useMemo(() => {
    if (isAdmin) return "max";
    return planTierFromString(creditData?.plan);
  }, [creditData?.plan, isAdmin]);

  const has = useMemo(
    () => (required: PlanTier) => tierSatisfies(tier, required),
    [tier]
  );

  return { tier, has };
}
