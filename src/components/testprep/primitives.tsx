import { type ReactNode, useId, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { masteryTone, pct } from "@/lib/testprep/stats";
import type { DomainStats, SkillStats } from "@/lib/testprep/stats";
import { AnimatedNumber, Collapse, Stagger, StaggerItem } from "@/components/testprep/motion";
import { EYEBROW, FOCUS, ROW_HOVER } from "@/lib/testprep/ui";

/**
 * The parts the SAT pages are built from.
 *
 * They exist so the section has one bar, one statistic and one topic row rather
 * than a slightly different version on each page — the thing that makes an
 * interface read as assembled rather than designed. If a page needs a shape
 * that is not here, the shape belongs here.
 */

/**
 * A progress bar.
 *
 * Grows from zero on first paint and then moves to any new value it is given,
 * so a bar that changes because an answer landed reads as the same object
 * moving rather than a different bar appearing. Not a loop, not a shimmer.
 */
export function Bar({
  value,
  className,
  tone = "accent",
  delay = 0,
  size = "default",
}: {
  /** 0-1. */
  value: number;
  className?: string;
  tone?: "accent" | "partial" | "success" | "warning" | "muted";
  delay?: number;
  size?: "default" | "sm";
}) {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, value));
  /*
    Four fills, three hues, no green.

    `success` used to be the distinct "you're strong here" colour. Under the
    College Board palette `--success` resolves to the same Cerulean Blue as
    `accent`, so a domain at 85% and one at 60% were drawing the identical
    bar — a three-tier scale rendering as two. `partial` restores the middle
    step as a lighter wash of the same blue: same hue, so it still reads as
    the same axis, visibly less filled-in, so it no longer reads as mastered.

    `success` is kept pointing at the token for anything outside the mastery
    scale that still asks for it, rather than being removed from the union
    and breaking a caller this file cannot see.
  */
  const fill = {
    accent: "bg-[hsl(var(--bb-blue))]",
    partial: "bg-[hsl(var(--bb-blue)/0.4)]",
    success: "bg-success",
    warning: "bg-warning",
    muted: "bg-muted-foreground/35",
  }[tone];

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-muted",
        size === "sm" ? "h-1" : "h-1.5",
        className,
      )}
    >
      <motion.div
        className={cn("h-full rounded-full", fill)}
        initial={reduced ? false : { width: 0 }}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO, delay: reduced ? 0 : delay }}
      />
    </div>
  );
}

/**
 * One statistic.
 *
 * Always rendered inside {@link StatGrid}, which supplies the hairline between
 * cells — so a page never has to decide how a group of figures is separated.
 */
export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 bg-card px-4 py-3.5 sm:px-5", className)}>
      <p className={EYEBROW}>{label}</p>
      <p className="mt-1.5 truncate font-display text-[22px] font-bold leading-none tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * A row of statistics in one surface.
 *
 * The separators are the grid's own `gap-px` over a border-coloured ground
 * rather than per-cell borders, which is what keeps the hairlines correct when
 * four cells wrap to two rows on a phone. Three bordered boxes with gaps
 * between them was the noisiest thing on the old Progress page.
 */
export function StatGrid({
  children,
  columns = 4,
  footer,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  /** Full-width area under the figures — a bar, usually. */
  footer?: ReactNode;
  className?: string;
}) {
  const cols = {
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div
      className={cn("overflow-hidden rounded-xl border border-border/70 bg-border/60", className)}
    >
      <div className={cn("grid gap-px", cols)}>{children}</div>
      {footer && <div className="mt-px bg-card px-4 py-3.5 sm:px-5">{footer}</div>}
    </div>
  );
}

/**
 * A labelled bar with its own percentage. The Overall preparation line, and
 * the same shape wherever a single quantity needs a label above it.
 */
export function LabelledBar({
  label,
  value,
  tone = "accent",
  caption,
  delay,
}: {
  label: string;
  /** 0-1. */
  value: number;
  tone?: "accent" | "partial" | "success" | "warning" | "muted";
  caption?: ReactNode;
  delay?: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className={EYEBROW}>{label}</p>
        <p className="text-xs font-semibold tabular-nums text-foreground">
          <AnimatedNumber value={Math.round(value * 100)} format={(n) => `${Math.round(n)}%`} />
        </p>
      </div>
      <Bar value={value} tone={tone} delay={delay} className="mt-2" />
      {caption && <p className="mt-1.5 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}

/**
 * One domain, with its skills folded underneath.
 *
 * This is the row the Overview is built from: name, mastery, a bar, a count,
 * and the action. Expanding it reveals the skills, which is where practice
 * actually happens — Subject → Domain → Skill → Practice, without a page change
 * at any step.
 *
 * The whole header is one button, so the hit target is the row rather than the
 * eleven pixels of chevron, and the action keeps its own tab stop.
 */
export function TopicRow({
  domain,
  practiceHref,
  skillHref,
}: {
  domain: DomainStats;
  /** Where the domain-level action goes. */
  practiceHref: string;
  /** Builds the href for one skill's practice set. */
  skillHref: (skill: SkillStats) => string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const started = domain.attempts > 0;

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <div className={cn("px-4 py-3 sm:px-5", ROW_HOVER)}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn("block w-full rounded-md text-left", FOCUS)}
        >
          <span className="flex items-baseline justify-between gap-4">
            <span className="flex min-w-0 items-center gap-1.5">
              <motion.span
                animate={{ rotate: open ? 90 : 0 }}
                transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
                className="inline-flex shrink-0 text-muted-foreground"
                aria-hidden="true"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </motion.span>
              <span className="truncate text-sm font-medium text-foreground">{domain.name}</span>
            </span>
            <span
              className={cn(
                "shrink-0 text-sm font-semibold tabular-nums",
                domain.mastery === null ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {pct(domain.mastery)}
            </span>
          </span>

          <Bar value={domain.mastery ?? 0} tone={masteryTone(domain.mastery)} className="mt-2.5" />
        </button>

        <div className="mt-2 flex items-baseline justify-between gap-4">
          <p className="truncate text-xs tabular-nums text-muted-foreground">
            {domain.completed} / {domain.available} completed
            {domain.mastery === null && domain.attempts > 0 && " · too few answers to rate"}
          </p>
          <Link
            to={practiceHref}
            className={cn(
              "shrink-0 rounded-md text-xs font-medium text-[hsl(var(--bb-blue))] transition-colors hover:text-[hsl(var(--bb-blue)/0.8)]",
              FOCUS,
            )}
          >
            {started ? "Continue" : "Practice"}
            <span aria-hidden="true"> →</span>
          </Link>
        </div>
      </div>

      <Collapse open={open}>
        <Stagger
          as="ul"
          count={domain.skills.length}
          step={0.02}
          className="border-t border-border/60 bg-muted/20 px-2 py-1 sm:px-3"
        >
          {domain.skills.map((skill) => (
            <StaggerItem key={skill.skillId} as="li" y={4}>
              <Link to={skillHref(skill)}>
                <motion.span
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-2 text-xs transition-colors hover:bg-background",
                    FOCUS,
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{skill.name}</span>
                  <span className="hidden w-20 shrink-0 sm:block">
                    <Bar value={skill.mastery ?? 0} tone={masteryTone(skill.mastery)} size="sm" />
                  </span>
                  <span
                    className={cn(
                      "w-9 shrink-0 text-right tabular-nums",
                      skill.mastery === null ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {pct(skill.mastery)}
                  </span>
                </motion.span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </Collapse>
    </div>
  );
}

/**
 * A row that is one sentence and one action.
 *
 * Practice and Practice Exams were each writing this shape by hand, which is
 * why their rows had drifted to different paddings and different button
 * variants for the same job.
 */
export function ActionRow({
  title,
  body,
  action,
  className,
}: {
  title: ReactNode;
  body?: ReactNode;
  action: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5", className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {body && <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{body}</p>}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

/** Difficulty, as a word. Used in the bank and in review. */
export function DifficultyTag({ value }: { value: "easy" | "medium" | "hard" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-px text-[0.92em] font-semibold capitalize leading-tight",
        value === "hard"
          ? "bg-[hsl(var(--bb-rule))] text-black"
          : value === "medium"
            ? "bg-[hsl(var(--bb-blue-soft))] text-[hsl(var(--bb-blue))]"
            : "bg-muted text-muted-foreground",
      )}
    >
      {value}
    </span>
  );
}

const DIFFICULTY_SEGMENTS: Record<"easy" | "medium" | "hard", number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

/**
 * Difficulty as three segments, filled from the left.
 *
 * The Question Bank table's difficulty column: one glance at a column of these
 * reads as a difficulty curve in a way that the word "medium" repeated forty
 * times down a column does not.
 */
export function DifficultyBar({ value }: { value: "easy" | "medium" | "hard" }) {
  const filled = DIFFICULTY_SEGMENTS[value];
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Difficulty: ${value}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            "h-1.5 w-4 rounded-full",
            i < filled ? "bg-[hsl(var(--bb-blue))]" : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

/**
 * The line that appears under every question.
 *
 * It is here, rather than written into each page, so that it cannot quietly
 * stop being shown: the bank is Pathforge-written, and a student practising for
 * a paid exam is entitled to know whose questions they are answering.
 */
export function SourceNote({ source }: { source: string }) {
  const label =
    source === "pathforge"
      ? "Written by Pathforge to the published SAT specification. Not a College Board question."
      : source === "official"
        ? "Official College Board question."
        : "Licensed practice question.";
  return <p className="text-[11px] leading-snug text-muted-foreground">{label}</p>;
}
