import { useMemo, useState } from "react";
import { Pin, PinOff, Bell, BellOff, MailOpen, Search, Users, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CommsEmpty } from "@/components/comms/CommsShell";
import { GroupAvatar, PersonAvatar } from "./PersonAvatar";
import { listTimestamp, preview } from "@/lib/comms/format";
import { displayName, type PersonMap } from "@/hooks/comms/usePeople";
import type { ConversationListItem } from "@/hooks/comms/useConversations";

/**
 * The left pane: every conversation the user is in, pinned first.
 *
 * The row is the densest surface in the section — nine facts in one line — so
 * the hierarchy is strict: avatar, then name, then who said what, with the
 * timestamp and unread count right-aligned so the eye can scan one column for
 * "is there anything new" without reading any names at all.
 */
export function ConversationList({
  conversations,
  people,
  selectedId,
  onSelect,
  onTogglePin,
  onToggleMute,
  onMarkUnread,
  isLoading,
  emptyAction,
}: {
  conversations: ConversationListItem[];
  people: PersonMap;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onTogglePin: (c: ConversationListItem) => void;
  onToggleMute: (c: ConversationListItem) => void;
  onMarkUnread: (c: ConversationListItem) => void;
  isLoading: boolean;
  emptyAction?: React.ReactNode;
}) {
  const [filter, setFilter] = useState("");

  const titleFor = (c: ConversationListItem) =>
    c.kind === "dm"
      ? displayName(c.other_user_id ? people[c.other_user_id] : undefined)
      : c.title ?? "Untitled";

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = titleFor(c).toLowerCase();
      const body = (c.last_message_body ?? "").toLowerCase();
      return name.includes(q) || body.includes(q);
    });
    // `people` participates because a DM's name is resolved from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, filter, people]);

  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/70 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="h-10 rounded-full border-transparent bg-muted/50 pl-10 focus-visible:border-accent/40 focus-visible:bg-card"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2.5">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <CommsEmpty
            icon={Users}
            title="No conversations yet"
            description="Start a direct message with someone from your school, or create a group for a project you're working on."
            action={emptyAction}
          />
        ) : filtered.length === 0 ? (
          <CommsEmpty
            icon={Search}
            title="Nothing matched"
            description={`No conversation name or recent message contains “${filter.trim()}”.`}
          />
        ) : (
          <div className="p-2">
            {pinned.length > 0 && (
              <>
                <SectionLabel>Pinned</SectionLabel>
                {pinned.map((c) => (
                  <Row
                    key={c.id}
                    conversation={c}
                    title={titleFor(c)}
                    people={people}
                    selected={c.id === selectedId}
                    onSelect={onSelect}
                    onTogglePin={onTogglePin}
                    onToggleMute={onToggleMute}
                    onMarkUnread={onMarkUnread}
                  />
                ))}
                {rest.length > 0 && <SectionLabel>All conversations</SectionLabel>}
              </>
            )}
            {rest.map((c) => (
              <Row
                key={c.id}
                conversation={c}
                title={titleFor(c)}
                people={people}
                selected={c.id === selectedId}
                onSelect={onSelect}
                onTogglePin={onTogglePin}
                onToggleMute={onToggleMute}
                onMarkUnread={onMarkUnread}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-3 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );
}

function Row({
  conversation: c,
  title,
  people,
  selected,
  onSelect,
  onTogglePin,
  onToggleMute,
  onMarkUnread,
}: {
  conversation: ConversationListItem;
  title: string;
  people: PersonMap;
  selected: boolean;
  onSelect: (id: string) => void;
  onTogglePin: (c: ConversationListItem) => void;
  onToggleMute: (c: ConversationListItem) => void;
  onMarkUnread: (c: ConversationListItem) => void;
}) {
  const unread = c.unread_count > 0;
  const sender = c.last_message_sender_id ? people[c.last_message_sender_id] : undefined;

  const previewText = c.last_message_deleted
    ? "Message deleted"
    : c.last_message_body
      ? c.kind === "dm"
        ? preview(c.last_message_body)
        : `${displayName(sender).split(" ")[0]}: ${preview(c.last_message_body, 70)}`
      : "No messages yet";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={() => onSelect(c.id)}
          aria-current={selected ? "true" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors",
            selected ? "bg-muted" : "hover:bg-muted/50",
          )}
        >
          {c.kind === "dm" ? (
            <PersonAvatar
              person={c.other_user_id ? people[c.other_user_id] : undefined}
              size="md"
            />
          ) : (
            <GroupAvatar title={title} accentName={c.accent} size="md" />
          )}

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              {c.kind === "team" && (
                <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "truncate text-[0.94rem]",
                  unread ? "font-semibold text-foreground" : "font-medium text-foreground",
                )}
              >
                {title}
              </span>
              {c.pinned && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
              {c.muted && <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" />}
            </span>
            <span
              className={cn(
                "mt-0.5 block truncate text-xs",
                c.last_message_deleted && "italic",
                unread ? "text-foreground/80" : "text-muted-foreground",
              )}
            >
              {previewText}
            </span>
          </span>

          <span className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {listTimestamp(c.last_message_at ?? c.created_at)}
            </span>
            {unread && (
              <span
                className={cn(
                  "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                  // A muted conversation still counts, but quietly — a badge you
                  // cannot silence is a badge you learn to ignore.
                  c.muted
                    ? "bg-muted text-muted-foreground"
                    : "bg-accent text-accent-foreground",
                )}
              >
                {c.unread_count > 99 ? "99+" : c.unread_count}
              </span>
            )}
          </span>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        {/*
         * Only offered where it can do something: a conversation with no
         * messages has no marker to rewind, and one that is already unread and
         * not open would just be told what it already knows.
         */}
        {!!c.last_message_at && !unread && !selected && (
          <ContextMenuItem onSelect={() => onMarkUnread(c)}>
            <MailOpen className="mr-2 h-4 w-4" /> Mark as unread
          </ContextMenuItem>
        )}
        <ContextMenuItem onSelect={() => onTogglePin(c)}>
          {c.pinned ? (
            <>
              <PinOff className="mr-2 h-4 w-4" /> Unpin
            </>
          ) : (
            <>
              <Pin className="mr-2 h-4 w-4" /> Pin to top
            </>
          )}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onToggleMute(c)}>
          {c.muted ? (
            <>
              <Bell className="mr-2 h-4 w-4" /> Unmute
            </>
          ) : (
            <>
              <BellOff className="mr-2 h-4 w-4" /> Mute
            </>
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
