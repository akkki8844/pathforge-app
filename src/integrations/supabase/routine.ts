/**
 * A typed view of the shared Supabase client, restricted to the `routine_*`
 * tables.
 *
 * `./types.ts` is machine-generated and re-emitted in full whenever the schema
 * is re-introspected, so hand-adding the ten Routine tables there would be
 * quietly erased on the next regeneration — and the failure mode is invisible
 * (`from("routine_tasks")` starts resolving to `never`, so every field becomes
 * an error at once, far from the cause). Instead this module declares the
 * Routine schema from the domain types in `@/lib/routine/types` and re-types the
 * one live client through it.
 *
 * It is the same client and the same connection: no second socket, no second
 * auth session. Only the compile-time view differs. Import `routineDb` for
 * `routine_*` reads and writes, and the plain `supabase` export for everything
 * else — including realtime channels, which are schema-agnostic.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  RoutineClass,
  RoutineEvent,
  RoutineFocusSession,
  RoutineFocusFlight,
  RoutineGoal,
  RoutineGoalMilestone,
  RoutineHabit,
  RoutineHabitLog,
  RoutineReminder,
  RoutineStudyBlock,
  RoutineTask,
  RoutineTimetableImage,
  RoutineDeadlineNotification,
} from "@/lib/routine/types";

/**
 * Insert shape for a Routine row.
 *
 * `id`, `created_at` and `updated_at` are database-assigned. `user_id` has a
 * `DEFAULT auth.uid()`, so it is optional here — but every hook passes it
 * explicitly anyway, because relying on the default makes an insert from a
 * stale session fail at the RLS check with a policy error instead of an obvious
 * "not signed in".
 */
type Insertable<Row> = Partial<Pick<Row, Extract<keyof Row, "id" | "user_id">>> &
  Omit<Row, "id" | "user_id" | "created_at" | "updated_at"> &
  Partial<Pick<Row, Extract<keyof Row, "created_at" | "updated_at">>>;

type Table<Row> = {
  Row: Row;
  Insert: Insertable<Row>;
  Update: Partial<Insertable<Row>>;
  Relationships: [];
};

export type RoutineDatabase = {
  public: {
    Tables: {
      routine_classes: Table<RoutineClass>;
      routine_study_blocks: Table<RoutineStudyBlock>;
      routine_tasks: Table<RoutineTask>;
      routine_reminders: Table<RoutineReminder>;
      routine_events: Table<RoutineEvent>;
      routine_habits: Table<RoutineHabit>;
      routine_habit_logs: Table<RoutineHabitLog>;
      routine_focus_sessions: Table<RoutineFocusSession>;
      routine_focus_flights: Table<RoutineFocusFlight>;
      routine_goals: Table<RoutineGoal>;
      routine_goal_milestones: Table<RoutineGoalMilestone>;
      routine_timetable_images: Table<RoutineTimetableImage>;
      routine_deadline_notifications: Table<RoutineDeadlineNotification>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type RoutineTableName = keyof RoutineDatabase["public"]["Tables"];

/**
 * Every Routine table the realtime fan-out subscribes to.
 *
 * `routine_deadline_notifications` is deliberately absent: it is a server-side
 * send-log written only by the reminder cron under the service role, nothing in
 * the UI reads it live, and it is not in the realtime publication — subscribing
 * would open a channel that can never fire.
 */
export const ROUTINE_TABLES = [
  "routine_classes",
  "routine_study_blocks",
  "routine_tasks",
  "routine_reminders",
  "routine_events",
  "routine_habits",
  "routine_habit_logs",
  "routine_focus_sessions",
  "routine_focus_flights",
  "routine_goals",
  "routine_goal_milestones",
  "routine_timetable_images",
] as const satisfies readonly RoutineTableName[];

export const routineDb = supabase as unknown as SupabaseClient<RoutineDatabase>;
