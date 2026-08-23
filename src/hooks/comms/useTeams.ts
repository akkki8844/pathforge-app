/**
 * Teams: the list, one team's workspace, its members, and its invites.
 *
 * The shape of this file follows one rule from the schema: anything that has to
 * create rows for *other* people goes through a SECURITY DEFINER RPC, and
 * anything that only touches the caller's own rows is a direct table write.
 *
 *   - `create_team` writes four rows (team, owner membership, the team's
 *     conversation, the owner's seat in it). From the client that is four
 *     requests, and a tab closed after the first leaves a team with no owner
 *     that nobody — including its creator — can read, because every policy on it
 *     keys off membership.
 *   - `accept_team_invite` likewise flips the invite, adds the membership and
 *     adds the chat seat together.
 *   - Leaving, renaming, changing a member's role and revoking an invite are all
 *     plain writes: RLS already says exactly who may do each one, so a second
 *     check here would only be a place for the two to disagree.
 *
 * A team's chat is not a separate thing to fetch: it is the conversation with
 * this `team_id`, so the workspace's Chat tab renders the same `ChatThread` the
 * Chats page does.
 */
import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { commsDb } from "@/integrations/supabase/communications";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Team,
  TeamAccent,
  TeamCategory,
  TeamInvite,
  TeamMember,
  TeamRole,
} from "@/lib/comms/types";
import { commsKeys } from "./keys";

/** A team card: the team plus the two figures the grid actually shows. */
export interface TeamCard extends Team {
  member_count: number;
  /** A few member ids for the card's avatar stack. */
  member_ids: string[];
  open_objectives: number;
  /** The team's chat, so a card can deep-link straight into it. */
  conversation_id: string | null;
  role: TeamRole | null;
}

export function useTeams() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: commsKeys.teams(user?.id),
    enabled: !!user?.id,
    queryFn: async (): Promise<TeamCard[]> => {
      // Teams the user belongs to. RLS on `teams` also admits a counsellor
      // viewing metadata, so this is filtered by membership explicitly —
      // "Teams" is the user's own list, not everything they may read.
      const { data: memberships, error: mErr } = await commsDb
        .from("team_members")
        .select("*")
        .eq("user_id", user!.id);
      if (mErr) throw mErr;

      const ids = (memberships ?? []).map((m) => m.team_id);
      if (ids.length === 0) return [];

      const [teamsRes, countsRes, convRes, objRes] = await Promise.all([
        commsDb.from("teams").select("*").in("id", ids),
        commsDb.from("team_members").select("team_id,user_id").in("team_id", ids),
        commsDb.from("conversations").select("id,team_id").in("team_id", ids),
        commsDb
          .from("objectives")
          .select("team_id,status")
          .in("team_id", ids)
          .in("status", ["todo", "in_progress"]),
      ]);
      if (teamsRes.error) throw teamsRes.error;

      const roleByTeam = new Map((memberships ?? []).map((m) => [m.team_id, m.role]));
      const memberCount = new Map<string, number>();
      const memberIds = new Map<string, string[]>();
      for (const row of countsRes.data ?? []) {
        memberCount.set(row.team_id, (memberCount.get(row.team_id) ?? 0) + 1);
        const list = memberIds.get(row.team_id) ?? [];
        if (list.length < 6) list.push(row.user_id);
        memberIds.set(row.team_id, list);
      }
      const objectiveCount = new Map<string, number>();
      for (const row of objRes.data ?? []) {
        if (!row.team_id) continue;
        objectiveCount.set(row.team_id, (objectiveCount.get(row.team_id) ?? 0) + 1);
      }
      const convByTeam = new Map(
        (convRes.data ?? []).filter((c) => c.team_id).map((c) => [c.team_id!, c.id]),
      );

      return (teamsRes.data ?? [])
        .filter((t) => !t.archived_at)
        .map((t) => ({
          ...t,
          member_count: memberCount.get(t.id) ?? 1,
          member_ids: memberIds.get(t.id) ?? [],
          open_objectives: objectiveCount.get(t.id) ?? 0,
          conversation_id: convByTeam.get(t.id) ?? null,
          role: roleByTeam.get(t.id) ?? null,
        }))
        .sort(
          (a, b) =>
            new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime(),
        );
    },
  });

  return {
    teams: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** One team, for the workspace. */
export function useTeam(teamId: string | undefined) {
  const query = useQuery({
    queryKey: commsKeys.team(teamId),
    enabled: !!teamId,
    queryFn: async (): Promise<Team | null> => {
      const { data, error } = await commsDb
        .from("teams")
        .select("*")
        .eq("id", teamId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  return { team: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

/** The team's chat conversation id. */
export function useTeamConversation(teamId: string | undefined) {
  return useQuery({
    queryKey: ["comms", "team-conversation", teamId ?? "none"],
    enabled: !!teamId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await commsDb
        .from("conversations")
        .select("id")
        .eq("team_id", teamId!)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  });
}

export function useTeamMembers(teamId: string | undefined) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: commsKeys.teamMembers(teamId),
    enabled: !!teamId,
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await commsDb
        .from("team_members")
        .select("*")
        .eq("team_id", teamId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const members = useMemo(() => query.data ?? [], [query.data]);

  return {
    members,
    memberIds: useMemo(() => members.map((m) => m.user_id), [members]),
    /** The signed-in user's role in this team, or null if they are not in it. */
    myRole: useMemo(
      () => members.find((m) => m.user_id === user?.id)?.role ?? null,
      [members, user?.id],
    ),
    isLoading: query.isLoading,
  };
}

/** Invites *to* the signed-in user, for the banner on the Teams page. */
export function useMyTeamInvites() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: commsKeys.teamInvites(user?.id),
    enabled: !!user?.id,
    queryFn: async (): Promise<TeamInvite[]> => {
      const { data, error } = await commsDb
        .from("team_invites")
        .select("*")
        .eq("invited_user_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return { invites: query.data ?? [], isLoading: query.isLoading };
}

/** Invites *from* a team, for the Members tab. */
export function useTeamInvites(teamId: string | undefined) {
  const query = useQuery({
    queryKey: ["comms", "team-invites-out", teamId ?? "none"],
    enabled: !!teamId,
    queryFn: async (): Promise<TeamInvite[]> => {
      const { data, error } = await commsDb
        .from("team_invites")
        .select("*")
        .eq("team_id", teamId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return { invites: query.data ?? [], isLoading: query.isLoading };
}

export function useTeamActions(teamId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: commsKeys.teams(user?.id) });
    void qc.invalidateQueries({ queryKey: commsKeys.teamInvites(user?.id) });
    void qc.invalidateQueries({ queryKey: commsKeys.conversations(user?.id) });
    if (teamId) {
      void qc.invalidateQueries({ queryKey: commsKeys.team(teamId) });
      void qc.invalidateQueries({ queryKey: commsKeys.teamMembers(teamId) });
      void qc.invalidateQueries({ queryKey: ["comms", "team-invites-out", teamId] });
    }
  }, [qc, user?.id, teamId]);

  const createTeam = useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      category: TeamCategory;
      accent: TeamAccent;
    }): Promise<string> => {
      const { data, error } = await supabase.rpc(
        "create_team" as never,
        {
          _name: input.name,
          _description: input.description ?? null,
          _category: input.category,
          _accent: input.accent,
        } as never,
      );
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: invalidate,
  });

  const updateTeam = useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<Pick<Team, "name" | "description" | "category" | "accent">>;
    }) => {
      const { error } = await commsDb.from("teams").update(input.patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Invite someone.
   *
   * The row is written directly — `team_invites` INSERT is already restricted to
   * an owner or admin of the team, so a member who tries this gets a policy
   * rejection rather than a hidden button they never see.
   */
  const inviteMember = useMutation({
    mutationFn: async (input: { teamId: string; userId: string }) => {
      if (!user?.id) throw new Error("not signed in");
      const { error } = await commsDb.from("team_invites").insert({
        team_id: input.teamId,
        invited_user_id: input.userId,
        invited_by: user.id,
        status: "pending",
        responded_at: null,
      });
      if (error) {
        // The UNIQUE(team_id, invited_user_id) constraint means "already
        // invited", which is the state the user was asking for anyway.
        if (`${error.message}`.toLowerCase().includes("duplicate")) {
          throw new Error("That person has already been invited.");
        }
        throw error;
      }
    },
    onSuccess: invalidate,
  });

  const acceptInvite = useMutation({
    mutationFn: async (inviteId: string): Promise<string> => {
      const { data, error } = await supabase.rpc(
        "accept_team_invite" as never,
        { _invite_id: inviteId } as never,
      );
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: invalidate,
  });

  const declineInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await commsDb
        .from("team_invites")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const revokeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await commsDb.from("team_invites").delete().eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setRole = useMutation({
    mutationFn: async (input: { memberId: string; role: TeamRole }) => {
      const { error } = await commsDb
        .from("team_members")
        .update({ role: input.role })
        .eq("id", input.memberId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Remove a member, or leave.
   *
   * The same delete either way — the RLS policy allows an owner/admin removing
   * anyone *or* a member removing themselves, so one mutation covers both and
   * there is no path where the UI and the database disagree about which it is.
   *
   * The team chat seat goes too, or the person keeps reading a team's messages
   * after leaving it.
   */
  const removeMember = useMutation({
    mutationFn: async (input: { teamId: string; userId: string }) => {
      const { data: conv } = await commsDb
        .from("conversations")
        .select("id")
        .eq("team_id", input.teamId)
        .maybeSingle();

      const { error } = await commsDb
        .from("team_members")
        .delete()
        .eq("team_id", input.teamId)
        .eq("user_id", input.userId);
      if (error) throw error;

      if (conv?.id) {
        await commsDb
          .from("conversation_members")
          .delete()
          .eq("conversation_id", conv.id)
          .eq("user_id", input.userId);
      }
    },
    onSuccess: invalidate,
  });

  /** Owner only, per RLS. Cascades to members, chat, objectives and files. */
  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await commsDb.from("teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    createTeam,
    updateTeam,
    inviteMember,
    acceptInvite,
    declineInvite,
    revokeInvite,
    setRole,
    removeMember,
    deleteTeam,
  };
}

export interface TeamSummary {
  summary: string;
  generated_at: string;
  model: string | null;
}

/**
 * The cached AI summary a counsellor (or team member) sees for this team.
 * Read is a direct table select — `team_summaries` RLS already gates it on
 * `is_team_member` OR `can_view_team_metadata`, the same boundary the
 * `summarize-team` function checks before it will (re)generate one.
 * Refreshing is always an explicit call, never automatic on page load.
 */
export function useTeamSummary(teamId: string | undefined) {
  const qc = useQueryClient();
  const key = ["comms", "team-summary", teamId];

  const query = useQuery({
    queryKey: key,
    enabled: !!teamId,
    queryFn: async (): Promise<TeamSummary | null> => {
      const { data, error } = await commsDb
        .from("team_summaries")
        .select("summary, generated_at, model")
        .eq("team_id", teamId!)
        .maybeSingle();
      if (error) throw error;
      return data as TeamSummary | null;
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("no team");
      const { data, error } = await supabase.functions.invoke("summarize-team", {
        body: { teamId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.summary as TeamSummary;
    },
    onSuccess: (summary) => qc.setQueryData(key, summary),
  });

  return { summary: query.data ?? null, isLoading: query.isLoading, refresh };
}
