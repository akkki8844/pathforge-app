import { useState } from "react";
import { Loader2, MessageSquarePlus, Search, UserPlus, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonAvatar } from "./PersonAvatar";
import { accent } from "@/lib/comms/accents";
import { TEAM_ACCENTS, type TeamAccent } from "@/lib/comms/types";
import { displayName, usePeopleSearch, type Person } from "@/hooks/comms/usePeople";
import { useConversationActions } from "@/hooks/comms/useConversations";

/**
 * Start a direct message, or create a group.
 *
 * Both tabs search the same directory, which only returns people the signed-in
 * user shares a school, class, team or conversation with. That restriction is
 * enforced in the database by `comms_can_reach`, so it holds whether the request
 * comes from this dialog or from a console — this UI is the convenient path to
 * it, not the thing that makes it true.
 */
export function NewChatDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new conversation's id so the caller can open it. */
  onCreated: (conversationId: string) => void;
}) {
  const { startDm, createGroup } = useConversationActions();

  const [dmQuery, setDmQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupAccent, setGroupAccent] = useState<TeamAccent>("indigo");
  const [selected, setSelected] = useState<Person[]>([]);

  const dmSearch = usePeopleSearch(dmQuery);
  const groupSearch = usePeopleSearch(groupQuery);

  const reset = () => {
    setDmQuery("");
    setGroupQuery("");
    setGroupName("");
    setGroupAccent("indigo");
    setSelected([]);
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleStartDm = async (person: Person) => {
    try {
      const id = await startDm.mutateAsync(person.user_id);
      close(false);
      onCreated(id);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not start that conversation.",
      );
    }
  };

  const handleCreateGroup = async () => {
    try {
      const id = await createGroup.mutateAsync({
        title: groupName.trim(),
        memberIds: selected.map((p) => p.user_id),
        accent: groupAccent,
      });
      close(false);
      onCreated(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create that group.");
    }
  };

  const toggleSelected = (person: Person) => {
    setSelected((prev) =>
      prev.some((p) => p.user_id === person.user_id)
        ? prev.filter((p) => p.user_id !== person.user_id)
        : [...prev, person],
    );
  };

  const canCreateGroup =
    groupName.trim().length > 0 && selected.length > 0 && !createGroup.isPending;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[46rem]">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            You can message people from your school, your classes and your teams.
          </DialogDescription>
        </DialogHeader>

        {/* min-h holds the dialog at the taller ("Group") tab's height so
            switching to the shorter ("Direct message") tab doesn't make the
            whole popup visibly shrink underneath the cursor. */}
        <Tabs defaultValue="dm" className="min-h-[30rem]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dm">
              <MessageSquarePlus className="mr-2 h-4 w-4" /> Direct message
            </TabsTrigger>
            <TabsTrigger value="group">
              <UserPlus className="mr-2 h-4 w-4" /> Group
            </TabsTrigger>
          </TabsList>

          {/* Direct message ------------------------------------------------ */}
          <TabsContent value="dm" className="mt-4 space-y-3">
            <PeopleSearchField
              value={dmQuery}
              onChange={setDmQuery}
              placeholder="Search by name, username or email"
              label="Find someone"
            />
            <PeopleResults
              state={dmSearch}
              onPick={handleStartDm}
              busyId={startDm.isPending ? "any" : undefined}
            />
          </TabsContent>

          {/* Group --------------------------------------------------------- */}
          <TabsContent value="group" className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Physics revision, Robotics build, …"
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Colour</Label>
              <div className="flex flex-wrap gap-2">
                {TEAM_ACCENTS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setGroupAccent(name)}
                    aria-label={name}
                    aria-pressed={groupAccent === name}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      accent(name).dot,
                      groupAccent === name
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105",
                    )}
                  />
                ))}
              </div>
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.map((p) => (
                  <span
                    key={p.user_id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 pl-1 pr-2 text-xs"
                  >
                    <PersonAvatar person={p} size="xs" />
                    {displayName(p)}
                    <button
                      type="button"
                      onClick={() => toggleSelected(p)}
                      aria-label={`Remove ${displayName(p)}`}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <PeopleSearchField
              value={groupQuery}
              onChange={setGroupQuery}
              placeholder="Search by name, username or email"
              label="Add members"
            />
            <PeopleResults
              state={groupSearch}
              onPick={toggleSelected}
              selectedIds={new Set(selected.map((p) => p.user_id))}
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={!canCreateGroup}>
                {createGroup.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create group
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PeopleSearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`search-${label}`}>{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={`search-${label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
          autoComplete="off"
        />
      </div>
    </div>
  );
}

function PeopleResults({
  state,
  onPick,
  selectedIds,
  busyId,
}: {
  state: ReturnType<typeof usePeopleSearch>;
  onPick: (p: Person) => void;
  selectedIds?: Set<string>;
  busyId?: string;
}) {
  if (state.tooShort) {
    return <Hint>Type at least two characters to search.</Hint>;
  }
  if (state.isSearching) {
    return (
      <Hint>
        <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />
        Searching…
      </Hint>
    );
  }
  if (state.isEmpty) {
    return (
      <Hint>
        No one matched by that name, username or email. You can only message
        people you share a school, class or team with.
      </Hint>
    );
  }
  if (state.results.length === 0) return null;

  return (
    <ScrollArea className="max-h-56 rounded-xl border border-border">
      <ul className="divide-y divide-border">
        {state.results.map((p) => {
          const isSelected = selectedIds?.has(p.user_id) ?? false;
          return (
            <li key={p.user_id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                disabled={!!busyId}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-60",
                  isSelected && "bg-accent/10",
                )}
              >
                <PersonAvatar person={p} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {displayName(p)}
                  </span>
                  {p.username && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {`@${p.username}`}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <span className="shrink-0 text-xs font-semibold text-accent">
                    Added
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}
