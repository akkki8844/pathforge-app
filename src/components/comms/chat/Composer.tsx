import { useEffect, useMemo, useRef, useState } from "react";
import { ImageIcon, Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PersonAvatar } from "./PersonAvatar";
import { fileSize } from "@/lib/comms/format";
import { displayName, type Person, type PersonMap } from "@/hooks/comms/usePeople";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, type ChatMessage } from "@/hooks/comms/useMessages";

interface SendPayload {
  body: string;
  mentions: string[];
  files: File[];
  replyToId: string | null;
}

/**
 * The composer.
 *
 * Three things it has to get right, in order of how often they bite:
 *
 * - **Enter sends, Shift+Enter breaks the line** on a pointer device, but on a
 *   touch device Enter must insert a newline, because a phone keyboard's return
 *   key is the only way to write a second line and there is a visible Send
 *   button right there.
 * - **Mentions resolve to ids at send time**, not at render time. The `@name`
 *   text is just text; what gets stored is the matched uuid, so a later rename
 *   cannot break the link and notification fan-out never has to parse prose.
 * - **Files are validated here as well as in the mutation**, so an oversized
 *   file is rejected before the user waits through an upload that the bucket
 *   was always going to refuse.
 */
export function Composer({
  members,
  people,
  replyTo,
  onCancelReply,
  onSend,
  onTyping,
  isSending,
  disabled,
  placeholder = "Write a message…",
}: {
  /** Ids of everyone in this conversation, for mention autocomplete. */
  members: string[];
  people: PersonMap;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSend: (payload: SendPayload) => void;
  onTyping: () => void;
  isSending: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const candidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .map((id) => people[id])
      .filter((p): p is Person => !!p)
      .filter(
        (p) =>
          q === "" ||
          displayName(p).toLowerCase().includes(q) ||
          (p.username ?? "").toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [mentionQuery, members, people]);

  useEffect(() => setActiveIndex(0), [mentionQuery]);

  // Grow with the content, up to a ceiling — past that the thread above would
  // be squeezed out of view, which matters more than seeing the whole draft.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const updateText = (value: string) => {
    setText(value);
    onTyping();
    const caret = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    // Only trigger at a word boundary, so an email address doesn't open the
    // mention list halfway through typing it.
    const match = /(?:^|\s)@([\w .'-]{0,40})$/.exec(before);
    setMentionQuery(match ? match[1] : null);
  };

  const applyMention = (person: Person) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const after = text.slice(caret);
    const replaced = before.replace(/@([\w .'-]{0,40})$/, `@${displayName(person)} `);
    const next = replaced + after;
    setText(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = replaced.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  /** Match `@…` runs in the final text back to member ids. */
  const resolveMentions = (value: string): string[] => {
    const ids = new Set<string>();
    for (const id of members) {
      const p = people[id];
      if (!p) continue;
      const forms = [displayName(p), p.username].filter(Boolean) as string[];
      for (const form of forms) {
        const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (new RegExp(`(^|\\s)@${escaped}(\\b|$)`, "i").test(value)) {
          ids.add(id);
          break;
        }
      }
    }
    return [...ids];
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const accepted: File[] = [];
    for (const f of Array.from(incoming)) {
      if (f.size > ATTACHMENT_MAX_BYTES) {
        toast.error(`${f.name} is larger than 25 MB.`);
        continue;
      }
      if (f.type && !ATTACHMENT_TYPES.includes(f.type)) {
        toast.error(`${f.name} is not a file type this chat accepts.`);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted].slice(0, 5));
  };

  const canSend = (text.trim().length > 0 || files.length > 0) && !isSending && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend({
      body: text,
      mentions: resolveMentions(text),
      files,
      replyToId: replyTo?.id ?? null,
    });
    setText("");
    setFiles([]);
    setMentionQuery(null);
    onCancelReply();
  };

  const isTouch =
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

  return (
    <div className="border-t border-border/70 bg-card/80 p-3 backdrop-blur-sm">
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border-l-2 border-accent bg-muted/50 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-accent">
              Replying to {displayName(people[replyTo.sender_id])}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {replyTo.deleted_at ? "Message deleted" : replyTo.body}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs"
            >
              <span className="max-w-[160px] truncate">{f.name}</span>
              <span className="text-muted-foreground">{fileSize(f.size)}</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                aria-label={`Remove ${f.name}`}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        {candidates.length > 0 && (
          <ul
            role="listbox"
            aria-label="Mention someone"
            className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
          >
            {candidates.map((p, i) => (
              <li key={p.user_id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => applyMention(p)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm",
                    i === activeIndex ? "bg-accent/10 text-accent" : "hover:bg-muted/60",
                  )}
                >
                  <PersonAvatar person={p} size="xs" />
                  <span className="truncate">{displayName(p)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-1.5 rounded-[1.4rem] border border-border/70 bg-muted/40 px-2 py-1.5 transition-colors focus-within:border-accent/40 focus-within:bg-card">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ATTACHMENT_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Attach a file"
            disabled={disabled || files.length >= 5}
            onClick={() => fileInputRef.current?.click()}
            className="mb-0.5 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Attach an image"
            disabled={disabled || files.length >= 5}
            onClick={() => fileInputRef.current?.click()}
            className="mb-0.5 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>

          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => updateText(e.target.value)}
            onKeyDown={(e) => {
              if (candidates.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((i) => (i + 1) % candidates.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((i) => (i - 1 + candidates.length) % candidates.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  applyMention(candidates[activeIndex]);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMentionQuery(null);
                  return;
                }
              }
              // Escape drops the reply you're attached to, the same as every
              // other client. Only reachable once the mention list has closed,
              // which is handled by the branch above.
              if (e.key === "Escape" && replyTo) {
                e.preventDefault();
                onCancelReply();
                return;
              }
              if (e.key === "Enter" && !e.shiftKey && !isTouch) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={8000}
            disabled={disabled}
            placeholder={placeholder}
            aria-label="Message"
            className="min-h-[36px] resize-none border-0 bg-transparent py-2 shadow-none focus-visible:ring-0"
          />

          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send message"
            className="mb-0.5 h-9 w-9 shrink-0 rounded-full bg-foreground text-background transition-transform hover:bg-foreground/90 hover:scale-105 disabled:bg-muted disabled:text-muted-foreground disabled:hover:scale-100"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="mt-1.5 px-2 text-[10px] text-muted-foreground">
        {isTouch
          ? "Use @ to mention someone in this conversation."
          : "Enter to send · Shift + Enter for a new line · @ to mention"}
      </p>
    </div>
  );
}
