import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "@/contexts/UsageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlanTier } from "@/hooks/usePlanTier";
import { PLANS, PLAN_RANK, discountPercent, usageLabel, planDisplayName } from "@/lib/plans";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CouponSuccessModal } from "@/components/CouponSuccessModal";
import { TierPlanCard } from "@/components/pricing/TierPlanCard";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";

export function BillingSection() {
  const { user } = useAuth();
  const {
    usageData, percentUsed, periodLabel, unlimited,
    claimFreePlan, redeemCoupon,
  } = useUsage();
  const { subscription, isActive } = useSubscription();
  const { tier: currentTier } = usePlanTier();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [history, setHistory] = useState<{ code: string; credits_granted: number; redeemed_at: string }[]>([]);
  const [couponSuccess, setCouponSuccess] = useState<{
    code: string; planName: string | null; planTier: string | null; planAllowanceLabel: string | null;
    allowanceIncreased: boolean; planActive: boolean;
  } | null>(null);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("coupon_redemptions" as any)
      .select("code, credits_granted, redeemed_at")
      .eq("user_id", user.id)
      .order("redeemed_at", { ascending: false })
      .limit(10);
    setHistory((data as any) || []);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadHistory(); }, [user]);

  const redeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      // Shared with /pricing via the usage context, which also refreshes the
      // plan so the cards below re-render as "Current plan" straight away.
      const result = await redeemCoupon(code);
      if (!result.success) {
        toast({ variant: "destructive", title: "Couldn't redeem", description: result.error });
        return;
      }
      setCode("");
      await loadHistory();

      if (!result.planTier && result.planKept) {
        const kept = PLANS.find((p) => p.tier === result.planKept);
        toast({
          title: "Code applied",
          description: `You're already on ${kept?.name || result.planKept}, which is better than this code grants — your plan is unchanged.`,
        });
        return;
      }

      const unlockedPlan = result.planTier ? PLANS.find((p) => p.tier === result.planTier) : undefined;
      setCouponSuccess({
        code: result.code || code.trim().toUpperCase(),
        planName: unlockedPlan?.name || result.planTier || null,
        planTier: result.planTier,
        planAllowanceLabel: unlockedPlan ? usageLabel(unlockedPlan) : null,
        allowanceIncreased: result.allowanceIncreased,
        planActive: result.planActivated,
      });
    } finally {
      setRedeeming(false);
    }
  };

  const handleClaimFreePlan = async () => {
    setClaiming(true);
    try {
      const result = await claimFreePlan();
      if (!result.success) {
        toast({ variant: "destructive", title: "Couldn't activate", description: result.error || "Try again in a moment." });
        return;
      }
      toast({ title: "Plan activated", description: "Enjoy your new plan — no charge." });
    } finally {
      setClaiming(false);
    }
  };

  // The local label map this replaced was keyed on exact plan strings, so a
  // Paddle subscriber whose plan reads `pro_monthly` was shown that raw id.
  const planLabel = planDisplayName(usageData?.plan);

  return (
    <SettingsSection title="Billing" description="Your plan, usage allowance, and coupon redemptions.">
      <SettingsCard title="Current plan">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-base font-semibold text-foreground">{planLabel}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unlimited
                ? "Unmetered — no usage limit"
                : `${Math.round(percentUsed)}% of your ${periodLabel} allowance used`}
              {usageData?.planExpiresAt && !subscription && (
                <> · until {new Date(usageData.planExpiresAt).toLocaleDateString()}</>
              )}
              {subscription?.current_period_end && isActive && (
                <> · renews {new Date(subscription.current_period_end).toLocaleDateString()}</>
              )}
            </p>
          </div>
          <Button asChild>
            <Link to="/pricing">{currentTier === "free" ? "Upgrade plan" : "Manage plan"}</Link>
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Plans"
        description="Free refills a daily allowance every 24 hours. Paid plans get a larger monthly allowance and a bigger advisor token pool."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isFreeUnlock = usageData?.freePlanGrant === plan.tier;
            const isCurrent = !isFreeUnlock && plan.tier === currentTier;
            const isUpgrade = PLAN_RANK[plan.tier] > PLAN_RANK[currentTier];
            const off = discountPercent(plan);
            return (
              <TierPlanCard
                key={plan.tier}
                id={`plan-card-${plan.tier}`}
                plan={plan}
                badge={isFreeUnlock ? "Unlocked by coupon" : plan.highlighted ? "Popular" : undefined}
                priceLabel={isFreeUnlock ? "$0" : `$${plan.priceUSD}`}
                priceSuffix="/mo"
                strikeThroughUSD={off !== null && !isFreeUnlock ? plan.originalPriceUSD : null}
                saveLabel={off !== null && !isFreeUnlock ? `Save ${off}%` : null}
                featureLimit={4}
              >
                {isFreeUnlock ? (
                  <Button onClick={handleClaimFreePlan} disabled={claiming} className="w-full">
                    {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate for $0"}
                  </Button>
                ) : isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : isUpgrade ? (
                  <Button asChild className="w-full">
                    <Link to={`/pricing?plan=${plan.tier}`}>Upgrade to {plan.name}</Link>
                  </Button>
                ) : (
                  <Button variant="ghost" className="w-full text-muted-foreground" disabled>
                    Included
                  </Button>
                )}
              </TierPlanCard>
            );
          })}
        </div>

        {/* Enterprise — a separate full-width bar, not a comparison card. */}
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">Enterprise</p>
            <p className="text-xs text-muted-foreground">
              For schools &amp; cohorts — counsellor seats, SSO, custom onboarding, and volume pricing.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to="/contact?topic=enterprise">Contact sales</Link>
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title="Redeem coupon" description="Got a code? Apply it to widen your usage allowance, or unlock a paid plan tier, at no charge.">
        <div className="flex flex-wrap gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            className="flex-1 min-w-[220px] uppercase tracking-wider"
          />
          <Button onClick={redeem} disabled={redeeming || !code.trim()}>
            {redeeming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply code
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title="Redemption history">
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No coupons redeemed yet.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {history.map((h) => (
              <div key={h.redeemed_at} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-foreground font-mono">{h.code}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(h.redeemed_at).toLocaleString()}
                  </p>
                </div>
                {/* The redemption row still records a grant in the server's
                    accounting units; what the student needs from a history
                    line is whether it widened the allowance, not by how much
                    of a unit nothing else in the product mentions. */}
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {h.credits_granted > 0 ? "Allowance widened" : "Applied"}
                </span>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      <SettingsCard title="Payment history" description="Subscription invoices are managed by our payment provider.">
        <SettingsRow
          label={subscription ? `Subscription: ${subscription.status}` : "No active subscription"}
          description={subscription?.paddle_subscription_id ? `ID ${subscription.paddle_subscription_id.slice(0, 12)}…` : undefined}
        >
          <Button asChild variant="outline" size="sm">
            <Link to="/pricing">View pricing</Link>
          </Button>
        </SettingsRow>
      </SettingsCard>

      <CouponSuccessModal
        open={!!couponSuccess}
        onClose={() => setCouponSuccess(null)}
        code={couponSuccess?.code || ""}
        planName={couponSuccess?.planName}
        planAllowanceLabel={couponSuccess?.planAllowanceLabel}
        allowanceIncreased={couponSuccess?.allowanceIncreased}
        planActive={couponSuccess?.planActive}
        onActivatePlan={
          couponSuccess?.planTier && !couponSuccess.planActive
            ? () => {
                setTimeout(() => {
                  document
                    .getElementById(`plan-card-${couponSuccess.planTier}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 300);
              }
            : undefined
        }
      />
    </SettingsSection>
  );
}
