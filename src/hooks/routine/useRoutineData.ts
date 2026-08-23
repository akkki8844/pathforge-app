/**
 * Every read and write in the Routine section goes through this module.
 *
 * The design constraint that shapes it: nine pages must share one source of
 * truth, and an edit on any of them has to show up on the others without a
 * refresh. React Query already gives that for free *if and only if* every page
 * reads the same query key — so the keys are built here, never inline at a call
 * site, and the per-entity hooks below are the only sanctioned way in.
 *
 * Consequences worth knowing before you add to this file:
 *
 *   * A mutation invalidates its own table's key and nothing else. Cross-entity
 *     figures (a goal's percentage, Today's progress ring) are *derived* by the
 *     pure functions in `@/lib/routine/derive` from rows the page already holds,
 *     so completing a task updates the goal card because the tasks query
 *     changed — not because anything wrote to the goal.
 *   * `useRoutineRealtime` is mounted once by the Routine layout, not per page.
 *     It invalidates on Postgres change events, which is what makes a second tab
 *     (or the same user on their phone) converge.
 *   * The two highest-frequency interactions — ticking a task and checking off a
 *     habit — are optimistic, because a 200ms round trip is visible on a tap
 *     that is meant to feel instant. Everything else waits for the server, which
 *     keeps the mutation surface small enough to reason about.
 */
import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ROUTINE_TABLES,
  routineDb,
  type RoutineTableName,
} from "@/integrations/supabase/routine";
import { useAuth } from "@/contexts/AuthContext";
import { dateKey } from "@/lib/routine/dates";
import type {
  NewRoutineClass,
  NewRoutineEvent,
  NewRoutineFocusSession,
  NewRoutineGoal,
  NewRoutineGoalMilestone,
  NewRoutineHabit,
  NewRoutineReminder,
  NewRoutineStudyBlock,
  NewRoutineTask,
  RoutineClass,
  RoutineEvent,
  RoutineFocusSession,
  RoutineGoal,
  RoutineGoalMilestone,
  RoutineHabit,
  RoutineHabitLog,
  RoutineReminder,
  RoutineStudyBlock,
  RoutineTask,
  RoutineTimetableImage,
  TaskStatus,
} from "@/lib/routine/types";
import { TIMETABLE_IMAGE_MAX_BYTES, TIMETABLE_IMAGE_TYPES } from "@/lib/routine/types";

/** Private bucket holding uploaded timetable images. Never public. */
const TIMETABLE_BUCKET = "routine-timetable-images";

/**
 * Query key factory.
 *
 * The leading segment is "routine" so `App.tsx`'s localStorage persister — which
 * matches sensitive prefixes on the *first* key segment — treats the whole
 * section consistently, and so a single `invalidateQueries({ queryKey: ["routine"] })`
 * can flush everything after a sign-out.
 */
export const routineKeys = {
  all: ["routine"] as const,
  table: (table: RoutineTableName, userId: string | undefined): QueryKey =>
    ["routine", table, userId ?? "anon"],
};

interface Options {
  /** Column to order by, and direction. */
  orderBy?: string;
  ascending?: boolean;
}

/**
 * Shared fetcher. Returns `[]` rather than throwing when there is no session:
 * every Routine route sits behind `ProtectedRoute`, so a missing user means auth
 * is still resolving, and an error state there would flash a failure banner on
 * every cold load.
 */
function useRoutineTable<Row>(table: RoutineTableName, options: Options = {}) {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: routineKeys.table(table, userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<Row[]> => {
      let q = routineDb.from(table).select("*").eq("user_id", userId!);
      if (options.orderBy) {
        q = q.order(options.orderBy, {
          ascending: options.ascending ?? true,
          nullsFirst: false,
        });
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  return {
    rows: (query.data ?? []) as Row[],
    loading: query.isPending && Boolean(userId),
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

/** Writes for one table, with the owner column filled in from the session. */
function useRoutineWrites<Row extends { id: string }, New>(table: RoutineTableName) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  const key = routineKeys.table(table, userId);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: key });
  }, [qc, key]);

  const create = useMutation({
    mutationFn: async (input: New): Promise<Row> => {
      if (!userId) throw new Error("You need to be signed in to do that.");
      const { data, error } = await routineDb
        .from(table)
        .insert({ ...(input as object), user_id: userId } as never)
        .select()
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<New> }): Promise<void> => {
      if (!userId) throw new Error("You need to be signed in to do that.");
      const { error } = await routineDb
        .from(table)
        .update(patch as never)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!userId) throw new Error("You need to be signed in to do that.");
      const { error } = await routineDb.from(table).delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, remove, invalidate, queryKey: key, userId };
}

// ── Timetable ────────────────────────────────────────────────────────────

export function useRoutineClasses() {
  const { rows, loading, error, refetch } = useRoutineTable<RoutineClass>("routine_classes", {
    orderBy: "start_time",
  });
  const writes = useRoutineWrites<RoutineClass, NewRoutineClass>("routine_classes");

  /** "Duplicate" in the timetable UI: same class, new row, ready to be edited. */
  const duplicate = useCallback(
    (cls: RoutineClass) => {
      const { id, user_id, created_at, updated_at, ...rest } = cls;
      return writes.create.mutateAsync({ ...rest, subject: `${cls.subject} (copy)` });
    },
    [writes.create],
  );

  return {
    classes: rows,
    loading,
    error,
    refetch,
    createClass: writes.create.mutateAsync,
    updateClass: writes.update.mutateAsync,
    deleteClass: writes.remove.mutateAsync,
    duplicateClass: duplicate,
    saving: writes.create.isPending || writes.update.isPending || writes.remove.isPending,
  };
}

/**
 * The uploaded timetable image.
 *
 * Two pieces of state that have to stay in step: the row (which says an image
 * exists, and where) and a *signed* URL for it (which is how the browser is
 * allowed to see it, because the bucket is private and has no public URL).
 * The URL query is keyed on the row's `updated_at` as well as its path, so
 * replacing the image — which overwrites the same storage object — still
 * produces a fresh signature and the browser cannot serve the old picture from
 * cache.
 *
 * Nothing here feeds `buildAgenda`. See the note on `RoutineTimetableImage`.
 */
export function useTimetableImage() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const { rows, loading, error, refetch } = useRoutineTable<RoutineTimetableImage>(
    "routine_timetable_images",
  );
  const image = rows[0] ?? null;

  const urlQuery = useQuery({
    queryKey: ["routine", "timetable-image-url", image?.storage_path, image?.updated_at],
    enabled: Boolean(image?.storage_path),
    // Signed for an hour; refreshed comfortably inside that so a long-open tab
    // never renders a broken image.
    staleTime: 45 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async (): Promise<string | null> => {
      const { data, error: signError } = await supabase.storage
        .from(TIMETABLE_BUCKET)
        .createSignedUrl(image!.storage_path, 60 * 60);
      if (signError) throw signError;
      return data?.signedUrl ?? null;
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File): Promise<void> => {
      if (!userId) throw new Error("You need to be signed in to do that.");
      // Validated here as well as by the bucket's own mime/size limits: a
      // client-side check gives a readable message instead of a 400 from
      // Storage, and the bucket rule is what actually enforces it.
      if (!(TIMETABLE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        throw new Error("That file isn't a PNG or JPEG. Upload an image of your timetable.");
      }
      if (file.size > TIMETABLE_IMAGE_MAX_BYTES) {
        throw new Error(
          `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${
            TIMETABLE_IMAGE_MAX_BYTES / 1024 / 1024
          }MB.`,
        );
      }

      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${userId}/timetable.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(TIMETABLE_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      // A previous upload may have used the other extension. Remove it, or the
      // old object lingers in the bucket unreferenced and un-deletable from
      // the UI. Failure here is not fatal to the upload that just succeeded.
      const stale = image?.storage_path;
      if (stale && stale !== path) {
        await supabase.storage.from(TIMETABLE_BUCKET).remove([stale]);
      }

      const { error: rowErr } = await routineDb
        .from("routine_timetable_images")
        .upsert(
          {
            user_id: userId,
            storage_path: path,
            mime_type: file.type,
            file_size: file.size,
            original_name: file.name.slice(0, 200),
            uploaded_at: new Date().toISOString(),
          } as never,
          { onConflict: "user_id" } as never,
        );
      if (rowErr) throw rowErr;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: routineKeys.table("routine_timetable_images", userId) });
      void qc.invalidateQueries({ queryKey: ["routine", "timetable-image-url"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!userId || !image) return;
      // Storage first: if the row went first and this failed, the object would
      // be orphaned with nothing left pointing at it to retry from.
      const { error: delErr } = await supabase.storage
        .from(TIMETABLE_BUCKET)
        .remove([image.storage_path]);
      if (delErr) throw delErr;
      const { error: rowErr } = await routineDb
        .from("routine_timetable_images")
        .delete()
        .eq("id", image.id)
        .eq("user_id", userId);
      if (rowErr) throw rowErr;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: routineKeys.table("routine_timetable_images", userId) });
      void qc.invalidateQueries({ queryKey: ["routine", "timetable-image-url"] });
    },
  });

  return {
    image,
    /** Signed URL, or null while it is being minted (or if there is no image). */
    imageUrl: urlQuery.data ?? null,
    loading,
    urlLoading: urlQuery.isPending && Boolean(image),
    error: (error ?? (urlQuery.error as Error | null)) ?? null,
    refetch,
    uploadImage: upload.mutateAsync,
    removeImage: remove.mutateAsync,
    uploading: upload.isPending,
    removing: remove.isPending,
  };
}

// ── Study Planner ────────────────────────────────────────────────────────

export function useStudyBlocks() {
  const { rows, loading, error, refetch } = useRoutineTable<RoutineStudyBlock>(
    "routine_study_blocks",
    { orderBy: "scheduled_date" },
  );
  const writes = useRoutineWrites<RoutineStudyBlock, NewRoutineStudyBlock>("routine_study_blocks");

  /**
   * Marks a block done. `minutes` defaults to the plan rather than 0, because
   * the overwhelmingly common case is "I did the session I planned", and asking
   * for the exact figure every time would make completion a two-step chore.
   */
  const complete = useCallback(
    (block: RoutineStudyBlock, minutes?: number) =>
      writes.update.mutateAsync({
        id: block.id,
        patch: {
          status: "completed",
          completed_minutes: minutes ?? block.planned_minutes,
          completed_at: new Date().toISOString(),
        },
      }),
    [writes.update],
  );

  /** Adds focus-session minutes onto a block without marking it finished. */
  const logMinutes = useCallback(
    (block: RoutineStudyBlock, minutes: number) =>
      writes.update.mutateAsync({
        id: block.id,
        patch: {
          completed_minutes: block.completed_minutes + minutes,
          status:
            block.completed_minutes + minutes >= block.planned_minutes
              ? "completed"
              : "in_progress",
          completed_at:
            block.completed_minutes + minutes >= block.planned_minutes
              ? new Date().toISOString()
              : block.completed_at,
        },
      }),
    [writes.update],
  );

  return {
    studyBlocks: rows,
    loading,
    error,
    refetch,
    createStudyBlock: writes.create.mutateAsync,
    createStudyBlocks: async (blocks: NewRoutineStudyBlock[]) => {
      // The planner's "generate a schedule" action commits a whole week at once;
      // one round trip beats N, and a partial failure leaving half a plan behind
      // would be worse than none.
      if (!writes.userId) throw new Error("You need to be signed in to do that.");
      const { error } = await routineDb
        .from("routine_study_blocks")
        .insert(blocks.map((b) => ({ ...b, user_id: writes.userId })) as never);
      if (error) throw error;
      writes.invalidate();
    },
    updateStudyBlock: writes.update.mutateAsync,
    deleteStudyBlock: writes.remove.mutateAsync,
    completeStudyBlock: complete,
    logStudyMinutes: logMinutes,
    saving: writes.create.isPending || writes.update.isPending || writes.remove.isPending,
  };
}

// ── Tasks ────────────────────────────────────────────────────────────────

export function useRoutineTasks() {
  const { rows, loading, error, refetch } = useRoutineTable<RoutineTask>("routine_tasks", {
    orderBy: "due_at",
  });
  const writes = useRoutineWrites<RoutineTask, NewRoutineTask>("routine_tasks");
  const qc = useQueryClient();

  /**
   * Optimistic on purpose: ticking a checkbox must feel like a checkbox. The
   * snapshot/rollback pair is what keeps that honest if the write fails.
   */
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      if (!writes.userId) throw new Error("You need to be signed in to do that.");
      const { error } = await routineDb
        .from("routine_tasks")
        .update({
          status,
          completed_at: status === "done" ? new Date().toISOString() : null,
        } as never)
        .eq("id", id)
        .eq("user_id", writes.userId);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: writes.queryKey });
      const previous = qc.getQueryData<RoutineTask[]>(writes.queryKey);
      qc.setQueryData<RoutineTask[]>(writes.queryKey, (old) =>
        (old ?? []).map((t) =>
          t.id === id
            ? { ...t, status, completed_at: status === "done" ? new Date().toISOString() : null }
            : t,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(writes.queryKey, context.previous);
    },
    onSettled: writes.invalidate,
  });

  const toggle = useCallback(
    (task: RoutineTask) =>
      setStatus.mutateAsync({ id: task.id, status: task.status === "done" ? "todo" : "done" }),
    [setStatus],
  );

  return {
    tasks: rows,
    loading,
    error,
    refetch,
    createTask: writes.create.mutateAsync,
    updateTask: writes.update.mutateAsync,
    deleteTask: writes.remove.mutateAsync,
    setTaskStatus: setStatus.mutateAsync,
    toggleTask: toggle,
    saving: writes.create.isPending || writes.update.isPending || writes.remove.isPending,
  };
}

// ── Reminders ────────────────────────────────────────────────────────────

export function useRoutineReminders() {
  const { rows, loading, error, refetch } = useRoutineTable<RoutineReminder>("routine_reminders", {
    orderBy: "remind_at",
  });
  const writes = useRoutineWrites<RoutineReminder, NewRoutineReminder>("routine_reminders");

  const markDone = useCallback(
    (id: string) =>
      writes.update.mutateAsync({
        id,
        patch: { status: "done", completed_at: new Date().toISOString() },
      }),
    [writes.update],
  );

  const restore = useCallback(
    (id: string) => writes.update.mutateAsync({ id, patch: { status: "pending", completed_at: null } }),
    [writes.update],
  );

  return {
    reminders: rows,
    loading,
    error,
    refetch,
    createReminder: writes.create.mutateAsync,
    updateReminder: writes.update.mutateAsync,
    deleteReminder: writes.remove.mutateAsync,
    completeReminder: markDone,
    restoreReminder: restore,
    saving: writes.create.isPending || writes.update.isPending || writes.remove.isPending,
  };
}

// ── Calendar events ──────────────────────────────────────────────────────

export function useRoutineEvents() {
  const { rows, loading, error, refetch } = useRoutineTable<RoutineEvent>("routine_events", {
    orderBy: "starts_at",
  });
  const writes = useRoutineWrites<RoutineEvent, NewRoutineEvent>("routine_events");

  return {
    events: rows,
    loading,
    error,
    refetch,
    createEvent: writes.create.mutateAsync,
    updateEvent: writes.update.mutateAsync,
    deleteEvent: writes.remove.mutateAsync,
    saving: writes.create.isPending || writes.update.isPending || writes.remove.isPending,
  };
}

// ── Habits ───────────────────────────────────────────────────────────────

export function useRoutineHabits() {
  const habits = useRoutineTable<RoutineHabit>("routine_habits", { orderBy: "created_at" });
  const logs = useRoutineTable<RoutineHabitLog>("routine_habit_logs", {
    orderBy: "log_date",
    ascending: false,
  });
  const writes = useRoutineWrites<RoutineHabit, NewRoutineHabit>("routine_habits");
  const { user } = useAuth();
  const qc = useQueryClient();
  const logsKey = routineKeys.table("routine_habit_logs", user?.id);

  /**
   * Check-off is an upsert on (habit_id, log_date), so a double-tap is a no-op
   * rather than a duplicate row — the uniqueness lives in the database, not in a
   * client-side guard that a second tab could race.
   *
   * Optimistic for the same reason as task completion: the check animation has
   * to land on the tap, not after it.
   */
  const toggleLog = useMutation({
    mutationFn: async ({
      habitId,
      day,
      quantity,
    }: {
      habitId: string;
      day: Date;
      quantity?: number | null;
    }) => {
      if (!user?.id) throw new Error("You need to be signed in to do that.");
      const key = dateKey(day);
      const existing = logs.rows.find((l) => l.habit_id === habitId && l.log_date === key);
      if (existing) {
        const { error } = await routineDb
          .from("routine_habit_logs")
          .delete()
          .eq("id", existing.id)
          .eq("user_id", user.id);
        if (error) throw error;
        return;
      }
      const { error } = await routineDb.from("routine_habit_logs").upsert(
        { habit_id: habitId, log_date: key, quantity: quantity ?? null, user_id: user.id } as never,
        { onConflict: "habit_id,log_date" } as never,
      );
      if (error) throw error;
    },
    onMutate: async ({ habitId, day, quantity }) => {
      await qc.cancelQueries({ queryKey: logsKey });
      const previous = qc.getQueryData<RoutineHabitLog[]>(logsKey);
      const key = dateKey(day);
      qc.setQueryData<RoutineHabitLog[]>(logsKey, (old) => {
        const rows = old ?? [];
        const hit = rows.find((l) => l.habit_id === habitId && l.log_date === key);
        if (hit) return rows.filter((l) => l !== hit);
        return [
          {
            // Temporary id, replaced by the refetch in onSettled. Prefixed so it
            // is obvious in a debugger that this row hasn't been persisted yet.
            id: `optimistic-${habitId}-${key}`,
            user_id: user?.id ?? "",
            habit_id: habitId,
            log_date: key,
            quantity: quantity ?? null,
            created_at: new Date().toISOString(),
          },
          ...rows,
        ];
      });
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) qc.setQueryData(logsKey, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: logsKey });
    },
  });

  return {
    habits: habits.rows,
    habitLogs: logs.rows,
    loading: habits.loading || logs.loading,
    error: habits.error ?? logs.error,
    createHabit: writes.create.mutateAsync,
    updateHabit: writes.update.mutateAsync,
    deleteHabit: writes.remove.mutateAsync,
    toggleHabitDay: toggleLog.mutateAsync,
    saving: writes.create.isPending || writes.update.isPending || writes.remove.isPending,
  };
}

// ── Focus ────────────────────────────────────────────────────────────────

export function useFocusSessions() {
  const { rows, loading, error, refetch } = useRoutineTable<RoutineFocusSession>(
    "routine_focus_sessions",
    { orderBy: "started_at", ascending: false },
  );
  const writes = useRoutineWrites<RoutineFocusSession, NewRoutineFocusSession>(
    "routine_focus_sessions",
  );

  return {
    sessions: rows,
    loading,
    error,
    refetch,
    recordSession: writes.create.mutateAsync,
    deleteSession: writes.remove.mutateAsync,
    saving: writes.create.isPending,
  };
}

// ── Goals ────────────────────────────────────────────────────────────────

export function useRoutineGoals() {
  const goals = useRoutineTable<RoutineGoal>("routine_goals", {
    orderBy: "created_at",
    ascending: false,
  });
  const milestones = useRoutineTable<RoutineGoalMilestone>("routine_goal_milestones", {
    orderBy: "sort_order",
  });
  const goalWrites = useRoutineWrites<RoutineGoal, NewRoutineGoal>("routine_goals");
  const milestoneWrites = useRoutineWrites<RoutineGoalMilestone, NewRoutineGoalMilestone>(
    "routine_goal_milestones",
  );

  const toggleMilestone = useCallback(
    (m: RoutineGoalMilestone) =>
      milestoneWrites.update.mutateAsync({
        id: m.id,
        patch: {
          is_complete: !m.is_complete,
          completed_at: m.is_complete ? null : new Date().toISOString(),
        },
      }),
    [milestoneWrites.update],
  );

  return {
    goals: goals.rows,
    milestones: milestones.rows,
    loading: goals.loading || milestones.loading,
    error: goals.error ?? milestones.error,
    createGoal: goalWrites.create.mutateAsync,
    updateGoal: goalWrites.update.mutateAsync,
    deleteGoal: goalWrites.remove.mutateAsync,
    createMilestone: milestoneWrites.create.mutateAsync,
    updateMilestone: milestoneWrites.update.mutateAsync,
    deleteMilestone: milestoneWrites.remove.mutateAsync,
    toggleMilestone,
    saving:
      goalWrites.create.isPending ||
      goalWrites.update.isPending ||
      milestoneWrites.create.isPending ||
      milestoneWrites.update.isPending,
  };
}

// ── Realtime ─────────────────────────────────────────────────────────────

/**
 * One channel for the whole section, mounted by the Routine layout.
 *
 * Filtered server-side to the signed-in user, so the socket never carries other
 * people's rows even though RLS would already hide them from a query. Each event
 * invalidates only the table it came from; the derived figures recompute from
 * that as a consequence.
 */
export function useRoutineRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`routine:${user.id}`);
    for (const table of ROUTINE_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${user.id}` },
        () => {
          void qc.invalidateQueries({ queryKey: routineKeys.table(table, user.id) });
        },
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}

// ── The aggregate ────────────────────────────────────────────────────────

/**
 * Everything Today and Calendar need, in one call.
 *
 * These two pages are cross-cutting by definition — they exist to show the whole
 * system at once — so they take the full set rather than picking tables one at a
 * time and drifting out of sync with `buildAgenda`'s expectations. Every page in
 * the section shares the underlying query cache, so this is not nine extra
 * requests per navigation: it's the same nine entries every other page is
 * already reading from.
 */
export function useRoutineSources() {
  const classes = useRoutineClasses();
  const study = useStudyBlocks();
  const tasks = useRoutineTasks();
  const reminders = useRoutineReminders();
  const events = useRoutineEvents();
  const habits = useRoutineHabits();
  const goals = useRoutineGoals();
  const focus = useFocusSessions();

  const sources = useMemo(
    () => ({
      classes: classes.classes,
      studyBlocks: study.studyBlocks,
      tasks: tasks.tasks,
      reminders: reminders.reminders,
      events: events.events,
      habits: habits.habits,
      habitLogs: habits.habitLogs,
      goals: goals.goals,
      goalMilestones: goals.milestones,
    }),
    [
      classes.classes,
      study.studyBlocks,
      tasks.tasks,
      reminders.reminders,
      events.events,
      habits.habits,
      habits.habitLogs,
      goals.goals,
      goals.milestones,
    ],
  );

  const loading =
    classes.loading ||
    study.loading ||
    tasks.loading ||
    reminders.loading ||
    events.loading ||
    habits.loading ||
    goals.loading;

  const error =
    classes.error ?? study.error ?? tasks.error ?? reminders.error ?? events.error ??
    habits.error ?? goals.error ?? focus.error ?? null;

  return { sources, loading, error, classes, study, tasks, reminders, events, habits, goals, focus };
}
