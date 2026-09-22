import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Plan usage, stated as a percentage of the allowance.
 *
 * This replaces the credit system. Credits were a currency the student had to
 * learn before they could answer the only question they ever actually asked —
 * "how much have I got left?" — and the answer changed units depending on where
 * you stood: a daily bucket on free, a monthly one on paid, plus a bonus wallet
 * that lived outside both. A percentage is the same answer in one unit that
 * needs no explanation and does not drift between plans.
 *
 * The server still meters in discrete units, because 16 edge functions and the
 * billing webhooks are built on `consume_credit` / `get_credits` and those are
 * the accounting substrate. Nothing below exposes that unit. `used` and
 * `capacity` are kept internal precisely so no surface can start printing them
 * again — every consumer reads a percentage.
 */

interface UsageData {
  plan: string;
  /** Admins only — every real plan (free, Pro, Max) is metered. */
  unlimited: boolean;
  /** Internal accounting units. Never rendered — percentages are the contract. */
  used: number;
  capacity: number;
  lastResetAt: string;
  /** Which bucket governs this account: free bills daily, paid plans monthly. */
  period: "day" | "month";
  /** When the governing bucket next refills. */
  periodResetAt: string;
  isAdmin?: boolean;
  /** When the current plan (if paid) stops being active. Null on free/admin. */
  planExpiresAt: string | null;
  /** A plan tier unlocked by a coupon but not yet claimed — legacy two-step flow. */
  freePlanGrant: string | null;
  freePlanGrantDays: number | null;
}

/** Outcome of a coupon redemption, normalised for the UI. */
export interface RedeemCouponResult {
  success: boolean;
  error?: string;
  code?: string;
  /** True when the code widened the allowance (the old "credits granted"). */
  allowanceIncreased: boolean;
  /** True when this code put the user on a (new or extended) paid plan. */
  planActivated: boolean;
  /** The plan tier now active because of this code, if any. */
  planTier: string | null;
  planExpiresAt: string | null;
  /**
   * Set when the code granted a LOWER tier than the user already held, so the
   * server declined to apply it. The UI should say so rather than go quiet.
   */
  planKept: string | null;
}

/** Global event — any page can announce that it just spent some allowance. */
export function notifyUsageConsumed() {
  window.dispatchEvent(new CustomEvent("usage-consumed"));
}

interface UsageContextValue {
  usageData: UsageData | null;
  loading: boolean;
  /** True for admins only. Nothing below it is a limit. */
  unlimited: boolean;
  /** 0–100. The single number every usage surface renders. */
  percentUsed: number;
  /** 0–100. What is left of the allowance. */
  percentRemaining: number;
  /** False once the allowance is spent — the gate every feature checks. */
  hasAllowance: boolean;
  /** "day" | "month" — which bucket the numbers above describe. */
  period: "day" | "month";
  /** Ready-made adjective for that bucket: "daily" or "monthly". */
  periodLabel: "daily" | "monthly";
  /** Cheap client-side gate. Opens the upgrade modal when nothing is left. */
  checkAllowance: () => Promise<boolean>;
  /** Server-authoritative spend. */
  consumeUsage: () => Promise<boolean>;
  /** Countdown to the refill, e.g. "3h 20m" or "12d". */
  getResetTime: () => string;
  /** Absolute refill moment, e.g. "Resets Fri 6:30 AM". */
  getResetLabel: () => string;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (v: boolean) => void;
  refreshUsage: () => Promise<void>;
  /** Redeem a coupon code and reflect the result immediately. */
  redeemCoupon: (code: string) => Promise<RedeemCouponResult>;
  /** Activates a coupon-unlocked plan for $0. No payment gateway involved. */
  claimFreePlan: () => Promise<{ success: boolean; error?: string; plan?: string }>;
  /** Self-serve move to a lower tier (or free). No payment gateway involved. */
  switchPlan: (target: "free" | "pro" | "max") => Promise<{ success: boolean; error?: string; plan?: string }>;
}

const UsageContext = createContext<UsageContextValue | null>(null);

/** Shape of the `get_credits` RPC payload — the server's accounting units. */
type UsageRpcRow = {
  plan: string;
  credits_used_today: number;
  max_daily_credits: number;
  bonus_credits: number;
  bonus_credits_used?: number;
  last_reset_at: string;
  period?: "day" | "month";
  period_reset_at?: string;
  is_admin?: boolean;
  unlimited?: boolean;
  plan_expires_at?: string | null;
  free_plan_grant?: string | null;
  free_plan_grant_days?: number | null;
};

/**
 * Collapse the server's three buckets (plan allowance, plan spend, bonus
 * wallet) into one used/capacity pair.
 *
 * Capacity has to be stated as "what you have spent plus what you have left",
 * not "allowance minus remaining": the bonus wallet is a live balance, so it
 * cancels out of the subtraction and the ratio silently collapses to the plan
 * bucket alone. That is the bug that made the meter read 0% for someone
 * burning through a coupon and then lurch the moment the plan bucket was
 * finally touched. See 20260808120400_bonus_credit_accounting.sql.
 */
function toUsageData(d: UsageRpcRow): UsageData {
  const planAllowance = d.max_daily_credits ?? 0;
  const planSpent = Math.min(d.credits_used_today ?? 0, planAllowance);
  const planLeft = Math.max(0, planAllowance - (d.credits_used_today ?? 0));
  const bonusLeft = d.bonus_credits ?? 0;
  const bonusSpent = Math.max(0, d.bonus_credits_used ?? 0);

  const used = planSpent + bonusSpent;
  const capacity = used + bonusLeft + planLeft;

  return {
    plan: d.plan,
    unlimited: d.unlimited === true || d.is_admin === true,
    used,
    capacity,
    lastResetAt: d.last_reset_at,
    period: d.period ?? "day",
    periodResetAt:
      d.period_reset_at ??
      new Date(new Date(d.last_reset_at).getTime() + 864e5).toISOString(),
    isAdmin: d.is_admin === true,
    planExpiresAt: d.plan_expires_at ?? null,
    freePlanGrant: d.free_plan_grant ?? null,
    freePlanGrantDays: d.free_plan_grant_days ?? null,
  };
}

// Single shared fetch + realtime subscription for the whole app, instead of
// every consumer (the settings meter, Resume, Pricing, PlacementTest, ...)
// opening its own Supabase channel and firing its own round-trip.
export function UsageProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  /**
   * Guards the auto-claim below so a grant is only ever redeemed once per
   * session, whatever re-render or realtime event re-runs the fetch.
   */
  const autoClaimedRef = useRef<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setUsageData(null);
      setLoading(false);
      return;
    }
    // Admins are unmetered — no fetch, no meter.
    if (isAdmin) {
      setUsageData({
        plan: "admin",
        unlimited: true,
        used: 0,
        capacity: 0,
        lastResetAt: new Date().toISOString(),
        period: "month",
        periodResetAt: new Date(Date.now() + 30 * 864e5).toISOString(),
        isAdmin: true,
        planExpiresAt: null,
        freePlanGrant: null,
        freePlanGrantDays: null,
      });
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc("get_credits");
      if (error) {
        /*
         * 42501 is "permission denied for function get_credits", and it is an
         * expired session rather than a fault. `get_credits()` grants EXECUTE
         * to `authenticated` and deliberately not to `anon`, so once the JWT
         * lapses PostgREST runs the call as anon and refuses it — while `user`
         * is still set in React state, which is why the guard above does not
         * catch it. The auth layer refreshes and the next fetch succeeds.
         *
         * It mattered because `console.error` within a few seconds of a click
         * is exactly what the bug reporter treats as user-visible, so a lapsed
         * token raised a red banner about a thing that fixed itself. Logged as
         * a warning so it is still visible in the console without being
         * captured.
         */
        if ((error as { code?: string }).code === "42501") {
          console.warn("Usage unavailable: session not authenticated yet");
        } else {
          console.error("Error fetching usage:", error);
        }
        setLoading(false);
        return;
      }
      if (data) {
        let row = data as UsageRpcRow;

        /*
         * Self-healing for the old two-step redemption flow.
         *
         * Redeeming a plan coupon used to only *unlock* the tier; the user then
         * had to find a "$0" button on /pricing and press it. Nobody did, so
         * coupons visibly did nothing. `redeem_coupon` now applies the plan on
         * the spot, but rows written before that fix still carry an unclaimed
         * `free_plan_grant`. Claim it here rather than making the user hunt for
         * a button that shouldn't have existed.
         */
        const pending = row.free_plan_grant ?? null;
        if (pending && autoClaimedRef.current !== pending) {
          autoClaimedRef.current = pending;
          const { data: claimed, error: claimError } = await supabase.rpc("claim_free_plan");
          if (!claimError && (claimed as { success?: boolean } | null)?.success) {
            const { data: fresh } = await supabase.rpc("get_credits");
            if (fresh) row = fresh as UsageRpcRow;
          }
        }

        setUsageData(toUsageData(row));
      }
    } catch (error) {
      console.warn("Usage unavailable:", error);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  useEffect(() => {
    const handler = () => { setTimeout(fetchUsage, 500); };
    window.addEventListener("usage-consumed", handler);
    return () => window.removeEventListener("usage-consumed", handler);
  }, [fetchUsage]);

  // Realtime: refresh immediately when admins adjust this user's allowance/plan.
  useEffect(() => {
    if (!user || isAdmin) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      // Use a unique topic per provider instance. Reusing the same topic can
      // return an already-subscribed realtime channel, and Supabase throws if
      // callbacks are added after subscribe(), which blanked the app for
      // signed-in users.
      const suffix =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      channel = supabase
        .channel(`user_usage:${user.id}:${suffix}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_credits", filter: `user_id=eq.${user.id}` },
          () => { fetchUsage(); }
        )
        .subscribe();
    } catch (error) {
      console.warn("Usage realtime disabled:", error);
    }

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [user, isAdmin, fetchUsage]);

  const unlimited = usageData?.unlimited === true;
  // An unmetered account has no ratio to draw. Reporting 0 rather than a live
  // percentage keeps every "running low" / "out of allowance" branch downstream
  // from firing on a plan that cannot run out.
  const percentUsed =
    unlimited || !usageData || usageData.capacity <= 0
      ? 0
      : Math.min(100, (usageData.used / usageData.capacity) * 100);
  const percentRemaining = unlimited ? 100 : Math.max(0, 100 - percentUsed);
  const hasAllowance = unlimited || !usageData ? true : usageData.used < usageData.capacity;

  const period = usageData?.period ?? "day";
  const periodLabel: "daily" | "monthly" = period === "month" ? "monthly" : "daily";

  const checkAllowance = useCallback(async (): Promise<boolean> => {
    if (isAdmin) return true;
    if (!user || !usageData) return false;
    if (!hasAllowance) {
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  }, [user, usageData, hasAllowance, isAdmin]);

  /**
   * Server-authoritative spend. Admins bypass entirely.
   */
  const consumeUsage = useCallback(async (): Promise<boolean> => {
    if (isAdmin) return true;
    if (!user) return false;
    if (!hasAllowance) {
      setShowUpgradeModal(true);
      return false;
    }
    const { data, error } = await supabase.rpc("consume_credit", { _feature_type: "placement_test" });
    if (error) {
      // A genuine RPC/database failure, not a considered "you have nothing
      // left" answer from the function itself — don't show the upgrade modal.
      console.error("usage spend error:", error);
      toast.error("Something went wrong — please try again.");
      return false;
    }
    if (data === false) {
      setShowUpgradeModal(true);
      await fetchUsage();
      return false;
    }
    await fetchUsage();
    return true;
  }, [user, hasAllowance, fetchUsage, isAdmin]);

  /**
   * One redemption path for both /pricing and Settings > Billing, so the two
   * can't drift on what a successful redemption means.
   */
  const redeemCoupon = useCallback(async (code: string): Promise<RedeemCouponResult> => {
    const empty: RedeemCouponResult = {
      success: false, allowanceIncreased: false, planActivated: false, planTier: null,
      planExpiresAt: null, planKept: null,
    };
    if (!user) return { ...empty, error: "Please sign in to redeem a coupon." };

    const trimmed = code.trim();
    if (!trimmed) return { ...empty, error: "Enter a coupon code." };

    const { data, error } = await supabase.rpc("redeem_coupon", { _code: trimmed });
    if (error) return { ...empty, error: error.message };

    const res = data as {
      success?: boolean; error?: string; code?: string;
      credits_granted?: number; plan_unlocked?: string | null;
      plan_activated?: boolean; plan_expires_at?: string | null;
      plan_kept?: string | null;
    } | null;

    if (!res?.success) return { ...empty, error: res?.error || "That code couldn't be redeemed." };

    await fetchUsage();

    return {
      success: true,
      code: res.code || trimmed.toUpperCase(),
      // The server still answers in accounting units; the UI only needs to know
      // that the allowance got wider, never by how many of a unit nobody sees.
      allowanceIncreased: (res.credits_granted ?? 0) > 0,
      // `plan_activated` is the new, explicit flag; fall back to the presence
      // of `plan_unlocked` so a not-yet-migrated database still behaves.
      planActivated: res.plan_activated ?? !!res.plan_unlocked,
      planTier: res.plan_unlocked ?? null,
      planExpiresAt: res.plan_expires_at ?? null,
      planKept: res.plan_kept ?? null,
    };
  }, [user, fetchUsage]);

  const claimFreePlan = useCallback(async () => {
    if (!user) return { success: false, error: "Not signed in" };
    const { data, error } = await supabase.rpc("claim_free_plan");
    if (error) return { success: false, error: error.message };
    const result = data as { success: boolean; error?: string; plan?: string };
    if (result?.success) await fetchUsage();
    return result;
  }, [user, fetchUsage]);

  const switchPlan = useCallback(async (target: "free" | "pro" | "max") => {
    if (!user) return { success: false, error: "Not signed in" };
    const { data, error } = await supabase.rpc("switch_plan", { _target_plan: target });
    if (error) return { success: false, error: error.message };
    const result = data as { success: boolean; error?: string; plan?: string };
    if (result?.success) await fetchUsage();
    return result;
  }, [user, fetchUsage]);

  const getResetTime = useCallback(() => {
    if (!usageData) return "";
    const diff = new Date(usageData.periodResetAt).getTime() - Date.now();
    if (diff <= 0) return "Resetting...";
    // A monthly bucket counted in hours reads as noise ("718h 4m"), so paid
    // plans get days and free plans keep the precise hour/minute countdown.
    if (usageData.period === "month") {
      const days = Math.ceil(diff / 864e5);
      return `${days}d`;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, [usageData]);

  /**
   * The absolute moment rather than the countdown. A countdown answers "how
   * long", which is the wrong question when you are deciding whether to wait —
   * "Resets Fri 6:30 AM" is something you can plan around.
   */
  const getResetLabel = useCallback(() => {
    if (!usageData) return "";
    const at = new Date(usageData.periodResetAt);
    if (Number.isNaN(at.getTime())) return "";
    const soon = at.getTime() - Date.now() < 36 * 60 * 60 * 1000;
    return `Resets ${at.toLocaleString(undefined, {
      weekday: soon ? "short" : undefined,
      month: soon ? undefined : "short",
      day: soon ? undefined : "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }, [usageData]);

  const value: UsageContextValue = {
    usageData,
    loading,
    unlimited,
    percentUsed,
    percentRemaining,
    hasAllowance,
    period,
    periodLabel,
    checkAllowance,
    consumeUsage,
    getResetTime,
    getResetLabel,
    showUpgradeModal,
    setShowUpgradeModal,
    refreshUsage: fetchUsage,
    redeemCoupon,
    claimFreePlan,
    switchPlan,
  };

  return <UsageContext.Provider value={value}>{children}</UsageContext.Provider>;
}

export function useUsage() {
  const ctx = useContext(UsageContext);
  if (!ctx) throw new Error("useUsage must be used within a UsageProvider");
  return ctx;
}
