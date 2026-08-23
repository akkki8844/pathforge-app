import { useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Check, Loader2, Plus, Sparkles, Target, User, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Button as MotionButton } from "@/components/ui/be-ui-button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CommsEmpty, CommsPanel } from "@/components/comms/CommsShell";
import { PersonAvatar } from "@/components/comms/chat/PersonAvatar";
import { DUE_STATE_CLASSES, dueState } from "@/lib/comms/accents";
import { PRIORITIES, type Objective, type Priority } from "@/lib/comms/types";
import { displayName, usePeople, type PersonMap } from "@/hooks/comms/usePeople";
import { useObjectiveActions, useTeamObjectives } from "@/hooks/comms/useObjectives";
import { useTeamMembers } from "@/hooks/comms/useTeams";
import { useAuth } from "@/contexts/AuthContext";

/**
 * What this team owes, and by when.
 *
 * The due-state colours come from the semantic tokens, not from a palette picked
 * for this screen: overdue is `destructive`, due-soon is `warning`, done is
 * `success`. That matters because the same three states appear on the Objectives
 * page and in a counsellor's view, and they have to mean the same thing in all
 * three or the colour stops carrying information.
 */
export function TeamObjectivesTab({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const { open, done, suggested, referencedUserIds, isLoading } = useTeamObjectives(teamId);
  const { memberIds } = useTeamMembers(teamId);
  const { people } = usePeople([...referencedUserIds, ...memberIds]);
  const { setStatus, acceptSuggestion, dismissSuggestion } = useObjectiveActions(teamId);
  const [createOpen, setCreateOpen] = useState(false);

  const createButton = (
    <MotionButton size="sm" className="rounded-lg" onClick={() => setCreateOpen(true)}>
      <Plus className="mr-1.5 h-3.5 w-3.5" />
      New objective
    </MotionButton>
  );

  return (
    <div className="space-y-6">
      {suggested.length > 0 && (
        <CommsPanel
          title={`Detected (${suggested.length})`}
          description="Picked up from this team's chat. Review before they count as commitments."
          icon={Sparkles}
          bodyClassName="space-y-2.5"
        >
          {suggested.map((o) => (
            <div
              key={o.id}
              className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/5 p-3"
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{o.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {o.assignee_id ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      <PersonAvatar person={people[o.assignee_id]} size="xs" />
                      {o.assignee_id === user?.id ? "You" : displayName(people[o.assignee_id])}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      <User className="h-3 w-3" />
                      Not specified
                    </span>
                  )}
                  {o.due_at && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      <CalendarClock className="h-3 w-3" />
                      {format(new Date(o.due_at), "d MMM, HH:mm")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() =>
                    dismissSuggestion.mutate(o.id, {
                      onError: () => toast.error("Could not dismiss that."),
                    })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2.5"
                  onClick={() =>
                    acceptSuggestion.mutate(
                      { id: o.id },
                      {
                        onSuccess: () => toast.success("Added to objectives."),
                        onError: () => toast.error("Could not accept that."),
                      },
                    )
                  }
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </CommsPanel>
      )}

      <CommsPanel
        title={`Open (${open.length})`}
        icon={Target}
        actions={createButton}
        bodyClassName={open.length ? "p-0" : undefined}
      >
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : open.length === 0 ? (
          <CommsEmpty
            icon={Target}
            title="Nothing open"
            description="Objectives created here — or detected from the team's chat — show up in this list and on the assignee's Routine."
            action={createButton}
          />
        ) : (
          <ul className="divide-y divide-border">
            {open.map((o) => (
              <ObjectiveRow
                key={o.id}
                objective={o}
                people={people}
                currentUserId={user?.id}
                onToggleDone={() =>
                  setStatus.mutate(
                    { id: o.id, status: "done" },
                    { onError: () => toast.error("Could not update that objective.") },
                  )
                }
              />
            ))}
          </ul>
        )}
      </CommsPanel>

      {done.length > 0 && (
        <CommsPanel title={`Completed (${done.length})`} icon={Check} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {done.slice(0, 20).map((o) => (
              <ObjectiveRow
                key={o.id}
                objective={o}
                people={people}
                currentUserId={user?.id}
                onToggleDone={() =>
                  setStatus.mutate(
                    { id: o.id, status: "todo" },
                    { onError: () => toast.error("Could not update that objective.") },
                  )
                }
              />
            ))}
          </ul>
        </CommsPanel>
      )}

      <CreateObjectiveDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        teamId={teamId}
        memberIds={memberIds}
        people={people}
      />
    </div>
  );
}

function ObjectiveRow({
  objective: o,
  people,
  currentUserId,
  onToggleDone,
}: {
  objective: Objective;
  people: PersonMap;
  currentUserId: string | undefined;
  onToggleDone: () => void;
}) {
  const state = dueState(o.due_at, o.status);
  const isDone = o.status === "done";
  const mine = o.assignee_id === currentUserId;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Checkbox
        checked={isDone}
        onCheckedChange={onToggleDone}
        aria-label={isDone ? `Reopen ${o.title}` : `Complete ${o.title}`}
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium text-foreground",
            isDone && "text-muted-foreground line-through",
          )}
        >
          {o.title}
        </p>
        {o.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {o.description}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {o.assignee_id ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
              <PersonAvatar person={people[o.assignee_id]} size="xs" />
              {mine ? "You" : displayName(people[o.assignee_id])}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
              <User className="h-3 w-3" />
              Not assigned
            </span>
          )}

          {o.due_at && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium",
                DUE_STATE_CLASSES[state],
              )}
            >
              <CalendarClock className="h-3 w-3" />
              {format(new Date(o.due_at), "d MMM, HH:mm")}
              {state === "overdue" && " · overdue"}
            </span>
          )}

          {o.priority !== "medium" && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[11px] capitalize text-muted-foreground">
              {o.priority} priority
            </span>
          )}

          {mine && o.routine_task_id && (
            <span className="rounded-full border border-info/40 bg-info/10 px-1.5 py-0.5 text-[11px] text-info">
              On your Routine
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function CreateObjectiveDialog({
  open,
  onOpenChange,
  teamId,
  memberIds,
  people,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  memberIds: string[];
  people: PersonMap;
}) {
  const { createObjective } = useObjectiveActions(teamId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string>("unassigned");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [addToRoutine, setAddToRoutine] = useState(true);
  const { user } = useAuth();

  const assignedToMe = assignee === user?.id;

  const close = (next: boolean) => {
    if (!next) {
      setTitle("");
      setDescription("");
      setAssignee("unassigned");
      setDueAt("");
      setPriority("medium");
      setAddToRoutine(true);
    }
    onOpenChange(next);
  };

  const submit = () => {
    createObjective.mutate(
      {
        title,
        description,
        teamId,
        // "unassigned" is a real choice, not a missing value: an objective with
        // nobody on it is better than one guessed onto the wrong person.
        assigneeId: assignee === "unassigned" ? null : assignee,
        linkToRoutine: addToRoutine,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        priority,
      },
      {
        onSuccess: () => {
          toast.success("Objective created.");
          close(false);
        },
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Could not create that objective."),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[41rem]">
        <DialogHeader>
          <DialogTitle>New objective</DialogTitle>
          <DialogDescription>
            Something this team has committed to. If you assign it to yourself, it
            also lands on your Routine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="objective-title">What needs doing?</Label>
            <Input
              id="objective-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Finish the prototype write-up"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="objective-description">
              Detail <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="objective-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="objective-assignee">Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger id="objective-assignee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Not specified</SelectItem>
                  {memberIds.map((id) => (
                    <SelectItem key={id} value={id}>
                      {id === user?.id ? "You" : displayName(people[id])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="objective-priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger id="objective-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="objective-due">
              Due <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="objective-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          {assignedToMe && (
            <label className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3">
              <Checkbox
                checked={addToRoutine}
                onCheckedChange={(v) => setAddToRoutine(v === true)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Add to my Routine</span>
                <br />
                Creates a task on Today and Calendar, and sends the deadline
                reminder. Ticking it off in either place completes both.
              </span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <MotionButton
            onClick={submit}
            disabled={!title.trim() || createObjective.isPending}
            className="rounded-xl h-10"
          >
            {createObjective.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create objective
          </MotionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
