import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  FileText,
  LayoutGrid,
  Loader2,
  LogOut,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CommsEmpty, CommsPanel } from "@/components/comms/CommsShell";
import { ChatThread } from "@/components/comms/chat/ChatThread";
import { PersonAvatar } from "@/components/comms/chat/PersonAvatar";
import { FilesTab } from "@/components/comms/teams/FilesTab";
import { MembersTab } from "@/components/comms/teams/MembersTab";
import { TeamAnnouncementsTab } from "@/components/comms/teams/TeamAnnouncementsTab";
import { TeamObjectivesTab } from "@/components/comms/teams/TeamObjectivesTab";
import { useCommsRealtime } from "@/hooks/comms/useCommsRealtime";
import { accent } from "@/lib/comms/accents";
import { listTimestamp } from "@/lib/comms/format";
import { TEAM_CATEGORY_LABELS } from "@/lib/comms/types";
import { displayName, usePeople } from "@/hooks/comms/usePeople";
import { useConversationActions, useConversations } from "@/hooks/comms/useConversations";
import { useTeamObjectives } from "@/hooks/comms/useObjectives";
import { useTeamAnnouncements } from "@/hooks/comms/useAnnouncements";
import {
  useTeam,
  useTeamActions,
  useTeamConversation,
  useTeamMembers,
  useTeamSummary,
} from "@/hooks/comms/useTeams";
import { useAuth } from "@/contexts/AuthContext";

const TABS = [
  { value: "overview", label: "Overview", icon: LayoutGrid },
  { value: "chat", label: "Chat", icon: MessageSquare },
  { value: "objectives", label: "Objectives", icon: Target },
  { value: "announcements", label: "Announcements", icon: Megaphone },
  { value: "files", label: "Files", icon: FileText },
  { value: "members", label: "Members", icon: Users },
] as const;

/**
 * One team, as a workspace.
 *
 * The Chat tab is not a second chat implementation — it renders the same
 * `ChatThread` the Chats page does, against the conversation whose `team_id` is
 * this team. That is the whole point of the schema having one `conversations`
 * table with a `kind`: every message feature works in a team by construction
 * rather than by being reimplemented here.
 *
 * The active tab lives in the URL so a link can point at a team's objectives
 * rather than only at the team.
 */
export default function TeamWorkspace() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();

  useCommsRealtime();

  const { team, isLoading } = useTeam(teamId);
  const { members, memberIds, myRole } = useTeamMembers(teamId);
  const { data: conversationId } = useTeamConversation(teamId);
  const { conversations } = useConversations();
  const { people } = usePeople(memberIds);
  const { removeMember, deleteTeam } = useTeamActions(teamId);
  const { markRead } = useConversationActions();

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tab = params.get("tab") ?? "overview";
  const setTab = (next: string) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  const conversation = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversations, conversationId],
  );

  /**
   * Reading a team's chat here has to clear its unread marker, exactly as
   * opening it from the Chats page does. Without this the conversation stays
   * unread forever for anyone who only ever reads it inside the workspace —
   * which, for a team, is most people.
   */
  const chatOpen = tab === "chat";
  const unreadHere = conversation?.unread_count ?? 0;
  useEffect(() => {
    if (chatOpen && conversation && unreadHere > 0) markRead.mutate(conversation.id);
    // `markRead` is a stable mutation object; depending on it would re-fire on
    // every render of this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, conversation?.id, unreadHere]);

  const isOwner = team?.owner_id === user?.id;

  if (isLoading) {
    return (
      <div className="section-container py-6 sm:py-8">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="mt-4 h-64 rounded-2xl" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="section-container py-10">
        <CommsEmpty
          icon={Users}
          title="Team not found"
          description="It may have been deleted, or you may no longer be a member of it."
          action={
            <Button asChild variant="outline">
              <Link to="/communications/teams">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Teams
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const tint = accent(team.accent);

  return (
    <>
      <Seo
        title={`${team.name} · Teams · Pathforge`}
        description={team.description ?? `The ${team.name} team workspace.`}
        path={`/communications/teams/${team.id}`}
        noindex
      />

      <div className="section-container py-6 sm:py-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/communications/teams">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Teams
          </Link>
        </Button>

        {/* Header ---------------------------------------------------------- */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
          className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <div className={cn("h-24 bg-gradient-to-br sm:h-28", tint.header)} />
          <div className="-mt-10 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
            <span
              className={cn(
                "inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-card font-display text-2xl font-bold shadow-sm",
                tint.avatar,
              )}
              aria-hidden
            >
              {team.name.trim().slice(0, 2).toUpperCase()}
            </span>

            <div className="min-w-0 flex-1 sm:pb-1">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {team.name}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span className={cn("rounded-full border px-2 py-0.5", tint.chip)}>
                  {TEAM_CATEGORY_LABELS[team.category] ?? "Team"}
                </span>
                <span className="text-muted-foreground">
                  {members.length} member{members.length === 1 ? "" : "s"} · active{" "}
                  {listTimestamp(team.last_activity_at)}
                </span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:pb-1">
              <span className="flex -space-x-2">
                {memberIds.slice(0, 5).map((id) => (
                  <PersonAvatar
                    key={id}
                    person={people[id]}
                    size="sm"
                    className="ring-2 ring-card"
                  />
                ))}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Team settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {!isOwner && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setConfirmLeave(true)}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Leave team
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete team
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.header>

        {/* Tabs ------------------------------------------------------------ */}
        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs data-[state=active]:border-accent data-[state=active]:bg-accent/10 data-[state=active]:font-semibold data-[state=active]:text-accent"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab
              teamId={team.id}
              description={team.description}
              onOpenTab={setTab}
            />
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            {conversation ? (
              <div className="h-[calc(100vh-22rem)] min-h-[420px] overflow-hidden rounded-2xl border border-border bg-card">
                <ChatThread
                  conversation={conversation}
                  listPeople={people}
                  onBack={() => setTab("overview")}
                  showBackButton={false}
                />
              </div>
            ) : (
              <CommsPanel>
                <CommsEmpty
                  icon={MessageSquare}
                  title="Loading the team chat"
                  description="If this doesn't resolve, the team's conversation may not have been created."
                />
              </CommsPanel>
            )}
          </TabsContent>

          <TabsContent value="objectives" className="mt-6">
            <TeamObjectivesTab teamId={team.id} />
          </TabsContent>

          <TabsContent value="announcements" className="mt-6">
            <TeamAnnouncementsTab teamId={team.id} myRole={myRole} />
          </TabsContent>

          <TabsContent value="files" className="mt-6">
            <FilesTab conversationId={conversationId ?? null} teamName={team.name} />
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <MembersTab teamId={team.id} ownerId={team.owner_id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Leave ------------------------------------------------------------- */}
      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave “{team.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll lose access to this team's chat, objectives, announcements
              and files. Anything you've already written stays with the team.
              Someone in it would need to invite you back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay in team</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!user?.id) return;
                removeMember.mutate(
                  { teamId: team.id, userId: user.id },
                  {
                    onSuccess: () => {
                      toast.success(`You left ${team.name}.`);
                      navigate("/communications/teams");
                    },
                    onError: () => toast.error("Could not leave that team."),
                  },
                );
              }}
            >
              Leave team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete ------------------------------------------------------------ */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{team.name}” permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the team for everyone in it — the chat and all its
              messages, the objectives, the announcements and every uploaded
              file. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep team</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteTeam.mutate(team.id, {
                  onSuccess: () => {
                    toast.success(`${team.name} was deleted.`);
                    navigate("/communications/teams");
                  },
                  onError: () => toast.error("Could not delete that team."),
                })
              }
            >
              {deleteTeam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * What this team is and where it stands.
 *
 * Every figure here is counted from real rows. Nothing on this page is a
 * hardcoded number, and where there is no data yet it says so rather than
 * showing a plausible-looking zero-state chart.
 */
function OverviewTab({
  teamId,
  description,
  onOpenTab,
}: {
  teamId: string;
  description: string | null;
  onOpenTab: (tab: string) => void;
}) {
  const { open, done, suggested } = useTeamObjectives(teamId);
  const { announcements } = useTeamAnnouncements(teamId);
  const { members, memberIds } = useTeamMembers(teamId);
  const { people } = usePeople(memberIds);

  const total = open.length + done.length;
  const pct = total > 0 ? Math.round((done.length / total) * 100) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <CommsPanel title="What we're building" className="lg:col-span-2">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description || "No description yet. An owner or admin can add one."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Members" value={members.length} />
          <Stat label="Open" value={open.length} tone={open.length > 0 ? "warning" : undefined} />
          <Stat label="Completed" value={done.length} tone={done.length > 0 ? "success" : undefined} />
          <Stat label="Announcements" value={announcements.length} />
        </div>

        {total > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Objectives completed</span>
              <span className="tabular-nums text-muted-foreground">
                {done.length} of {total} · {pct}%
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {suggested.length > 0 && (
          <button
            type="button"
            onClick={() => onOpenTab("objectives")}
            className="mt-5 flex w-full items-center gap-2.5 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2.5 text-left transition-colors hover:bg-accent/10"
          >
            <Target className="h-4 w-4 shrink-0 text-accent" />
            <span className="text-xs text-foreground">
              <span className="font-semibold">
                {suggested.length} possible objective
                {suggested.length === 1 ? "" : "s"} detected
              </span>{" "}
              from this team's chat — review before they count as commitments.
            </span>
          </button>
        )}
      </CommsPanel>

      <CommsPanel title="Team" icon={Users} bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {memberIds.slice(0, 8).map((id) => (
            <li key={id} className="flex items-center gap-2.5 px-4 py-2.5">
              <PersonAvatar person={people[id]} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {displayName(people[id])}
              </span>
            </li>
          ))}
        </ul>
        {memberIds.length > 8 && (
          <div className="border-t border-border px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onOpenTab("members")}
            >
              See all {memberIds.length} members
            </Button>
          </div>
        )}
      </CommsPanel>

      <TeamSummaryPanel teamId={teamId} />
    </div>
  );
}

function TeamSummaryPanel({ teamId }: { teamId: string }) {
  const { summary, isLoading, refresh } = useTeamSummary(teamId);

  return (
    <CommsPanel
      title="AI summary"
      icon={Sparkles}
      className="lg:col-span-3"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            refresh.mutate(undefined, {
              onError: (e) => toast.error(e instanceof Error ? e.message : "Could not refresh the summary."),
            })
          }
          disabled={refresh.isPending}
        >
          {refresh.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton className="h-14 rounded-xl" />
      ) : summary ? (
        <div>
          <p className="text-sm leading-relaxed text-foreground">{summary.summary}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Generated {format(new Date(summary.generated_at), "d MMM yyyy, HH:mm")}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No summary yet. Generate one for a quick status read without reading the chat.
        </p>
      )}
    </CommsPanel>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5">
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-xl font-bold tabular-nums",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          !tone && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
