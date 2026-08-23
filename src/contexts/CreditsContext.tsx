import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CreditData {
  plan: string;
  /** Admins only — every real plan (free, Pro, Max) is metered. */
  unlimited: boolean;
  creditsUsed: number;
  maxCredits: number;
  bonusCredits: number;
  /**
   * Bonus credits spent inside the CURRENT window, from the server.
   *
   * Without this the meter cannot be drawn: `bonusCredits` is a live balance,
   * so it cancels out of `capacity - remaining` and the ratio collapses to the
   * plan bucket alone. See 20260808120400_bonus_credit_accounting.sql.
   */
  bonusCreditsUsed: number;
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
  creditsGranted: number;
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

// Global event for credit consumption — any page can dispatch this
export function notifyCreditConsumed() {
  window.dispatchEvent(new CustomEvent("credit-consumed"));
}

interface CreditsContextValue {
  creditData: CreditData | null;
  loading: boolean;
  /** True for admins only. Nothing below it is a limit. */
  unlimited: boolean;
  creditsRemaining: number;
  /** Credits left in the governing plan bucket (excludes the bonus wallet). */
  dailyRemaining: number;
  totalCapacity: number;
  totalUsed: number;
  usagePercent: number;
  /** "day" | "month" — which bucket the numbers above describe. */
  period: "day" | "month";
  /** Ready-made adjective for that bucket: "daily" or "monthly". */
  periodLabel: "daily" | "monthly";
  useCredit: () => Promise<boolean>;
  consumeCredit: () => Promise<boolean>;
  getResetTime: () => string;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (v: boolean) => void;
  refreshCredits: () => Promise<void>;
  /** Redeem a coupon code and reflect the result immediately. */
  redeemCoupon: (code: string) => Promise<RedeemCouponResult>;
  /** Activates a coupon-unlocked plan for $0. No payment gateway involved. */
  claimFreePlan: () => Promise<{ success: boolean; error?: string; plan?: string }>;
  /** Self-serve move to a lower tier (or free). No payment gateway involved. */
  switchPlan: (target: "free" | "pro" | "max") => Promise<{ success: boolean; error?: string; plan?: string }>;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

/** Shape of the `get_credits` RPC payload. */
type CreditsRpcRow = {
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

function toCreditData(d: CreditsRpcRow): CreditData {
  return {
    plan: d.plan,
    unlimited: d.unlimited === true || d.is_admin === true,
    creditsUsed: d.credits_used_today,
    maxCredits: d.max_daily_credits,
    bonusCredits: d.bonus_credits ?? 0,
    bonusCreditsUsed: Math.max(0, d.bonus_credits_used ?? 0),
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
// every consumer (CreditMeter, Resume, Pricing, PlacementTest, etc.) opening
// its own Supabase channel and firing its own get_credits round-trip.
export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [creditData, setCreditData] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  /**
   * Guards the auto-claim below so a grant is only ever redeemed once per
   * session, whatever re-render or realtime event re-runs the fetch.
   */
  const autoClaimedRef = useRef<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCreditData(null);
      setLoading(false);
      return;
    }
    // Admins skip credits entirely — no fetch, no UI.
    if (isAdmin) {
      setCreditData({
        plan: "admin",
        unlimited: true,
        creditsUsed: 0,
        maxCredits: 999999,
        bonusCredits: 0,
        bonusCreditsUsed: 0,
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
        console.error("Error fetching credits:", error);
        setLoading(false);
        return;
      }
      if (data) {
        // credits_used_today / max_daily_credits are the generic "used /
        // capacity" pair — for paid plans the server fills them from the
        // monthly bucket. `period` says which one you're actually looking at.
        let row = data as CreditsRpcRow;

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
            if (fresh) row = fresh as CreditsRpcRow;
          }
        }

        setCreditData(toCreditData(row));
      }
    } catch (error) {
      console.warn("Credits unavailable:", error);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  useEffect(() => {
    const handler = () => { setTimeout(fetchCredits, 500); };
    window.addEventListener("credit-consumed", handler);
    return () => window.removeEventListener("credit-consumed", handler);
  }, [fetchCredits]);

  // Realtime: refresh immediately when admins adjust this user's credits/plan.
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
        .channel(`user_credits:${user.id}:${suffix}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_credits", filter: `user_id=eq.${user.id}` },
          () => { fetchCredits(); }
        )
        .subscribe();
    } catch (error) {
      console.warn("Credit realtime disabled:", error);
    }

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [user, isAdmin, fetchCredits]);

  /*
   * Meter arithmetic.
   *
   * The previous version computed `totalUsed = totalCapacity - creditsRemaining`,
   * which algebraically cancels `bonusCredits` out of both sides and reduces to
   * `min(creditsUsed, maxCredits)`. Spending a bonus credit therefore shrank the
   * denominator while the numerator stood still: the ring read 0% for a user
   * burning through a 500-credit coupon, then lurched the instant the plan
   * bucket was finally touched.
   *
   * The server now reports how much of the bonus wallet was spent in this
   * window, so capacity can be stated the only way that stays self-consistent:
   * what you have spent, plus what you have left.
   */
  const planRemaining = creditData ? Math.max(0, creditData.maxCredits - creditData.creditsUsed) : 0;
  const bonusUsed = creditData ? Math.max(0, creditData.bonusCreditsUsed) : 0;
  const creditsRemaining = creditData ? creditData.bonusCredits + planRemaining : 0;
  const totalUsed = creditData ? Math.min(creditData.creditsUsed, creditData.maxCredits) + bonusUsed : 0;
  const totalCapacity = creditData ? totalUsed + creditsRemaining : 0;
  const unlimited = creditData?.unlimited === true;
  // An unmetered account has no ratio to draw. Reporting 0 rather than a live
  // percentage keeps every "running low" / "out of credits" branch downstream
  // from firing on a plan that cannot run out.
  const usagePercent = unlimited ? 0 : totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

  const period = creditData?.period ?? "day";
  const periodLabel: "daily" | "monthly" = period === "month" ? "monthly" : "daily";

  const useCredit = useCallback(async (): Promise<boolean> => {
    if (isAdmin) return true;
    if (!user || !creditData) return false;
    if (creditsRemaining <= 0) {
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  }, [user, creditData, creditsRemaining, isAdmin]);

  /**
   * Server-authoritative credit consumption. Admins bypass entirely.
   */
  const consumeCredit = useCallback(async (): Promise<boolean> => {
    if (isAdmin) return true;
    if (!user) return false;
    if (creditsRemaining <= 0) {
      setShowUpgradeModal(true);
      return false;
    }
    const { data, error } = await supabase.rpc("consume_credit", { _feature_type: "placement_test" });
    if (error) {
      // A genuine RPC/database failure, not a considered "you have no credits"
      // answer from the function itself — don't show the upgrade modal for this.
      console.error("consume_credit error:", error);
      toast.error("Something went wrong — please try again.");
      return false;
    }
    if (data === false) {
      setShowUpgradeModal(true);
      await fetchCredits();
      return false;
    }
    await fetchCredits();
    return true;
  }, [user, creditsRemaining, fetchCredits, isAdmin]);

  /**
   * One redemption path for both /pricing and Settings > Billing, so the two
   * can't drift on what a successful redemption means.
   */
  const redeemCoupon = useCallback(async (code: string): Promise<RedeemCouponResult> => {
    const empty: RedeemCouponResult = {
      success: false, creditsGranted: 0, planActivated: false, planTier: null,
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

    await fetchCredits();

    return {
      success: true,
      code: res.code || trimmed.toUpperCase(),
      creditsGranted: res.credits_granted ?? 0,
      // `plan_activated` is the new, explicit flag; fall back to the presence
      // of `plan_unlocked` so a not-yet-migrated database still behaves.
      planActivated: res.plan_activated ?? !!res.plan_unlocked,
      planTier: res.plan_unlocked ?? null,
      planExpiresAt: res.plan_expires_at ?? null,
      planKept: res.plan_kept ?? null,
    };
  }, [user, fetchCredits]);

  const claimFreePlan = useCallback(async () => {
    if (!user) return { success: false, error: "Not signed in" };
    const { data, error } = await supabase.rpc("claim_free_plan");
    if (error) return { success: false, error: error.message };
    const result = data as { success: boolean; error?: string; plan?: string };
    if (result?.success) await fetchCredits();
    return result;
  }, [user, fetchCredits]);

  const switchPlan = useCallback(async (target: "free" | "pro" | "max") => {
    if (!user) return { success: false, error: "Not signed in" };
    const { data, error } = await supabase.rpc("switch_plan", { _target_plan: target });
    if (error) return { success: false, error: error.message };
    const result = data as { success: boolean; error?: string; plan?: string };
    if (result?.success) await fetchCredits();
    return result;
  }, [user, fetchCredits]);

  const getResetTime = useCallback(() => {
    if (!creditData) return "";
    const diff = new Date(creditData.periodResetAt).getTime() - Date.now();
    if (diff <= 0) return "Resetting...";
    // A monthly bucket counted in hours reads as noise ("718h 4m"), so paid
    // plans get days and free plans keep the precise hour/minute countdown.
    if (creditData.period === "month") {
      const days = Math.ceil(diff / 864e5);
      return `${days}d`;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, [creditData]);

  const value: CreditsContextValue = {
    creditData,
    loading,
    unlimited,
    creditsRemaining,
    dailyRemaining: planRemaining,
    totalCapacity,
    totalUsed,
    usagePercent,
    period,
    periodLabel,
    useCredit,
    consumeCredit,
    getResetTime,
    showUpgradeModal,
    setShowUpgradeModal,
    refreshCredits: fetchCredits,
    redeemCoupon,
    claimFreePlan,
    switchPlan,
  };

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>;
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error("useCredits must be used within a CreditsProvider");
  return ctx;
}
