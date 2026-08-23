/**
 * The counts the Communications sub-nav wears.
 *
 * Every messaging product a student already uses — Slack, Teams, Discord,
 * Gmail — puts the "there is something here for you" number on the navigation
 * itself, because a badge that only exists on the page you are already looking
 * at tells you nothing. Before this hook, `comms_unread_total` was written,
 * shipped and never read by anything: the section had unread state and no way
 * to see it without opening Chats.
 *
 * The constraint is cost. This runs on all four Communications pages, so each
 * count has to be one small request that React Query then shares across them:
 *
 * - **Chats** is a scalar RPC that counts server-side.
 * - **Teams** reuses the pending-invite query the Teams page already runs, so
 *   on that page it is free.
 * - **Objectives** is a single narrow select — four columns, only the statuses
 *   that can possibly need attention — rather than `useMyObjectives`, which
 *   pulls the full objective rows *and* the team list behind them. A nav badge
 *   does not need the rows, only how many there are.
 *
 * What each number means is deliberately not "how many exist" but "how many
 * want something from you": unread messages, invites you have not answered, and
 * objectives that are either newly detected or already past due. A count that
 * includes work sitting comfortably in the future is a count you learn to
 * ignore.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { commsDb } from "@/integrations/supabase/communications";
import { useAuth } from "@/contexts/AuthContext";
import type { ObjectiveStatus } from "@/lib/comms/types";
import { useUnreadTotal } from "./useConversations";
import { useMyTeamInvites } from "./useTeams";

/** Statuses that can contribute to the Objectives badge. `done` never can. */
const LIVE_STATUSES: ObjectiveStatus[] = ["suggested", "todo", "in_progress"];

function useObjectiveAttention(): number {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["comms", "objective-attention", user?.id ?? "anon"],
    enabled: !!user?.id,
    // A minute of staleness is invisible on a badge and stops four page
    // navigations in a row from being four identical requests.
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await commsDb
        .from("objectives")
        .select("id,status,due_at,assignee_id")
        .in("status", LIVE_STATUSES);
      if (error) throw error;
      return data ?? [];
    },
  });

  return useMemo(() => {
    const rows = query.data ?? [];
    const now = Date.now();
    let count = 0;
    for (const o of rows) {
      // A suggestion is unanswered by definition — it is waiting on a yes or a
      // no from someone, whoever it was detected for.
      if (o.status === "suggested") {
        count += 1;
        continue;
      }
      // Otherwise only your own overdue work counts. Someone else's late
      // objective is not a thing you can clear off this badge.
      if (o.assignee_id !== user?.id) continue;
      if (!o.due_at) continue;
      const due = new Date(o.due_at).getTime();
      if (!Number.isNaN(due) && due < now) count += 1;
    }
    return count;
  }, [query.data, user?.id]);
}

export interface CommsBadges {
  /** Unread messages across every conversation that is not muted. */
  chats: number;
  /** Team invites you have neither accepted nor declined. */
  teams: number;
  /** Detected suggestions plus your own overdue objectives. */
  objectives: number;
}

export function useCommsBadges(): CommsBadges {
  const unread = useUnreadTotal();
  const { invites } = useMyTeamInvites();
  const objectives = useObjectiveAttention();

  return {
    chats: unread.data ?? 0,
    teams: invites.length,
    objectives,
  };
}
