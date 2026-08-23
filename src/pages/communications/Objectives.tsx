import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarClock, Check, Sparkles, Target, User, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { CommsEmpty, CommsPanel, CommsShell } from "@/components/comms/CommsShell";
import { PersonAvatar } from "@/components/comms/chat/PersonAvatar";
import { DUE_STATE_CLASSES, dueState } from "@/lib/comms/accents";
import type { Objective } from "@/lib/comms/types";
import { displayName, usePeople, type PersonMap } from "@/hooks/comms/usePeople";
import { useMyObjectives, useObjectiveActions } from "@/hooks/comms/useObjectives";
import type { TeamCard } from "@/hooks/comms/useTeams";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Every objective the user can see, in one place, instead of hunting through
 * each team's tab. "My" is what they personally owe; "Team" is everything open
 * across every team they're in; "Detected" is what the AI has picked out of
 * chat and nobody has accepted or dismissed yet; "Completed" is the record.
 */
export default function Objectives() {
  const { user } = useAuth();
  const { mine, team, suggested, completed, teamById, referencedUserIds, isLoading } =
    useMyObjectives();
  const { people } = usePeople(referencedUserIds);
  const { setStatus, acceptSuggestion, dismissSuggestion } = useObjectiveActions();

  const [tab, setTab] = useState("mine");

  return (
    <CommsShell
      title="Objectives"
      purpose="What you've committed to, and by when — across every team."
      icon={Target}
      path="/communications/objectives"
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="mine">Mine ({mine.length})</TabsTrigger>
          <TabsTrigger value="team">Team ({team.length})</TabsTrigger>
          <TabsTrigger value="detected">
            Detected {suggested.length > 0 ? `(${suggested.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          <ObjectiveList
            objectives={mine}
            people={people}
            teamById={teamById}
            currentUserId={user?.id}
            isLoading={isLoading}
            emptyTitle="Nothing assigned to you"
            emptyDescription="Objectives assigned to you, on any team, show up here and on your Routine."
            onToggleDone={(o) =>
              setStatus.mutate(
                { id: o.id, status: o.status === "done" ? "todo" : "done" },
                { onError: () => toast.error("Could not update that objective.") },
              )
            }
          />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <ObjectiveList
            objectives={team}
            people={people}
            teamById={teamById}
            currentUserId={user?.id}
            isLoading={isLoading}
            emptyTitle="Nothing open"
            emptyDescription="Open objectives across every team you're in will show up here."
            onToggleDone={(o) =>
              setStatus.mutate(
                { id: o.id, status: "done" },
                { onError: () => toast.error("Could not update that objective.") },
              )
            }
          />
        </TabsContent>

        <TabsContent value="detected" className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : suggested.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card">
              <CommsEmpty
                icon={Sparkles}
                title="Nothing detected"
                description="When a team or group chat message reads like a commitment, it will show up here first for you to accept or dismiss."
              />
            </div>
          ) : (
            <CommsPanel bodyClassName="space-y-2.5">
              {suggested.map((o) => (
                <div
                  key={o.id}
                  className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/5 p-3"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">{o.title}</p>
                      {o.team_id && teamById.get(o.team_id) && (
                        <span className="rounded-full border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {teamById.get(o.team_id)!.name}
                        </span>
                      )}
                    </div>
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
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <ObjectiveList
            objectives={completed}
            people={people}
            teamById={teamById}
            currentUserId={user?.id}
            isLoading={isLoading}
            emptyTitle="Nothing completed yet"
            emptyDescription="Objectives you or your teams finish will collect here."
            onToggleDone={(o) =>
              setStatus.mutate(
                { id: o.id, status: "todo" },
                { onError: () => toast.error("Could not update that objective.") },
              )
            }
          />
        </TabsContent>
      </Tabs>
    </CommsShell>
  );
}

function ObjectiveList({
  objectives,
  people,
  teamById,
  currentUserId,
  isLoading,
  emptyTitle,
  emptyDescription,
  onToggleDone,
}: {
  objectives: Objective[];
  people: PersonMap;
  teamById: Map<string, TeamCard>;
  currentUserId: string | undefined;
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onToggleDone: (o: Objective) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (objectives.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card">
        <CommsEmpty icon={Target} title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <ul className="divide-y divide-border">
        {objectives.map((o) => (
          <ObjectiveRow
            key={o.id}
            objective={o}
            people={people}
            team={o.team_id ? teamById.get(o.team_id) : undefined}
            currentUserId={currentUserId}
            onToggleDone={() => onToggleDone(o)}
          />
        ))}
      </ul>
    </div>
  );
}

function ObjectiveRow({
  objective: o,
  people,
  team,
  currentUserId,
  onToggleDone,
}: {
  objective: Objective;
  people: PersonMap;
  team: TeamCard | undefined;
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
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{o.description}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {team && (
            <Link
              to={`/communications/teams/${team.id}`}
              className="rounded-full border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:border-accent/50 hover:text-foreground"
            >
              {team.name}
            </Link>
          )}

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
