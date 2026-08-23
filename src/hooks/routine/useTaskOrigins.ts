/**
 * Where a Routine task came from, when it did not come from Routine.
 *
 * Accepting a team objective writes a `routine_tasks` row — that is the whole
 * point of the design: there is one deadline record, and Today, Calendar and
 * the deadline-reminder cron all read it without knowing anything about teams.
 * The cost of that is on the Routine side, where a task can simply appear in a
 * student's planner with a title they never typed and no way to find out why.
 *
 * This closes that loop from the client rather than with a new column, because
 * the link already exists: `objectives.routine_task_id` points at the task. One
 * narrow select gives every task on the page its provenance, and the query is
 * shared with the rest of Communications through React Query, so on a session
 * where the user has already been in Objectives it costs nothing.
 *
 * A task with no matching objective is the ordinary case and gets no chip —
 * "created here" is not information worth spending a line on.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { commsDb } from "@/integrations/supabase/communications";
import { useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/comms/useTeams";

export interface TaskOrigin {
  objectiveId: string;
  teamId: string | null;
  /** Resolved team name, or null for an objective that belongs to no team. */
  teamName: string | null;
}

export function useTaskOrigins(): Map<string, TaskOrigin> {
  const { user } = useAuth();
  const { teams } = useTeams();

  const query = useQuery({
    queryKey: ["comms", "objective-task-links", user?.id ?? "anon"],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await commsDb
        .from("objectives")
        .select("id,team_id,routine_task_id")
        .eq("assignee_id", user!.id)
        .not("routine_task_id", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  return useMemo(() => {
    const names = new Map(teams.map((t) => [t.id, t.name]));
    const map = new Map<string, TaskOrigin>();
    for (const row of query.data ?? []) {
      if (!row.routine_task_id) continue;
      map.set(row.routine_task_id, {
        objectiveId: row.id,
        teamId: row.team_id,
        teamName: row.team_id ? names.get(row.team_id) ?? null : null,
      });
    }
    return map;
  }, [query.data, teams]);
}
