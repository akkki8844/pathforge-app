import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Plus, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Button as MotionButton } from "@/components/ui/be-ui-button";
import { CommsEmpty, CommsPanel, CommsShell } from "@/components/comms/CommsShell";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateTeamDialog } from "@/components/comms/teams/CreateTeamDialog";
import { TeamCard } from "@/components/comms/teams/TeamCard";
import { usePeople, displayName } from "@/hooks/comms/usePeople";
import {
  useMyTeamInvites,
  useTeamActions,
  useTeams,
} from "@/hooks/comms/useTeams";
import { commsDb } from "@/integrations/supabase/communications";
import { useQuery } from "@tanstack/react-query";

/**
 * Teams.
 *
 * A grid of the user's teams, with pending invites pulled to the top — an invite
 * is the only thing on this page that expires socially, so burying it below a
 * scroll of cards is how people end up never joining anything.
 */
export default function Teams() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const { teams, isLoading } = useTeams();
  const { invites } = useMyTeamInvites();

  // Names for the invite rows: the team being offered, and who offered it.
  const inviteTeamIds = useMemo(() => invites.map((i) => i.team_id), [invites]);
  const { data: inviteTeams = [] } = useQuery({
    queryKey: ["comms", "invite-teams", inviteTeamIds.join(",")],
    enabled: inviteTeamIds.length > 0,
    queryFn: async () => {
      const { data, error } = await commsDb
        .from("teams")
        .select("id,name,description,accent")
        .in("id", inviteTeamIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const referencedIds = useMemo(
    () => [...teams.flatMap((t) => t.member_ids), ...invites.map((i) => i.invited_by)],
    [teams, invites],
  );
  const { people } = usePeople(referencedIds);

  const createButton = (
    <MotionButton onClick={() => setCreateOpen(true)} ripple className="rounded-xl">
      <Plus className="mr-2 h-4 w-4" />
      Create team
    </MotionButton>
  );

  return (
    <CommsShell
      title="Teams"
      purpose="Projects, clubs, competitions and research — each with its own chat, objectives and files."
      icon={Users}
      path="/communications/teams"
      actions={createButton}
    >
      {invites.length > 0 && (
        <CommsPanel
          title={`${invites.length} pending invite${invites.length === 1 ? "" : "s"}`}
          description="Someone has asked you to join their team."
          icon={UserPlus}
          className="mb-6 border-accent/40"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {invites.map((invite) => {
              const team = inviteTeams.find((t) => t.id === invite.team_id);
              return (
                <InviteRow
                  key={invite.id}
                  inviteId={invite.id}
                  teamName={team?.name ?? "A team"}
                  teamDescription={team?.description ?? null}
                  invitedBy={displayName(people[invite.invited_by])}
                  onJoined={(teamId) => navigate(`/communications/teams/${teamId}`)}
                />
              );
            })}
          </ul>
        </CommsPanel>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card">
          <CommsEmpty
            icon={Users}
            title="No teams yet"
            description="Create one for a group project, a club, a competition entry or a piece of research. Everyone you invite gets the team's chat, objectives and files."
            action={createButton}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, i) => (
            <TeamCard
              key={team.id}
              team={team}
              people={people}
              memberIds={team.member_ids}
              index={i}
            />
          ))}
        </div>
      )}

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => navigate(`/communications/teams/${id}`)}
      />
    </CommsShell>
  );
}

function InviteRow({
  inviteId,
  teamName,
  teamDescription,
  invitedBy,
  onJoined,
}: {
  inviteId: string;
  teamName: string;
  teamDescription: string | null;
  invitedBy: string;
  onJoined: (teamId: string) => void;
}) {
  const { acceptInvite, declineInvite } = useTeamActions();

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{teamName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Invited by {invitedBy}
          {teamDescription ? ` · ${teamDescription}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={declineInvite.isPending}
          onClick={() =>
            declineInvite.mutate(inviteId, {
              onError: () => toast.error("Could not decline that invite."),
            })
          }
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Decline
        </Button>
        <MotionButton
          size="sm"
          className="rounded-lg"
          disabled={acceptInvite.isPending}
          onClick={() =>
            acceptInvite.mutate(inviteId, {
              onSuccess: (teamId) => {
                toast.success(`You joined ${teamName}.`);
                onJoined(teamId);
              },
              onError: (e) =>
                toast.error(
                  e instanceof Error ? e.message : "Could not join that team.",
                ),
            })
          }
        >
          {acceptInvite.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          )}
          Join
        </MotionButton>
      </div>
    </li>
  );
}
