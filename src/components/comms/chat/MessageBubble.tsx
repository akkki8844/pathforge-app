import { useMemo, useState } from "react";
import {
  AlertCircle,
  Copy,
  CornerUpLeft,
  Download,
  FileText,
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
import { PersonAvatar } from "./PersonAvatar";
import { fileSize, messageTime } from "@/lib/comms/format";
import { QUICK_REACTIONS, type MessageAttachment } from "@/lib/comms/types";
import { displayName, type PersonMap } from "@/hooks/comms/usePeople";
import { useAttachmentUrl, type ChatMessage } from "@/hooks/comms/useMessages";

/**
 * One message.
 *
 * Own messages are accent-tinted and right-aligned; everyone else's are neutral
 * and left-aligned. That is the whole visual language — no per-sender colour
 * wheel, which stops being legible past about four participants and fights the
 * team accents everywhere else in the section.
 *
 * Actions live in a right-click / long-press context menu rather than a hover
 * toolbar, because a hover toolbar has no equivalent on a phone and this pane is
 * the mobile surface people will use most. The menu's contents differ for own
 * versus others' messages, and the difference is not decorative: `messages`
 * UPDATE policy is `sender_id = auth.uid()`, so an edit or delete offered on
 * someone else's message would fail at the database, which is exactly the kind
 * of permission problem that must not be papered over by hiding a button.
 */
export function MessageBubble({
  message,
  people,
  isOwn,
  showAuthor,
  replyTo,
  isPinned,
  canPin,
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleReaction,
  currentUserId,
  highlighted,
}: {
  message: ChatMessage;
  people: PersonMap;
  isOwn: boolean;
  /** False when this continues a run from the same author. */
  showAuthor: boolean;
  replyTo: ChatMessage | undefined;
  isPinned: boolean;
  canPin: boolean;
  onReply: (m: ChatMessage) => void;
  onEdit: (id: string, body: string) => void;
  onDelete: (m: ChatMessage) => void;
  onTogglePin: (id: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  currentUserId: string | undefined;
  /** Set when jumped to from search or the pinned list. */
  highlighted?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const sender = people[message.sender_id];

  const grouped = useMemo(() => groupReactions(message, currentUserId), [message, currentUserId]);

  const deleted = !!message.deleted_at;

  const body = (
    <>
      {replyTo && (
        <div
          className={cn(
            "mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs",
            isOwn
              ? "border-accent-foreground/40 bg-background/20 text-accent-foreground/80"
              : "border-accent/50 bg-background/60 text-muted-foreground",
          )}
        >
          <span className="font-semibold">
            {displayName(people[replyTo.sender_id])}
          </span>
          <span className="ml-1.5 line-clamp-2">
            {replyTo.deleted_at ? "Message deleted" : replyTo.body}
          </span>
        </div>
      )}

      {deleted ? (
        <p className="text-sm italic opacity-70">This message was deleted</p>
      ) : editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={8000}
            className="text-sm text-foreground"
            aria-label="Edit message"
          />
          <div className="flex justify-end gap-2">
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
        message.body && (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            <MentionText
              body={message.body}
              mentions={message.mentions}
              people={people}
              onOwnBubble={isOwn}
            />
          </p>
        )
      )}

      {!deleted && message.message_attachments.length > 0 && (
        <div className={cn("space-y-1.5", message.body && "mt-2")}>
          {message.message_attachments.map((a) => (
            <Attachment key={a.id} attachment={a} onOwnBubble={isOwn} />
          ))}
        </div>
      )}
    </>
  );

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        "flex gap-2.5 px-1 transition-colors",
        isOwn ? "flex-row-reverse" : "flex-row",
        highlighted && "-mx-1 rounded-xl bg-warning/10 px-2 py-1",
      )}
    >
      <span className="w-8 shrink-0">
        {showAuthor && <PersonAvatar person={sender} size="sm" />}
      </span>

      <div className={cn("flex min-w-0 max-w-[min(560px,85%)] flex-col", isOwn && "items-end")}>
        {showAuthor && !isOwn && (
          <span className="mb-1 px-1 text-xs font-semibold text-foreground">
            {displayName(sender)}
          </span>
        )}

        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={cn(
                "rounded-[1.25rem] border px-3.5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors",
                isOwn
                  ? "border-transparent bg-accent text-accent-foreground"
                  : "border-border/70 bg-card text-foreground",
                isOwn ? "rounded-br-md" : "rounded-bl-md",
                message.pending && "opacity-60",
                message.failed && "border-destructive",
              )}
            >
              {body}
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-52">
            <ContextMenuItem onSelect={() => onReply(message)} disabled={deleted}>
              <CornerUpLeft className="mr-2 h-4 w-4" /> Reply
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
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>

        {/* Timestamp lives outside the bubble — the bubble is the message,
            this is metadata, and printing it as a separate quiet line is what
            keeps the bubble itself uncluttered. */}
        <span
          className={cn(
            "mt-1 flex items-center gap-1.5 px-1 text-[10px] tabular-nums text-muted-foreground/70",
            isOwn && "justify-end",
          )}
        >
          {isPinned && <Pin className="h-2.5 w-2.5" />}
          {message.edited_at && !deleted && <span>edited</span>}
          {messageTime(message.created_at)}
          {message.pending && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
          {message.failed && <AlertCircle className="h-2.5 w-2.5 text-destructive" />}
        </span>

        {!deleted && (
          <div
            className={cn(
              "mt-1 flex flex-wrap items-center gap-1",
              isOwn && "justify-end",
            )}
          >
            {grouped.map((g) => (
              <button
                key={g.emoji}
                type="button"
                onClick={() => onToggleReaction(message.id, g.emoji)}
                aria-pressed={g.mine}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                  g.mine
                    ? "border-accent bg-accent/10 font-semibold text-accent"
                    : "border-border bg-card text-muted-foreground hover:border-accent/40",
                )}
              >
                <span aria-hidden>{g.emoji}</span>
                <span className="tabular-nums">{g.count}</span>
              </button>
            ))}

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Add reaction"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
                >
                  <SmilePlus className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1.5" align={isOwn ? "end" : "start"}>
                <div className="flex gap-0.5">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onToggleReaction(message.id, emoji)}
                      aria-label={`React ${emoji}`}
                      className="rounded-lg px-1.5 py-1 text-lg transition-transform hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
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
  // Fixed palette order, so the row doesn't reshuffle as counts change.
  return [...map.values()].sort(
    (a, b) => QUICK_REACTIONS.indexOf(a.emoji as never) - QUICK_REACTIONS.indexOf(b.emoji as never),
  );
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
      if (n?.username) set.add(n.username.toLowerCase());
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
            className={cn("font-semibold", onOwnBubble ? "underline underline-offset-2" : "text-accent")}
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
        className="block overflow-hidden rounded-xl border border-border/50"
      >
        {url ? (
          <img
            src={url}
            alt={attachment.file_name}
            loading="lazy"
            className="max-h-72 w-auto max-w-full object-cover"
          />
        ) : (
          <span className="flex h-32 w-48 items-center justify-center bg-muted/40 text-xs text-muted-foreground">
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
        "flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors",
        onOwnBubble
          ? "border-accent-foreground/25 bg-background/15 hover:bg-background/25"
          : "border-border bg-muted/40 hover:bg-muted/70",
      )}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{attachment.file_name}</span>
        <span className="block text-[10px] opacity-70">{fileSize(attachment.file_size)}</span>
      </span>
      <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
    </a>
  );
}
