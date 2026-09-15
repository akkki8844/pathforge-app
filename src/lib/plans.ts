import type { LucideIcon } from "lucide-react";
import { Sparkles, Zap, Crown } from "lucide-react";

/**
 * Plan tiers for Pathforge — the single source of truth for pricing.
 *
 * Three self-serve tiers (free / pro / max) plus a contact-sales Enterprise
 * plan that is shown as a full-width bar rather than a comparison card. Both
 * the public /pricing page and the in-app billing settings render from this
 * file; nothing hard-codes a price or an allowance of its own.
 *
 * Allowance cadence differs by tier and that is deliberate:
 *   - Free refills DAILY so a casual user always has something to try.
 *   - Paid tiers refill MONTHLY so a heavy week isn't capped artificially.
 * These numbers mirror `monthly_credit_allowance()` and
 * `effective_daily_credit_limit()` in the database, which do the enforcing.
 * Those server functions keep their historical names; nothing student-facing
 * says "credit" any more — usage is reported as a percentage of the allowance.
 */
export type PlanTier = "free" | "pro" | "max";

export const PLAN_RANK: Record<PlanTier, number> = { free: 0, pro: 1, max: 2 };

/**
 * Map a raw server plan string (from get_credits) onto a tier.
 *
 * The string is not always one of the three tier names. Paddle writes the
 * subscribed product's external id straight into `user_credits.plan`, so a
 * paying account can carry `pro_monthly`, `max_annual`, or one of the older
 * `pro_100`…`pro_7000` catalogue ids; coupon and admin grants use the
 * historical `starter`/`growth`/`power` aliases for Pro. Everything
 * unrecognised used to fall through to "free", which is precisely how a
 * subscriber ended up locked out of the paid models and metered at three
 * credits a day. The tier is the part before the first underscore, so the
 * suffix is stripped before the lookup rather than after the complaint.
 *
 * `normalize_plan()` in the database does the same thing for the server-side
 * allowance functions; the two must agree.
 */
export function planTierFromString(plan?: string | null): PlanTier {
  const raw = (plan || "free").trim().toLowerCase();
  const base = raw.split("_")[0];
  switch (base) {
    case "max":
    case "admin": // admins get top-tier access
    case "enterprise": // custom/highest-tier plan, at least Max-level access
      return "max";
    case "pro":
    case "starter":
    case "growth":
    case "power":
      return "pro";
    default:
      return "free";
  }
}

/** Does `current` satisfy the `required` tier? */
export function tierSatisfies(current: PlanTier, required: PlanTier): boolean {
  return PLAN_RANK[current] >= PLAN_RANK[required];
}

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  tagline: string;
  /** What the customer actually pays per month, after the launch discount. */
  priceUSD: number;
  /** List price before the launch discount. Omit on tiers that aren't on sale. */
  originalPriceUSD?: number;
  /**
   * The plan's usage allowance in the server's internal accounting units, in
   * the cadence given by `allowancePeriod`. Never rendered — usage is stated to
   * students as a percentage of this, and tiers are compared as multiples of
   * the free allowance. It lives here only so those two can be derived, and so
   * the figures stay pinned to `monthly_credit_allowance()` in the database.
   */
  allowanceUnits: number;
  allowancePeriod: "day" | "month";
  icon: LucideIcon;
  /** Tailwind gradient classes for the plan accent. */
  accent: string;
  highlighted?: boolean;
  features: string[];
  /** Advisor model this tier unlocks. */
  advisorModel: string;
  /** One line on what that model is actually good for. */
  advisorModelBlurb: string;
}

/** Whole-percent discount off list price, or null when a tier isn't on sale. */
export function discountPercent(plan: PlanConfig): number | null {
  if (!plan.originalPriceUSD || plan.originalPriceUSD <= plan.priceUSD) return null;
  return Math.round((1 - plan.priceUSD / plan.originalPriceUSD) * 100);
}

/** Everything on one cadence, so two tiers can actually be compared. */
function monthlyEquivalent(plan: PlanConfig): number {
  return plan.allowancePeriod === "day" ? plan.allowanceUnits * 30 : plan.allowanceUnits;
}

/**
 * What a tier gets you, in the only unit the product still speaks: the
 * allowance, and how much bigger it is than the free one.
 *
 * This replaced "250 credits / month". A credit figure asked the student to
 * learn a currency, hold an exchange rate for what each feature costs, and then
 * do the division themselves — for a number that meant something different on
 * a daily plan than on a monthly one. A multiple of the tier everybody starts
 * on needs none of that.
 */
export function usageLabel(plan: PlanConfig): string {
  if (plan.allowancePeriod === "day") {
    return "Full daily allowance, resets every 24 h";
  }
  const free = PLANS.find((p) => p.tier === "free");
  const ratio = free ? monthlyEquivalent(plan) / monthlyEquivalent(free) : 0;
  if (!Number.isFinite(ratio) || ratio <= 1) return "Monthly allowance";
  return `About ${Math.round(ratio)}× the free allowance, monthly`;
}

export const PLANS: PlanConfig[] = [
  {
    tier: "free",
    name: "Free",
    tagline: "Everything you need to start forging your path.",
    priceUSD: 0,
    allowanceUnits: 3,
    allowancePeriod: "day",
    icon: Sparkles,
    accent: "from-slate-400 to-slate-500",
    advisorModel: "PFA 5.5",
    advisorModelBlurb: "Fast answers for everyday planning questions.",
    features: [
      "The full 300-quest Journey",
      "PFA 5.5 advisor model",
      "Activities, essays & resume builders",
      "Full daily allowance, resets every 24 h",
      "Advisor chats draw on the same daily allowance",
      "Community support",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    tagline: "Deeper analysis and room to move fast.",
    priceUSD: 20,
    originalPriceUSD: 25,
    allowanceUnits: 250,
    allowancePeriod: "month",
    icon: Zap,
    accent: "from-indigo-500 to-violet-600",
    highlighted: true,
    advisorModel: "PFA 6.5",
    advisorModelBlurb:
      "Reasons across your whole profile — scores, activities and target list — before it answers.",
    features: [
      "Everything in Free",
      "PFA 6.5 advisor model",
      "About 3× the free allowance",
      "Priority screenshot verification",
      "All application & LinkedIn builders",
      "Email support",
    ],
  },
  {
    tier: "max",
    name: "Max",
    tagline: "The deepest reasoning for the highest-stakes decisions.",
    priceUSD: 75,
    originalPriceUSD: 100,
    allowanceUnits: 750,
    allowancePeriod: "month",
    icon: Crown,
    accent: "from-amber-400 via-orange-500 to-rose-500",
    advisorModel: "PFA 7",
    advisorModelBlurb:
      "Our deepest reasoning model — for essay strategy, school-list calls and anything you only get one shot at.",
    features: [
      "Everything in Pro",
      "PFA 7 advisor model",
      "About 8× the free allowance",
      "Fastest verification queue",
      "1:1 priority support",
      "Early access to new features",
    ],
  },
];

export function planForTier(tier: PlanTier): PlanConfig {
  return PLANS.find((p) => p.tier === tier) ?? PLANS[0];
}

/**
 * What to call a raw server plan string in the UI.
 *
 * Deliberately not `planForTier(planTierFromString(plan)).name`: that collapse
 * is right for access decisions and wrong for a label. An Enterprise customer
 * reading their own billing page should be told they are on Enterprise, not on
 * Max, and an admin should not be told they are a paying Max subscriber.
 */
export function planDisplayName(plan?: string | null): string {
  const base = (plan || "free").trim().toLowerCase().split("_")[0];
  if (base === "enterprise") return "Enterprise";
  if (base === "admin") return "Admin";
  return planForTier(planTierFromString(base)).name;
}
