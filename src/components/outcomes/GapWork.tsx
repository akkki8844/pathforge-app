import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColumnHead, Figure, Ledger, LedgerCell, Panel, PanelHead, Reveal } from "./primitives";
import type { EvidenceState } from "@/hooks/useOutcomesData";
import type { GapTask } from "@/lib/outcomesScoring";

/**
 * The work.
 *
 * One task per signal sitting below its tier bar, ordered by what each is
 * actually worth to the reading. The figure on each card is derived from the
 * live weights and the live bar — the old page printed hard-coded values
 * ("+25 pts", "+30 pts") that had no connection to the score, so a student
 * could finish a "+30" task and watch the number move by two.
 */

const STATE_LABEL: Record<EvidenceState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  evidence_submitted: "Evidence submitted",
  verified: "Verified",
};

export function GapWork({
  tasks,
  states,
  onStateChange,
}: {
  tasks: GapTask[];
  states: Record<string, EvidenceState>;
  onStateChange: (taskId: string, state: EvidenceState) => void;
}) {
  if (tasks.length === 0) {
    return (
      <Reveal delay={0.05}>
        <Panel>
          <PanelHead eyebrow="The work" title="Every signal is at its bar" />
          <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">
            Nothing on this file is below the standard for the tier you selected. Raise the
            target tier to see what the next one asks for, or spend the time deepening what you
            already have rather than adding to it.
          </p>
        </Panel>
      </Reveal>
    );
  }

  return (
    <Reveal delay={0.05}>
      <Panel flush>
        <div className="p-5 pb-4 sm:p-6 sm:pb-4">
          <PanelHead
            eyebrow="The work"
            title="Ordered by what it recovers"
            note={
              <>
                <Figure size="sm" className="text-foreground">
                  {tasks.length}
                </Figure>
                <span className="ml-1 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  open
                </span>
              </>
            }
          />
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">
            Each of these closes a gap the standings just showed you. The points figure is what
            that signal is worth to your reading right now at the current weighting — it moves
            as the rest of the file moves.
          </p>
        </div>

        <Ledger className="border-t border-border">
          {tasks.map((task) => {
            const state = states[task.id] || "not_started";
            const done = state === "verified";
            return (
              <LedgerCell key={task.id} className={cn("p-5 sm:p-6", done && "opacity-70")}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <ColumnHead>{task.signalName}</ColumnHead>
                  <span className="shrink-0">
                    <Figure size="sm" className="text-primary">
                      +{task.worth}
                    </Figure>
                    <span className="ml-1 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      points
                    </span>
                  </span>
                </div>

                <h3
                  className={cn(
                    "mt-2 text-balance font-display text-[clamp(1.05rem,3.5vw,1.3rem)] font-semibold leading-[1.15] tracking-[-0.015em]",
                    done && "line-through decoration-1"
                  )}
                >
                  {task.objective}
                </h3>

                <p className="mt-2.5 max-w-[64ch] text-[15px] leading-relaxed text-muted-foreground">
                  {task.scope}
                </p>

                <div className="mt-5 grid gap-5 border-t border-border/70 pt-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] sm:gap-8">
                  <div className="min-w-0">
                    <ColumnHead>Proof it takes</ColumnHead>
                    <ul className="mt-2.5 space-y-1.5">
                      {task.proof.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-[13.5px] leading-snug text-muted-foreground">
                          <Check className="mt-[3px] h-3 w-3 shrink-0 text-primary" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="min-w-0">
                    <ColumnHead>Horizon</ColumnHead>
                    <p className="mt-2.5 text-[13.5px] leading-snug text-muted-foreground">
                      {task.horizon}
                    </p>

                    <ColumnHead className="mt-5 block">Your state</ColumnHead>
                    <Select
                      value={state}
                      onValueChange={(v) => onStateChange(task.id, v as EvidenceState)}
                    >
                      <SelectTrigger
                        aria-label={`Evidence state for ${task.objective}`}
                        className="mt-2 h-9 w-full min-w-0 text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATE_LABEL) as EvidenceState[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATE_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </LedgerCell>
            );
          })}
        </Ledger>

        <p className="border-t border-border bg-card px-5 py-4 text-[12.5px] leading-relaxed text-muted-foreground sm:px-6">
          Marking a task here records your intent. Your reading only moves when the underlying
          entry in the record below moves — there is no way to raise the number from this list
          alone, by design.
        </p>
      </Panel>
    </Reveal>
  );
}
