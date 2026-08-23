import { BookOpenCheck, CheckSquare, Repeat } from "lucide-react";
import { RoutinePanel, RoutineStat } from "@/components/routine/RoutineShell";
import { formatDuration } from "@/lib/routine/dates";
import type { DaySummary } from "@/lib/routine/derive";

/**
 * The day's standing, from `summarizeDay`. Three counted tiles plus one
 * restrained bar — no rings or dials, in keeping with the section's calm tone.
 */
export function DayProgress({ summary }: { summary: DaySummary }) {
  const { overall } = summary;

  return (
    <RoutinePanel title="Today's progress" bodyClassName="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <RoutineStat
          icon={CheckSquare}
          label="Tasks"
          value={`${summary.tasksDone}/${summary.tasksTotal}`}
          hint={summary.tasksTotal ? "done" : "none due"}
        />
        <RoutineStat
          icon={BookOpenCheck}
          label="Study"
          value={
            summary.studyPlannedMinutes
              ? formatDuration(summary.studyCompletedMinutes) || "0m"
              : "0m"
          }
          hint={
            summary.studyPlannedMinutes
              ? `of ${formatDuration(summary.studyPlannedMinutes)}`
              : "no plan"
          }
        />
        <RoutineStat
          icon={Repeat}
          label="Habits"
          value={`${summary.habitsDone}/${summary.habitsDue}`}
          hint={summary.habitsDue ? "done" : "none due"}
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Day progress
          </span>
          <span className="font-display text-xs font-bold tabular-nums text-foreground">
            {overall}%
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={overall}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall progress for today"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>
    </RoutinePanel>
  );
}
