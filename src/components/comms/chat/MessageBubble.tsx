import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Copy,
  CornerUpLeft,
  CornerUpRight,
  Download,
  FileText,
  Info,
  Loader2,
  Pencil,
  Pin,
  PinOff,
  SmilePlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PersonAvatar } from "./PersonAvatar";
import { EmojiPicker } from "./EmojiPicker";
import { emojiOnlyCount, fileSize, fullTimestamp, messageTime } from "@/lib/comms/format";
import { QUICK_REACTIONS, type MessageAttachment } from "@/lib/comms/types";
import { displayName, type PersonMap } from "@/hooks/comms/usePeople";
import { useAttachmentUrl, type ChatMessage } from "@/hooks/comms/useMessages";
import { DURATION, EASE_OUT_EXPO, transition } from "@/lib/motion";

/** How far a message has got. Derived by the thread from members' read marks. */
export type DeliveryState = "sending" | "sent" | "read" | "failed";

/**
 * One message.
 *
 * Own messages are accent-tinted and right-aligned; everyone else's are neutral
 * and left-aligned. That is the whole visual language — no per-sender colour
 * wheel, which stops being legible past about four participants and fights the
 * team accents everywhere else in the section.
 *
 * Three conventions borrowed wholesale from the messengers a student already
 * uses, because a chat that does these differently reads as broken rather than
 * as original:
 *
 * - **The timestamp lives inside the bubble**, bottom-right, floated so the
 *   last line of text wraps around it. A separate line underneath doubles the
 *   vertical space every message costs, and in a long thread that is the single
 *   biggest source of the "congested" feeling.
 * - **A bare emoji is not a bubble.** One to three emoji and nothing else
 *   render large and unwrapped, the way they do everywhere else.
 * - **Actions are reachable three ways.** A hover toolbar for pointers, a
 *   right-click / long-press menu for everyone, and a swipe-right-to-reply for
 *   touch. The menu is the accessible baseline; the other two are shortcuts.
 *
 * The menu's contents differ for own versus others' messages, and the
 * difference is not decorative: the `messages` UPDATE policy is
 * `sender_id = auth.uid()`, so an edit or delete offered on someone else's
 * message would fail at the database.
 */
export function MessageBubble({
  message,
  people,
  isOwn,
  showAuthor,
  isRunEnd,
  replyTo,
  isPinned,
  canPin,
  delivery,
  readByCount,
  memberCount,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onTogglePin,
  onToggleReaction,
  onJumpToMessage,
  currentUserId,
  highlighted,
}: {
  message: ChatMessage;
  people: PersonMap;
  isOwn: boolean;
  /** False when this continues a run from the same author. */
  showAuthor: boolean;
  /** True when the next message is from someone else — the tail goes here. */
  isRunEnd: boolean;
  replyTo: ChatMessage | undefined;
  isPinned: boolean;
  canPin: boolean;
  /** Own messages only; undefined suppresses the ticks entirely. */
  delivery?: DeliveryState;
  readByCount?: number;
  memberCount?: number;
  onReply: (m: ChatMessage) => void;
  onEdit: (id: string, body: string) => void;
  onDelete: (m: ChatMessage) => void;
  onForward: (m: ChatMessage) => void;
  onTogglePin: (id: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  /** Jump the thread to the quoted message when its preview is clicked. */
  onJumpToMessage?: (id: string) => void;
  currentUserId: string | undefined;
  /** Set when jumped to from search or the pinned list. */
  highlighted?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [showInfo, setShowInfo] = useState(false);
  const reduced = useReducedMotion();
  const sender = people[message.sender_id];

  const grouped = useMemo(
    () => groupReactions(message, currentUserId),
    [message, currentUserId],
  );

  const deleted = !!message.deleted_at;
  const bigEmoji = !deleted && !editing && emojiOnlyCount(message.body) > 0;
  const hasAttachments = !deleted && message.message_attachments.length > 0;

  const react = (emoji: string) => onToggleReaction(message.id, emoji);

  const quote = replyTo && (
    <button
      type="button"
      disabled={!onJumpToMessage}
      onClick={() => replyTo && onJumpToMessage?.(replyTo.id)}
      className={cn(
        "mb-1.5 block w-full rounded-lg border-l-[3px] px-2.5 py-1.5 text-left text-xs transition-colors",
        isOwn
          ? "border-accent-foreground/50 bg-background/20 text-accent-foreground/85 hover:bg-background/30"
          : "border-accent/60 bg-accent/[0.07] text-muted-foreground hover:bg-accent/[0.12]",
        !onJumpToMessage && "cursor-default",
      )}
    >
      <span className="block font-semibold">
        {replyTo.sender_id === currentUserId
          ? "You"
          : displayName(people[replyTo.sender_id])}
      </span>
      <span className="mt-0.5 line-clamp-2 block">
        {replyTo.deleted_at ? "Message deleted" : replyTo.body || "Attachment"}
      </span>
    </button>
  );

  /**
   * The time and, on your own messages, the ticks.
   *
   * Floated right and given a leading space, so a short last line pulls it up
   * beside the text instead of forcing another line — which is exactly how
   * every messenger fits the timestamp in without costing a row.
   */
  const meta = (
    <span
      className={cn(
        "pointer-events-none float-right ml-2 mt-[0.4rem] flex translate-y-px items-center gap-1 text-[0.625rem] tabular-nums leading-none",
        isOwn ? "text-accent-foreground/65" : "text-muted-foreground/70",
      )}
    >
      {isPinned && <Pin className="h-2.5 w-2.5" aria-label="Pinned" />}
      {message.edited_at && !deleted && <span>edited</span>}
      {messageTime(message.created_at)}
      {isOwn && !deleted && <DeliveryTicks state={delivery} />}
    </span>
  );

  const bubbleBody = (
    <>
      {quote}

      {deleted ? (
        <p className="text-sm italic opacity-70">
          This message was deleted{meta}
        </p>
      ) : editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
                setDraft(message.body);
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim() && draft.trim() !== message.body) {
                  onEdit(message.id, draft);
                }
                setEditing(false);
              }
            }}
            rows={3}
            maxLength={8000}
            autoFocus
            className="text-sm text-foreground"
            aria-label="Edit message"
          />
          <div className="flex items-center justify-end gap-2">
            <span className="mr-auto text-[0.625rem] text-muted-foreground">
              Enter to save · Esc to cancel
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setDraft(message.body);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!draft.trim() || draft.trim() === message.body}
              onClick={() => {
                onEdit(message.id, draft);
                setEditing(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          {hasAttachments && (
            <div className={cn("space-y-1.5", message.body && "mb-2")}>
              {message.message_attachments.map((a) => (
                <Attachment key={a.id} attachment={a} onOwnBubble={isOwn} />
              ))}
            </div>
          )}
          {message.body ? (
            <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-[1.55]">
              <MentionText
                body={message.body}
                mentions={message.mentions}
                people={people}
                onOwnBubble={isOwn}
              />
              {meta}
            </p>
          ) : (
            <p className="text-right">{meta}</p>
          )}
        </>
      )}
    </>
  );

  /** Reply, react and the overflow menu — pointer devices only. */
  const hoverTools = !deleted && !editing && (
    <div
      className={cn(
        "pointer-events-none absolute top-1 z-10 hidden items-center gap-0.5 rounded-full border border-border bg-popover/95 p-0.5 opacity-0 shadow-md backdrop-blur transition-opacity duration-150 group-hover/msg:pointer-events-auto group-hover/msg:opacity-100 group-focus-within/msg:pointer-events-auto group-focus-within/msg:opacity-100 md:flex",
        isOwn ? "left-0 -translate-x-[calc(100%+0.5rem)]" : "right-0 translate-x-[calc(100%+0.5rem)]",
      )}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="React to this message"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align={isOwn ? "end" : "start"}
          className="w-auto p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <QuickReactionRow onPick={react} />
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={() => onReply(message)}
        aria-label="Reply to this message"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <CornerUpLeft className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onForward(message)}
        aria-label="Forward this message"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <CornerUpRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <motion.div
      id={`message-${message.id}`}
      layout={reduced ? false : "position"}
      initial={reduced ? false : { opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
      // Swipe right to reply, the touch gesture every messenger uses. Snaps
      // back either way; crossing the threshold is what opens the reply.
      drag={reduced || deleted ? false : "x"}
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.32 }}
      dragSnapToOrigin
      onDragEnd={(_, info) => {
        if (info.offset.x > 56) onReply(message);
      }}
      onDoubleClick={() => !deleted && onReply(message)}
      className={cn(
        "group/msg relative flex gap-2.5 px-1",
        isOwn ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* The avatar sits at the *end* of a run, next to the last thing said —
          the same anchoring WhatsApp and iMessage use, and the reason a run of
          six messages reads as one turn rather than six. */}
      <span className="w-9 shrink-0 self-end">
        {!isOwn && isRunEnd && <PersonAvatar person={sender} size="sm" />}
      </span>

      <div
        className={cn(
          "flex min-w-0 max-w-[min(640px,78%)] flex-col",
          isOwn && "items-end",
        )}
      >
        {showAuthor && !isOwn && (
          <span className="mb-1 px-1.5 text-xs font-semibold text-accent">
            {displayName(sender)}
          </span>
        )}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                "relative w-fit max-w-full transition-shadow",
                highlighted && "rounded-2xl ring-2 ring-warning ring-offset-2 ring-offset-background",
              )}
            >
              {hoverTools}

              {bigEmoji ? (
                <div
                  className={cn(
                    "px-1 py-0.5 leading-none",
                    emojiOnlyCount(message.body) === 1 ? "text-[3.25rem]" : "text-[2.5rem]",
                    isOwn ? "text-right" : "text-left",
                  )}
                >
                  {quote && <div className="mb-1.5 text-sm">{quote}</div>}
                  <span>{message.body}</span>
                  <span
                    className={cn(
                      "mt-1 flex items-center gap-1 text-[0.625rem] tabular-nums text-muted-foreground/70",
                      isOwn && "justify-end",
                    )}
                  >
                    {messageTime(message.created_at)}
                    {isOwn && <DeliveryTicks state={delivery} />}
                  </span>
                </div>
              ) : (
                <div
                  className={cn(
                    "overflow-hidden rounded-[1.35rem] border px-3.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)]",
                    isOwn
                      ? "border-transparent bg-accent text-accent-foreground"
                      : "border-border/60 bg-card text-foreground",
                    // The tail: the corner nearest the speaker is squared off on
                    // the last bubble of a run, so a run reads as one shape.
                    isRunEnd && (isOwn ? "rounded-br-md" : "rounded-bl-md"),
                    message.pending && "opacity-60",
                    message.failed && "border-destructive ring-1 ring-destructive/40",
                  )}
                >
                  {bubbleBody}
                </div>
              )}
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-56">
            <div className="px-1 pb-1 pt-0.5">
              <QuickReactionRow onPick={react} compact />
            </div>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => onReply(message)} disabled={deleted}>
              <CornerUpLeft className="mr-2 h-4 w-4" /> Reply
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onForward(message)} disabled={deleted}>
              <CornerUpRight className="mr-2 h-4 w-4" /> Forward
            </ContextMenuItem>
            <ContextMenuItem
              disabled={deleted || !message.body}
              onSelect={() => {
                void navigator.clipboard.writeText(message.body);
                toast.success("Copied");
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy text
            </ContextMenuItem>
            {canPin && (
              <ContextMenuItem onSelect={() => onTogglePin(message.id)} disabled={deleted}>
                {isPinned ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" /> Unpin
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" /> Pin message
                  </>
                )}
              </ContextMenuItem>
            )}
            <ContextMenuItem onSelect={() => setShowInfo((v) => !v)}>
              <Info className="mr-2 h-4 w-4" /> {showInfo ? "Hide info" : "Message info"}
            </ContextMenuItem>
            {isOwn && !deleted && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={() => setEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </ContextMenuItem>
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDelete(message)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete for everyone
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>

        {/*
         * Reactions, only when there are some.
         *
         * The old layout rendered an empty row plus an always-visible "add
         * reaction" button under every single message, which is a control most
         * messages never need and two rows of chrome per message in a thread of
         * two hundred. Adding one now lives in the hover toolbar and the menu.
         */}
        <AnimatePresence initial={false}>
          {!deleted && grouped.length > 0 && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: -4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={transition.spring}
              className={cn(
                "-mt-1.5 flex flex-wrap items-center gap-1 px-1",
                isOwn && "justify-end",
              )}
            >
              {grouped.map((g) => (
                <motion.button
                  key={g.emoji}
                  layout={!reduced}
                  type="button"
                  onClick={() => react(g.emoji)}
                  aria-pressed={g.mine}
                  aria-label={`${g.count} reacted ${g.emoji}`}
                  whileTap={reduced ? undefined : { scale: 0.88 }}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-colors",
                    g.mine
                      ? "border-accent/60 bg-accent/12 font-semibold text-accent"
                      : "border-border bg-card text-muted-foreground hover:border-accent/40",
                  )}
                >
                  <span aria-hidden>{g.emoji}</span>
                  <span className="tabular-nums">{g.count}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showInfo && (
            <motion.dl
              initial={reduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={transition.base}
              className="mt-1.5 w-fit max-w-full overflow-hidden rounded-xl border border-border bg-muted/40 px-3 py-2 text-[0.6875rem] text-muted-foreground"
            >
              <div className="flex gap-2">
                <dt className="font-semibold text-foreground">Sent</dt>
                <dd>{fullTimestamp(message.created_at)}</dd>
              </div>
              {message.edited_at && (
                <div className="flex gap-2">
                  <dt className="font-semibold text-foreground">Edited</dt>
                  <dd>{fullTimestamp(message.edited_at)}</dd>
                </div>
              )}
              {isOwn && readByCount !== undefined && memberCount !== undefined && (
                <div className="flex gap-2">
                  <dt className="font-semibold text-foreground">Read by</dt>
                  <dd>
                    {readByCount} of {Math.max(memberCount - 1, 0)}{" "}
                    {memberCount - 1 === 1 ? "person" : "people"}
                  </dd>
                </div>
              )}
            </motion.dl>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** The six quick reactions, plus the full picker behind a `+`. */
function QuickReactionRow({
  onPick,
  compact,
}: {
  onPick: (emoji: string) => void;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <div className={cn("flex items-center gap-0.5 p-1", compact && "justify-between")}>
      {QUICK_REACTIONS.map((emoji) => (
        <motion.button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          aria-label={`React ${emoji}`}
          whileHover={reduced ? undefined : { scale: 1.3, y: -2 }}
          whileTap={reduced ? undefined : { scale: 0.9 }}
          transition={transition.spring}
          className="rounded-lg px-1.5 py-1 text-xl leading-none"
        >
          <span aria-hidden>{emoji}</span>
        </motion.button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="More reactions"
            className="ml-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <EmojiPicker onPick={onPick} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Sent / read ticks.
 *
 * Derived from the other members' `last_read_at`, which the conversation
 * already stores — so this is real read state, not a decoration. One tick means
 * the row is in the database; two filled ticks mean everyone else's read marker
 * has passed it. There is deliberately no separate "delivered" state: nothing
 * in the schema records device delivery, and inventing a tick for it would be
 * telling the user something we do not know.
 */
function DeliveryTicks({ state }: { state: DeliveryState | undefined }) {
  if (!state) return null;
  if (state === "sending") {
    return <Loader2 className="h-3 w-3 animate-spin" aria-label="Sending" />;
  }
  if (state === "failed") {
    return <AlertCircle className="h-3 w-3 text-destructive" aria-label="Not sent" />;
  }
  if (state === "read") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <CheckCheck className="h-3.5 w-3.5 text-info" aria-label="Read" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">Read</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Check className="h-3.5 w-3.5" aria-label="Sent" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">Sent</TooltipContent>
    </Tooltip>
  );
}

interface ReactionGroup {
  emoji: string;
  count: number;
  mine: boolean;
}

function groupReactions(m: ChatMessage, uid: string | undefined): ReactionGroup[] {
  const map = new Map<string, ReactionGroup>();
  for (const r of m.message_reactions ?? []) {
    const g = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    g.count += 1;
    if (r.user_id === uid) g.mine = true;
    map.set(r.emoji, g);
  }
  // Quick reactions keep their palette order so the row doesn't reshuffle as
  // counts change; anything picked out of the full picker sorts after them.
  const rank = (e: string) => {
    const i = (QUICK_REACTIONS as readonly string[]).indexOf(e);
    return i === -1 ? QUICK_REACTIONS.length : i;
  };
  return [...map.values()].sort((a, b) => rank(a.emoji) - rank(b.emoji));
}

/**
 * Renders `@name` runs as accent-coloured text.
 *
 * The mention *targets* are the stored `mentions` uuids — this only styles the
 * text so the reader can see one happened. It is deliberately not a lookup that
 * could disagree with the stored ids: if someone renames themselves, the old
 * text stays and the notification still went to the right person.
 */
function MentionText({
  body,
  mentions,
  people,
  onOwnBubble,
}: {
  body: string;
  mentions: string[];
  people: PersonMap;
  /** Own bubbles are solid accent, so an accent-coloured mention would vanish. */
  onOwnBubble: boolean;
}) {
  const names = useMemo(() => {
    const set = new Set<string>();
    for (const id of mentions ?? []) {
      const n = people[id];
      if (n) set.add(displayName(n).toLowerCase());
    }
    return set;
  }, [mentions, people]);

  if (names.size === 0) return <>{body}</>;

  const parts = body.split(/(@[\w][\w .'-]{0,40})/g);
  return (
    <>
      {parts.map((part, i) => {
        if (!part.startsWith("@")) return <span key={i}>{part}</span>;
        const candidate = part.slice(1).trim().toLowerCase();
        const hit = [...names].some(
          (n) => candidate === n || candidate.startsWith(`${n} `),
        );
        return hit ? (
          <span
            key={i}
            className={cn(
              "rounded px-0.5 font-semibold",
              onOwnBubble
                ? "bg-accent-foreground/15 underline underline-offset-2"
                : "bg-accent/10 text-accent",
            )}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

/**
 * One attachment.
 *
 * The bucket is private, so there is no public URL: a signed one is minted on
 * demand and lasts an hour. Images render inline once that URL resolves;
 * everything else is a chip with its real filename and size, which is what a
 * reader needs to decide whether to open it.
 */
function Attachment({
  attachment,
  onOwnBubble,
}: {
  attachment: MessageAttachment;
  onOwnBubble: boolean;
}) {
  const { data: url, isLoading } = useAttachmentUrl(attachment.storage_path);
  const isImage = attachment.mime_type.startsWith("image/");

  if (isImage) {
    return (
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="group/img block overflow-hidden rounded-2xl border border-border/40"
      >
        {url ? (
          <img
            src={url}
            alt={attachment.file_name}
            loading="lazy"
            className="max-h-80 w-auto max-w-full object-cover transition-transform duration-300 group-hover/img:scale-[1.02]"
          />
        ) : (
          <span className="flex h-36 w-52 items-center justify-center bg-muted/40 text-xs text-muted-foreground">
            {isLoading ? "Loading image…" : "Image unavailable"}
          </span>
        )}
      </a>
    );
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
        onOwnBubble
          ? "border-accent-foreground/25 bg-background/15 hover:bg-background/25"
          : "border-border bg-muted/40 hover:bg-muted/70",
      )}
    >
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          onOwnBubble ? "bg-background/20" : "bg-card",
        )}
      >
        <FileText className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-medium">
          {attachment.file_name}
        </span>
        <span className="block text-[0.6875rem] opacity-70">
          {fileSize(attachment.file_size)}
        </span>
      </span>
      <Download className="h-4 w-4 shrink-0 opacity-70" />
    </a>
  );
}
