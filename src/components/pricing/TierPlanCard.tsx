import type { ReactNode } from "react";
import type { PlanConfig } from "@/lib/plans";
import { creditLabel } from "@/lib/plans";
import { cn } from "@/lib/utils";

interface TierPlanCardProps {
  plan: Pick<PlanConfig, "name" | "tagline" | "advisorModel" | "features" | "highlighted">;
  id?: string;
  badge?: string;
  priceLabel: string;
  priceSuffix: string;
  strikeThroughUSD?: number | null;
  saveLabel?: string | null;
  note?: string | null;
  featureLimit?: number;
  children: ReactNode;
}

/**
 * The one pricing-card look used everywhere plans are shown — landing nav
 * link target, /pricing, and Settings > Billing. No icons: a plain
 * typography-first card with a dash-bulleted feature list, matching the
 * site's "no AI sloppy icons" rule.
 */
export function TierPlanCard({
  plan,
  id,
  badge,
  priceLabel,
  priceSuffix,
  strikeThroughUSD,
  saveLabel,
  note,
  featureLimit,
  children,
}: TierPlanCardProps) {
  const features = featureLimit ? plan.features.slice(0, featureLimit) : plan.features;

  return (
    <article
      id={id}
      className={cn(
        "flex flex-col rounded-2xl border p-6 transition-shadow",
        plan.highlighted ? "border-primary/50 shadow-md" : "border-border hover:shadow-sm",
      )}
    >
      {badge && (
        <span className="self-start mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
          {badge}
        </span>
      )}
      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>

      <p className="mt-4 flex items-baseline gap-1.5 flex-wrap">
        <span className="text-3xl font-bold text-foreground">{priceLabel}</span>
        <span className="text-sm text-muted-foreground">{priceSuffix}</span>
        {strikeThroughUSD != null && (
          <span className="text-sm text-muted-foreground line-through">${strikeThroughUSD}</span>
        )}
      </p>
      {saveLabel && <p className="mt-1 text-xs font-semibold text-primary">{saveLabel}</p>}
      {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}

      <p className="mt-3 pt-3 border-t border-border text-sm font-medium text-foreground">
        {creditLabel(plan as PlanConfig)} <span className="text-muted-foreground">· {plan.advisorModel}</span>
      </p>

      <ul className="mt-4 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-muted-foreground">
            <span aria-hidden="true">–</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 pt-4 border-t border-border">{children}</div>
    </article>
  );
}
