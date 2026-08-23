import { Link } from "react-router-dom";
import { BookOpenCheck, CheckSquare, Timer } from "lucide-react";
import { RoutinePanel } from "@/components/routine/RoutineShell";

/**
 * Contextual jump-offs. Quick-add already lives in the sub-nav, so this row is
 * about starting the two things you *do* from Today and reaching the pages that
 * own the rest.
 */

const ACTIONS: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
}[] = [
  { href: "/routine/focus", label: "Start focus", icon: Timer, primary: true },
  { href: "/routine/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/routine/study-planner", label: "Plan & calendar", icon: BookOpenCheck },
];

export function QuickActions() {
  return (
    <RoutinePanel title="Quick actions" bodyClassName="p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map(({ href, label, icon: Icon, primary }) => (
          <Link
            key={href}
            to={href}
            className={
              "inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors " +
              (primary
                ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
                : "border-border text-foreground hover:border-accent/50 hover:text-accent")
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </div>
    </RoutinePanel>
  );
}
