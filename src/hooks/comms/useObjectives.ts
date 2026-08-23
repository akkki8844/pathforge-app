/**
 * Objectives: the commitments a conversation produced.
 *
 * The one structural decision worth knowing before editing this file: an
 * objective assigned to *you* owns a `routine_tasks` row, and that row is how
 * its deadline reaches Today, Calendar and the deadline-reminder cron. There is
 * no second kind of deadline record and no Communications-specific calendar
 * code — `buildAgenda()` already merges `routine_tasks` into both views, so
 * writing one task is the entire integration.
 *
 * Completion then syncs both ways through database triggers rather than through
 * this hook, because a user can tick the task off on `/routine/today` where this
 * code is not mounted at all.
 *
 * `status = 'suggested'` rows are AI proposals nobody has accepted. They live in
 * the same table so the Detected inbox and My Objectives read one source of
 * truth, but they are a distinct status rather than a flag, so a suggestion can
 * never be mistaken for a commitment somebody actually made.
 */
import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commsDb } from "@/integrations/supabase/communications";
import { routineDb } from "@/integrations/supabase/routine";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Objective,
  ObjectiveStatus,
  Priority,
} from "@/lib/comms/types";
import { commsKeys } from "./keys";
import { useTeams, type TeamCard } from "./useTeams";

/** Statuses that count as live work, in the order they belong on screen. */
export const OPEN_STATUSES: ObjectiveStatus[] = ["todo", "in_progress"];

export interface NewObjective {
  title: string;
  description?: string | null;
  teamId?: string | null;
  assigneeId?: string | null;
  dueAt?: string | null;
  priority?: Priority;
  /**
   * Whether to also write the assignee's Routine task. Only honoured when the
   * assignee is the caller — see the comment in `createObjective`.
   */
  linkToRoutine?: boolean;
}

/** Objectives for one team. */
export function useTeamObjectives(teamId: string | undefined) {
  const query = useQuery({
    queryKey: commsKeys.objectives(teamId, "team"),
    enabled: !!teamId,
    queryFn: async (): Promise<Objective[]> => {
      const { data, error } = await commsDb
        .from("objectives")
        .select("*")
        .eq("team_id", teamId!)
        .neq("status", "dismissed")
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const objectives = useMemo(() => query.data ?? [], [query.data]);

  return {
    objectives,
    open: useMemo(
      () => objectives.filter((o) => OPEN_STATUSES.includes(o.status)),
      [objectives],
    ),
    done: useMemo(() => objectives.filter((o) => o.status === "done"), [objectives]),
    suggested: useMemo(
      () => objectives.filter((o) => o.status === "suggested"),
      [objectives],
    ),
    referencedUserIds: useMemo(
      () =>
        objectives.flatMap((o) =>
          [o.assignee_id, o.created_by, o.assigned_by].filter(Boolean) as string[],
        ),
      [objectives],
    ),
    isLoading: query.isLoading,
  };
}

/**
 * Every objective the signed-in user can see, for the standalone Objectives
 * page: what is assigned to them, everything open across every team they're
 * in, what the AI has detected, and what's done. One page, four slices of the
 * same rows — `objectives_select`'s RLS already admits exactly this set
 * (`assignee_id = me OR created_by = me OR team member`), so this hook mirrors
 * that with two queries and merges rather than re-deriving authorization.
 */
export function useMyObjectives() {
  const { user } = useAuth();
  const { teams } = useTeams();
  const teamIds = useMemo(() => teams.map((t) => t.id), [teams]);

  const mineQuery = useQuery({
    queryKey: commsKeys.objectives(user?.id, "mine"),
    enabled: !!user?.id,
    queryFn: async (): Promise<Objective[]> => {
      const { data, error } = await commsDb
        .from("objectives")
        .select("*")
        .or(`assignee_id.eq.${user!.id},created_by.eq.${user!.id}`)
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const teamsQuery = useQuery({
    queryKey: commsKeys.objectives(user?.id, "all-teams"),
    enabled: teamIds.length > 0,
    queryFn: async (): Promise<Objective[]> => {
      const { data, error } = await commsDb
        .from("objectives")
        .select("*")
        .in("team_id", teamIds)
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const merged = useMemo(() => {
    const map = new Map<string, Objective>();
    for (const o of mineQuery.data ?? []) map.set(o.id, o);
    for (const o of teamsQuery.data ?? []) map.set(o.id, o);
    return [...map.values()];
  }, [mineQuery.data, teamsQuery.data]);

  const mine = useMemo(
    () =>
      merged.filter(
        (o) => o.assignee_id === user?.id && o.status !== "suggested" && o.status !== "dismissed",
      ),
    [merged, user?.id],
  );
  const team = useMemo(
    () =>
      merged.filter(
        (o) => o.team_id && o.status !== "suggested" && o.status !== "dismissed" && o.status !== "done",
      ),
    [merged],
  );
  const suggested = useMemo(() => merged.filter((o) => o.status === "suggested"), [merged]);
  const completed = useMemo(() => merged.filter((o) => o.status === "done"), [merged]);

  const teamById = useMemo(() => {
    const map = new Map<string, TeamCard>();
    for (const t of teams) map.set(t.id, t);
    return map;
  }, [teams]);

  const referencedUserIds = useMemo(
    () =>
      merged.flatMap((o) => [o.assignee_id, o.created_by, o.assigned_by].filter(Boolean) as string[]),
    [merged],
  );

  return {
    mine,
    team,
    suggested,
    completed,
    teamById,
    referencedUserIds,
    isLoading: mineQuery.isLoading || (teamIds.length > 0 && teamsQuery.isLoading),
  };
}

export function useObjectiveActions(teamId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = useCallback(() => {
    // Prefix match, not `commsKeys.objectives(teamId, "team")` alone: the
    // standalone Objectives page reads "mine" and "all-teams" scopes with no
    // `teamId` at all, and an action taken there (or on a team's tab) has to
    // invalidate every scope, not just the one the mutation happened to run in.
    void qc.invalidateQueries({ queryKey: ["comms", "objectives"] });
    void qc.invalidateQueries({ queryKey: commsKeys.teams(user?.id) });
    // The linked Routine task changed too, and Today/Calendar read that.
    void qc.invalidateQueries({ queryKey: ["routine"] });
  }, [qc, user?.id]);

  const createObjective = useMutation({
    mutationFn: async (input: NewObjective): Promise<Objective> => {
      if (!user?.id) throw new Error("not signed in");
      const assignee = input.assigneeId ?? null;

      // A Routine task is only written when the objective is assigned to the
      // person creating it. Inserting into someone else's `routine_tasks` is
      // refused by RLS (`user_id = auth.uid()`), and rightly so — one student
      // must not be able to write rows into another's planner. When they accept
      // the objective themselves, that is when their task gets created.
      let routineTaskId: string | null = null;
      if (assignee && assignee === user.id && input.linkToRoutine !== false) {
        const { data: task, error: taskErr } = await routineDb
          .from("routine_tasks")
          .insert({
            user_id: user.id,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            due_at: input.dueAt ?? null,
            priority: input.priority ?? "medium",
            category: "extracurricular",
            status: "todo",
            estimated_minutes: null,
            recurrence: "none",
            goal_id: null,
            completed_at: null,
          } as never)
          .select("id")
          .single();
        if (taskErr) throw taskErr;
        routineTaskId = (task as { id: string } | null)?.id ?? null;
      }

      const { data, error } = await commsDb
        .from("objectives")
        .insert({
          title: input.title.trim(),
          description: input.description?.trim() || null,
          status: "todo",
          priority: input.priority ?? "medium",
          assignee_id: assignee,
          assigned_by: assignee ? user.id : null,
          team_id: input.teamId ?? teamId ?? null,
          due_at: input.dueAt ?? null,
          source_type: "manual",
          source_id: null,
          confidence: null,
          routine_task_id: routineTaskId,
          created_by: user.id,
          completed_at: null,
        })
        .select("*")
        .single();
      if (error) throw error;

      await commsDb.from("objective_activity").insert({
        objective_id: data.id,
        actor_id: user.id,
        kind: "created",
        detail: null,
      });

      return data;
    },
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: ObjectiveStatus }) => {
      if (!user?.id) throw new Error("not signed in");
      const { error } = await commsDb
        .from("objectives")
        .update({
          status: input.status,
          completed_at: input.status === "done" ? new Date().toISOString() : null,
        })
        .eq("id", input.id);
      if (error) throw error;

      await commsDb.from("objective_activity").insert({
        objective_id: input.id,
        actor_id: user.id,
        kind: `status:${input.status}`,
        detail: null,
      });
    },
    onSuccess: invalidate,
  });

  const updateObjective = useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<Pick<Objective, "title" | "description" | "due_at" | "priority" | "assignee_id">>;
    }) => {
      const { error } = await commsDb
        .from("objectives")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Turns an AI suggestion into a real objective. Mirrors createObjective's
   * routine-task rule exactly: a Routine task is only written when the final
   * assignee is the person accepting, since RLS refuses a write into anyone
   * else's `routine_tasks`.
   */
  const acceptSuggestion = useMutation({
    mutationFn: async (input: { id: string; assigneeId?: string | null }): Promise<Objective> => {
      if (!user?.id) throw new Error("not signed in");

      const { data: existing, error: fetchErr } = await commsDb
        .from("objectives")
        .select("*")
        .eq("id", input.id)
        .single();
      if (fetchErr) throw fetchErr;

      const finalAssignee = input.assigneeId !== undefined ? input.assigneeId : existing.assignee_id;

      let routineTaskId: string | null = existing.routine_task_id ?? null;
      if (finalAssignee && finalAssignee === user.id && !routineTaskId) {
        const { data: task, error: taskErr } = await routineDb
          .from("routine_tasks")
          .insert({
            user_id: user.id,
            title: existing.title,
            description: existing.description,
            due_at: existing.due_at,
            priority: existing.priority,
            category: "extracurricular",
            status: "todo",
            estimated_minutes: null,
            recurrence: "none",
            goal_id: null,
            completed_at: null,
          } as never)
          .select("id")
          .single();
        if (taskErr) throw taskErr;
        routineTaskId = (task as { id: string } | null)?.id ?? null;
      }

      const { data, error } = await commsDb
        .from("objectives")
        .update({
          status: "todo",
          assignee_id: finalAssignee,
          assigned_by: finalAssignee ? user.id : null,
          routine_task_id: routineTaskId,
        })
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;

      await commsDb.from("objective_activity").insert({
        objective_id: input.id,
        actor_id: user.id,
        kind: "accepted",
        detail: null,
      });

      return data;
    },
    onSuccess: invalidate,
  });

  const dismissSuggestion = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("not signed in");
      const { error } = await commsDb
        .from("objectives")
        .update({ status: "dismissed" })
        .eq("id", id);
      if (error) throw error;

      await commsDb.from("objective_activity").insert({
        objective_id: id,
        actor_id: user.id,
        kind: "dismissed",
        detail: null,
      });
    },
    onSuccess: invalidate,
  });

  return { createObjective, setStatus, updateObjective, acceptSuggestion, dismissSuggestion };
}
