/**
 * The eight Routine destinations, declared once.
 *
 * The navbar dropdown, the mobile drawer, the Routine sub-nav and every page
 * header read this list, so a route can't exist in one place and be missing from
 * another. Order is the intended reading order of the product, not alphabetical:
 * what's happening now, then the two things that fill a day, then the wide view,
 * then the things you act on, then the things you build over time.
 */
import {
  CalendarRange,
  CheckSquare,
  Bell,
  Timer,
  Repeat,
  Flag,
  Sun,
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
    href: "/routine/today",
    label: "Today",
    description: "Your day at a glance and what's next",
    icon: Sun,
  },
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
    href: "/routine/tasks",
    label: "Tasks",
    description: "Everything that needs doing",
    icon: CheckSquare,
  },
  {
    href: "/routine/reminders",
    label: "Reminders",
    description: "Nudges at the moment you need them",
    icon: Bell,
  },
  {
    href: "/routine/focus",
    label: "Focus",
    description: "Timed sessions for real work",
    icon: Timer,
  },
  {
    href: "/routine/habits",
    label: "Habits",
    description: "Routines you keep, and your streaks",
    icon: Repeat,
  },
  {
    href: "/routine/goals",
    label: "Goals",
    description: "Long-term outcomes and milestones",
    icon: Flag,
  },
];

export const ROUTINE_ROOT = "/routine";

export function isRoutinePath(pathname: string): boolean {
  return pathname === ROUTINE_ROOT || pathname.startsWith(`${ROUTINE_ROOT}/`);
}

export function routineDestination(pathname: string): RoutineDestination | undefined {
  return ROUTINE_DESTINATIONS.find((d) => d.href === pathname);
}
