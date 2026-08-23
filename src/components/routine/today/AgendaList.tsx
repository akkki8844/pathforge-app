import { motion } from "framer-motion";
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CheckSquare,
  Flag,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerParent, staggerStep, listItem, viewportOnce } from "@/lib/motion";
import { formatClock } from "@/lib/routine/dates";
import { KIND_LABEL, swatch } from "@/lib/routine/colors";
import type { AgendaItem, AgendaKind } from "@/lib/routine/types";

/**
 * The chronological day. Each row is identifiable by KIND three ways — icon,
 * text label and colour rail — so the categories never depend on colour alone.
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

function timeLabel(item: AgendaItem): string {
  if (item.allDay) return "All day";
  const start = formatClock(item.start);
  if (item.end && item.end.getTime() !== item.start.getTime()) {
    return `${start} – ${formatClock(item.end)}`;
  }
  return start;
}

export function AgendaRow({
  item,
  live,
  actionable,
  pending,
  onToggle,
}: {
  item: AgendaItem;
  /** True while the item is currently underway. */
  live: boolean;
  /** Whether this kind can be ticked off from here. */
  actionable: boolean;
  pending: boolean;
  onToggle: (item: AgendaItem) => void;
}) {
  const sw = swatch(item.color);
  const Icon = KIND_ICON[item.kind];

  return (
    <motion.li
      variants={listItem}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-l-2 bg-card/60 px-3 py-2.5 transition-colors",
        sw.rail,
        live ? "border-accent/50 bg-accent/[0.04]" : "border-border",
        item.done && "opacity-60",
      )}
    >
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background",
          sw.text,
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "font-display text-[10px] font-bold uppercase tracking-[0.12em]",
              sw.text,
            )}
          >
            {KIND_LABEL[item.kind]}
          </span>
          {live && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Now
            </span>
          )}
          {item.overdue && !item.done && (
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
              Missed
            </span>
          )}
        </div>
        <p
          className={cn(
            "truncate text-sm font-medium text-foreground",
            item.done && "line-through",
          )}
        >
          {item.title}
        </p>
        {item.subtitle && (
          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          {timeLabel(item)}
        </span>
        {actionable && (
          <button
            type="button"
            role="checkbox"
            aria-checked={item.done}
            aria-label={`Mark ${item.title} ${item.done ? "not done" : "done"}`}
            disabled={pending}
            onClick={() => onToggle(item)}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
              item.done
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-border text-transparent hover:border-accent hover:text-accent/40",
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.li>
  );
}

export function AgendaList({
  items,
  isActionable,
  pendingKeys,
  onToggle,
  liveKeys,
}: {
  items: AgendaItem[];
  isActionable: (item: AgendaItem) => boolean;
  pendingKeys: Set<string>;
  onToggle: (item: AgendaItem) => void;
  liveKeys: Set<string>;
}) {
  return (
    <motion.ul
      variants={staggerParent}
      custom={staggerStep(items.length)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className="space-y-2"
    >
      {items.map((item) => (
        <AgendaRow
          key={item.key}
          item={item}
          live={liveKeys.has(item.key)}
          actionable={isActionable(item)}
          pending={pendingKeys.has(item.key)}
          onToggle={onToggle}
        />
      ))}
    </motion.ul>
  );
}
