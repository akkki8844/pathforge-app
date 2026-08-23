/**
 * Shared visual vocabulary for the Calendar's three views.
 *
 * The section's non-negotiable rule is that a category is legible *without*
 * relying on colour: every kind carries its own lucide icon and its own label
 * (`KIND_LABEL`) on top of the tint resolved from `swatch()`. The chip and the
 * row here are the two shapes the month grid, week grid, agenda list and day
 * sheet all draw items with — so an "event" reads the same everywhere and no
 * view re-invents the rendering.
 */
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpenCheck,
  CalendarClock,
  CheckSquare,
  Flag,
  GraduationCap,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/routine/dates";
import { KIND_LABEL, swatch } from "@/lib/routine/colors";
import type { AgendaItem, AgendaKind } from "@/lib/routine/types";

export type CalendarView = "month" | "week" | "day" | "agenda";

/** The icon that carries each kind's identity independently of its colour. */
export const KIND_ICON: Record<AgendaKind, LucideIcon> = {
  class: GraduationCap,
  study: BookOpenCheck,
  task: CheckSquare,
  reminder: Bell,
  event: CalendarClock,
  habit: Repeat,
  goal: Flag,
};

/** Reading order for filters, legends and the day-sheet's grouped sections. */
export const KIND_ORDER: AgendaKind[] = [
  "class",
  "study",
  "task",
  "reminder",
  "event",
  "habit",
  "goal",
];

/**
 * A compact chip for dense surfaces (month cells, week all-day row).
 *
 * The icon is the primary non-colour signal; `title` spells out the kind for a
 * pointer, and the whole chip is a button so a click reaches the day it lives
 * on. Done items dim and strike; overdue ones gain a ring so they read at a
 * glance without depending on the amber/rose distinction.
 */
export function ItemChip({
  item,
  onClick,
  showTime = true,
  className,
}: {
  item: AgendaItem;
  onClick?: () => void;
  showTime?: boolean;
  className?: string;
}) {
  const s = swatch(item.color);
  const Icon = KIND_ICON[item.kind];
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${KIND_LABEL[item.kind]}: ${item.title}`}
      className={cn(
        "flex w-full items-center gap-1 overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-tight transition-colors",
        s.chip,
        item.done && "opacity-55",
        item.overdue && "ring-1 ring-destructive/60",
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {showTime && !item.allDay && (
        <span className="shrink-0 tabular-nums opacity-70">{formatClock(item.start)}</span>
      )}
      <span className={cn("truncate", item.done && "line-through")}>{item.title}</span>
    </button>
  );
}

/**
 * The fuller row used in the agenda list and day sheet. Carries a coloured left
 * rail, an iconned badge, the kind label in words, and the time range.
 */
export function ItemRow({
  item,
  onClick,
}: {
  item: AgendaItem;
  onClick?: () => void;
}) {
  const s = swatch(item.color);
  const Icon = KIND_ICON[item.kind];
  const inner = (
    <>
      <span
        className={cn(
          "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
          s.chip,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "truncate text-sm font-medium text-foreground",
              item.done && "text-muted-foreground line-through",
            )}
          >
            {item.title}
          </p>
          {item.overdue && (
            <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
              Overdue
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span className={s.text}>{KIND_LABEL[item.kind]}</span>
          {item.allDay ? (
            <> · All day</>
          ) : (
            <>
              {" · "}
              <span className="tabular-nums">{formatClock(item.start)}</span>
              {item.end ? <span className="tabular-nums">–{formatClock(item.end)}</span> : null}
            </>
          )}
          {item.subtitle ? <> · {item.subtitle}</> : null}
        </p>
      </div>
    </>
  );

  const base =
    "flex w-full items-start gap-3 rounded-xl border border-l-2 border-border bg-card/60 px-3 py-2.5 text-left";
  if (!onClick) {
    return <div className={cn(base, s.rail)}>{inner}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(base, s.rail, "transition-colors hover:border-accent/50 hover:bg-card")}
    >
      {inner}
    </button>
  );
}

/**
 * The mobile month indicator: up to three tiny *icons* rather than featureless
 * dots, so the compact grid still distinguishes a class from a deadline without
 * leaning on colour, then a "+N" for the remainder.
 */
export function DayIndicators({ items }: { items: AgendaItem[] }) {
  if (items.length === 0) return null;
  const shown = items.slice(0, 3);
  const extra = items.length - shown.length;
  return (
    <div className="mt-auto flex items-center justify-center gap-0.5">
      {shown.map((it) => {
        const Icon = KIND_ICON[it.kind];
        return (
          <Icon
            key={it.key}
            className={cn("h-2.5 w-2.5", swatch(it.color).text, it.done && "opacity-40")}
            aria-hidden
          />
        );
      })}
      {extra > 0 && <span className="text-[9px] font-semibold text-muted-foreground">+{extra}</span>}
    </div>
  );
}

/** Small legend chip showing icon + label + colour, used in filters. */
export function KindGlyph({ kind, className }: { kind: AgendaKind; className?: string }) {
  const Icon = KIND_ICON[kind];
  return <Icon className={cn("h-3.5 w-3.5", className)} aria-hidden />;
}
