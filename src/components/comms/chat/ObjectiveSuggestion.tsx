import { Check, Target, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useObjectiveActions } from "@/hooks/comms/useObjectives";
import type { Objective } from "@/lib/comms/types";
import type { PersonMap } from "@/hooks/comms/usePeople";

/**
 * "Someone just committed to something" — offered under the message that said
 * it, where the decision is cheapest to make.
 *
 * This card is a view of a row `extract-objectives` already wrote with
 * `status = 'suggested'`. It is never rendered from a client-side guess, and
 * accepting is the only thing that turns it into work: until then it is a
 * proposal, drawn as an outline rather than as a solid card so it cannot be
 * mistaken for a task somebody already agreed to.
 *
 * When the model could not resolve who the message meant, the assignee reads
 * "not specified" rather than defaulting to the sender or the reader — a wrong
 * assignment is worse than an unassigned one.
 */
export function ObjectiveSuggestion({
  objective,
  people,
  currentUserId,
  className,
}: {
  objective: Objective;
  people: PersonMap;
  currentUserId: string | undefined;
  className?: string;
}) {
  const { acceptSuggestion, dismissSuggestion } = useObjectiveActions(objective.team_id ?? undefined);

  const assignee = objective.assignee_id ? people[objective.assignee_id] : undefined;
  const assigneeLabel = objective.assignee_id
    ? objective.assignee_id === currentUserId
      ? "you"
      : assignee?.full_name || "a member"
    : "not specified";

  const due = objective.due_at
    ? new Date(objective.due_at).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const busy = acceptSuggestion.isPending || dismissSuggestion.isPending;

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-accent/50 bg-accent/[0.04] px-3 py-2.5",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Possible objective detected
          </p>
          <p className="mt-1 text-sm font-medium leading-snug text-foreground">{objective.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Assignee: {assigneeLabel}
            {due ? ` · due ${due}` : " · no due date"}
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            className="h-7 px-2 text-muted-foreground hover:text-destructive"
            aria-label="Dismiss suggestion"
            onClick={() =>
              dismissSuggestion.mutate(objective.id, {
                onError: () => toast.error("Could not dismiss that."),
              })
            }
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            disabled={busy}
            className="h-7 px-2.5"
            onClick={() =>
              acceptSuggestion.mutate(
                { id: objective.id },
                {
                  onSuccess: () => toast.success("Added to objectives."),
                  onError: () => toast.error("Could not accept that."),
                },
              )
            }
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
