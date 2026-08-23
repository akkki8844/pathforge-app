import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ChevronUp, Info, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { MessageBubble } from "./MessageBubble";
import { TypingDots } from "./TypingDots";
import { continuesFrom, crossesDay, dayLabel } from "@/lib/comms/format";
import { displayName, usePeople, type PersonMap } from "@/hooks/comms/usePeople";
import {
  useMessages,
  usePins,
  useTypingIndicator,
  type ChatMessage,
} from "@/hooks/comms/useMessages";
import { useConversationMembers } from "@/hooks/comms/useConversations";
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
 */
export function ChatThread({
  conversation,
  listPeople,
  onBack,
  onOpenDetails,
  showBackButton,
  jumpToMessageId,
  onJumpHandled,
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
  const { memberIds } = useConversationMembers(conversation.id);
  const { pinnedIds, toggle: togglePin } = usePins(conversation.id);
  const { typingIds, onlineIds, notifyTyping } = useTypingIndicator(conversation.id);

  const { people: threadPeople } = usePeople([
    ...referencedUserIds,
    ...memberIds,
    conversation.other_user_id,
  ]);
  const people = useMemo<PersonMap>(
    () => ({ ...listPeople, ...threadPeople }),
    [listPeople, threadPeople],
  );

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const prevHeightRef = useRef(0);
  const prevCountRef = useRef(0);
  const newestIdRef = useRef<string | null>(null);
  const { user } = useAuth();
  const currentUserId = user?.id;

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
      (m) =>
        m.sender_id !== currentUserId && new Date(m.created_at).getTime() > cutoff,
    );
    return found?.id ?? null;
  }, [messages, currentUserId]);

  const byId = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

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
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  };

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
    // `last_read_at` is deliberately not a dependency: it moves to "now" the
    // instant the page marks this conversation read, and re-running then would
    // erase the divider the user opened the conversation to find.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    if (!jumpToMessageId) return;
    const el = document.getElementById(`message-${jumpToMessageId}`);
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      onJumpHandled?.();
    }
  }, [jumpToMessageId, messages.length, onJumpHandled]);

  const title =
    conversation.kind === "dm"
      ? displayName(
          conversation.other_user_id ? people[conversation.other_user_id] : undefined,
        )
      : conversation.title ?? "Untitled";

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
    return `${conversation.member_count} member${conversation.member_count === 1 ? "" : "s"}`;
  })();

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header ------------------------------------------------------------ */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border/70 bg-card/80 px-4 py-3 backdrop-blur-sm">
        {showBackButton && (
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-1.5 shrink-0">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Chats
          </Button>
        )}
        {conversation.kind === "dm" ? (
          <PersonAvatar
            person={conversation.other_user_id ? people[conversation.other_user_id] : undefined}
            size="md"
            online={
              conversation.other_user_id
                ? onlineIds.includes(conversation.other_user_id)
                : undefined
            }
          />
        ) : (
          <GroupAvatar title={title} accentName={conversation.accent} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.95rem] font-semibold tracking-tight text-foreground">{title}</p>
          <p
            className={cn(
              "flex items-center gap-1.5 truncate text-xs",
              typingIds.length > 0 ? "text-accent" : "text-muted-foreground",
            )}
          >
            {typingIds.length > 0 && <TypingDots />}
            {subtitle}
          </p>
        </div>
        {onOpenDetails && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenDetails}
            aria-label="Conversation details"
            className="shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Info className="h-4 w-4" />
          </Button>
        )}
      </header>

      {/* Messages ---------------------------------------------------------- */}
      <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-4"
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
                ? `Say hello to ${title}.`
                : "Start the conversation — everyone in this group will see it."
            }
          />
        ) : (
          <>
            {hasOlder && (
              <div className="mb-3 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadOlder()}
                  disabled={isLoadingOlder}
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

            <div className="space-y-1.5">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const newDay = crossesDay(prev?.created_at, m.created_at);
                return (
                  <div key={m.id}>
                    {m.id === firstUnreadId && (
                      <div className="my-4 flex items-center gap-3" aria-label="New messages">
                        <span className="h-px flex-1 bg-accent/50" />
                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                          New
                        </span>
                        <span className="h-px flex-1 bg-accent/50" />
                      </div>
                    )}
                    {newDay && (
                      <div className="my-4 flex items-center gap-3">
                        <span className="h-px flex-1 bg-border" />
                        <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {dayLabel(m.created_at)}
                        </span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    <MessageBubble
                      message={m}
                      people={people}
                      isOwn={m.sender_id === currentUserId}
                      showAuthor={newDay || !continuesFrom(prev, m)}
                      replyTo={m.reply_to_id ? byId.get(m.reply_to_id) : undefined}
                      isPinned={pinnedIds.has(m.id)}
                      canPin={conversation.kind !== "dm"}
                      currentUserId={currentUserId}
                      onReply={setReplyTo}
                      onEdit={(id, body) =>
                        edit.mutate(
                          { id, body },
                          { onError: () => toast.error("Could not save that edit.") },
                        )
                      }
                      onDelete={setPendingDelete}
                      onTogglePin={(id) => togglePin.mutate(id)}
                      onToggleReaction={(messageId, emoji) =>
                        toggleReaction.mutate({ messageId, emoji })
                      }
                    />
                  </div>
                );
              })}
            </div>
            <div ref={bottomRef} />
          </>
        )}
      </div>

        {/*
         * Jump to latest. Shown whenever the reader is away from the bottom, so
         * it is also just a "back to now" control, and labelled with a count
         * when something actually arrived while they were up there.
         */}
        {!atBottom && messages.length > 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-md transition-colors hover:bg-muted"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            {unseen > 0
              ? `${unseen > 99 ? "99+" : unseen} new message${unseen === 1 ? "" : "s"}`
              : "Jump to latest"}
          </button>
        )}
      </div>

      {/* Composer ---------------------------------------------------------- */}
      <Composer
        members={memberIds}
        people={people}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        isSending={send.isPending}
        onTyping={notifyTyping}
        placeholder={`Message ${title.split(" ")[0]}…`}
        onSend={(payload) => {
          nearBottomRef.current = true;
          send.mutate(
            {
              body: payload.body,
              mentions: payload.mentions,
              files: payload.files,
              replyToId: payload.replyToId,
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
