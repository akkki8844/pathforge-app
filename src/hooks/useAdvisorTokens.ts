import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The advisor's monthly token budget.
 *
 * Separate from `useCredits` on purpose: the advisor spends tokens, everything
 * else in the app spends credits, and conflating them in one hook is how a
 * meter ends up showing the wrong pool. See
 * `supabase/migrations/20260810120000_advisor_token_budget.sql` for the rates.
 *
 * `advisor_tokens_status()` is the only read path — it rolls the monthly window
 * as a side effect, so a user who has been away for two months sees a fresh
 * balance the moment they open the page rather than after their next message.
 */

export interface AdvisorTokenStatus {
  /** Admins and demo accounts. The meter is hidden rather than pinned at zero. */
  unlimited: boolean;
  used: number;
  allowance: number;
  remaining: number;
  /** When the current window rolls over. Null until the first read lands. */
  resetsAt: Date | null;
}

const EMPTY: AdvisorTokenStatus = {
  unlimited: false,
  used: 0,
  allowance: 0,
  remaining: 0,
  resetsAt: null,
};

function parse(row: Record<string, unknown> | null): AdvisorTokenStatus {
  if (!row) return EMPTY;
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
  const resets = typeof row.resets_at === "string" ? new Date(row.resets_at) : null;
  return {
    unlimited: row.unlimited === true,
    used: num(row.used),
    allowance: num(row.allowance),
    remaining: num(row.remaining),
    resetsAt: resets && !Number.isNaN(resets.getTime()) ? resets : null,
  };
}

export function useAdvisorTokens() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AdvisorTokenStatus>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus(EMPTY);
      setLoading(false);
      return;
    }
    // `as any`: advisor_tokens_status is newer than the checked-in generated
    // types, which cannot be regenerated without an interactive supabase login.
    const { data } = await supabase.rpc("advisor_tokens_status" as any);
    setStatus(parse(data as Record<string, unknown> | null));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Apply the balance the edge function returned with a finished turn.
   *
   * The `done` frame already carries the post-charge numbers, so the meter can
   * move the instant the answer lands instead of after a round trip. Anything
   * missing from the payload is left alone rather than zeroed — a partial
   * frame should not blank the meter.
   */
  const applyServerBalance = useCallback((payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    const row = payload as Record<string, unknown>;
    if (row.unlimited === true) return;
    setStatus((prev) => {
      const next = { ...prev };
      if (row.used != null) next.used = Number(row.used) || 0;
      if (row.allowance != null) next.allowance = Number(row.allowance) || 0;
      if (row.remaining != null) next.remaining = Number(row.remaining) || 0;
      return next;
    });
  }, []);

  return { status, loading, refresh, applyServerBalance };
}

/** 24,500 → "24.5k". Meters are read at a glance, not audited. */
export function formatTokens(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n < 1000) return String(Math.max(0, Math.round(n)));
  const k = n / 1000;
  return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
}
