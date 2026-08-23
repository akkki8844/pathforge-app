import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Check, Loader2, Megaphone, Pin, PinOff, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import { CommsEmpty, CommsPanel } from "@/components/comms/CommsShell";
import { PersonAvatar } from "@/components/comms/chat/PersonAvatar";
import { teamRoleAtLeast, type Announcement, type AnnouncementPriority, type TeamRole } from "@/lib/comms/types";
import { displayName, usePeople, type PersonMap } from "@/hooks/comms/usePeople";
import {
  useAnnouncementActions,
  useTeamAnnouncements,
} from "@/hooks/comms/useAnnouncements";
import { useAuth } from "@/contexts/AuthContext";

const PRIORITY_STYLE: Record<AnnouncementPriority, string> = {
  normal: "border-border text-muted-foreground",
  important: "border-warning/40 bg-warning/10 text-warning",
  urgent: "border-destructive/40 bg-destructive/10 text-destructive",
};

/**
 * Announcements posted to this team.
 *
 * The record written here is the *same* row the global Announcements feed reads
 * — not a copy pushed into a second table. That is what stops a team
 * announcement and its feed entry from drifting apart when one is edited.
 */
export function TeamAnnouncementsTab({
  teamId,
  myRole,
}: {
  teamId: string;
  myRole: TeamRole | null;
}) {
  const { user } = useAuth();
  const { announcements, readIds, authorIds, isLoading } = useTeamAnnouncements(teamId);
  const { people } = usePeople(authorIds);
  const { markRead, acknowledge, setPinned, unpublish } = useAnnouncementActions(teamId);
  const [composeOpen, setComposeOpen] = useState(false);

  const canPublish = teamRoleAtLeast(myRole, "admin");

  const composeButton = canPublish ? (
    <MotionButton size="sm" className="rounded-lg" onClick={() => setComposeOpen(true)}>
      <Plus className="mr-1.5 h-3.5 w-3.5" />
      Post announcement
    </MotionButton>
  ) : undefined;

  return (
    <div className="space-y-4">
      <CommsPanel
        title={`Announcements (${announcements.length})`}
        description="Everyone in the team sees these. Use them for the things a chat message would scroll past."
        icon={Megaphone}
        actions={composeButton}
        bodyClassName={announcements.length ? "space-y-3" : undefined}
      >
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <CommsEmpty
            icon={Megaphone}
            title="Nothing announced yet"
            description={
              canPublish
                ? "Post a deadline, a meeting time or a decision the whole team needs."
                : "When an owner or admin posts something, it will appear here."
            }
            action={composeButton}
          />
        ) : (
          announcements.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              people={people}
              isRead={readIds.has(a.id)}
              canManage={canPublish || a.author_id === user?.id}
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
          ))
        )}
      </CommsPanel>

      {canPublish && (
        <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} teamId={teamId} />
      )}
    </div>
  );
}

export function AnnouncementCard({
  announcement: a,
  people,
  isRead,
  canManage,
  onRead,
  onAcknowledge,
  onTogglePin,
  onUnpublish,
  teamLabel,
}: {
  announcement: Announcement;
  people: PersonMap;
  isRead: boolean;
  canManage: boolean;
  onRead: () => void;
  onAcknowledge: () => void;
  onTogglePin: () => void;
  onUnpublish: () => void;
  /** Shown next to the priority pill on the global feed, where the team isn't implied by the page. */
  teamLabel?: string;
}) {
  return (
    <article
      onMouseEnter={() => {
        if (!isRead) onRead();
      }}
      className={cn(
        "rounded-xl border p-4 transition-colors",
        a.pinned ? "border-accent/40 bg-accent/5" : "border-border bg-background",
        !isRead && "ring-1 ring-inset ring-accent/20",
      )}
    >
      <div className="flex items-start gap-3">
        <PersonAvatar person={people[a.author_id]} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
            {teamLabel && (
              <span className="rounded-full border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {teamLabel}
              </span>
            )}
            {a.pinned && <Pin className="h-3 w-3 text-accent" />}
            {a.priority !== "normal" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold capitalize",
                  PRIORITY_STYLE[a.priority],
                )}
              >
                {a.priority === "urgent" && <AlertTriangle className="h-3 w-3" />}
                {a.priority}
              </span>
            )}
            {!isRead && (
              <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                New
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {displayName(people[a.author_id])} ·{" "}
            {format(new Date(a.published_at), "d MMM yyyy, HH:mm")}
          </p>
        </div>

        {canManage && (
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" onClick={onTogglePin} aria-label={a.pinned ? "Unpin" : "Pin"}>
              {a.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onUnpublish}
              className="text-muted-foreground hover:text-destructive"
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {a.body}
      </p>

      {a.requires_ack && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <p className="flex-1 text-xs text-muted-foreground">
            This one asks you to confirm you've seen it.
          </p>
          <Button size="sm" variant="outline" onClick={onAcknowledge}>
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Acknowledge
          </Button>
        </div>
      )}
    </article>
  );
}

function ComposeDialog({
  open,
  onOpenChange,
  teamId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
}) {
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
            Everyone in this team will see it here and in their Announcements feed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Build review moved to Thursday"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ann-body">Message</Label>
            <Textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="What changed, and what everyone needs to do about it."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ann-priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as AnnouncementPriority)}
            >
              <SelectTrigger id="ann-priority">
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
            disabled={!title.trim() || !body.trim() || publish.isPending}
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
