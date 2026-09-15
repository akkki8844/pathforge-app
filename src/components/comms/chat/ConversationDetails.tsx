import { useRef, useState } from "react";
import { Bell, BellOff, Camera, LogOut, Pin, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import { GroupAvatar, PersonAvatar } from "./PersonAvatar";
import { listTimestamp, preview } from "@/lib/comms/format";
import { useAuth } from "@/contexts/AuthContext";
import { displayName, usePeople, type PersonMap } from "@/hooks/comms/usePeople";
import { useMessageSearch, usePins } from "@/hooks/comms/useMessages";
import {
  useConversationActions,
  useConversationMembers,
  type ConversationListItem,
} from "@/hooks/comms/useConversations";

/**
 * The right pane: who is in here, what has been pinned, and search.
 *
 * On desktop it sits alongside the thread; on a phone the page renders it in a
 * sheet instead. Same component either way — the details of a conversation
 * should not be two implementations that drift apart.
 */
export function ConversationDetails({
  conversation,
  listPeople,
  onJumpToMessage,
  onTogglePin,
  onToggleMute,
  onLeave,
}: {
  conversation: ConversationListItem;
  listPeople: PersonMap;
  onJumpToMessage: (messageId: string) => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onLeave: () => void;
}) {
  const [term, setTerm] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);

  const { user } = useAuth();
  const { setGroupImage } = useConversationActions();
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const { memberIds } = useConversationMembers(conversation.id);
  const { people: memberPeople } = usePeople(memberIds);
  const people: PersonMap = { ...listPeople, ...memberPeople };
  const { pins } = usePins(conversation.id);
  const search = useMessageSearch(conversation.id, term);

  // Matches the `conversations_update` RLS policy: the creator, or (for a
  // team conversation) a team owner/admin. A member who isn't either of
  // those simply doesn't get the hover affordance — the upload would just
  // be rejected server-side, so there's no point offering it.
  const canEditPhoto = conversation.kind !== "dm" && conversation.created_by === user?.id;

  const handlePickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      await setGroupImage.mutateAsync({ conversationId: conversation.id, file });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update the group photo.");
    }
  };

  const title =
    conversation.kind === "dm"
      ? displayName(
          conversation.other_user_id ? people[conversation.other_user_id] : undefined,
        )
      : conversation.title ?? "Untitled";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-5 p-4">
          {/* Identity ---------------------------------------------------- */}
          <div className="flex flex-col items-center text-center">
            {conversation.kind === "dm" ? (
              <PersonAvatar
                person={
                  conversation.other_user_id ? people[conversation.other_user_id] : undefined
                }
                size="xl"
              />
            ) : canEditPhoto ? (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="group relative rounded-2xl"
                aria-label="Change group photo"
              >
                <GroupAvatar title={title} accentName={conversation.accent} imagePath={conversation.image_path} size="xl" />
                <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-5 w-5" />
                </span>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handlePickPhoto(e.target.files?.[0])}
                />
              </button>
            ) : (
              <GroupAvatar title={title} accentName={conversation.accent} imagePath={conversation.image_path} size="xl" />
            )}
            <h2 className="mt-3 font-display text-base font-bold text-foreground">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {conversation.kind === "dm"
                ? "Direct message"
                : conversation.kind === "team"
                  ? "Team chat"
                  : `Group · ${conversation.member_count} members`}
            </p>
          </div>

          {/* Per-viewer controls ----------------------------------------- */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={onTogglePin}>
              <Pin className="mr-2 h-3.5 w-3.5" />
              {conversation.pinned ? "Unpin" : "Pin"}
            </Button>
            <Button variant="outline" size="sm" onClick={onToggleMute}>
              {conversation.muted ? (
                <>
                  <Bell className="mr-2 h-3.5 w-3.5" /> Unmute
                </>
              ) : (
                <>
                  <BellOff className="mr-2 h-3.5 w-3.5" /> Mute
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Search ------------------------------------------------------- */}
          <section className="space-y-2">
            <SectionHeading icon={Search}>Search this conversation</SectionHeading>
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Find a message"
              aria-label="Search this conversation"
              className="h-9"
            />
            {search.tooShort && (
              <p className="text-xs text-muted-foreground">
                Type at least two characters.
              </p>
            )}
            {search.isEmpty && (
              <p className="text-xs text-muted-foreground">
                No message in this conversation contains that.
              </p>
            )}
            {search.results.length > 0 && (
              <ul className="space-y-1">
                {search.results.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onJumpToMessage(m.id)}
                      className="w-full rounded-lg border border-border px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {displayName(people[m.sender_id])}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {listTimestamp(m.created_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {preview(m.body, 70)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Pinned ------------------------------------------------------- */}
          {conversation.kind !== "dm" && (
            <>
              <Separator />
              <section className="space-y-2">
                <SectionHeading icon={Pin}>Pinned ({pins.length})</SectionHeading>
                {pins.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nothing pinned yet. Right-click a message to pin it for
                    everyone.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {pins.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => onJumpToMessage(p.message_id)}
                          className="w-full rounded-lg border border-border px-2.5 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60"
                        >
                          Pinned by {displayName(people[p.pinned_by])} ·{" "}
                          {listTimestamp(p.created_at)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

          {/* Members ------------------------------------------------------ */}
          <Separator />
          <section className="space-y-2">
            <SectionHeading icon={Users}>
              Members ({conversation.member_count})
            </SectionHeading>
            <ul className="space-y-0.5">
              {memberIds.map((id) => (
                <li key={id} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
                  <PersonAvatar person={people[id]} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">
                      {displayName(people[id])}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Leave -------------------------------------------------------- */}
          {conversation.kind === "group" && (
            <>
              <Separator />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmLeave(true)}
                className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Leave group
              </Button>
            </>
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              You will stop receiving messages from this group and it will
              disappear from your list. Someone in the group would need to add you
              back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay in group</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onLeave();
                setConfirmLeave(false);
                toast.success(`You left ${title}.`);
              }}
            >
              Leave group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {children}
    </h3>
  );
}
