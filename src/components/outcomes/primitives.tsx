import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Outcomes primitives.
 *
 * The page is a student's evidence file being read, so it is set like a
 * document under assessment rather than a dashboard: ruled surfaces, tracked
 * small-caps column heads, serif figures, and one measuring instrument.
 *
 * The visual language is the dashboard's — same eyebrow spec, same 1rem radius,
 * same `dash-feature` hero panel — because a student moving between the two
 * pages should not feel they have changed product. What is new here is the
 * *scale*: everything on this page is drawn against a marked bar rather than
 * as a percentage of nothing.
 */

// ─── Type and surface ────────────────────────────────────────────────────

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "block font-display text-[11px] font-bold uppercase tracking-[0.16em] text-primary",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Column head inside a ledger. Muted rather than blue — it labels, it doesn't announce. */
export function ColumnHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Serif numeral. Every figure on this page is set in it, at one of three sizes. */
export function Figure({
  children,
  size = "md",
  className,
}: {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-serif leading-none tabular-nums",
        size === "sm" && "text-[16px]",
        size === "md" && "text-[clamp(1.5rem,4vw,2rem)]",
        size === "lg" && "text-[clamp(2.4rem,9vw,4rem)] tracking-[-0.01em]",
        className
      )}
    >
      {children}
    </span>
  );
}

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
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}

/**
 * The card. Matches `dashboard/primitives.Panel` exactly so the two pages
 * share one surface, with `flush` for panels whose content is a ruled grid
 * that needs to reach the edges.
 */
export function Panel({
  children,
  className,
  tone = "default",
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "feature";
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border",
        flush ? "overflow-hidden p-0" : "p-5 sm:p-6",
        tone === "feature" ? "dash-feature" : "border-foreground/[0.14] bg-card/70",
        className
      )}
    >
      {children}
    </section>
  );
}

/** Eyebrow, title, and an optional right-hand note. */
export function PanelHead({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title?: string;
  note?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        {title && (
          <h2 className="mt-2 font-display text-lg font-semibold leading-[1.15] tracking-[-0.015em]">
            {title}
          </h2>
        )}
      </div>
      {note && <div className="shrink-0 text-right">{note}</div>}
    </div>
  );
}

// ─── The scale ───────────────────────────────────────────────────────────

/** The index runs to 115 because the overshoot cap lets a profile pass the bar. */
const SCALE_MAX = 115;

/**
 * The page's one instrument.
 *
 * A readiness figure only means something next to the thing it is being
 * measured against, so this draws the tier bar as a fixed notch at 100 and
 * puts the reading on the same rule. A profile at 62 reads as "well short of
 * the mark", which a 62% progress bar never does — 62% of an unnamed total is
 * not information.
 *
 * Deliberately horizontal and deliberately not a dial: the brief for this
 * page is a verdict a student can read in one glance, and a number inside a
 * ring hides the only comparison that matters.
 */
export function IndexScale({
  value,
  barLabel,
  toneClass,
}: {
  value: number;
  barLabel: string;
  toneClass: string;
}) {
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(100, (value / SCALE_MAX) * 100));
  const barPct = (100 / SCALE_MAX) * 100;

  return (
    <div className="w-full">
      <div className="relative pt-7">
        {/* The reading, riding above its own position on the rule. */}
        <motion.div
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
          initial={reduced ? false : { opacity: 0, left: "0%" }}
          animate={{ opacity: 1, left: `${pct}%` }}
          transition={{ duration: reduced ? 0 : 0.9, ease: EASE_OUT_EXPO }}
        >
          <span className={cn("font-display text-[12.5px] font-bold tabular-nums", toneClass)}>
            {value}
          </span>
        </motion.div>

        {/* The rule itself. 3px, squared off — a measuring edge, not a pill. */}
        <div className="relative h-[3px] w-full bg-border">
          <motion.div
            className={cn("absolute inset-y-0 left-0 bg-current", toneClass)}
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: reduced ? 0 : 0.9, ease: EASE_OUT_EXPO }}
          />
          {/* The bar. Full-height and darker than the rule so it reads as the
              thing being cleared, not as another segment of the fill. */}
          <span
            className="absolute -top-1.5 h-[15px] w-[2px] bg-foreground/70"
            style={{ left: `${barPct}%` }}
            aria-hidden
          />
        </div>

        {/* Ticks. Only three, at the two ends and the bar. */}
        <div className="relative mt-2 h-4">
          <span className="absolute left-0 font-display text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            0
          </span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap font-display text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/70"
            style={{ left: `${barPct}%` }}
          >
            {barLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Ledger row ──────────────────────────────────────────────────────────

/**
 * One measured line against its bar.
 *
 * The notch is the same device as the scale above, shrunk to a row: the fill
 * is the student's score, the hairline is what the tier expects. A row that
 * looks two-thirds full but stops short of the notch still reads as short,
 * which is the fact a bare 0–100 meter was hiding.
 */
export function MeasuredRow({
  label,
  score,
  bar,
  attainment,
  note,
  index = 0,
  muted = false,
}: {
  label: string;
  score: number;
  bar: number;
  attainment: number;
  note?: string;
  index?: number;
  muted?: boolean;
}) {
  const reduced = useReducedMotion();
  const at = score >= bar;
  // Both the fill and the notch are drawn on a track that runs to 115% of the
  // bar, so "past the bar" has somewhere to go and the notch never sits at the
  // right-hand edge where it would be invisible.
  const track = bar * 1.15;
  const fillPct = Math.max(0, Math.min(100, (score / track) * 100));
  const barPct = (bar / track) * 100;

  return (
    <div className={cn("px-4 py-3 sm:px-5", muted && "opacity-55")}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-display text-[15px] font-semibold tracking-tight">
          {label}
        </span>
        <span className="shrink-0">
          {/* Clearing the bar is shown by the fill passing the notch. Colouring
              the figure green as well says the same thing twice, in a hue this
              page uses for nothing else. */}
          <Figure size="sm" className="text-foreground">
            {attainment}
          </Figure>
          <span className="ml-0.5 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            % of bar
          </span>
        </span>
      </div>

      <div className="relative mt-2 h-[6px] w-full bg-muted">
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0",
            at ? "bg-foreground" : score > 0 ? "bg-primary" : "bg-transparent"
          )}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{
            duration: reduced ? 0 : 0.6,
            delay: reduced ? 0 : Math.min(0.24, index * 0.03),
            ease: EASE_OUT_EXPO,
          }}
        />
        <span
          className="absolute -top-[3px] h-[12px] w-px bg-foreground/60"
          style={{ left: `${barPct}%` }}
          aria-hidden
        />
      </div>

      {note && (
        <p className="mt-2 text-[13.5px] leading-snug text-muted-foreground">{note}</p>
      )}
    </div>
  );
}

/**
 * A ruled stack. The hairlines are the grid's own gap showing the container
 * through, which is correct at any row count without per-row border rules.
 */
export function Ledger({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-px bg-border", className)}>{children}</div>;
}

export function LedgerCell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("bg-card", className)}>{children}</div>;
}
