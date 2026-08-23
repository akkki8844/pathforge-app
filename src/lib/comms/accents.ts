/**
 * Accent resolution for teams and group conversations.
 *
 * Rows store a token name (`"violet"`), never a hex value, for two reasons: the
 * same class then reads correctly in light and dark mode, and Tailwind's JIT
 * only emits CSS for class strings it can find literally in the source — a
 * class built by interpolating a stored value (`bg-[${row.accent}]`) produces no
 * rule at all and renders untinted.
 *
 * This is the Communications counterpart to `@/lib/routine/colors`, kept
 * separate because the variants a team header and a chat bubble need are not
 * the ones a calendar pill needs.
 */
import type { TeamAccent } from "./types";

interface Accent {
  /** Tinted surface + text + border, for chips and badges. */
  chip: string;
  /** Just the text colour, for inline labels and icons. */
  text: string;
  /** `bg-` only, for dots, unread badges and progress fills. */
  dot: string;
  /** Soft two-stop wash for a team header — the one place a gradient earns its keep. */
  header: string;
  /** Tinted ring/border for a selected card. */
  ring: string;
  /** Solid fill for an avatar fallback. */
  avatar: string;
}

const ACCENTS: Record<TeamAccent, Accent> = {
  indigo: {
    chip: "bg-indigo-500/10 text-indigo-700 border-indigo-300 dark:text-indigo-300 dark:border-indigo-800",
    text: "text-indigo-600 dark:text-indigo-300",
    dot: "bg-indigo-500",
    header: "from-indigo-500/20 via-indigo-500/5 to-transparent",
    ring: "ring-indigo-500/40 border-indigo-400/50",
    avatar: "bg-indigo-500 text-white",
  },
  violet: {
    chip: "bg-violet-500/10 text-violet-700 border-violet-300 dark:text-violet-300 dark:border-violet-800",
    text: "text-violet-600 dark:text-violet-300",
    dot: "bg-violet-500",
    header: "from-violet-500/20 via-violet-500/5 to-transparent",
    ring: "ring-violet-500/40 border-violet-400/50",
    avatar: "bg-violet-500 text-white",
  },
  emerald: {
    chip: "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-800",
    text: "text-emerald-600 dark:text-emerald-300",
    dot: "bg-emerald-500",
    header: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    ring: "ring-emerald-500/40 border-emerald-400/50",
    avatar: "bg-emerald-500 text-white",
  },
  amber: {
    chip: "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-800",
    text: "text-amber-600 dark:text-amber-300",
    dot: "bg-amber-500",
    header: "from-amber-500/20 via-amber-500/5 to-transparent",
    ring: "ring-amber-500/40 border-amber-400/50",
    avatar: "bg-amber-500 text-white",
  },
  rose: {
    chip: "bg-rose-500/10 text-rose-700 border-rose-300 dark:text-rose-300 dark:border-rose-800",
    text: "text-rose-600 dark:text-rose-300",
    dot: "bg-rose-500",
    header: "from-rose-500/20 via-rose-500/5 to-transparent",
    ring: "ring-rose-500/40 border-rose-400/50",
    avatar: "bg-rose-500 text-white",
  },
  cyan: {
    chip: "bg-cyan-500/10 text-cyan-700 border-cyan-300 dark:text-cyan-300 dark:border-cyan-800",
    text: "text-cyan-600 dark:text-cyan-300",
    dot: "bg-cyan-500",
    header: "from-cyan-500/20 via-cyan-500/5 to-transparent",
    ring: "ring-cyan-500/40 border-cyan-400/50",
    avatar: "bg-cyan-500 text-white",
  },
  orange: {
    chip: "bg-orange-500/10 text-orange-700 border-orange-300 dark:text-orange-300 dark:border-orange-800",
    text: "text-orange-600 dark:text-orange-300",
    dot: "bg-orange-500",
    header: "from-orange-500/20 via-orange-500/5 to-transparent",
    ring: "ring-orange-500/40 border-orange-400/50",
    avatar: "bg-orange-500 text-white",
  },
  slate: {
    chip: "bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-700",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-500",
    header: "from-slate-500/20 via-slate-500/5 to-transparent",
    ring: "ring-slate-500/40 border-slate-400/50",
    avatar: "bg-slate-500 text-white",
  },
};

/** Falls back to indigo (the Pathforge brand hue) rather than rendering unstyled. */
export function accent(name: string | null | undefined): Accent {
  return ACCENTS[(name ?? "indigo") as TeamAccent] ?? ACCENTS.indigo;
}

/**
 * A stable accent for a name, used as the default when creating a team and for
 * DM avatars, which have no stored accent of their own. Hashing gets consistency
 * between pages for free rather than needing another column.
 */
export function accentForName(name: string): TeamAccent {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const palette: TeamAccent[] = [
    "indigo", "violet", "emerald", "amber", "rose", "cyan", "orange",
  ];
  return palette[Math.abs(h) % palette.length];
}

/**
 * Semantic styling for an objective's due state.
 *
 * Uses the `success`/`warning` tokens added for Communications rather than raw
 * palette colours, so "done" and "due soon" mean the same thing here as they
 * will anywhere else in the product.
 */
export const DUE_STATE_CLASSES = {
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  soon: "bg-warning/10 text-warning border-warning/30",
  done: "bg-success/10 text-success border-success/30",
  normal: "bg-muted text-muted-foreground border-border",
} as const;

export type DueState = keyof typeof DUE_STATE_CLASSES;

/**
 * Which due state an objective is in.
 *
 * "Soon" is the next 48 hours — wide enough to catch a tomorrow-evening
 * deadline seen the previous morning, which is the case the deadline reminders
 * are built around.
 */
export function dueState(
  dueAt: string | null,
  status: string,
  now: Date = new Date(),
): DueState {
  if (status === "done") return "done";
  if (!dueAt) return "normal";
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return "normal";
  const ms = due - now.getTime();
  if (ms < 0) return "overdue";
  if (ms < 48 * 60 * 60 * 1000) return "soon";
  return "normal";
}
