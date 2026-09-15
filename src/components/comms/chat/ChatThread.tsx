import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  Bell,
  BellOff,
  ChevronUp,
  Info,
  Loader2,
  LogOut,
  MessageSquare,
  MoreVertical,
  Pin,
  PinOff,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { CommsEmpty } from "@/components/comms/CommsShell";
import { useAuth } from "@/contexts/AuthContext";
import { GroupAvatar, PersonAvatar } from "./PersonAvatar";
import { Composer } from "./Composer";
import { ForwardDialog } from "./ForwardDialog";
import { MessageBubble, type DeliveryState } from "./MessageBubble";
import { ObjectiveSuggestion } from "./ObjectiveSuggestion";
import { useMessageSuggestions } from "@/hooks/comms/useMessageSuggestions";
import { TypingDots } from "./TypingDots";
import { continuesFrom, crossesDay, dayLabel, messageTime, preview } from "@/lib/comms/format";
import { displayName, initials, usePeople, type PersonMap } from "@/hooks/comms/usePeople";
import {
  useMessages,
  useMessageSearch,
  usePins,
  useTypingIndicator,
  type ChatMessage,
} from "@/hooks/comms/useMessages";
import { useConversationMembers } from "@/hooks/comms/useConversations";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { DURATION, EASE_OUT_EXPO, transition } from "@/lib/motion";
import type { ConversationListItem } from "@/hooks/comms/useConversations";

/**
 * The middle pane: one conversation, open.
 *
 * Scroll behaviour is the part worth reading twice. A chat has two scroll
 * anchors that fight each other — "stay pinned to the newest message" and "stay
 * where I am while older messages load in above me" — and getting either wrong
 * is immediately, viscerally broken. So: the pane sticks to the bottom only
 * when the reader was already near the bottom, and when a page of older
 * messages is prepended it restores the previous scroll height difference in a
 * layout effect, before the browser paints.
 *
 * Three things follow from that rule, and each is here because leaving it out
 * is what makes a chat feel unfinished next to the ones a student already uses:
 *
 * - **A "new messages" line.** The read marker is captured once, when the
 *   conversation opens, *before* the page marks it read — otherwise the marker
 *   would move to the bottom in the same tick and the divider could never
 *   appear. It is the only way to come back to a busy group and know where you
 *   stopped.
 * - **A jump-to-latest pill.** Not sticking the view to the bottom while
 *   someone is reading history is correct; leaving them with no signal that
 *   anything arrived is not. The pill counts what landed while they were away
 *   from the bottom and takes them there.
 * - **Older messages load on scroll.** The button stays, because it is the
 *   keyboard- and screen-reader-reachable path and because it is the fallback
 *   when a fetch fails, but reaching the top of the list is itself the request.
 *
 * The rest of the header — search, pinned banner, the overflow menu — exists
 * because a conversation you cannot search or pin inside is a conversation you
 * have to scroll to use.
 */
export function ChatThread({
  conversation,
  listPeople,
  onBack,
  onOpenDetails,
  showBackButton,
  jumpToMessageId,
  onJumpHandled,
  onTogglePin,
  onToggleMute,
  onLeave,
}: {
  conversation: ConversationListItem;
  /** People already resolved by the list, so the header renders instantly. */
  listPeople: PersonMap;
  onBack: () => void;
  /** Omit where there is no details surface; the button is then not rendered. */
  onOpenDetails?: () => void;
  showBackButton: boolean;
  jumpToMessageId?: string | null;
  onJumpHandled?: () => void;
  /** Conversation-level actions, surfaced in the header's overflow menu. */
  onTogglePin?: () => void;
  onToggleMute?: () => void;
  onLeave?: () => void;
}) {
  const {
    messages,
    referencedUserIds,
    isLoading,
    hasOlder,
    isLoadingOlder,
    loadOlder,
    send,
    edit,
    remove,
    toggleReaction,
  } = useMessages(conversation.id);
  const { members, memberIds } = useConversationMembers(conversation.id);
  const { pins, pinnedIds, toggle: togglePinnedMessage } = usePins(conversation.id);
  const { typingIds, onlineIds, notifyTyping } = useTypingIndicator(conversation.id);
  const reduced = useReducedMotion();

  const { people: threadPeople } = usePeople([
    ...referencedUserIds,
    ...memberIds,
    conversation.other_user_id,
  ]);
  const people = useMemo<PersonMap>(
    () => ({ ...listPeople, ...threadPeople }),
    [listPeople, threadPeople],
  );

  const { user } = useAuth();
  const currentUserId = user?.id;

  /**
   * The header stack, as people rather than as URLs.
   *
   * Every field is real: membership comes from `conversation_members`, names
   * and photos from the directory RPC, `online` from this conversation's
   * presence channel and `typing` from its broadcast channel. Someone the
   * directory has not resolved yet still appears — as initials from the
   * fallback name — rather than being dropped from a count of who is here.
   */
  const participants = useMemo(
    () =>
      memberIds.map((id) => {
        const person = people[id];
        return {
          id,
          name: displayName(person),
          avatarUrl: person?.avatar_url ?? null,
          initials: initials(person),
          online: onlineIds.includes(id),
          typing: typingIds.includes(id),
          isYou: id === currentUserId,
        };
      }),
    [memberIds, people, onlineIds, typingIds, currentUserId],
  );

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [pinIndex, setPinIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const prevHeightRef = useRef(0);
  const prevCountRef = useRef(0);
  const newestIdRef = useRef<string | null>(null);

  const search = useMessageSearch(conversation.id, searchOpen ? term : "");

  /** How many messages arrived while the reader was scrolled away from the bottom. */
  const [unseen, setUnseen] = useState(0);
  /** Mirrors `nearBottomRef` into render, so the jump pill can appear at all. */
  const [atBottom, setAtBottom] = useState(true);

  /**
   * Where the "new messages" line goes.
   *
   * Captured once per conversation and then left alone. The page marks the
   * conversation read the moment it opens, so reading `last_read_at` live would
   * always resolve to "everything is read" and the divider would never render.
   */
  const openedAtRef = useRef<string | null>(null);
  if (openedAtRef.current === null) {
    openedAtRef.current = conversation.last_read_at ?? "";
  }
  const firstUnreadId = useMemo(() => {
    const mark = openedAtRef.current;
    if (!mark) return null;
    const cutoff = new Date(mark).getTime();
    if (Number.isNaN(cutoff)) return null;
    const found = messages.find(
      (m) => m.sender_id !== currentUserId && new Date(m.created_at).getTime() > cutoff,
    );
    return found?.id ?? null;
  }, [messages, currentUserId]);

  const byId = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  /**
   * Everyone else's read high-water mark, newest first.
   *
   * This is what makes the ticks real rather than decorative: the schema
   * already stores `last_read_at` per member for unread counting, so "has this
   * been read" is a comparison, not a new table. `others[0]` is the most recent
   * reader and `others[others.length - 1]` the least — so a message is read by
   * *everyone* once it is older than the laggard's mark.
   */
  const otherReadMarks = useMemo(
    () =>
      members
        .filter((m) => m.user_id !== currentUserId)
        .map((m) => (m.last_read_at ? new Date(m.last_read_at).getTime() : 0))
        .sort((a, b) => b - a),
    [members, currentUserId],
  );

  const deliveryFor = useCallback(
    (m: ChatMessage): DeliveryState | undefined => {
      if (m.sender_id !== currentUserId) return undefined;
      if (m.failed) return "failed";
      if (m.pending) return "sending";
      if (otherReadMarks.length === 0) return "sent";
      const at = new Date(m.created_at).getTime();
      return otherReadMarks[otherReadMarks.length - 1] >= at ? "read" : "sent";
    },
    [currentUserId, otherReadMarks],
  );

  const readCountFor = useCallback(
    (m: ChatMessage) => {
      const at = new Date(m.created_at).getTime();
      return otherReadMarks.filter((mark) => mark >= at).length;
    },
    [otherReadMarks],
  );

  // Track how close to the bottom the reader is, so an arriving message only
  // yanks the view down when they were already reading the newest.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    nearBottomRef.current = near;
    setAtBottom(near);
    if (near) setUnseen(0);
    // Reaching the top *is* the request for the previous page. The button below
    // stays for keyboards, screen readers, and for retrying a failed fetch.
    if (el.scrollTop < 160 && hasOlder && !isLoadingOlder) void loadOlder();
  };

  const jumpToLatest = () => {
    nearBottomRef.current = true;
    setAtBottom(true);
    setUnseen(0);
    bottomRef.current?.scrollIntoView({
      block: "end",
      behavior: reduced ? "auto" : "smooth",
    });
  };

  /**
   * Scroll to a message and flash it.
   *
   * The highlight is not decoration: after a jump out of search or the pinned
   * banner, the thread looks identical to any other position in the thread, and
   * without a marker the reader has to re-find the line they asked for.
   */
  const jumpTo = useCallback(
    (id: string) => {
      const el = document.getElementById(`message-${id}`);
      if (!el) {
        toast.info("That message is further back — loading earlier messages.");
        if (hasOlder) void loadOlder();
        return;
      }
      el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      setHighlighted(id);
      window.setTimeout(() => setHighlighted((v) => (v === id ? null : v)), 1800);
    },
    [hasOlder, loadOlder, reduced],
  );

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grewAtTop = messages.length > prevCountRef.current && !nearBottomRef.current;
    if (grewAtTop && prevHeightRef.current) {
      // Older page prepended: hold the reader's position rather than letting the
      // new content push their place off screen.
      el.scrollTop += el.scrollHeight - prevHeightRef.current;
    }
    prevHeightRef.current = el.scrollHeight;
    prevCountRef.current = messages.length;
  }, [messages]);

  /**
   * React to the newest message changing — not to the count changing, which a
   * page of *older* messages also does and which would otherwise be counted as
   * something new to go and read.
   */
  useEffect(() => {
    const newest = messages[messages.length - 1];
    if (!newest || newest.id === newestIdRef.current) return;
    const isFirstPaint = newestIdRef.current === null;
    newestIdRef.current = newest.id;

    if (nearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
      return;
    }
    // Your own message never counts against you: sending scrolls you to the
    // bottom anyway, and a badge for a line you just wrote is noise.
    if (!isFirstPaint && newest.sender_id !== currentUserId) {
      setUnseen((n) => n + 1);
    }
  }, [messages, currentUserId]);

  // Opening a different conversation always starts at the newest message.
  useEffect(() => {
    nearBottomRef.current = true;
    prevHeightRef.current = 0;
    prevCountRef.current = 0;
    newestIdRef.current = null;
    openedAtRef.current = conversation.last_read_at ?? "";
    setAtBottom(true);
    setUnseen(0);
    setReplyTo(null);
    setSearchOpen(false);
    setTerm("");
    setPinIndex(0);
    // `last_read_at` is deliberately not a dependency: it moves to "now" the
    // instant the page marks this conversation read, and re-running then would
    // erase the divider the user opened the conversation to find.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    if (!jumpToMessageId) return;
    jumpTo(jumpToMessageId);
    onJumpHandled?.();
  }, [jumpToMessageId, messages.length, onJumpHandled, jumpTo]);

  const title =
    conversation.kind === "dm"
      ? displayName(
          conversation.other_user_id ? people[conversation.other_user_id] : undefined,
        )
      : (conversation.title ?? "Untitled");

  const subtitle = (() => {
    if (typingIds.length > 0) {
      const names = typingIds.map((id) => displayName(people[id]).split(" ")[0]);
      return names.length === 1
        ? `${names[0]} is typing…`
        : `${names.slice(0, 2).join(" and ")} are typing…`;
    }
    if (conversation.kind === "dm") {
      return conversation.other_user_id && onlineIds.includes(conversation.other_user_id)
        ? "Online now"
        : "Direct message";
    }
    const online = memberIds.filter((id) => id !== currentUserId && onlineIds.includes(id));
    const base = `${conversation.member_count} member${conversation.member_count === 1 ? "" : "s"}`;
    return online.length > 0 ? `${base} · ${online.length} online` : base;
  })();

  /** The pinned messages that are actually loaded, newest pin first. */
  // Detected objectives for the messages currently on screen. These are rows
  // `extract-objectives` already wrote, read back so the decision can be made
  // under the sentence that caused it rather than only in the Detected inbox.
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { byMessageId: suggestionsByMessage } = useMessageSuggestions(
    conversation?.id,
    messageIds,
  );

  const pinnedMessages = useMemo(
    () => pins.map((p) => byId.get(p.message_id)).filter((m): m is ChatMessage => !!m),
    [pins, byId],
  );
  const shownPin = pinnedMessages[pinIndex % Math.max(pinnedMessages.length, 1)];

  return (
    <div className="flex h-full min-h-0 flex-col bg-chat-canvas">
      {/* Header ------------------------------------------------------------ */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border/60 bg-card/90 px-3 py-3 backdrop-blur-md sm:px-5 sm:py-3.5">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to chats"
            className="-ml-1 h-9 w-9 shrink-0 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <button
          type="button"
          onClick={onOpenDetails}
          disabled={!onOpenDetails}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 text-left transition-colors enabled:hover:bg-muted/60 disabled:cursor-default"
        >
          {conversation.kind === "dm" ? (
            <PersonAvatar
              person={
                conversation.other_user_id ? people[conversation.other_user_id] : undefined
              }
              size="md"
              online={
                conversation.other_user_id
                  ? onlineIds.includes(conversation.other_user_id)
                  : undefined
              }
            />
          ) : (
            <GroupAvatar title={title} accentName={conversation.accent} imagePath={conversation.image_path} size="md" />
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[0.975rem] font-semibold tracking-tight text-foreground">
                {title}
              </span>
              {conversation.pinned && (
                <Pin className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Pinned" />
              )}
              {conversation.muted && (
                <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Muted" />
              )}
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 truncate text-xs",
                typingIds.length > 0 ? "text-accent" : "text-muted-foreground",
              )}
            >
              {typingIds.length > 0 && <TypingDots />}
              {subtitle}
            </span>
          </span>
        </button>

        {/*
         * Who is in here, at the far end of the header.
         *
         * The stack is the hover target: resting, it is the same cluster of
         * faces it always was; under the pointer — or under focus, or a tap —
         * it opens onto the full membership with who is connected and who is
         * typing, and a way through to the details pane.
         */}
        {conversation.kind !== "dm" && participants.length > 0 && (
          <ChatBubble
            className="hidden lg:inline-flex"
            participants={participants}
            title={title}
            actionLabel={onOpenDetails ? "Conversation details" : undefined}
            onAction={onOpenDetails}
            actionHint={onOpenDetails ? "Members, shared files and pinned messages." : undefined}
          />
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSearchOpen((v) => !v);
            setTerm("");
          }}
          aria-label={searchOpen ? "Close search" : "Search in this conversation"}
          aria-pressed={searchOpen}
          className={cn(
            "h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
            searchOpen && "bg-accent/10 text-accent",
          )}
        >
          <Search className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Conversation options"
              className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {onOpenDetails && (
              <DropdownMenuItem onSelect={onOpenDetails}>
                <Info className="mr-2 h-4 w-4" />
                {conversation.kind === "dm" ? "Contact info" : "Group info"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                setSearchOpen(true);
                setTerm("");
              }}
            >
              <Search className="mr-2 h-4 w-4" /> Search in conversation
            </DropdownMenuItem>
            {onTogglePin && (
              <DropdownMenuItem onSelect={onTogglePin}>
                {conversation.pinned ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" /> Unpin chat
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" /> Pin chat
                  </>
                )}
              </DropdownMenuItem>
            )}
            {onToggleMute && (
              <DropdownMenuItem onSelect={onToggleMute}>
                {conversation.muted ? (
                  <>
                    <Bell className="mr-2 h-4 w-4" /> Unmute
                  </>
                ) : (
                  <>
                    <BellOff className="mr-2 h-4 w-4" /> Mute notifications
                  </>
                )}
              </DropdownMenuItem>
            )}
            {onLeave && conversation.kind === "group" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={onLeave}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Leave group
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Search ------------------------------------------------------------ */}
      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.div
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition.base}
            className="shrink-0 overflow-hidden border-b border-border/60 bg-card/80 backdrop-blur"
          >
            <div className="p-3 sm:px-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
                  placeholder={`Search in ${title}`}
                  aria-label="Search in this conversation"
                  className="h-10 rounded-full border-transparent bg-muted/60 pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {term.trim().length > 0 && (
                <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-card">
                  {search.tooShort ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground">
                      Type at least two characters.
                    </p>
                  ) : search.isSearching ? (
                    <p className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                    </p>
                  ) : search.isEmpty ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground">
                      No message in this conversation contains “{term.trim()}”.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {search.results.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => jumpTo(r.id)}
                            className="flex w-full items-baseline gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                          >
                            <span className="shrink-0 text-[0.6875rem] font-semibold text-accent">
                              {r.sender_id === currentUserId
                                ? "You"
                                : displayName(people[r.sender_id]).split(" ")[0]}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                              {preview(r.body, 90)}
                            </span>
                            <span className="shrink-0 text-[0.625rem] tabular-nums text-muted-foreground">
                              {messageTime(r.created_at)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned banner ------------------------------------------------------ */}
      <AnimatePresence initial={false}>
        {shownPin && !searchOpen && (
          <motion.div
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition.base}
            className="shrink-0 overflow-hidden border-b border-border/60 bg-accent/[0.06]"
          >
            <div className="flex items-center gap-2.5 px-3 py-2 sm:px-5">
              <Pin className="h-3.5 w-3.5 shrink-0 text-accent" />
              <button
                type="button"
                onClick={() => jumpTo(shownPin.id)}
                className="min-w-0 flex-1 truncate text-left text-xs text-foreground/85 hover:underline"
              >
                <span className="font-semibold">
                  {shownPin.sender_id === currentUserId
                    ? "You"
                    : displayName(people[shownPin.sender_id]).split(" ")[0]}
                  :
                </span>{" "}
                {preview(shownPin.body, 90) || "Attachment"}
              </button>
              {pinnedMessages.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPinIndex((i) => (i + 1) % pinnedMessages.length)}
                  className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-[0.625rem] font-semibold tabular-nums text-muted-foreground transition-colors hover:text-foreground"
                >
                  {(pinIndex % pinnedMessages.length) + 1}/{pinnedMessages.length}
                </button>
              )}
              <button
                type="button"
                onClick={() => togglePinnedMessage.mutate(shownPin.id)}
                aria-label="Unpin this message"
                className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <PinOff className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages ---------------------------------------------------------- */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-6 sm:px-7 lg:px-10"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <CommsEmpty
              icon={MessageSquare}
              title="No messages yet"
              description={
                conversation.kind === "dm"
                  ? `Say hello to ${title.split(" ")[0]}.`
                  : "Start the conversation — everyone in this group will see it."
              }
            />
          ) : (
            <>
              {hasOlder && (
                <div className="mb-5 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadOlder()}
                    disabled={isLoadingOlder}
                    className="rounded-full"
                  >
                    {isLoadingOlder ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ChevronUp className="mr-2 h-3.5 w-3.5" />
                    )}
                    Load earlier messages
                  </Button>
                </div>
              )}

              <div className="mx-auto w-full max-w-[62rem]">
                {messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const next = messages[i + 1];
                  const newDay = crossesDay(prev?.created_at, m.created_at);
                  const startsRun = newDay || !continuesFrom(prev, m);
                  const endsRun = !next || !continuesFrom(m, next) || crossesDay(m.created_at, next.created_at);
                  return (
                    <div
                      key={m.id}
                      // A new turn gets air; a continuation stays tight to the
                      // line above it. That single rule is most of what makes a
                      // thread readable at a glance.
                      className={startsRun && i > 0 ? "mt-4" : "mt-0.5"}
                    >
                      {m.id === firstUnreadId && (
                        <Divider tone="accent" label="Unread messages" />
                      )}
                      {newDay && <Divider label={dayLabel(m.created_at)} />}
                      <MessageBubble
                        message={m}
                        people={people}
                        isOwn={m.sender_id === currentUserId}
                        showAuthor={startsRun && conversation.kind !== "dm"}
                        isRunEnd={endsRun}
                        replyTo={m.reply_to_id ? byId.get(m.reply_to_id) : undefined}
                        isPinned={pinnedIds.has(m.id)}
                        canPin={conversation.kind !== "dm"}
                        delivery={deliveryFor(m)}
                        readByCount={readCountFor(m)}
                        memberCount={conversation.member_count}
                        currentUserId={currentUserId}
                        highlighted={highlighted === m.id}
                        onReply={setReplyTo}
                        onForward={setForwarding}
                        onJumpToMessage={jumpTo}
                        onEdit={(id, body) =>
                          edit.mutate(
                            { id, body },
                            { onError: () => toast.error("Could not save that edit.") },
                          )
                        }
                        onDelete={setPendingDelete}
                        onTogglePin={(id) => togglePinnedMessage.mutate(id)}
                        onToggleReaction={(messageId, emoji) =>
                          toggleReaction.mutate({ messageId, emoji })
                        }
                      />

                      {(suggestionsByMessage.get(m.id) ?? []).map((o) => (
                        <ObjectiveSuggestion
                          key={o.id}
                          objective={o}
                          people={people}
                          currentUserId={currentUserId}
                          className={m.sender_id === currentUserId
                            ? "ml-auto mt-1.5 max-w-[min(34rem,85%)]"
                            : "mt-1.5 max-w-[min(34rem,85%)] sm:ml-11"}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Someone is mid-sentence: show it where the message will land,
                  not only in the header, which is where the eye already is. */}
              <AnimatePresence>
                {typingIds.length > 0 && (
                  <motion.div
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={transition.base}
                    className="mx-auto mt-4 flex w-full max-w-[62rem] items-end gap-2.5 px-1"
                  >
                    <PersonAvatar person={people[typingIds[0]]} size="sm" />
                    <span className="rounded-[1.35rem] rounded-bl-md border border-border/60 bg-card px-4 py-3">
                      <TypingDots />
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={bottomRef} className="h-1" />
            </>
          )}
        </div>

        {/*
         * Jump to latest. Shown whenever the reader is away from the bottom, so
         * it is also just a "back to now" control, and labelled with a count
         * when something actually arrived while they were up there.
         */}
        <AnimatePresence>
          {!atBottom && messages.length > 0 && (
            <motion.button
              type="button"
              onClick={jumpToLatest}
              initial={reduced ? false : { opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              transition={transition.spring}
              className={cn(
                "absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-lg",
                unseen > 0
                  ? "border-transparent bg-accent text-accent-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              <ArrowDown className="h-3.5 w-3.5" />
              {unseen > 0
                ? `${unseen > 99 ? "99+" : unseen} new message${unseen === 1 ? "" : "s"}`
                : "Jump to latest"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Composer ---------------------------------------------------------- */}
      <Composer
        members={memberIds}
        people={people}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        isSending={send.isPending}
        onTyping={notifyTyping}
        placeholder={
          conversation.kind === "dm"
            ? `Message ${title.split(" ")[0]}…`
            : `Message ${title}…`
        }
        onSend={(payload) => {
          nearBottomRef.current = true;
          send.mutate(
            {
              body: payload.body,
              mentions: payload.mentions,
              files: payload.files,
              replyToId: payload.replyToId,
              poll: payload.poll,
            },
            {
              onError: (e) =>
                toast.error(
                  e instanceof Error ? e.message : "Message could not be sent.",
                ),
            },
          );
        }}
      />

      <ForwardDialog
        message={forwarding}
        fromConversationId={conversation.id}
        onClose={() => setForwarding(null)}
      />

      {/* Delete confirmation ----------------------------------------------- */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be replaced with “This message was deleted” for everyone in
              this conversation. Replies to it stay where they are. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep message</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) {
                  remove.mutate(pendingDelete.id, {
                    onError: () => toast.error("Could not delete that message."),
                  });
                }
                setPendingDelete(null);
              }}
            >
              Delete message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** A day break or the unread mark: a centred pill on a hairline. */
function Divider({ label, tone }: { label: string; tone?: "accent" }) {
  return (
    <div className="my-5 flex items-center gap-3" aria-label={label}>
      <span className={cn("h-px flex-1", tone === "accent" ? "bg-accent/40" : "bg-border")} />
      <motion.span
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
        className={cn(
          "rounded-full px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.1em] shadow-sm",
          tone === "accent"
            ? "bg-accent text-accent-foreground"
            : "border border-border bg-card text-muted-foreground",
        )}
      >
        {label}
      </motion.span>
      <span className={cn("h-px flex-1", tone === "accent" ? "bg-accent/40" : "bg-border")} />
    </div>
  );
}
