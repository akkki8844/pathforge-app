import { useEffect, useMemo, useState } from "react";
import { Check, CornerUpRight, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GroupAvatar, PersonAvatar } from "./PersonAvatar";
import { preview } from "@/lib/comms/format";
import { displayName, usePeople } from "@/hooks/comms/usePeople";
import { useConversations } from "@/hooks/comms/useConversations";
import { useForwardMessage, type ChatMessage } from "@/hooks/comms/useMessages";

/**
 * Forward a message to other conversations.
 *
 * Multi-select, because forwarding one thing to three people is the whole
 * reason the gesture exists. The conversation it came from is excluded — that
 * would just be sending it again — and the message being forwarded is shown at
 * the top so there is no doubt about what is about to go out.
 */
export function ForwardDialog({
  message,
  fromConversationId,
  onClose,
}: {
  message: ChatMessage | null;
  fromConversationId: string;
  onClose: () => void;
}) {
  const [term, setTerm] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const { conversations, referencedUserIds } = useConversations();
  const { people } = usePeople(referencedUserIds);
  const forward = useForwardMessage();

  // A fresh selection each time the dialog opens — a leftover tick from the
  // last forward is how a message goes somewhere nobody meant to send it.
  useEffect(() => {
    if (message) {
      setPicked([]);
      setTerm("");
    }
  }, [message]);

  const titleFor = (c: (typeof conversations)[number]) =>
    c.kind === "dm"
      ? displayName(c.other_user_id ? people[c.other_user_id] : undefined)
      : (c.title ?? "Untitled");

  const options = useMemo(() => {
    const q = term.trim().toLowerCase();
    return conversations
      .filter((c) => c.id !== fromConversationId)
      .filter((c) => !q || titleFor(c).toLowerCase().includes(q));
    // `people` participates because a DM's name is resolved from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, fromConversationId, term, people]);

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    if (!message || picked.length === 0) return;
    forward.mutate(
      { message, toConversationIds: picked },
      {
        onSuccess: (ids) => {
          toast.success(
            ids.length === 1 ? "Message forwarded." : `Forwarded to ${ids.length} chats.`,
          );
          onClose();
        },
        onError: () => toast.error("Could not forward that message."),
      },
    );
  };

  return (
    <Dialog open={!!message} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CornerUpRight className="h-4 w-4 text-accent" />
            Forward message
          </DialogTitle>
          <DialogDescription>
            Pick who should get it. It is sent as a new message, so they don’t need
            access to this conversation.
          </DialogDescription>
        </DialogHeader>

        {message && (
          <p className="line-clamp-3 rounded-xl border-l-[3px] border-accent bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            {message.body
              ? preview(message.body, 200)
              : `Attachment: ${message.message_attachments.map((a) => a.file_name).join(", ")}`}
          </p>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats to forward to"
            className="h-10 rounded-xl pl-9"
          />
        </div>

        <ScrollArea className="h-64 rounded-xl border border-border">
          {options.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {conversations.length <= 1
                ? "You don’t have another conversation to forward this to yet."
                : `No chat matched “${term.trim()}”.`}
            </p>
          ) : (
            <ul className="p-1.5">
              {options.map((c) => {
                const title = titleFor(c);
                const on = picked.includes(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                        on ? "bg-accent/10" : "hover:bg-muted/60",
                      )}
                    >
                      {c.kind === "dm" ? (
                        <PersonAvatar
                          person={c.other_user_id ? people[c.other_user_id] : undefined}
                          size="sm"
                        />
                      ) : (
                        <GroupAvatar title={title} accentName={c.accent} size="sm" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {title}
                      </span>
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                          on
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border",
                        )}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={picked.length === 0 || forward.isPending}>
            {forward.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {picked.length > 1 ? `Forward to ${picked.length}` : "Forward"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
