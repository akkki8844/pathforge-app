/**
 * The four Routine destinations, declared once.
 *
 * The navbar dropdown, the mobile drawer, and every page header read this
 * list, so a route can't exist in one place and be missing from another.
 * Order is the intended reading order of the product, not alphabetical:
 * the recurring week, then what to study inside it, then the wide view, then
 * the nudges you act on.
 *
 * Tasks and Habits used to be separate pages here, and later Today, Focus
 * and Goals were removed too. Their data still shows on the Calendar, and
 * Quick Add (press Q) still creates any of them inline without a page.
 */
import {
  CalendarRange,
  CalendarDays,
  Bell,
  BookOpenCheck,
} from "lucide-react";

export interface RoutineDestination {
  href: string;
  label: string;
  /** One line, shown under the label in the dropdown. Says what the page is *for*. */
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ROUTINE_DESTINATIONS: RoutineDestination[] = [
  {
    href: "/routine/timetable",
    label: "Timetable",
    description: "Recurring weekly classes",
    icon: CalendarRange,
  },
  {
    href: "/routine/study-planner",
    label: "Study Planner",
    description: "What to study and when, plus everything scheduled",
    icon: BookOpenCheck,
  },
  {
    href: "/routine/calendar",
    label: "Calendar",
    description: "Everything scheduled, on one grid you can drag",
    icon: CalendarDays,
  },
  {
    href: "/routine/reminders",
    label: "Reminders",
    description: "Nudges at the moment you need them",
    icon: Bell,
  },
];

export const ROUTINE_ROOT = "/routine";

export function isRoutinePath(pathname: string): boolean {
  return pathname === ROUTINE_ROOT || pathname.startsWith(`${ROUTINE_ROOT}/`);
}

export function routineDestination(pathname: string): RoutineDestination | undefined {
  return ROUTINE_DESTINATIONS.find((d) => d.href === pathname);
}
