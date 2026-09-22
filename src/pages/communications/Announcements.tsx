import { useMemo, useState } from "react";
import { format, isThisWeek, isToday, isYesterday } from "date-fns";
import { Bell, Loader2, Megaphone, Plus, Search } from "lucide-react";
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
import { CommsEmpty, CommsShell } from "@/components/comms/CommsShell";
import { PersonAvatar } from "@/components/comms/chat/PersonAvatar";
import {
  AnnouncementItem,
  PathforgeEmblem,
} from "@/components/comms/announcements/AnnouncementItem";
import { teamRoleAtLeast, type Announcement, type AnnouncementPriority } from "@/lib/comms/types";
import { displayName, usePeople } from "@/hooks/comms/usePeople";
import {
  useAcknowledgementCounts,
  useAnnouncementActions,
  useAnnouncementsFeed,
  type PlatformAnnouncement,
} from "@/hooks/comms/useAnnouncements";
import { useTeams } from "@/hooks/comms/useTeams";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Everything announced to the reader, in one feed.
 *
 * WHAT WAS WRONG WITH THE OLD ONE
 *
 * It rendered every platform announcement first and every team announcement
 * after, so a Pathforge notice from March sat above this morning's deadline
 * change. Nothing was sorted together, nothing could be filtered or searched,
 * a long announcement filled the viewport on its own, and the only way to find
 * an old one was to scroll. This page merges both sources into a single
 * chronological list - pinned first, because pinning is a claim about
 * importance rather than about time - and gives the list the three controls a
 * feed actually needs: what kind, from where, and matching what text.
 *
 * "Needs you" is deliberately its own filter rather than a badge. An
 * announcement that asks for acknowledgement is the only kind that carries an
 * obligation, and having to spot those by eye among everything else is how they
 * get missed.
 */

type Filter = "all" | "unread" | "needs-you" | "pinned";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "needs-you", label: "Needs you" },
  { id: "pinned", label: "Pinned" },
];

/** A team announcement and a platform one, flattened to what the list needs. */
type FeedEntry =
  | { kind: "team"; id: string; at: string; pinned: boolean; row: Announcement }
  | { kind: "platform"; id: string; at: string; pinned: false; row: PlatformAnnouncement };

/** Day buckets, so a long feed reads as a timeline rather than a wall. */
function bucketOf(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "Earlier this week";
  return format(d, "MMMM yyyy");
}

export default function Announcements() {
  const { user } = useAuth();
  const { teams } = useTeams();
  const [composeOpen, setComposeOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [source, setSource] = useState<string>("all");
  const [term, setTerm] = useState("");

  const { teamAnnouncements, platformAnnouncements, readIds, ackedIds, authorIds, isLoading } =
    useAnnouncementsFeed();
  const { people } = usePeople(authorIds);
  const { markRead, acknowledge, setPinned, unpublish } = useAnnouncementActions();

  const mine = useMemo(
    () => teamAnnouncements.filter((a) => a.author_id === user?.id).map((a) => a.id),
    [teamAnnouncements, user?.id],
  );
  const ackCounts = useAcknowledgementCounts(mine);

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const publishableTeams = useMemo(
    () => teams.filter((t) => teamRoleAtLeast(t.role, "admin")),
    [teams],
  );

  /** Pinned first, then newest first, both sources in the same ordering. */
  const entries = useMemo<FeedEntry[]>(() => {
    const merged: FeedEntry[] = [
      ...teamAnnouncements.map(
        (a): FeedEntry => ({
          kind: "team",
          id: a.id,
          at: a.published_at,
          pinned: a.pinned,
          row: a,
        }),
      ),
      ...platformAnnouncements.map(
        (a): FeedEntry => ({
          kind: "platform",
          id: `platform-${a.id}`,
          at: a.created_at,
          pinned: false,
          row: a,
        }),
      ),
    ];
    return merged.sort((x, y) => {
      if (x.pinned !== y.pinned) return x.pinned ? -1 : 1;
      return y.at.localeCompare(x.at);
    });
  }, [teamAnnouncements, platformAnnouncements]);

  const unreadCount = useMemo(
    () => teamAnnouncements.filter((a) => !readIds.has(a.id)).length,
    [teamAnnouncements, readIds],
  );
  const needsYouCount = useMemo(
    () => teamAnnouncements.filter((a) => a.requires_ack && !ackedIds.has(a.id)).length,
    [teamAnnouncements, ackedIds],
  );

  const visible = useMemo(() => {
    const q = term.trim().toLowerCase();
    return entries.filter((e) => {
      if (source === "platform" && e.kind !== "platform") return false;
      if (source !== "all" && source !== "platform") {
        if (e.kind !== "team" || e.row.team_id !== source) return false;
      }

      if (filter === "unread") {
        // A platform announcement has no per-reader read row to check — see the
        // note on `readIds` — so it is never "unread" and never shown here.
        if (e.kind !== "team" || readIds.has(e.row.id)) return false;
      }
      if (filter === "needs-you") {
        if (e.kind !== "team" || !e.row.requires_ack || ackedIds.has(e.row.id)) return false;
      }
      if (filter === "pinned" && !e.pinned) return false;

      if (q) {
        const haystack =
          e.kind === "team"
            ? `${e.row.title} ${e.row.body}`
            : `${e.row.title} ${e.row.content}`;
        if (!haystack.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [entries, filter, source, term, readIds, ackedIds]);

  /** [bucket, entries] in feed order, so headings appear where the dates change. */
  const grouped = useMemo(() => {
    const out: { label: string; items: FeedEntry[] }[] = [];
    const pinned = visible.filter((e) => e.pinned);
    if (pinned.length) out.push({ label: "Pinned", items: pinned });
    for (const e of visible.filter((x) => !x.pinned)) {
      const label = bucketOf(e.at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(e);
      else out.push({ label, items: [e] });
    }
    return out;
  }, [visible]);

  const composeButton =
    publishableTeams.length > 0 ? (
      <MotionButton size="sm" className="rounded-lg" onClick={() => setComposeOpen(true)}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Post announcement
      </MotionButton>
    ) : undefined;

  const countFor = (id: Filter) =>
    id === "unread" ? unreadCount : id === "needs-you" ? needsYouCount : undefined;

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
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card">
          <CommsEmpty
            icon={Megaphone}
            title="Nothing announced yet"
            description="Updates from your teams, your classes and from Pathforge will show up here."
            action={composeButton}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Filter announcements"
              className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1"
            >
              {FILTERS.map((f) => {
                const count = countFor(f.id);
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {f.label}
                    {!!count && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                          active ? "bg-accent-foreground/20" : "bg-muted-foreground/15",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {teams.length > 0 && (
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-9 w-[min(14rem,60vw)] rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Every source</SelectItem>
                  <SelectItem value="platform">Pathforge</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="relative ml-auto w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search announcements"
                aria-label="Search announcements"
                className="h-9 rounded-xl pl-9 text-xs"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card">
              <CommsEmpty
                icon={Bell}
                title="Nothing matches that"
                description={
                  term.trim()
                    ? `No announcement mentions "${term.trim()}".`
                    : filter === "needs-you"
                      ? "Nothing is waiting on your acknowledgement."
                      : filter === "unread"
                        ? "You have read everything here."
                        : "Nothing is pinned right now."
                }
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilter("all");
                      setSource("all");
                      setTerm("");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            </div>
          ) : (
            grouped.map((group) => (
              <section key={group.label} className="space-y-3">
                <h2 className="px-1 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </h2>

                {group.items.map((entry) =>
                  entry.kind === "platform" ? (
                    <AnnouncementItem
                      key={entry.id}
                      title={entry.row.title}
                      body={entry.row.content}
                      at={entry.row.created_at}
                      authorLabel="Pathforge"
                      sourceLabel="Everyone on Pathforge"
                      // A platform announcement's `type` is its severity, so it
                      // maps onto the same priority label every other entry in
                      // the feed uses rather than onto a different emblem.
                      priority={
                        entry.row.type === "warning" || entry.row.type === "maintenance"
                          ? "important"
                          : "normal"
                      }
                      avatar={<PathforgeEmblem />}
                    />
                  ) : (
                    <AnnouncementItem
                      key={entry.id}
                      title={entry.row.title}
                      body={entry.row.body}
                      at={entry.row.published_at}
                      priority={entry.row.priority}
                      pinned={entry.row.pinned}
                      isRead={readIds.has(entry.row.id)}
                      onRead={() => markRead.mutate(entry.row.id)}
                      avatar={<PersonAvatar person={people[entry.row.author_id]} size="md" />}
                      authorLabel={displayName(people[entry.row.author_id])}
                      sourceLabel={
                        entry.row.team_id
                          ? teamById.get(entry.row.team_id)?.name ?? "A team"
                          : entry.row.scope === "class"
                            ? "Your class"
                            : "Your school"
                      }
                      sourceHref={
                        entry.row.team_id
                          ? `/communications/teams/${entry.row.team_id}`
                          : undefined
                      }
                      requiresAck={entry.row.requires_ack}
                      hasAcknowledged={ackedIds.has(entry.row.id)}
                      onAcknowledge={() =>
                        acknowledge.mutate(entry.row.id, {
                          onSuccess: () => toast.success("Acknowledged."),
                          onError: () => toast.error("Could not acknowledge that."),
                        })
                      }
                      canManage={entry.row.author_id === user?.id}
                      ackCount={
                        entry.row.author_id === user?.id && entry.row.requires_ack
                          ? ackCounts[entry.row.id] ?? 0
                          : undefined
                      }
                      onTogglePin={() =>
                        setPinned.mutate({ id: entry.row.id, pinned: !entry.row.pinned })
                      }
                      onUnpublish={() =>
                        unpublish.mutate(entry.row.id, {
                          onSuccess: () => toast.success("Announcement removed."),
                          onError: () => toast.error("Could not remove that announcement."),
                        })
                      }
                    />
                  ),
                )}
              </section>
            ))
          )}
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
