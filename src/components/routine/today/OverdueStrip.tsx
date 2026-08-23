import { motion } from "framer-motion";
import { Check, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerParent, staggerStep, listItem, viewportOnce } from "@/lib/motion";
import { relativeTime } from "@/lib/routine/dates";
import { PRIORITY_CLASSES } from "@/lib/routine/colors";
import { RoutinePanel } from "@/components/routine/RoutineShell";
import type { RoutineTask } from "@/lib/routine/types";

/**
 * Overdue tasks — surfaced, not alarmed. A quiet, scannable strip with a calm
 * amber accent rather than a red wall, each row tickable in place.
 */
export function OverdueStrip({
  tasks,
  now,
  pendingIds,
  onComplete,
}: {
  tasks: RoutineTask[];
  now: Date;
  pendingIds: Set<string>;
  onComplete: (task: RoutineTask) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <RoutinePanel
      title="Overdue"
      icon={History}
      description={`${tasks.length} task${tasks.length === 1 ? "" : "s"} past its deadline`}
      bodyClassName="p-3 sm:p-3"
    >
      <motion.ul
        variants={staggerParent}
        custom={staggerStep(tasks.length)}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="space-y-1.5"
      >
        {tasks.map((task) => (
          <motion.li
            key={task.id}
            variants={listItem}
            className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/40 px-3 py-2"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
              {task.due_at && (
                <p className="text-xs text-muted-foreground">
                  Due {relativeTime(new Date(task.due_at), now)}
                </p>
              )}
            </div>
            {task.priority !== "medium" && (
              <span
                className={cn(
                  "hidden rounded-full border px-1.5 py-0.5 text-[10px] font-medium sm:inline",
                  PRIORITY_CLASSES[task.priority],
                )}
              >
                {task.priority}
              </span>
            )}
            <button
              type="button"
              disabled={pendingIds.has(task.id)}
              onClick={() => onComplete(task)}
              aria-label={`Mark ${task.title} done`}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-transparent transition-colors hover:border-emerald-500 hover:text-emerald-500 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </RoutinePanel>
  );
}
