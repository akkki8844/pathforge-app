import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";

/**
 * Outcomes primitives — Cluely spec.
 *
 * The page used to be set as a document under assessment: cream paper, serif
 * figures, tracked small-caps column heads and six ruled ledgers stacked down
 * the page. That is a good way to publish a finding and a poor way to deliver
 * one. A student opening this page is asking a single question, and the
 * broadsheet made them read four panels of prose to reach the answer.
 *
 * This is Cluely's language instead, taken from their shipped desktop app:
 * Geist at two weights, zinc neutrals, one cyan-blue accent, a 10px radius,
 * flat cards with a single lifted lead. Figures are tabular sans rather than
 * serif — a readiness index is an instrument reading, and Geist's numerals are
 * drawn for exactly that.
 *
 * Palette tokens live in `index.css` under `[data-cluely]`, so every shadcn
 * control on this route inherits them without a per-component override.
 */

// ─── Type ────────────────────────────────────────────────────────────────

/**
 * Section label. Muted, not blue.
 *
 * Blue is the accent this page uses to mean "this is the measured quantity" —
 * on the index, on a fill, on a points figure. Spending it on every heading as
 * well left the page with no way to point at anything.
 */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "block font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Kept as a distinct name because it labels a column rather than a section. */
export function ColumnHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Every numeral on this page. Geist, tabular, tight. */
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
        "font-cluely font-semibold leading-none tabular-nums tracking-[-0.02em]",
        size === "sm" && "text-[15px]",
        size === "md" && "text-[clamp(1.4rem,4vw,1.9rem)]",
        size === "lg" && "text-[clamp(3.4rem,13vw,5.75rem)] tracking-[-0.045em]",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Panel headings. */
export function Title({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "font-cluely text-[17px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground",
        className
      )}
    >
      {children}
    </h2>
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
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
}

// ─── Surface ─────────────────────────────────────────────────────────────

/**
 * The card. One hairline, one radius, no shadow — except `lead`, which is the
 * page's single elevated surface and is defined in `index.css` so it can carry
 * a gradient and a dark-mode variant.
 */
export function Panel({
  children,
  className,
  tone = "default",
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "lead";
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-[0.875rem] border",
        flush ? "overflow-hidden p-0" : "p-5 sm:p-6",
        tone === "lead" ? "cly-lead" : "border-border bg-card",
        className
      )}
    >
      {children}
    </section>
  );
}

/** Panel header: a title, and an optional right-hand note. */
export function PanelHead({
  eyebrow,
  title,
  note,
  className,
}: {
  eyebrow?: string;
  title?: string;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {title && <Title className={cn(eyebrow && "mt-1.5")}>{title}</Title>}
      </div>
      {note && <div className="shrink-0 text-right">{note}</div>}
    </div>
  );
}

/**
 * A labelled quantity.
 *
 * Three of the old page's six panels existed only to state one number with a
 * paragraph under it — the file's shape, the months of runway, how much of the
 * record carries proof. Each was a full ruled card with its own heading, its
 * own prose and its own explanation of why it is not a score. They are these
 * instead, in a row beneath the verdict they qualify.
 */
export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <ColumnHead>{label}</ColumnHead>
      <div className="mt-1.5 font-cluely text-[15px] font-semibold tracking-[-0.01em] text-foreground">
        {value}
      </div>
      {hint && (
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

// ─── The scale ───────────────────────────────────────────────────────────

/** The index runs to 115 because the overshoot cap lets a profile pass the bar. */
const SCALE_MAX = 115;

/**
 * The page's one instrument.
 *
 * A readiness figure only means something next to the thing it is measured
 * against, so this draws the tier bar as a fixed notch at 100 and puts the
 * reading on the same rule. A profile at 62 reads as "well short of the mark",
 * which a 62% progress bar never does.
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
      <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-full bg-current", toneClass)}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduced ? 0 : 0.8, ease: EASE_OUT_EXPO }}
        />
        {/* The bar, drawn over the fill so passing it stays visible. */}
        <span
          className="absolute inset-y-0 w-[2px] bg-foreground/45"
          style={{ left: `${barPct}%` }}
          aria-hidden
        />
      </div>

      <div className="relative mt-2 h-4">
        <span className="absolute left-0 font-cluely text-[11px] font-medium tabular-nums text-muted-foreground">
          0
        </span>
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap font-cluely text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/70"
          style={{ left: `${barPct}%` }}
        >
          {barLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Ledger row ──────────────────────────────────────────────────────────

/**
 * One measured line against its bar.
 *
 * The notch is the scale above shrunk to a row: the fill is the student's
 * score, the hairline is what the tier expects. The explanatory `note` that
 * used to print under every one of these is gone — ten rows each carrying a
 * sentence is a page of prose pretending to be a table.
 */
export function MeasuredRow({
  label,
  score,
  bar,
  attainment,
  index = 0,
  muted = false,
}: {
  label: string;
  score: number;
  bar: number;
  attainment: number;
  index?: number;
  muted?: boolean;
}) {
  const reduced = useReducedMotion();
  const at = score >= bar;
  // Both fill and notch are drawn on a track running to 115% of the bar, so
  // "past the bar" has somewhere to go and the notch is never at the edge.
  const track = bar * 1.15;
  const fillPct = Math.max(0, Math.min(100, (score / track) * 100));
  const barPct = (bar / track) * 100;

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_minmax(4rem,7rem)_3rem] items-center gap-x-3 px-5 py-2.5 sm:gap-x-4 sm:px-6",
        muted && "opacity-50"
      )}
    >
      <span className="min-w-0 truncate font-cluely text-[14px] font-medium tracking-[-0.01em]">
        {label}
      </span>

      <div className="relative h-[5px] w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            at ? "bg-foreground" : score > 0 ? "bg-primary" : "bg-transparent"
          )}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{
            duration: reduced ? 0 : 0.55,
            delay: reduced ? 0 : Math.min(0.2, index * 0.025),
            ease: EASE_OUT_EXPO,
          }}
        />
        <span
          className="absolute inset-y-0 w-px bg-foreground/45"
          style={{ left: `${barPct}%` }}
          aria-hidden
        />
      </div>

      <span
        className={cn(
          "text-right font-cluely text-[13px] font-semibold tabular-nums tracking-[-0.01em]",
          at ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {attainment}%
      </span>
    </div>
  );
}

/** A ruled stack. The hairlines are the grid's own gap showing through. */
export function Ledger({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-px bg-border", className)}>{children}</div>;
}

export function LedgerCell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("bg-card", className)}>{children}</div>;
}
