import type { LucideIcon } from "lucide-react";
import { Sparkles, Zap, Crown } from "lucide-react";

/**
 * Plan tiers for Pathforge — the single source of truth for pricing.
 *
 * Three self-serve tiers (free / pro / max) plus a contact-sales Enterprise
 * plan that is shown as a full-width bar rather than a comparison card. Both
 * the public /pricing page and the in-app billing settings render from this
 * file; nothing hard-codes a price or a credit figure of its own.
 *
 * Credit cadence differs by tier and that is deliberate:
 *   - Free bills DAILY (3/day) so a casual user always has something to try.
 *   - Paid tiers bill MONTHLY so a heavy week isn't capped artificially.
 * These numbers mirror `monthly_credit_allowance()` and
 * `effective_daily_credit_limit()` in the database, which do the enforcing.
 */
export type PlanTier = "free" | "pro" | "max";

export const PLAN_RANK: Record<PlanTier, number> = { free: 0, pro: 1, max: 2 };

/** Map a raw server plan string (from get_credits) onto a tier. */
export function planTierFromString(plan?: string | null): PlanTier {
  switch ((plan || "free").toLowerCase()) {
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
  /** Credit allotment, in the cadence given by `creditPeriod`. */
  credits: number;
  creditPeriod: "day" | "month";
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

/** "3 credits / day" or "250 credits / month". */
export function creditLabel(plan: PlanConfig): string {
  return `${plan.credits.toLocaleString()} credits / ${plan.creditPeriod}`;
}

export const PLANS: PlanConfig[] = [
  {
    tier: "free",
    name: "Free",
    tagline: "Everything you need to start forging your path.",
    priceUSD: 0,
    credits: 3,
    creditPeriod: "day",
    icon: Sparkles,
    accent: "from-slate-400 to-slate-500",
    advisorModel: "Pathforge Core",
    advisorModelBlurb: "Fast answers for everyday planning questions.",
    features: [
      "The full 300-quest Journey",
      "Pathforge Core advisor model",
      "Activities, essays & resume builders",
      "3 credits / day",
      "Community support",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    tagline: "Deeper analysis and room to move fast.",
    priceUSD: 20,
    originalPriceUSD: 25,
    credits: 250,
    creditPeriod: "month",
    icon: Zap,
    accent: "from-indigo-500 to-violet-600",
    highlighted: true,
    advisorModel: "Pathforge Pro",
    advisorModelBlurb:
      "Reasons across your whole profile — scores, activities and target list — before it answers.",
    features: [
      "Everything in Free",
      "Pathforge Pro advisor model",
      "250 credits / month",
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
    credits: 750,
    creditPeriod: "month",
    icon: Crown,
    accent: "from-amber-400 via-orange-500 to-rose-500",
    advisorModel: "Pathforge Max",
    advisorModelBlurb:
      "Our deepest reasoning model — for essay strategy, school-list calls and anything you only get one shot at.",
    features: [
      "Everything in Pro",
      "Pathforge Max advisor model",
      "750 credits / month",
      "Fastest verification queue",
      "1:1 priority support",
      "Early access to new features",
    ],
  },
];

export function planForTier(tier: PlanTier): PlanConfig {
  return PLANS.find((p) => p.tier === tier) ?? PLANS[0];
}
