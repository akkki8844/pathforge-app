import type { ReactNode } from "react";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { Check } from "lucide-react";
import type { PlanConfig } from "@/lib/plans";
import { usageLabel } from "@/lib/plans";
import { cn } from "@/lib/utils";

interface TierPlanCardProps {
  plan: Pick<PlanConfig, "name" | "tagline" | "advisorModel" | "features" | "highlighted">;
  id?: string;
  badge?: string;
  /**
   * The price as a plain string, e.g. "$20". Always required — it is what
   * screen readers announce and what renders if `priceValue` is absent.
   */
  priceLabel: string;
  /**
   * The same price as a number. When given, the digits animate between values
   * instead of cutting, which is what makes the monthly/annual toggle legible:
   * the eye follows 20 counting down to 13 and understands that one number
   * became the other. Without it the card silently falls back to `priceLabel`,
   * so a caller that has no meaningful number to animate loses nothing.
   */
  priceValue?: number;
  priceSuffix: string;
  strikeThroughUSD?: number | null;
  saveLabel?: string | null;
  note?: string | null;
  featureLimit?: number;
  children: ReactNode;
}

/**
 * The one pricing-card look used everywhere plans are shown — /pricing and
 * Settings > Billing both render this, so the tiers cannot drift apart.
 *
 * The highlighted tier is distinguished by *surface*, not by decoration: a
 * tinted ground and a ring in the accent, rather than a glow or a gradient
 * border. That keeps one accent doing the work across the whole card and
 * leaves the price as the loudest thing in it, which is what a person is
 * actually here to compare.
 */
export function TierPlanCard({
  plan,
  id,
  badge,
  priceLabel,
  priceValue,
  priceSuffix,
  strikeThroughUSD,
  saveLabel,
  note,
  featureLimit,
  children,
}: TierPlanCardProps) {
  const features = featureLimit ? plan.features.slice(0, featureLimit) : plan.features;
  const featured = plan.highlighted === true;

  return (
    <article
      id={id}
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 transition-colors",
        featured
          ? "border-primary/40 bg-primary/[0.04] ring-1 ring-primary/20 dark:bg-primary/[0.07]"
          : "border-border bg-card hover:border-foreground/20",
      )}
    >
      {badge && (
        <span
          className={cn(
            "mb-3 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight",
            featured ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {badge}
        </span>
      )}

      <h3 className="text-xl font-bold tracking-tight text-foreground">{plan.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        {priceValue !== undefined && Number.isFinite(priceValue) ? (
          <NumberFlow
            value={priceValue}
            format={{
              style: "currency",
              currency: "USD",
              // Whole prices read as "$20", not "$20.00"; the annual rate
              // genuinely has cents and keeps them.
              minimumFractionDigits: Number.isInteger(priceValue) ? 0 : 2,
              maximumFractionDigits: 2,
            }}
            className="text-4xl font-bold tracking-tight text-foreground"
            aria-label={priceLabel}
          />
        ) : (
          <span className="text-4xl font-bold tracking-tight text-foreground">{priceLabel}</span>
        )}
        <span className="text-sm text-muted-foreground">{priceSuffix}</span>
        {strikeThroughUSD != null && (
          <span className="text-sm text-muted-foreground line-through">${strikeThroughUSD}</span>
        )}
      </p>

      {saveLabel && <p className="mt-1.5 text-xs font-semibold text-primary">{saveLabel}</p>}
      {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}

      <p
        className={cn(
          "mt-4 border-t pt-4 text-sm font-medium text-foreground",
          featured ? "border-primary/20" : "border-border",
        )}
      >
        {usageLabel(plan as PlanConfig)}{" "}
        <span className="text-muted-foreground">· {plan.advisorModel}</span>
      </p>

      <ul className="mt-4 flex-1 space-y-2.5">
        {features.map((f, i) => (
          <motion.li
            key={f}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 + i * 0.045, type: "spring", stiffness: 260, damping: 26 }}
            className="flex items-start gap-2.5 text-sm text-muted-foreground"
          >
            <span
              aria-hidden
              className={cn(
                "mt-px flex size-4 shrink-0 items-center justify-center rounded-full",
                featured ? "bg-primary/15 text-primary" : "bg-muted text-foreground/70",
              )}
            >
              <Check className="size-2.5" strokeWidth={3} />
            </span>
            <span>{f}</span>
          </motion.li>
        ))}
      </ul>

      <div className={cn("mt-5 border-t pt-4", featured ? "border-primary/20" : "border-border")}>
        {children}
      </div>
    </article>
  );
}
