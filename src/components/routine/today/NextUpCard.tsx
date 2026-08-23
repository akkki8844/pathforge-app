import { motion } from "framer-motion";
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CheckSquare,
  CircleCheck,
  Flag,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { transition } from "@/lib/motion";
import { formatClock, relativeTime } from "@/lib/routine/dates";
import { KIND_LABEL, swatch } from "@/lib/routine/colors";
import type { AgendaItem, AgendaKind } from "@/lib/routine/types";

/**
 * The one card that answers "what do I do next". Its countdown reads from the
 * `now` the page ticks every 30s, so "in 23m" stays honest without a refresh.
 */

const KIND_ICON: Record<AgendaKind, React.ComponentType<{ className?: string }>> = {
  class: CalendarRange,
  study: BookOpenCheck,
  task: CheckSquare,
  reminder: Bell,
  event: CalendarDays,
  habit: Repeat,
  goal: Flag,
};

export function NextUpCard({
  item,
  mode,
  now,
  actionable,
  pending,
  onToggle,
}: {
  /** null once nothing is left for the day. */
  item: AgendaItem | null;
  mode: "now" | "next";
  now: Date;
  actionable: boolean;
  pending: boolean;
  onToggle: (item: AgendaItem) => void;
}) {
  if (!item) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition.base}
        className="rounded-2xl border border-border bg-card/60 p-5"
      >
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Next up
        </p>
        <div className="mt-3 flex items-center gap-3">
          <CircleCheck className="h-6 w-6 text-emerald-500" />
          <div>
            <p className="font-display text-base font-bold text-foreground">
              Nothing left scheduled
            </p>
            <p className="text-sm text-muted-foreground">
              You're clear for the rest of the day.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const sw = swatch(item.color);
  const Icon = KIND_ICON[item.kind];
  const target = mode === "now" ? item.end ?? item.start : item.start;
  const countdown =
    mode === "now"
      ? item.end
        ? `Ends ${relativeTime(item.end, now)}`
        : "Happening now"
      : `Starts ${relativeTime(target, now)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.base}
      className={cn(
        "overflow-hidden rounded-2xl border bg-card/70 p-5",
        mode === "now" ? "border-accent/50" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em]",
            mode === "now" ? "text-accent" : "text-muted-foreground",
          )}
        >
          {mode === "now" && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
          {mode === "now" ? "Happening now" : "Next up"}
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]",
            sw.chip,
          )}
        >
          <Icon className="h-3 w-3" />
          {KIND_LABEL[item.kind]}
        </span>
      </div>

      <p className="mt-3 font-display text-xl font-bold leading-tight text-foreground">
        {item.title}
      </p>
      {item.subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold tabular-nums text-foreground">
            {countdown}
          </p>
          {!item.allDay && (
            <p className="text-xs tabular-nums text-muted-foreground">
              {formatClock(item.start)}
              {item.end ? ` – ${formatClock(item.end)}` : ""}
            </p>
          )}
        </div>
        {actionable && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onToggle(item)}
            className={cn(
              "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
              item.done
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20",
            )}
          >
            <Check className="h-3.5 w-3.5" />
            {item.done ? "Done" : "Mark done"}
          </button>
        )}
      </div>
    </motion.div>
  );
}
