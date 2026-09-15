import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  BellOff,
  CheckCheck,
  Hash,
  MailOpen,
  Paperclip,
  Pin,
  PinOff,
  Search,
  Users,
  X,
} from "lucide-react";
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
import { transition } from "@/lib/motion";
import type { ConversationListItem } from "@/hooks/comms/useConversations";

type Filter = "all" | "unread" | "groups";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
];

/**
 * The left pane: every conversation the user is in, pinned first.
 *
 * The row was the densest surface in the section and the main reason the page
 * read as congested — nine facts crammed into 44px. It is now the height every
 * messenger settles on (a 48px avatar with real air around it), which costs
 * about one row of scroll and buys a list you can read at a glance instead of
 * one you have to study. The hierarchy is strict: avatar, then name, then who
 * said what, with the timestamp and unread count right-aligned so the eye can
 * scan one column for "is there anything new" without reading any names at all.
 *
 * The filter chips are the other half of the same problem: past about fifteen
 * conversations, "which of these wants something from me" stops being
 * answerable by scrolling, and every messenger grows the same three answers.
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
  header,
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
  /** Rendered above the search field — the pane's own title row. */
  header?: React.ReactNode;
}) {
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const reduced = useReducedMotion();

  const titleFor = (c: ConversationListItem) =>
    c.kind === "dm"
      ? displayName(c.other_user_id ? people[c.other_user_id] : undefined)
      : (c.title ?? "Untitled");

  const unreadTotal = useMemo(
    () => conversations.filter((c) => c.unread_count > 0).length,
    [conversations],
  );

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return conversations
      .filter((c) => {
        if (filter === "unread") return c.unread_count > 0;
        if (filter === "groups") return c.kind !== "dm";
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        const name = titleFor(c).toLowerCase();
        const body = (c.last_message_body ?? "").toLowerCase();
        return name.includes(q) || body.includes(q);
      });
    // `people` participates because a DM's name is resolved from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, term, filter, people]);

  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);

  const rows = (items: ConversationListItem[]) =>
    items.map((c, i) => (
      <motion.div
        key={c.id}
        layout={!reduced}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, scale: 0.98 }}
        transition={{ ...transition.base, delay: reduced ? 0 : Math.min(i * 0.018, 0.18) }}
      >
        <Row
          conversation={c}
          title={titleFor(c)}
          people={people}
          selected={c.id === selectedId}
          onSelect={onSelect}
          onTogglePin={onTogglePin}
          onToggleMute={onToggleMute}
          onMarkUnread={onMarkUnread}
        />
      </motion.div>
    ));

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {header}

      <div className="shrink-0 space-y-2.5 px-3 pb-3 pt-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="h-11 rounded-full border-transparent bg-muted/60 pl-10 pr-9 text-sm focus-visible:border-accent/40 focus-visible:bg-card"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="Filter conversations">
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  on ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {on && (
                  <motion.span
                    layoutId="comms-filter-pill"
                    transition={transition.spring}
                    className="absolute inset-0 rounded-full bg-accent"
                  />
                )}
                <span className="relative">{f.label}</span>
                {f.id === "unread" && unreadTotal > 0 && (
                  <span
                    className={cn(
                      "relative rounded-full px-1.5 text-[0.625rem] tabular-nums",
                      on ? "bg-accent-foreground/20" : "bg-accent/15 text-accent",
                    )}
                  >
                    {unreadTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3.5 rounded-2xl px-3 py-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2.5">
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
            icon={term.trim() ? Search : CheckCheck}
            title={term.trim() ? "Nothing matched" : filter === "unread" ? "All caught up" : "No groups yet"}
            description={
              term.trim()
                ? `No conversation name or recent message contains “${term.trim()}”.`
                : filter === "unread"
                  ? "Every conversation has been read."
                  : "Group and team conversations will show up here."
            }
          />
        ) : (
          <div className="px-2 pb-3">
            <AnimatePresence initial={false}>
              {pinned.length > 0 && (
                <>
                  <SectionLabel key="pinned-label">
                    <Pin className="h-2.5 w-2.5" /> Pinned
                  </SectionLabel>
                  {rows(pinned)}
                  {rest.length > 0 && (
                    <SectionLabel key="all-label">All conversations</SectionLabel>
                  )}
                </>
              )}
              {rows(rest)}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 px-3 pb-1.5 pt-4 font-display text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
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
  const reduced = useReducedMotion();

  const previewText = c.last_message_deleted
    ? "Message deleted"
    : c.last_message_body
      ? preview(c.last_message_body, 64)
      : c.last_message_id
        ? "Attachment"
        : "No messages yet";

  /** "You:" / "Ravi:" in groups — the same prefix every messenger uses. */
  const prefix =
    c.kind !== "dm" && c.last_message_sender_id
      ? `${displayName(sender).split(" ")[0]}: `
      : "";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.button
          type="button"
          onClick={() => onSelect(c.id)}
          aria-current={selected ? "true" : undefined}
          whileTap={reduced ? undefined : { scale: 0.985 }}
          className={cn(
            "relative flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors",
            selected ? "bg-accent/[0.09]" : "hover:bg-muted/60",
          )}
        >
          {/* The selected rail, animated between rows rather than redrawn — it
              reads as one marker moving, which is what tells you the list and
              the thread are the same object. */}
          {selected && (
            <motion.span
              layoutId="comms-selected-rail"
              transition={transition.spring}
              className="absolute inset-y-2 left-0 w-1 rounded-full bg-accent"
            />
          )}

          {c.kind === "dm" ? (
            <PersonAvatar
              person={c.other_user_id ? people[c.other_user_id] : undefined}
              size="lg"
            />
          ) : (
            <GroupAvatar title={title} accentName={c.accent} imagePath={c.image_path} size="lg" />
          )}

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              {c.kind === "team" && (
                <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "truncate text-[0.9375rem] leading-tight",
                  unread ? "font-bold text-foreground" : "font-semibold text-foreground/90",
                )}
              >
                {title}
              </span>
              {c.pinned && (
                <Pin className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Pinned" />
              )}
              {c.muted && (
                <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Muted" />
              )}
            </span>
            <span
              className={cn(
                "mt-1.5 flex items-center gap-1 text-[0.8125rem] leading-tight",
                c.last_message_deleted && "italic",
                unread ? "font-medium text-foreground/75" : "text-muted-foreground",
              )}
            >
              {!c.last_message_body && c.last_message_id && (
                <Paperclip className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">
                {prefix}
                {previewText}
              </span>
            </span>
          </span>

          <span className="flex shrink-0 flex-col items-end gap-1.5 self-start pt-0.5">
            <span
              className={cn(
                "text-[0.6875rem] tabular-nums",
                unread && !c.muted ? "font-semibold text-accent" : "text-muted-foreground",
              )}
            >
              {listTimestamp(c.last_message_at ?? c.created_at)}
            </span>
            {unread ? (
              <motion.span
                initial={reduced ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={transition.spring}
                className={cn(
                  "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-bold tabular-nums",
                  // A muted conversation still counts, but quietly — a badge you
                  // cannot silence is a badge you learn to ignore.
                  c.muted
                    ? "bg-muted text-muted-foreground"
                    : "bg-accent text-accent-foreground",
                )}
              >
                {c.unread_count > 99 ? "99+" : c.unread_count}
              </motion.span>
            ) : (
              <span className="h-5" />
            )}
          </span>
        </motion.button>
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
