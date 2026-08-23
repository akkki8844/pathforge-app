/**
 * Colour resolution for Routine entities.
 *
 * Rows store a token name (`"violet"`), never a hex value, so the same class
 * reads correctly in light and dark mode and survives a palette change. Every
 * variant here is defined for both schemes; nothing relies on a single literal
 * colour that would disappear against one of the two backgrounds.
 *
 * Colour is never the *only* signal for a category anywhere in Routine — the
 * calendar and agenda pair it with an icon and a shape — so these classes are
 * decoration on top of an already-legible distinction.
 */
import type { AgendaKind, RoutineColor } from "./types";

interface Swatch {
  /** Tinted surface + text + border, for chips and calendar pills. */
  chip: string;
  /** Solid-ish surface for timetable blocks, where the fill carries the meaning. */
  block: string;
  /** Just the text colour, for inline labels. */
  text: string;
  /** A 2px left rail, for agenda rows. */
  rail: string;
  /** `bg-` only, for dots and progress fills. */
  dot: string;
}

const SWATCHES: Record<RoutineColor, Swatch> = {
  slate: {
    chip: "bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-700",
    block: "bg-slate-500/15 text-slate-800 border-slate-400/40 dark:text-slate-200",
    text: "text-slate-600 dark:text-slate-300",
    rail: "border-l-slate-400 dark:border-l-slate-500",
    dot: "bg-slate-500",
  },
  blue: {
    chip: "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-300 dark:border-blue-800",
    block: "bg-blue-500/15 text-blue-800 border-blue-400/40 dark:text-blue-200",
    text: "text-blue-600 dark:text-blue-300",
    rail: "border-l-blue-500",
    dot: "bg-blue-500",
  },
  violet: {
    chip: "bg-violet-500/10 text-violet-700 border-violet-300 dark:text-violet-300 dark:border-violet-800",
    block: "bg-violet-500/15 text-violet-800 border-violet-400/40 dark:text-violet-200",
    text: "text-violet-600 dark:text-violet-300",
    rail: "border-l-violet-500",
    dot: "bg-violet-500",
  },
  emerald: {
    chip: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-800",
    block: "bg-emerald-500/15 text-emerald-800 border-emerald-400/40 dark:text-emerald-200",
    text: "text-emerald-600 dark:text-emerald-300",
    rail: "border-l-emerald-500",
    dot: "bg-emerald-500",
  },
  amber: {
    chip: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-800",
    block: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-200",
    text: "text-amber-600 dark:text-amber-300",
    rail: "border-l-amber-500",
    dot: "bg-amber-500",
  },
  rose: {
    chip: "bg-rose-500/10 text-rose-700 border-rose-300 dark:text-rose-300 dark:border-rose-800",
    block: "bg-rose-500/15 text-rose-800 border-rose-400/40 dark:text-rose-200",
    text: "text-rose-600 dark:text-rose-300",
    rail: "border-l-rose-500",
    dot: "bg-rose-500",
  },
  cyan: {
    chip: "bg-cyan-500/10 text-cyan-700 border-cyan-300 dark:text-cyan-300 dark:border-cyan-800",
    block: "bg-cyan-500/15 text-cyan-800 border-cyan-400/40 dark:text-cyan-200",
    text: "text-cyan-600 dark:text-cyan-300",
    rail: "border-l-cyan-500",
    dot: "bg-cyan-500",
  },
  orange: {
    chip: "bg-orange-500/10 text-orange-700 border-orange-300 dark:text-orange-300 dark:border-orange-800",
    block: "bg-orange-500/15 text-orange-800 border-orange-400/40 dark:text-orange-200",
    text: "text-orange-600 dark:text-orange-300",
    rail: "border-l-orange-500",
    dot: "bg-orange-500",
  },
};

/** Falls back to slate for an unrecognised token rather than rendering unstyled. */
export function swatch(color: string | null | undefined): Swatch {
  return SWATCHES[(color ?? "slate") as RoutineColor] ?? SWATCHES.slate;
}

/** The default tint for each agenda source, used when a row carries none. */
export const KIND_COLOR: Record<AgendaKind, RoutineColor> = {
  class: "blue",
  study: "violet",
  task: "amber",
  reminder: "cyan",
  event: "rose",
  habit: "emerald",
  goal: "orange",
};

/** Human label for an agenda source. Rendered next to the icon, not instead of it. */
export const KIND_LABEL: Record<AgendaKind, string> = {
  class: "Class",
  study: "Study",
  task: "Task",
  reminder: "Reminder",
  event: "Event",
  habit: "Habit",
  goal: "Goal",
};

/**
 * A stable colour for a subject name.
 *
 * Timetable rows store their own colour, but study blocks and focus history are
 * keyed by subject text alone, and those need to match the class the student
 * already coloured — or at least be consistent between pages. Hashing the name
 * gets consistency for free without another column to keep in sync.
 */
export function colorForSubject(subject: string): RoutineColor {
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) | 0;
  const palette: RoutineColor[] = ["blue", "violet", "emerald", "amber", "rose", "cyan", "orange"];
  return palette[Math.abs(h) % palette.length];
}

export const PRIORITY_CLASSES = {
  high: "bg-rose-500/10 text-rose-700 border-rose-300 dark:text-rose-300 dark:border-rose-800",
  medium: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-800",
  low: "bg-slate-500/10 text-slate-600 border-slate-300 dark:text-slate-300 dark:border-slate-700",
} as const;
