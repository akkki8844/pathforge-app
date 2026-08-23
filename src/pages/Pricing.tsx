import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
// The spring-physics CTA button, used only for the plan actions below — the
// clicks that actually cost money. Everything else on this page stays on the
// standard Button so a "Cancel" doesn't animate like a purchase.
import { Button as MotionButton } from "@/components/ui/be-ui-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { submitPublicForm } from "@/lib/publicContact";
import { z } from "zod";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { Seo } from "@/components/Seo";
import { CouponSuccessModal } from "@/components/CouponSuccessModal";
import { TierPlanCard } from "@/components/pricing/TierPlanCard";
import { PLANS, PLAN_RANK, planTierFromString, discountPercent, creditLabel, type PlanConfig } from "@/lib/plans";

const ANNUAL_DISCOUNT = 0.35;

// The INR figure is indicative only — Paddle charges in USD and does its own
// localisation at checkout.
const USD_TO_INR = 83;

const ENTERPRISE_FEATURES = [
  "Everything in Max",
  "Custom credit pool per institution",
  "Student & counsellor dashboards",
  "Bulk class onboarding",
  "Role-based access control (RBAC)",
  "Custom integrations & API access",
  "Single Sign-On (SSO)",
  "Service Level Agreement (SLA)",
  "Dedicated success manager",
];

export default function Pricing() {
  const { creditData, claimFreePlan, switchPlan, redeemCoupon } = useCredits();
  const { user } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  const [showEnterprise, setShowEnterprise] = useState(false);
  const [enterpriseForm, setEnterpriseForm] = useState({ name: "", email: "", org: "", message: "" });
  const [enterpriseSubmitting, setEnterpriseSubmitting] = useState(false);
  const [enterpriseSubmitted, setEnterpriseSubmitted] = useState(false);
  const [enterpriseErrors, setEnterpriseErrors] = useState<Record<string, string>>({});

  // Coupon redemption
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState<{
    code: string; planName: string | null; planTier: string | null; planCreditLabel: string | null;
    creditsGranted: number; planActive: boolean;
  } | null>(null);

  const handleRedeemCoupon = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to redeem a coupon.", variant: "destructive" });
      return;
    }
    setCouponLoading(true);
    try {
      // One shared implementation with Settings > Billing — the two used to
      // hold separate copies of this logic and had already drifted apart on
      // what a successful redemption meant.
      const result = await redeemCoupon(couponCode);
      if (!result.success) {
        toast({ title: "Couldn't redeem", description: result.error || "Invalid code.", variant: "destructive" });
        return;
      }
      setCouponCode("");

      // The code granted a tier below what they already hold, so the server
      // declined to apply it. Say so — going quiet reads as a broken code.
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
        code: result.code || couponCode.trim().toUpperCase(),
        planName: unlockedPlan?.name || result.planTier || null,
        planTier: result.planTier,
        planCreditLabel: unlockedPlan ? creditLabel(unlockedPlan) : null,
        creditsGranted: result.creditsGranted,
        planActive: result.planActivated,
      });
    } catch (e: any) {
      toast({ title: "Couldn't redeem", description: e?.message || "Try again in a moment.", variant: "destructive" });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleClaimFreePlan = async (plan: PlanConfig) => {
    setClaiming(true);
    try {
      const result = await claimFreePlan();
      if (!result.success) {
        toast({ title: "Couldn't activate", description: result.error || "Try again in a moment.", variant: "destructive" });
        return;
      }
      toast({ title: `${plan.name} activated`, description: "Enjoy your new plan — no charge." });
    } finally {
      setClaiming(false);
    }
  };

  const handleSwitchPlan = async (plan: PlanConfig) => {
    setSwitching(plan.tier);
    try {
      const result = await switchPlan(plan.tier);
      if (!result.success) {
        toast({ title: "Couldn't switch plans", description: result.error || "Try again in a moment.", variant: "destructive" });
        return;
      }
      toast({ title: `Switched to ${plan.name}`, description: "Your plan changed immediately — no charge." });
    } finally {
      setSwitching(null);
    }
  };

  /**
   * What a paid plan costs on the selected billing period. Annual applies its
   * discount on top of the launch discount already baked into `priceUSD`, and
   * is quoted as an effective monthly rate so the two toggle states compare
   * like with like.
   */
  const priceFor = useMemo(
    () => (plan: PlanConfig) => {
      const monthlyUSD = plan.priceUSD;
      if (!annual || monthlyUSD === 0) {
        return {
          displayUSD: String(monthlyUSD),
          displayINR: Math.round(monthlyUSD * USD_TO_INR),
          totalUSD: monthlyUSD,
        };
      }
      const annualUSD = Math.round(monthlyUSD * 12 * (1 - ANNUAL_DISCOUNT));
      return {
        displayUSD: (annualUSD / 12).toFixed(2),
        displayINR: Math.round((annualUSD / 12) * USD_TO_INR),
        totalUSD: annualUSD,
      };
    },
    [annual],
  );

  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const { subscription, isActive } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleUpgrade = (plan: PlanConfig) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to subscribe.", variant: "destructive" });
      return;
    }
    openCheckout(`${plan.tier}_${annual ? "annual" : "monthly"}`);
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paddle-customer-portal", {
        body: { environment: import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN?.startsWith("test_") ? "sandbox" : "live" },
      });
      if (error || !data?.url) throw new Error(error?.message || "Couldn't open portal");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const enterpriseSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(200),
    email: z.string().trim().email("Valid email required").max(320),
    org: z.string().trim().max(200).optional().or(z.literal("")),
    message: z.string().trim().min(20, "Please share at least 20 characters about your needs").max(5000),
  });

  const handleEnterprise = async () => {
    const parsed = enterpriseSchema.safeParse(enterpriseForm);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setEnterpriseErrors(errs);
      return;
    }
    setEnterpriseErrors({});
    setEnterpriseSubmitting(true);
    try {
      const { name, email, org, message } = parsed.data;
      const { error: insertErr } = await supabase
        .from("enterprise_inquiries")
        .insert({ name, email, organization: org || null, message })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      // The row above is the durable record, so the enquiry itself was never at
      // risk — but the notification emails were. They went straight to
      // `send-transactional-email`, which is service-role-only and not exempt
      // from verify_jwt, so a signed-out visitor's call was rejected at the
      // gateway. Promise.allSettled then swallowed both rejections and the form
      // showed its success state regardless: nobody on the team was told.
      await submitPublicForm({
        kind: "enterprise",
        name,
        email,
        organization: org || undefined,
        message,
      });
      setEnterpriseSubmitted(true);
    } catch (e: any) {
      toast({
        title: "Couldn't submit request",
        description: e?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setEnterpriseSubmitting(false);
    }
  };

  const closeEnterprise = () => {
    setShowEnterprise(false);
    setTimeout(() => {
      setEnterpriseSubmitted(false);
      setEnterpriseForm({ name: "", email: "", org: "", message: "" });
      setEnterpriseErrors({});
    }, 250);
  };

  return (
    <div className="min-h-[100svh] relative overflow-hidden">
      <Seo
        title='Pricing — Pathforge'
        description='Free forever with 3 credits a day. Pro is $20/mo for 250 credits a month, Max is $75/mo for 750. Enterprise plans for schools and counselling teams.'
        path='/pricing'
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          // Carries its own @id and points `brand` at the Organization declared
          // in index.html's graph, so this is a fourth linked node rather than a
          // second, unrelated thing also called "Pathforge".
          "@id": "https://pathforge.co.in/pricing#product",
          name: "Pathforge",
          description:
            "AI-powered college application platform with activity recommendations, essay refinement, LinkedIn building, and application tracking.",
          brand: { "@id": "https://pathforge.co.in/#organization" },
          image: "https://pathforge.co.in/logo.png",
          // An AggregateOffer, not a bare list. The list previously ended with an
          // Enterprise entry that had neither `price` nor `priceCurrency` —
          // Enterprise is quote-only, so there was no number to put there — and an
          // Offer without a price fails validation. Enterprise is described in
          // `offerCount` and the page copy instead of being asserted as a priced
          // offer that does not exist.
          //
          // Built from PLANS so the structured data can't drift from the page.
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: String(Math.min(...PLANS.map((p) => p.priceUSD))),
            highPrice: String(Math.max(...PLANS.map((p) => p.priceUSD))),
            offerCount: PLANS.length + 1, // + Enterprise, which is priced on request
            offers: PLANS.map((p) => ({
              "@type": "Offer",
              name: p.name,
              price: String(p.priceUSD),
              priceCurrency: "USD",
              description: `${p.advisorModel} advisor model — ${creditLabel(p)}`,
              url: "https://pathforge.co.in/pricing",
              availability: "https://schema.org/InStock",
            })),
          },
        }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-primary/8 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-10 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-primary text-xs font-semibold uppercase tracking-wide"
          >
            Simple, scalable pricing
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight"
          >
            Pay for what you{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">actually use</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-base max-w-xl mx-auto"
          >
            Every AI interaction is 1 credit. Free gives you 3 a day forever — paid plans give you a monthly pool and a deeper advisor model.
          </motion.p>

          {/* Monthly / Annual toggle */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-3 mt-4 p-1.5 rounded-full bg-muted/60 border border-border/50"
          >
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                !annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                annual ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              Annual
              <span className="text-[10px] font-bold bg-green-500/15 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">
                Save 35%
              </span>
            </button>
          </motion.div>
        </div>

        {/* Plan grid — rendered from src/lib/plans.ts, the same source the
            in-app billing settings use, so the two can never disagree. */}
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight text-center mb-6">
          Plans and credits
        </h2>
        {/* pt-4 leaves room for the overhanging "Most Popular" badge. */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 pt-4">
          {PLANS.map((plan, i) => {
            const isFreeUnlock = creditData?.freePlanGrant === plan.tier;
            const price = isFreeUnlock
              ? { displayUSD: "0", displayINR: 0, totalUSD: 0 }
              : priceFor(plan);
            const off = discountPercent(plan);
            /* Compare tiers, not raw plan strings. The server stores whatever
               the webhook wrote — "pro_monthly", "enterprise", "admin" — so an
               exact match against "pro" told a paying subscriber that they were
               on no plan at all. planTierFromString is the same normaliser the
               downgrade check on the next line already used. */
            const currentTier = planTierFromString(creditData?.plan);
            const planActive =
              currentTier === plan.tier &&
              (!creditData?.planExpiresAt || new Date(creditData.planExpiresAt) > new Date());
            const isCurrent = isFreeUnlock ? false : currentTier === plan.tier;
            const isPaid = plan.priceUSD > 0;
            const isDowngradeTarget =
              !!creditData &&
              !isFreeUnlock &&
              PLAN_RANK[planTierFromString(creditData.plan)] > PLAN_RANK[plan.tier];
            const badge = isFreeUnlock
              ? "Unlocked by coupon"
              : plan.highlighted
              ? "Most popular"
              : undefined;
            const saveLabel = isFreeUnlock
              ? null
              : off !== null
              ? annual
                ? `${off}% launch + 35% annual`
                : `Save ${off}%`
              : null;
            const note = isFreeUnlock
              ? null
              : isPaid
              ? `${annual ? `billed $${price.totalUSD}/yr · ` : ""}≈ ₹${price.displayINR}/mo`
              : null;
            return (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <TierPlanCard
                  id={`plan-card-${plan.tier}`}
                  plan={plan}
                  badge={badge}
                  priceLabel={`$${price.displayUSD}`}
                  priceSuffix={isPaid ? "/mo" : "/forever"}
                  strikeThroughUSD={off !== null && !annual && !isFreeUnlock ? plan.originalPriceUSD : null}
                  saveLabel={saveLabel}
                  note={note}
                >
                  {!isPaid ? (
                    isDowngradeTarget ? (
                      <MotionButton
                        onClick={() => handleSwitchPlan(plan)}
                        disabled={switching === plan.tier}
                        variant="outline"
                        className="w-full rounded-xl h-11 font-semibold"
                      >
                        {switching === plan.tier ? <Loader2 className="h-4 w-4 animate-spin" /> : "Switch to Free"}
                      </MotionButton>
                    ) : (
                      <MotionButton variant="outline" className="w-full rounded-xl h-11" disabled>
                        {isCurrent ? "Current Plan" : "Free Forever"}
                      </MotionButton>
                    )
                  ) : isFreeUnlock ? (
                    <MotionButton
                      onClick={() => handleClaimFreePlan(plan)}
                      disabled={claiming}
                      ripple
                      className="w-full rounded-xl h-11 font-semibold"
                    >
                      {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activate for $0"}
                    </MotionButton>
                  ) : planActive ? (
                    <MotionButton variant="outline" className="w-full rounded-xl h-11 font-semibold" disabled>
                      Current Plan
                    </MotionButton>
                  ) : isDowngradeTarget ? (
                    <MotionButton
                      onClick={() => handleSwitchPlan(plan)}
                      disabled={switching === plan.tier}
                      variant="outline"
                      className="w-full rounded-xl h-11 font-semibold"
                    >
                      {switching === plan.tier ? <Loader2 className="h-4 w-4 animate-spin" /> : `Switch to ${plan.name}`}
                    </MotionButton>
                  ) : isActive && subscription?.product_id?.startsWith(plan.tier) ? (
                    <MotionButton
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      variant="outline"
                      className="w-full rounded-xl h-11 font-semibold"
                    >
                      {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage Subscription"}
                    </MotionButton>
                  ) : (
                    <MotionButton
                      onClick={() => handleUpgrade(plan)}
                      disabled={checkoutLoading}
                      ripple
                      className="w-full rounded-xl h-11 font-semibold"
                      variant={plan.highlighted ? "primary" : "outline"}
                    >
                      {checkoutLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isActive ? (
                        "Switch to this plan"
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </MotionButton>
                  )}
                </TierPlanCard>
              </motion.div>
            );
          })}

          {/* Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            whileHover={{ y: -4 }}
          >
            <article className="flex flex-col rounded-2xl border border-border p-6 h-full">
              <h3 className="text-xl font-bold text-foreground">Enterprise</h3>
              <p className="mt-1 text-xs text-muted-foreground">For schools & counselling teams</p>
              <p className="mt-4 text-3xl font-bold text-foreground">Custom</p>
              <p className="mt-3 pt-3 border-t border-border text-sm font-medium text-foreground">
                Custom credit pool <span className="text-muted-foreground">· PFA 7</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {ENTERPRISE_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-muted-foreground">
                    <span aria-hidden="true">–</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 pt-4 border-t border-border">
                <MotionButton onClick={() => setShowEnterprise(true)} variant="outline" className="w-full rounded-xl h-11">
                  Contact sales
                </MotionButton>
              </div>
            </article>
          </motion.div>
        </div>

        {/* Coupon redemption */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-md mx-auto mb-8 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3" id="coupon-heading">Have a coupon code?</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Redeem a promo code for bonus credits or a free plan unlock — no payment required.
          </p>
          <div className="flex gap-2">
            <Input
              id="coupon-code"
              aria-label="Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              maxLength={32}
              className="h-10 uppercase tracking-wider"
              onKeyDown={(e) => { if (e.key === "Enter") handleRedeemCoupon(); }}
              disabled={couponLoading}
            />
            <Button
              onClick={handleRedeemCoupon}
              disabled={couponLoading || !couponCode.trim()}
              className="h-10 px-5 shrink-0"
            >
              {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
            </Button>
          </div>
        </motion.div>

        {/* Reassurance row */}
        <div className="text-center text-xs text-muted-foreground">
          Cancel anytime · Free resets 3 credits every 24 hours · Paid plans refill their monthly bucket at billing renewal · Unused credits don't carry over
        </div>
      </div>

      {/* Test mode banner is shown app-wide via PaymentTestModeBanner */}

      {/* Enterprise Modal — premium, full-screen on mobile, large dialog on desktop */}
      <AnimatePresence>
        {showEnterprise && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-0 sm:p-4 overflow-y-auto"
            onClick={closeEnterprise}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-card border border-border/60 sm:rounded-3xl shadow-2xl w-full sm:max-w-3xl my-auto min-h-[100svh] sm:min-h-0 overflow-hidden"
            >
              {/* Close */}
              <button
                onClick={closeEnterprise}
                className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-background/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <span className="text-xl leading-none" aria-hidden="true">×</span>
              </button>

              <AnimatePresence mode="wait">
                {!enterpriseSubmitted ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="grid md:grid-cols-2 gap-0"
                  >
                    {/* Left: pitch */}
                    <div className="relative p-7 sm:p-9 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-b md:border-b-0 md:border-r border-border/40">
                      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="relative space-y-5">
                        <div className="text-primary text-[11px] font-semibold uppercase tracking-wide">
                          Pathforge for teams
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
                          Bring Pathforge to your{" "}
                          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            school or counselling team
                          </span>
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Bulk seats, dedicated success manager, custom dashboards, SSO, and SLA.
                          Tell us a bit about your team and we'll get back within 24 hours.
                        </p>
                        <div className="space-y-2 pt-2">
                          {[
                            "School & counsellor dashboards",
                            "SSO, RBAC and SLA",
                            "Reply within 24 hours",
                          ].map((label) => (
                            <div key={label} className="flex items-center gap-2 text-sm text-foreground">
                              <span aria-hidden="true">–</span>
                              {label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: form */}
                    <div className="p-7 sm:p-9 space-y-4">
                      <h3 className="text-lg font-bold text-foreground">Tell us about your team</h3>

                      <div className="space-y-1.5">
                        <label htmlFor="ent-name" className="text-xs font-semibold text-foreground">Name</label>
                        <Input
                          id="ent-name"
                          placeholder="Your full name"
                          value={enterpriseForm.name}
                          onChange={(e) => setEnterpriseForm((p) => ({ ...p, name: e.target.value }))}
                          className="h-11"
                        />
                        {enterpriseErrors.name && <p className="text-[11px] text-destructive">{enterpriseErrors.name}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="ent-email" className="text-xs font-semibold text-foreground">Email <span className="text-destructive">*</span></label>
                        <Input
                          id="ent-email"
                          type="email"
                          placeholder="you@school.edu"
                          value={enterpriseForm.email}
                          onChange={(e) => setEnterpriseForm((p) => ({ ...p, email: e.target.value }))}
                          className="h-11"
                        />
                        {enterpriseErrors.email && <p className="text-[11px] text-destructive">{enterpriseErrors.email}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="ent-org" className="text-xs font-semibold text-foreground">Organization <span className="text-muted-foreground font-normal">(optional)</span></label>
                        <Input
                          id="ent-org"
                          placeholder="School, district, or company"
                          value={enterpriseForm.org}
                          onChange={(e) => setEnterpriseForm((p) => ({ ...p, org: e.target.value }))}
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="ent-message" className="text-xs font-semibold text-foreground">What do you need?</label>
                        <Textarea
                          id="ent-message"
                          placeholder="Number of students, timeline, integrations, anything we should know…"
                          value={enterpriseForm.message}
                          onChange={(e) => setEnterpriseForm((p) => ({ ...p, message: e.target.value }))}
                          rows={4}
                          className="resize-none"
                        />
                        {enterpriseErrors.message && <p className="text-[11px] text-destructive">{enterpriseErrors.message}</p>}
                      </div>

                      <Button
                        onClick={handleEnterprise}
                        disabled={enterpriseSubmitting}
                        className="w-full h-12 rounded-xl gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 font-semibold"
                      >
                        {enterpriseSubmitting ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                        ) : (
                          "Submit request"
                        )}
                      </Button>
                      <p className="text-[10px] text-muted-foreground text-center">
                        We'll never share your info. Email goes straight to our founders.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-10 sm:p-14 text-center space-y-5"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 220, damping: 18 }}
                      className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl"
                    >
                      <span className="text-3xl font-bold text-white" aria-hidden="true">✓</span>
                    </motion.div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                      Your request has been submitted
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      We'll get back to you shortly at{" "}
                      <span className="font-semibold text-foreground">{enterpriseForm.email}</span>.
                      Keep an eye on your inbox.
                    </p>
                    <Button onClick={closeEnterprise} variant="outline" className="rounded-xl h-11 px-8">
                      Close
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CouponSuccessModal
        open={!!couponSuccess}
        onClose={() => setCouponSuccess(null)}
        code={couponSuccess?.code || ""}
        planName={couponSuccess?.planName}
        planCreditLabel={couponSuccess?.planCreditLabel}
        creditsGranted={couponSuccess?.creditsGranted}
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
    </div>
  );
}
