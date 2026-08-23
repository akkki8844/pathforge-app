import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Dashboard shell.
 *
 * The visual language is deliberately the landing page's: bordered cards on
 * cream, 1rem radii, editorial-blue eyebrows, Instrument Serif for every
 * figure, and a lift on hover. The signed-in home should not feel like a
 * different product from the page that sold it.
 */

/** Letterspaced small-caps label in editorial blue. Introduces every section. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-primary",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Hairline. */
export function Rule({ className }: { className?: string }) {
  return <div className={cn("h-px bg-border", className)} aria-hidden />;
}

/**
 * Reveal-on-arrival wrapper.
 *
 * `whileInView` rather than `animate` so panels below the fold stagger as the
 * student scrolls, while anything already visible plays immediately. `once`
 * keeps it from re-firing on every scroll back up, which reads as jitter.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}

/**
 * The card. `lift` is opt-out because a few panels (the hero) are too large for
 * a hover translate to read as anything but the page wobbling.
 */
export function Panel({
  children,
  className,
  lift = true,
  tone = "default",
  id,
}: {
  children: ReactNode;
  className?: string;
  lift?: boolean;
  tone?: "default" | "accent" | "feature";
  /** Anchor target, for the masthead's link down to a panel. */
  id?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      id={id}
      whileHover={lift && !reduced ? { y: -3 } : undefined}
      transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
      className={cn(
        // rounded-2xl is 1rem, which is the landing page's single radius — every
        // card, its glass header and its form shell are all exactly 1rem.
        // scroll-mt keeps a panel clear of the sticky nav when it is the target
        // of an in-page jump.
        "card-motion scroll-mt-24 rounded-2xl border p-5 sm:p-6",
        tone === "accent"
          ? "border-primary/25 bg-secondary/40"
          : tone === "feature"
            ? "dash-feature"
            : // Translucent at rest, opaque on hover, and no resting shadow —
              // the landing page's card recipe exactly. The cream page showing
              // through the card is most of why that page reads as paper, and a
              // solid bg-card with a shadow-sm was throwing it away.
              "border-foreground/[0.14] bg-card/70 hover:bg-card",
        lift &&
          // A wide, very low-alpha navy — never black, and only on hover.
          "hover:border-primary/35 hover:shadow-[0_14px_26px_rgba(33,48,88,0.09)]",
        className
      )}
    >
      {children}
    </motion.section>
  );
}

/** Eyebrow + title, with an optional link to the tool that owns the data. */
export function PanelHead({
  eyebrow,
  title,
  to,
  action = "Open",
}: {
  eyebrow: string;
  title?: string;
  to?: string;
  action?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        {title && (
          // Sora 600 at -0.015em is the landing page's card-title voice; the
          // serif is reserved for the page's one headline and the dial figure.
          <h2 className="mt-2 font-display text-lg font-semibold leading-[1.15] tracking-[-0.015em]">
            {title}
          </h2>
        )}
      </div>
      {to && (
        <Link
          to={to}
          // The negative margin keeps the 10px label visually where it was while
          // giving it a 44px-square tap target — this link is the only route out
          // of the panel, and at 13px tall it was a miss on touch.
          className="group -m-2 inline-flex min-h-[44px] shrink-0 items-center gap-1 p-2 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary"
        >
          {action}
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      )}
    </div>
  );
}

// ── Standing colour ───────────────────────────────────────────────────

/*
 * Standing colour.
 *
 * This used to be four saturated hues — green, blue, amber, red — one per band.
 * Four colour systems on one page is what makes a dashboard look assembled from
 * a component gallery rather than designed, and it was competing with the
 * blue eyebrows, the blue bars and the amber deadline counts for the same
 * meaning: "look here".
 *
 * The ladder is now carried by weight and one warning hue. Safety is full ink
 * because it is settled; Match takes the page's single accent because it is
 * the band a student is trying to reach; Reach steps back to muted; only "Far
 * reach" — the one band that is actually a problem — spends a colour. The
 * ordering survives greyscale and colour-blindness, which the old ramp did not.
 */
export const STANDING_TEXT: Record<string, string> = {
  Safety: "text-foreground",
  Match: "text-primary",
  Reach: "text-muted-foreground",
  "Far reach": "text-amber-700 dark:text-amber-400",
};

const STANDING_CHIP: Record<string, string> = {
  Safety: "border-foreground/25 bg-transparent text-foreground",
  Match: "border-primary/35 bg-primary/10 text-primary",
  Reach: "border-border bg-transparent text-muted-foreground",
  "Far reach": "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export function StandingChip({ standing }: { standing: string }) {
  return (
    <span
      className={cn(
        // 11px, not 9px: "Reach" / "Far reach" is load-bearing information, not
        // decoration, and 9px uppercase with 0.12em tracking is below any
        // readable floor on a phone.
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-[0.08em]",
        STANDING_CHIP[standing] || "border-border bg-muted text-muted-foreground"
      )}
    >
      {standing}
    </span>
  );
}

// ── The gauge ─────────────────────────────────────────────────────────

const R = 86;
const CIRC = 2 * Math.PI * R;
/** 270° of dial, gap at the bottom. */
const SWEEP = 0.75;
/** The dial runs to 120 so a profile past the admitted bar still has somewhere to go. */
const SCALE = 120;

/**
 * Readiness dial.
 *
 * The tick at 100 is the whole point: it is the typical admitted student at the
 * tier being measured, so the arc reads as "how far to the bar" rather than as
 * an abstract percentage of nothing.
 */
export function Gauge({
  value,
  label,
  sublabel,
  toneClass,
}: {
  value: number;
  label: string;
  sublabel?: string;
  toneClass: string;
}) {
  const reduced = useReducedMotion();
  const frac = Math.max(0, Math.min(1, value / SCALE));
  const barFrac = 100 / SCALE;
  // The circle path starts at 3 o'clock; rotating 135° puts the start at the
  // lower left, so the 270° sweep is symmetric about the top.
  const rot = "rotate(135 100 100)";
  const tickAngle = 135 + barFrac * SWEEP * 360;
  const tickRad = (tickAngle * Math.PI) / 180;

  return (
    /* Fluid rather than a hard 200px: at 320px the dial used to sit inside a
       fixed box with the school name wrapping around it. It never exceeds the
       old size on desktop. */
    <div className="relative mx-auto w-[clamp(9.5rem,44vw,12.5rem)] max-w-full">
      <svg viewBox="0 0 200 200" className="w-full" role="img" aria-label={`${value} out of 100 of the admitted bar`}>
        <defs>
          {/* A soft halo in the arc's own colour. On the light feature panel a
              full bloom filter goes muddy, so this is a single blurred copy at
              low opacity — depth without haze. */}
          <filter id="gauge-halo" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="13"
          strokeLinecap="round"
          transform={rot}
          className="stroke-border"
          strokeDasharray={`${CIRC * SWEEP} ${CIRC}`}
        />
        <motion.circle
          filter="url(#gauge-halo)"
          opacity={0.32}
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="13"
          strokeLinecap="round"
          transform={rot}
          className={cn("stroke-current", toneClass)}
          strokeDasharray={`0 ${CIRC}`}
          initial={reduced ? false : { strokeDasharray: `0 ${CIRC}` }}
          animate={{ strokeDasharray: `${CIRC * SWEEP * frac} ${CIRC}` }}
          transition={{ duration: reduced ? 0 : 1.1, ease: EASE_OUT_EXPO }}
          aria-hidden
        />
        <motion.circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="13"
          strokeLinecap="round"
          transform={rot}
          className={cn("stroke-current", toneClass)}
          strokeDasharray={`0 ${CIRC}`}
          initial={reduced ? false : { strokeDasharray: `0 ${CIRC}` }}
          animate={{ strokeDasharray: `${CIRC * SWEEP * frac} ${CIRC}` }}
          transition={{ duration: reduced ? 0 : 1.1, ease: EASE_OUT_EXPO }}
        />
        {/* The admitted-student bar. */}
        <line
          x1={100 + Math.cos(tickRad) * (R - 11)}
          y1={100 + Math.sin(tickRad) * (R - 11)}
          x2={100 + Math.cos(tickRad) * (R + 11)}
          y2={100 + Math.sin(tickRad) * (R + 11)}
          className="stroke-foreground/45"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4">
        {/* Scales with the dial rather than staying 3.6rem inside a shrunken
            circle. */}
        <span
          className={cn(
            "font-serif text-[clamp(2.6rem,10vw,3.6rem)] leading-none tabular-nums",
            toneClass
          )}
        >
          {value}
        </span>
        <span className="mt-2 text-center font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {sublabel && (
          <span className="mt-1 max-w-[9rem] text-center text-[11px] leading-tight text-muted-foreground">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Pillar bar ────────────────────────────────────────────────────────

/**
 * One pillar against its tier bar.
 *
 * The notch is the admitted-student level for this tier, so a full-looking bar
 * that stops short of the notch still reads as short — which is exactly the
 * information a raw 0–100 meter was hiding.
 */
export function PillarBar({
  label,
  value,
  bar,
  reported,
  index,
}: {
  label: string;
  value: number;
  bar: number;
  reported: boolean;
  index: number;
}) {
  const reduced = useReducedMotion();
  const at = reported && value >= bar;
  // An unreported pillar draws no fill at all. Drawing one and labelling it
  // "not reported" says two different things about the same bar.
  const pct = reported ? Math.min(100, value) : 0;
  const barPct = Math.min(100, bar);

  return (
    <div className={cn(!reported && "opacity-55")}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-display text-[11px] font-semibold tracking-tight">
          {label}
        </span>
        <span className="shrink-0 font-serif text-[13px] tabular-nums text-muted-foreground">
          {reported ? (
            <>
              {/* Clearing the bar is marked by the fill reaching past the notch,
                  not by turning the number green. The notch is the whole
                  instrument; a second signal for the same fact is noise. */}
              <span className="text-foreground">{value}</span>
              <span className="mx-0.5 opacity-50">/</span>
              {bar}
            </>
          ) : (
            "not reported"
          )}
        </span>
      </div>
      <div className="relative mt-1.5 h-[7px] overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn(
            "h-full rounded-full",
            at ? "bg-foreground" : reported ? "bg-primary" : "bg-muted-foreground/40"
          )}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : 0.15 + index * 0.06, ease: EASE_OUT_EXPO }}
        />
        <span
          className="absolute top-0 h-full w-px bg-foreground/45"
          style={{ left: `${barPct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
