import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CreditData {
  plan: string;
  creditsUsed: number;
  maxCredits: number;
  bonusCredits: number;
  lastResetAt: string;
  /** Which bucket governs this account: free bills daily, paid plans monthly. */
  period: "day" | "month";
  /** When the governing bucket next refills. */
  periodResetAt: string;
  isAdmin?: boolean;
  /** When the current plan (if paid) stops being active. Null on free/admin. */
  planExpiresAt: string | null;
  /** A plan tier unlocked by a coupon but not yet claimed — shown as $0 on /pricing. */
  freePlanGrant: string | null;
  freePlanGrantDays: number | null;
}

// Global event for credit consumption — any page can dispatch this
export function notifyCreditConsumed() {
  window.dispatchEvent(new CustomEvent("credit-consumed"));
}

interface CreditsContextValue {
  creditData: CreditData | null;
  loading: boolean;
  creditsRemaining: number;
  dailyRemaining: number;
  totalCapacity: number;
  totalUsed: number;
  usagePercent: number;
  useCredit: () => Promise<boolean>;
  consumeCredit: () => Promise<boolean>;
  getResetTime: () => string;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (v: boolean) => void;
  refreshCredits: () => Promise<void>;
  /** Activates a coupon-unlocked plan for $0. No payment gateway involved. */
  claimFreePlan: () => Promise<{ success: boolean; error?: string; plan?: string }>;
  /** Self-serve move to a lower tier (or free). No payment gateway involved. */
  switchPlan: (target: "free" | "pro" | "max") => Promise<{ success: boolean; error?: string; plan?: string }>;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

// Single shared fetch + realtime subscription for the whole app, instead of
// every consumer (CreditMeter, Resume, Pricing, PlacementTest, etc.) opening
// its own Supabase channel and firing its own get_credits round-trip.
export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [creditData, setCreditData] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
        creditsUsed: 0,
        maxCredits: 999999,
        bonusCredits: 0,
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
        const d = data as {
          plan: string; credits_used_today: number; max_daily_credits: number;
          bonus_credits: number; last_reset_at: string;
          period?: "day" | "month"; period_reset_at?: string; is_admin?: boolean;
          plan_expires_at?: string | null;
          free_plan_grant?: string | null;
          free_plan_grant_days?: number | null;
        };
        setCreditData({
          plan: d.plan,
          creditsUsed: d.credits_used_today,
          maxCredits: d.max_daily_credits,
          bonusCredits: d.bonus_credits ?? 0,
          lastResetAt: d.last_reset_at,
          period: d.period ?? "day",
          periodResetAt:
            d.period_reset_at ??
            new Date(new Date(d.last_reset_at).getTime() + 864e5).toISOString(),
          isAdmin: d.is_admin === true,
          planExpiresAt: d.plan_expires_at ?? null,
          freePlanGrant: d.free_plan_grant ?? null,
          freePlanGrantDays: d.free_plan_grant_days ?? null,
        });
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

  // Monthly bucket + remaining daily free = total available now
  const dailyRemaining = creditData ? Math.max(0, creditData.maxCredits - creditData.creditsUsed) : 0;
  const creditsRemaining = creditData ? creditData.bonusCredits + dailyRemaining : 0;
  const totalCapacity = creditData ? creditData.bonusCredits + creditData.maxCredits : 0;
  const totalUsed = creditData ? Math.max(0, totalCapacity - creditsRemaining) : 0;
  const usagePercent = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

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
    const { data, error } = await supabase.rpc("consume_credit");
    if (error) {
      console.error("consume_credit error:", error);
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
    creditsRemaining,
    dailyRemaining,
    totalCapacity,
    totalUsed,
    usagePercent,
    useCredit,
    consumeCredit,
    getResetTime,
    showUpgradeModal,
    setShowUpgradeModal,
    refreshCredits: fetchCredits,
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
