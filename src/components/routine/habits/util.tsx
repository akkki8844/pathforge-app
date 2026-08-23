/**
 * Small presentation helpers shared by the Habits components.
 *
 * These are pure label formatters — no data access. They live beside the
 * components that use them so the Habits page never re-invents "how do we say
 * this frequency in words" in three slightly different ways.
 */
import { WEEKDAY_LABELS, type RoutineHabit, type Weekday } from "@/lib/routine/types";
import { formatTime } from "@/lib/routine/dates";

/** Monday-first ordering key for a 0=Sunday weekday. */
export function mondayIndex(day: Weekday): number {
  return (day + 6) % 7;
}

/** The Monday-first weekday values, for pickers and grids. */
export const WEEKDAYS_MONDAY_FIRST: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** "Every day" / "3× per week" / "Mon, Wed, Fri". */
export function frequencyLabel(h: RoutineHabit): string {
  if (h.frequency === "daily") return "Every day";
  if (h.frequency === "weekly") return `${h.target_per_week}× per week`;
  const days = [...(h.target_days ?? [])].sort((a, b) => mondayIndex(a) - mondayIndex(b));
  if (days.length === 0) return "Custom";
  if (days.length === 7) return "Every day";
  return days.map((d) => WEEKDAY_LABELS[d]).join(", ");
}

/** "20 minutes" / "30 pages", or null when the habit is a simple tick. */
export function targetLabel(h: RoutineHabit): string | null {
  if (!h.target_quantity) return null;
  return `${h.target_quantity}${h.unit ? ` ${h.unit}` : ""}`;
}

/** The preferred time as a locale clock, or null. */
export function preferredTimeLabel(h: RoutineHabit): string | null {
  return h.preferred_time ? formatTime(h.preferred_time) : null;
}
