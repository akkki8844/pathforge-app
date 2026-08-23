import { useCallback } from "react";
import { toast } from "sonner";
import { dateKey, formatShortDate, relativeDayLabel } from "@/lib/routine/dates";
import { useRoutineTasks, useStudyBlocks } from "@/hooks/routine/useRoutineData";
import type {
  NewRoutineTask,
  RoutineTask,
  TaskRecurrence,
  TaskStatus,
} from "@/lib/routine/types";

/**
 * Every write the Tasks page performs, in one place.
 *
 * The page and its two views all need the same four verbs — tick, move, convert,
 * delete — and two of them are more than a single mutation (a recurring task's
 * completion is a tick *and* a roll-forward). Putting them behind one hook keeps
 * that composite behaviour from being re-implemented per view and drifting: the
 * list and the board tick a task through exactly the same code path.
 *
 * Nothing here writes to a goal. A task carrying `goal_id` moves its goal's
 * percentage because `goalProgress` reads the same tasks query this hook
 * invalidates — see the note at the top of `useRoutineData`.
 */

/**
 * The next occurrence of a recurring task.
 *
 * Rolled forward from the *previous* due instant so the original time of day
 * survives — a 7am daily task stays a 7am task no matter when it was actually
 * ticked. It is then advanced until it lands in the future, because a task
 * finished three weeks late should reappear as tomorrow's job, not as five more
 * overdue rows. Month steps use `setMonth`, which clamps 31 January to the last
 * day of February rather than skipping a month.
 */
export function nextDueAt(
  recurrence: TaskRecurrence,
  dueAt: string | null,
  from: Date = new Date(),
): string | null {
  if (recurrence === "none") return dueAt;
  const cursor = dueAt ? new Date(dueAt) : new Date(from);
  if (Number.isNaN(cursor.getTime())) return dueAt;

  // Bounded: enough to cross a decade of daily repeats, never unbounded on a
  // malformed date.
  for (let i = 0; i < 4000; i++) {
    switch (recurrence) {
      case "daily":
        cursor.setDate(cursor.getDate() + 1);
        break;
      case "weekly":
        cursor.setDate(cursor.getDate() + 7);
        break;
      case "monthly":
        cursor.setMonth(cursor.getMonth() + 1);
        break;
      default:
        return cursor.toISOString();
    }
    if (cursor > from) break;
  }
  return cursor.toISOString();
}

export interface TaskActions {
  tasks: RoutineTask[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  saving: boolean;
  createTask: (input: NewRoutineTask) => Promise<RoutineTask>;
  updateTask: (args: { id: string; patch: Partial<NewRoutineTask> }) => Promise<void>;
  /** Tick or un-tick. Recurring tasks roll forward instead of staying done. */
  toggleDone: (task: RoutineTask) => Promise<void>;
  moveTo: (task: RoutineTask, status: TaskStatus) => Promise<void>;
  convertToStudyBlock: (task: RoutineTask) => Promise<void>;
  deleteTask: (task: RoutineTask) => Promise<void>;
}

export function useTaskActions(): TaskActions {
  const {
    tasks,
    loading,
    error,
    refetch,
    createTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    toggleTask,
    saving,
  } = useRoutineTasks();
  const { createStudyBlock } = useStudyBlocks();

  const toggleDone = useCallback(
    async (task: RoutineTask) => {
      const reopening = task.status === "done";
      try {
        // The optimistic mutation runs first either way, so the checkbox lands on
        // the tap. The roll-forward is a second, non-optimistic write — by the
        // time it resolves the tick has already been seen.
        await toggleTask(task);
        if (!reopening && task.recurrence !== "none") {
          const next = nextDueAt(task.recurrence, task.due_at);
          await updateTask({
            id: task.id,
            patch: { status: "todo", completed_at: null, due_at: next },
          });
          toast.success("Done — and scheduled again", {
            description: next
              ? `Next: ${relativeDayLabel(new Date(next))}`
              : `Repeats ${task.recurrence}`,
          });
        }
      } catch (err) {
        toast.error("Couldn't update that task", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    },
    [toggleTask, updateTask],
  );

  const moveTo = useCallback(
    async (task: RoutineTask, status: TaskStatus) => {
      if (task.status === status) return;
      if (status === "done") {
        await toggleDone({ ...task, status: "todo" });
        return;
      }
      try {
        await setTaskStatus({ id: task.id, status });
      } catch (err) {
        toast.error("Couldn't move that task", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    },
    [setTaskStatus, toggleDone],
  );

  const convertToStudyBlock = useCallback(
    async (task: RoutineTask) => {
      const day = task.due_at ? new Date(task.due_at) : new Date();
      try {
        await createStudyBlock({
          subject: task.title,
          topic: task.description,
          objective: null,
          // A block with no length can't be planned around, so an unestimated
          // task gets the planner's own default session rather than zero.
          planned_minutes: task.estimated_minutes ?? 45,
          completed_minutes: 0,
          priority: task.priority,
          scheduled_date: dateKey(day),
          // "Sometime that day": the task's due time is a deadline, not a start.
          scheduled_start: null,
          status: "planned",
          goal_id: task.goal_id,
          completed_at: null,
        });
        toast.success("Added to your study plan", {
          description: `${task.title} · ${formatShortDate(day)}`,
        });
      } catch (err) {
        toast.error("Couldn't create that study block", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    },
    [createStudyBlock],
  );

  const remove = useCallback(
    async (task: RoutineTask) => {
      try {
        await deleteTask(task.id);
        toast.success("Task deleted", { description: task.title });
      } catch (err) {
        toast.error("Couldn't delete that task", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    },
    [deleteTask],
  );

  return {
    tasks,
    loading,
    error,
    refetch: () => {
      void refetch();
    },
    saving,
    createTask,
    updateTask,
    toggleDone,
    moveTo,
    convertToStudyBlock,
    deleteTask: remove,
  };
}
