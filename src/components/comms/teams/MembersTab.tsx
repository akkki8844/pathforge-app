import { useState } from "react";
import { Crown, Loader2, MailX, Search, Shield, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Button as MotionButton } from "@/components/ui/be-ui-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PersonAvatar } from "@/components/comms/chat/PersonAvatar";
import { CommsPanel } from "@/components/comms/CommsShell";
import { teamRoleAtLeast, type TeamRole } from "@/lib/comms/types";
import {
  displayName,
  usePeople,
  usePeopleSearch,
  type Person,
} from "@/hooks/comms/usePeople";
import {
  useTeamActions,
  useTeamInvites,
  useTeamMembers,
} from "@/hooks/comms/useTeams";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Who is in the team, who has been invited, and the controls to change that.
 *
 * The destructive controls are shown to owners and admins only — but that is a
 * *clarity* decision, not the security boundary. `team_members` UPDATE and
 * DELETE are already restricted by RLS to an owner/admin (or the member
 * themselves leaving), so a member who reaches the mutation another way gets a
 * policy rejection. Hiding the button just stops it looking like an option.
 */
export function MembersTab({ teamId, ownerId }: { teamId: string; ownerId: string }) {
  const { user } = useAuth();
  const { members, memberIds, myRole } = useTeamMembers(teamId);
  const { invites } = useTeamInvites(teamId);
  const { people } = usePeople([...memberIds, ...invites.map((i) => i.invited_user_id)]);
  const { setRole, removeMember, revokeInvite } = useTeamActions(teamId);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{ userId: string; name: string } | null>(
    null,
  );

  const canManage = teamRoleAtLeast(myRole, "admin");
  const isOwner = myRole === "owner";

  return (
    <div className="space-y-6">
      <CommsPanel
        title={`Members (${members.length})`}
        icon={UserPlus}
        bodyClassName="p-0"
        actions={
          canManage ? (
            <MotionButton size="sm" className="rounded-lg" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Invite
            </MotionButton>
          ) : undefined
        }
      >
        <ul className="divide-y divide-border">
          {members.map((m) => {
            const person = people[m.user_id];
            const isMe = m.user_id === user?.id;
            const isTeamOwner = m.user_id === ownerId;
            // The owner's own row is not manageable: demoting or removing the
            // owner would leave the team with nobody who can delete it.
            const manageable = canManage && !isTeamOwner;

            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <PersonAvatar person={person} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {displayName(person)}
                    {isMe && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </p>
                  {person?.username && (
                    <p className="truncate text-xs text-muted-foreground">
                      @{person.username}
                    </p>
                  )}
                </div>

                <RoleBadge role={m.role} />

                {manageable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label={`Manage ${displayName(person)}`}>
                        ···
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isOwner && m.role !== "admin" && (
                        <DropdownMenuItem
                          onSelect={() =>
                            setRole.mutate(
                              { memberId: m.id, role: "admin" },
                              { onError: () => toast.error("Could not change that role.") },
                            )
                          }
                        >
                          <Shield className="mr-2 h-4 w-4" /> Make admin
                        </DropdownMenuItem>
                      )}
                      {isOwner && m.role === "admin" && (
                        <DropdownMenuItem
                          onSelect={() =>
                            setRole.mutate(
                              { memberId: m.id, role: "member" },
                              { onError: () => toast.error("Could not change that role.") },
                            )
                          }
                        >
                          <Shield className="mr-2 h-4 w-4" /> Make member
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() =>
                          setPendingRemove({
                            userId: m.user_id,
                            name: displayName(person),
                          })
                        }
                      >
                        <UserMinus className="mr-2 h-4 w-4" /> Remove from team
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            );
          })}
        </ul>
      </CommsPanel>

      {canManage && invites.length > 0 && (
        <CommsPanel
          title={`Invited (${invites.length})`}
          description="These people have been asked to join but haven't answered yet."
          icon={MailX}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-3 px-4 py-3">
                <PersonAvatar person={people[invite.invited_user_id]} size="sm" />
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {displayName(people[invite.invited_user_id])}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() =>
                    revokeInvite.mutate(invite.id, {
                      onError: () => toast.error("Could not revoke that invite."),
                    })
                  }
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        </CommsPanel>
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        teamId={teamId}
        existing={new Set([...memberIds, ...invites.map((i) => i.invited_user_id)])}
      />

      <AlertDialog
        open={!!pendingRemove}
        onOpenChange={(open) => !open && setPendingRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {pendingRemove?.name} from this team?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to the team chat, its objectives, its
              announcements and its files. Anything they have already written
              stays. You can invite them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep in team</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingRemove) {
                  removeMember.mutate(
                    { teamId, userId: pendingRemove.userId },
                    {
                      onSuccess: () => toast.success(`${pendingRemove.name} was removed.`),
                      onError: () => toast.error("Could not remove that member."),
                    },
                  );
                }
                setPendingRemove(null);
              }}
            >
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoleBadge({ role }: { role: TeamRole }) {
  if (role === "member") {
    return <span className="shrink-0 text-xs text-muted-foreground">Member</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        role === "owner"
          ? "border-warning/40 bg-warning/10 text-warning"
          : "border-info/40 bg-info/10 text-info",
      )}
    >
      {role === "owner" ? <Crown className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
      {role === "owner" ? "Owner" : "Admin"}
    </span>
  );
}

/**
 * Invite someone to the team.
 *
 * Searches the same bounded directory the New Chat dialog does — people you
 * share a school, class, team or conversation with — so a team cannot be used
 * to reach an account you otherwise could not contact.
 */
function InviteDialog({
  open,
  onOpenChange,
  teamId,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  existing: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const search = usePeopleSearch(query);
  const { inviteMember } = useTeamActions(teamId);

  const invite = (person: Person) => {
    inviteMember.mutate(
      { teamId, userId: person.user_id },
      {
        onSuccess: () => toast.success(`Invited ${displayName(person)}.`),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not send that invite."),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[41rem]">
        <DialogHeader>
          <DialogTitle>Invite to this team</DialogTitle>
          <DialogDescription>
            You can invite people from your school, your classes and your teams.
            They'll get a pending invite to accept.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username"
            className="pl-9"
            autoComplete="off"
            aria-label="Search people to invite"
          />
        </div>

        {search.tooShort && (
          <p className="text-xs text-muted-foreground">
            Type at least two characters to search.
          </p>
        )}
        {search.isSearching && (
          <p className="flex items-center text-xs text-muted-foreground">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Searching…
          </p>
        )}
        {search.isEmpty && (
          <p className="text-xs text-muted-foreground">
            No one matched. You can only invite people you share a school, class
            or team with.
          </p>
        )}

        {search.results.length > 0 && (
          <ScrollArea className="max-h-64 rounded-xl border border-border">
            <ul className="divide-y divide-border">
              {search.results.map((p) => {
                const already = existing.has(p.user_id);
                return (
                  <li key={p.user_id} className="flex items-center gap-3 px-3 py-2.5">
                    <PersonAvatar person={p} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {displayName(p)}
                      </span>
                      {p.username && (
                        <span className="block truncate text-xs text-muted-foreground">
                          @{p.username}
                        </span>
                      )}
                    </span>
                    {already ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Already in
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={inviteMember.isPending}
                        onClick={() => invite(p)}
                      >
                        Invite
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
