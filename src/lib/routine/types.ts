/**
 * The Routine domain model.
 *
 * These types mirror `supabase/migrations/20260817120000_routine_system.sql`
 * one-for-one and are the single contract every Routine page codes against. If
 * you change a column, change it here in the same commit — nothing else in the
 * section reaches for the raw table shape.
 *
 * They live here rather than in `integrations/supabase/types.ts` on purpose:
 * that file carries a "automatically generated, do not edit" banner and is
 * rewritten wholesale whenever the schema is re-introspected, which would
 * silently drop hand-written entries. `routineDb` in
 * `@/integrations/supabase/routine` re-types the shared client from these
 * definitions instead, so Routine gets full type safety without editing a
 * generated file.
 */

export type Priority = "low" | "medium" | "high";

/** 0 = Sunday, matching `Date.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

export const PRIORITIES: Priority[] = ["low", "medium", "high"];

/**
 * The palette Routine entities may be tinted with.
 *
 * A closed set of token names rather than free-form colour: the class grid, the
 * calendar and the habit rings all need to resolve the same name to the same
 * swatch, and a hex code stored per row would not survive a theme change.
 * Resolve with `colorClasses()` in `@/lib/routine/colors`.
 */
export const ROUTINE_COLORS = [
  "slate", "blue", "violet", "emerald", "amber", "rose", "cyan", "orange",
] as const;
export type RoutineColor = (typeof ROUTINE_COLORS)[number];

// ── Timetable ────────────────────────────────────────────────────────────

export interface RoutineClass {
  id: string;
  user_id: string;
  subject: string;
  teacher: string | null;
  location: string | null;
  /** "HH:MM:SS" wall clock. */
  start_time: string;
  end_time: string;
  days_of_week: Weekday[];
  color: RoutineColor;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NewRoutineClass = Omit<
  RoutineClass,
  "id" | "user_id" | "created_at" | "updated_at"
>;

/**
 * An uploaded timetable image.
 *
 * Deliberately not part of `RoutineSources` and never fed to `buildAgenda`: an
 * image is a picture of a timetable, not a timetable. Nothing has parsed it, so
 * inventing class times from it would be fabrication. `RoutineClass` stays the
 * only structured source; this row is a display artefact the Timetable page,
 * the dashboard card and Today render *as the image the student uploaded*.
 *
 * One row per user (`UNIQUE (user_id)` in the schema), so replacing the image
 * is an upsert rather than a second row with an ambiguous winner.
 */
export interface RoutineTimetableImage {
  id: string;
  user_id: string;
  /** Path inside the private `routine-timetable-images` bucket. */
  storage_path: string;
  mime_type: string;
  file_size: number;
  original_name: string | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export type NewRoutineTimetableImage = Omit<
  RoutineTimetableImage,
  "id" | "user_id" | "created_at" | "updated_at"
>;

/** What the timetable upload accepts, in one place for the input and the check. */
export const TIMETABLE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"] as const;
export const TIMETABLE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Send-log row for a deadline reminder email.
 *
 * Written only by the `send-routine-deadline-reminders` edge function under the
 * service role; readable by its owner so a future "notification history" view
 * has somewhere to read from. The uniqueness that prevents double-sends lives
 * in the database constraint, not here.
 */
export interface RoutineDeadlineNotification {
  id: string;
  user_id: string;
  source_table: "routine_tasks" | "routine_reminders" | "routine_events";
  source_id: string;
  lead_days: number;
  due_at: string;
  sent_at: string;
}

// ── Study Planner ────────────────────────────────────────────────────────

export type StudyBlockStatus = "planned" | "in_progress" | "completed" | "skipped";

export interface RoutineStudyBlock {
  id: string;
  user_id: string;
  subject: string;
  topic: string | null;
  objective: string | null;
  planned_minutes: number;
  completed_minutes: number;
  priority: Priority;
  /** "YYYY-MM-DD". */
  scheduled_date: string;
  /** "HH:MM:SS" or null for "sometime that day". */
  scheduled_start: string | null;
  status: StudyBlockStatus;
  goal_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NewRoutineStudyBlock = Omit<
  RoutineStudyBlock,
  "id" | "user_id" | "created_at" | "updated_at"
>;

// ── Tasks ────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";

export interface RoutineTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  /** ISO instant, or null for "no deadline". */
  due_at: string | null;
  priority: Priority;
  category: string;
  status: TaskStatus;
  estimated_minutes: number | null;
  recurrence: TaskRecurrence;
  goal_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NewRoutineTask = Omit<
  RoutineTask,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export const TASK_CATEGORIES = [
  "general", "school", "applications", "admin", "personal", "extracurricular",
] as const;

// ── Reminders ────────────────────────────────────────────────────────────

export type ReminderRepeat =
  | "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";
export type ReminderStatus = "pending" | "done" | "dismissed";

export interface RoutineReminder {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  remind_at: string;
  repeat_rule: ReminderRepeat;
  notify: boolean;
  status: ReminderStatus;
  completed_at: string | null;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NewRoutineReminder = Omit<
  RoutineReminder,
  "id" | "user_id" | "created_at" | "updated_at"
>;

// ── Calendar events ──────────────────────────────────────────────────────

export type EventCategory =
  | "exam" | "deadline" | "school" | "application" | "personal" | "other";

export interface RoutineEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export type NewRoutineEvent = Omit<
  RoutineEvent,
  "id" | "user_id" | "created_at" | "updated_at"
>;

// ── Habits ───────────────────────────────────────────────────────────────

export type HabitFrequency = "daily" | "weekly" | "custom";

export interface RoutineHabit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  /** Only meaningful when frequency === "custom". */
  target_days: Weekday[];
  target_per_week: number;
  target_quantity: number | null;
  unit: string | null;
  preferred_time: string | null;
  color: RoutineColor;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export type NewRoutineHabit = Omit<
  RoutineHabit,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface RoutineHabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  /** "YYYY-MM-DD". */
  log_date: string;
  quantity: number | null;
  created_at: string;
}

// ── Focus ────────────────────────────────────────────────────────────────

export type FocusMode = "pomodoro" | "short_break" | "long_break" | "custom";
export type FocusTargetType =
  | "none" | "task" | "study_block" | "goal" | "habit" | "subject";

export interface RoutineFocusSession {
  id: string;
  user_id: string;
  mode: FocusMode;
  target_type: FocusTargetType;
  target_id: string | null;
  /** Denormalised so history stays readable after the target is deleted. */
  target_label: string | null;
  planned_minutes: number;
  actual_minutes: number;
  started_at: string;
  ended_at: string | null;
  was_completed: boolean;
  created_at: string;
}

export type NewRoutineFocusSession = Omit<
  RoutineFocusSession,
  "id" | "user_id" | "created_at"
>;

/**
 * The journey half of a Focus Flight session.
 *
 * Paired 1:1 with a `RoutineFocusSession`, which remains the only place minutes
 * are stored — this row never carries an `actual_minutes`, so the two can never
 * disagree about how long the student focused.
 *
 * `focus_session_id` is null while the aircraft is still airborne: the session
 * row is written on landing, when its actual duration first becomes knowable.
 * That is also what makes "is there a flight to restore?" a single indexed
 * lookup rather than a join.
 *
 * Airport fields are denormalised from the bundled atlas at booking time, for
 * the same reason `target_label` is: history has to stay readable even if the
 * dataset is later corrected or an entry removed.
 */
export interface RoutineFocusFlight {
  id: string;
  user_id: string;
  focus_session_id: string | null;
  origin_code: string;
  origin_name: string;
  origin_city: string;
  origin_country: string;
  origin_lat: number;
  origin_lon: number;
  destination_code: string;
  destination_name: string;
  destination_city: string;
  destination_country: string;
  destination_lat: number;
  destination_lon: number;
  /** Real great-circle kilometres. The flight itself is simulated. */
  distance_km: number;
  planned_minutes: number;
  intent: "study" | "work" | "create" | "review";
  cabin: "window" | "quiet" | "night" | "business";
  objective: string | null;
  flight_number: string;
  seat: string;
  gate: string;
  status: "boarding" | "in_flight" | "landed" | "diverted";
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export type NewRoutineFocusFlight = Omit<
  RoutineFocusFlight,
  "id" | "user_id" | "created_at"
>;

// ── Goals ────────────────────────────────────────────────────────────────

export type GoalStatus = "active" | "completed" | "paused" | "archived";

export interface RoutineGoal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  target_date: string | null;
  priority: Priority;
  status: GoalStatus;
  /** null = derive progress from milestones and linked work. */
  progress_override: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NewRoutineGoal = Omit<
  RoutineGoal,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface RoutineGoalMilestone {
  id: string;
  user_id: string;
  goal_id: string;
  title: string;
  due_date: string | null;
  is_complete: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export type NewRoutineGoalMilestone = Omit<
  RoutineGoalMilestone,
  "id" | "user_id" | "created_at"
>;

export const GOAL_CATEGORIES = [
  "academic", "applications", "extracurricular", "skill", "wellbeing", "personal",
] as const;

// ── The unified agenda item ──────────────────────────────────────────────

/**
 * What Today and Calendar actually render.
 *
 * Both pages need one chronologically sortable list drawn from six different
 * tables. Rather than each page re-implementing that flattening (and drifting),
 * `buildAgenda()` in `@/lib/routine/derive` projects every source into this
 * shape. `sourceId` points back at the owning row so a click can open the right
 * editor, and `kind` is what the UI switches on for icon, label and shape —
 * never colour alone, so the categories stay distinguishable without it.
 */
export type AgendaKind =
  | "class" | "study" | "task" | "reminder" | "event" | "habit" | "goal";

export interface AgendaItem {
  /** Unique per occurrence, not per row — a weekly class yields one per day. */
  key: string;
  kind: AgendaKind;
  sourceId: string;
  title: string;
  subtitle?: string;
  /** Local Date for the occurrence's start. Midnight when the item is all-day. */
  start: Date;
  end?: Date;
  /** True when the item has no meaningful clock time (all-day, undated habit). */
  allDay: boolean;
  done: boolean;
  overdue: boolean;
  priority?: Priority;
  color: RoutineColor;
}
