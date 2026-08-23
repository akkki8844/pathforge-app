import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { AlertTriangle, Loader2, Megaphone, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Button as MotionButton } from "@/components/ui/be-ui-button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CommsEmpty, CommsPanel, CommsShell } from "@/components/comms/CommsShell";
import { AnnouncementCard } from "@/components/comms/teams/TeamAnnouncementsTab";
import { teamRoleAtLeast, type AnnouncementPriority } from "@/lib/comms/types";
import { usePeople } from "@/hooks/comms/usePeople";
import { useAnnouncementActions, useAnnouncementsFeed } from "@/hooks/comms/useAnnouncements";
import { useTeams } from "@/hooks/comms/useTeams";

/**
 * Everything announced to the user, merged: team announcements from every team
 * they're in, and platform announcements from Pathforge — the same rows the
 * team workspace and `AnnouncementBanner` read, not copies of them.
 */
export default function Announcements() {
  const { teams } = useTeams();
  const teamIds = useMemo(() => teams.map((t) => t.id), [teams]);
  const [composeOpen, setComposeOpen] = useState(false);

  const { teamAnnouncements, platformAnnouncements, readIds, authorIds, isLoading } =
    useAnnouncementsFeed(teamIds);
  const { people } = usePeople(authorIds);
  const { markRead, acknowledge, setPinned, unpublish } = useAnnouncementActions();

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const publishableTeams = useMemo(
    () => teams.filter((t) => teamRoleAtLeast(t.role, "admin")),
    [teams],
  );

  const composeButton =
    publishableTeams.length > 0 ? (
      <MotionButton size="sm" className="rounded-lg" onClick={() => setComposeOpen(true)}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Post announcement
      </MotionButton>
    ) : undefined;

  const totalCount = teamAnnouncements.length + platformAnnouncements.length;

  return (
    <CommsShell
      title="Announcements"
      purpose="Updates from your teachers, your teams and Pathforge, in one feed."
      icon={Megaphone}
      path="/communications/announcements"
      actions={composeButton}
    >
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="rounded-2xl border border-border bg-card">
          <CommsEmpty
            icon={Megaphone}
            title="Nothing announced yet"
            description="Updates from your teams and from Pathforge will show up here."
            action={composeButton}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {platformAnnouncements.map((a) => (
            <div
              key={`platform-${a.id}`}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                  {a.type === "warning" || a.type === "maintenance" ? (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-accent" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                    <span className="rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent">
                      Pathforge
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(new Date(a.created_at), "d MMM yyyy, HH:mm")}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {a.content}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {teamAnnouncements.map((a) => {
            const team = a.team_id ? teamById.get(a.team_id) : undefined;
            const canManage = a.team_id ? teamRoleAtLeast(team?.role, "admin") : false;
            return (
              <div key={a.id}>
                {team && (
                  <Link
                    to={`/communications/teams/${team.id}`}
                    className="mb-1 inline-block text-xs text-muted-foreground hover:text-accent"
                  >
                    In {team.name}
                  </Link>
                )}
                <AnnouncementCard
                  announcement={a}
                  people={people}
                  isRead={readIds.has(a.id)}
                  canManage={canManage}
                  onRead={() => markRead.mutate(a.id)}
                  onAcknowledge={() =>
                    acknowledge.mutate(a.id, {
                      onSuccess: () => toast.success("Acknowledged."),
                      onError: () => toast.error("Could not acknowledge that."),
                    })
                  }
                  onTogglePin={() => setPinned.mutate({ id: a.id, pinned: !a.pinned })}
                  onUnpublish={() =>
                    unpublish.mutate(a.id, {
                      onSuccess: () => toast.success("Announcement removed."),
                      onError: () => toast.error("Could not remove that announcement."),
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {publishableTeams.length > 0 && (
        <ComposeDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          teams={publishableTeams.map((t) => ({ id: t.id, name: t.name }))}
        />
      )}
    </CommsShell>
  );
}

function ComposeDialog({
  open,
  onOpenChange,
  teams,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: { id: string; name: string }[];
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const { publish } = useAnnouncementActions(teamId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [requiresAck, setRequiresAck] = useState(false);

  const close = (next: boolean) => {
    if (!next) {
      setTitle("");
      setBody("");
      setPriority("normal");
      setRequiresAck(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[41rem]">
        <DialogHeader>
          <DialogTitle>Post an announcement</DialogTitle>
          <DialogDescription>
            Everyone on the team you pick will see it in their chat and in this feed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="feed-ann-team">Team</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger id="feed-ann-team">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feed-ann-title">Title</Label>
            <Input
              id="feed-ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Build review moved to Thursday"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feed-ann-body">Message</Label>
            <Textarea
              id="feed-ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="What changed, and what everyone needs to do about it."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feed-ann-priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as AnnouncementPriority)}
            >
              <SelectTrigger id="feed-ann-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3">
            <Checkbox
              checked={requiresAck}
              onCheckedChange={(v) => setRequiresAck(v === true)}
              className="mt-0.5"
            />
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Require acknowledgement</span>
              <br />
              Each member gets an Acknowledge button, so you can tell who has
              actually read it rather than guessing.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <MotionButton
            className="rounded-xl h-10"
            disabled={!teamId || !title.trim() || !body.trim() || publish.isPending}
            onClick={() =>
              publish.mutate(
                { teamId, title, body, priority, requiresAck },
                {
                  onSuccess: () => {
                    toast.success("Announcement posted.");
                    close(false);
                  },
                  onError: (e) =>
                    toast.error(
                      e instanceof Error ? e.message : "Could not post that announcement.",
                    ),
                },
              )
            }
          >
            {publish.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post
          </MotionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
