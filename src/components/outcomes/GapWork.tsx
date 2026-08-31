import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColumnHead, Figure, Ledger, LedgerCell, Panel, PanelHead, Reveal } from "./primitives";
import type { EvidenceState } from "@/hooks/useOutcomesData";
import type { GapTask } from "@/lib/outcomesScoring";

/**
 * The work.
 *
 * One task per signal sitting below its tier bar, ordered by what each is
 * worth to the reading. The figure on each is derived from the live weights
 * and the live bar.
 *
 * Three at a time, one line each, and the detail behind a chevron.
 *
 * This block used to print every task open: an objective at headline size, a
 * scope paragraph, four proof bullets, a horizon, a status control and two
 * closing paragraphs of caveat. Three of those is roughly two full screens of
 * reading placed directly under a verdict that has just told the student they
 * are short — which is how a list of priorities stops being one. Collapsed,
 * the same three fit in a glance and the detail is one click from the row it
 * belongs to.
 */

/** How many are worth reading before the list stops being a shortlist. */
const SHORTLIST = 3;

const STATE_LABEL: Record<EvidenceState, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  evidence_submitted: "Evidence submitted",
  verified: "Verified",
};

function TaskRow({
  task,
  state,
  onStateChange,
}: {
  task: GapTask;
  state: EvidenceState;
  onStateChange: (taskId: string, state: EvidenceState) => void;
}) {
  const [open, setOpen] = useState(false);
  const done = state === "verified";

  return (
    <LedgerCell className={cn(done && "opacity-60")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-muted/50 sm:px-6"
      >
        <span className="min-w-0 flex-1">
          <ColumnHead>{task.signalName}</ColumnHead>
          <span
            className={cn(
              "mt-1 block truncate font-cluely text-[15px] font-medium tracking-[-0.015em] text-foreground",
              done && "line-through decoration-1"
            )}
          >
            {task.objective}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <Figure size="sm" className="text-primary">
            +{task.worth}
          </Figure>
          <span className="ml-1 font-cluely text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            pts
          </span>
        </span>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4 sm:px-6">
          <p className="max-w-[64ch] text-[14px] leading-relaxed text-muted-foreground">
            {task.scope}
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)] sm:gap-8">
            <div className="min-w-0">
              <ColumnHead>Proof it takes</ColumnHead>
              <ul className="mt-2 space-y-1.5">
                {task.proof.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 text-[13px] leading-snug text-muted-foreground"
                  >
                    <Check className="mt-[3px] h-3 w-3 shrink-0 text-primary" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <ColumnHead>Horizon</ColumnHead>
              <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{task.horizon}</p>

              <ColumnHead className="mt-4 block">Your state</ColumnHead>
              <Select value={state} onValueChange={(v) => onStateChange(task.id, v as EvidenceState)}>
                <SelectTrigger
                  aria-label={`Evidence state for ${task.objective}`}
                  className="mt-2 h-9 w-full min-w-0 text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="cly-scope font-cluely">
                  {(Object.keys(STATE_LABEL) as EvidenceState[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATE_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </LedgerCell>
  );
}

export function GapWork({
  tasks,
  states,
  onStateChange,
}: {
  tasks: GapTask[];
  states: Record<string, EvidenceState>;
  onStateChange: (taskId: string, state: EvidenceState) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  if (tasks.length === 0) {
    return (
      <Reveal delay={0.05}>
        <Panel>
          <PanelHead eyebrow="Do next" title="Every signal is at its bar" />
          <p className="mt-2.5 max-w-[56ch] text-[14px] leading-relaxed text-muted-foreground">
            Raise the target tier to see what the next one asks for, or deepen what you already
            have rather than adding to it.
          </p>
        </Panel>
      </Reveal>
    );
  }

  const shown = showAll ? tasks : tasks.slice(0, SHORTLIST);
  const rest = tasks.length - shown.length;

  return (
    <Reveal delay={0.05}>
      <Panel flush>
        <PanelHead
          className="p-5 pb-4 sm:p-6 sm:pb-4"
          eyebrow="Do next"
          title={showAll ? "Ordered by what it recovers" : "Start with these three"}
          note={
            <>
              <Figure size="sm" className="text-foreground">
                {tasks.length}
              </Figure>
              <span className="ml-1 font-cluely text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                open
              </span>
            </>
          }
        />

        <Ledger className="border-t border-border">
          {shown.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              state={states[task.id] || "not_started"}
              onStateChange={onStateChange}
            />
          ))}
        </Ledger>

        {(rest > 0 || showAll) && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-full border-t border-border bg-card px-5 py-3 text-left font-cluely text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground sm:px-6"
          >
            {showAll
              ? `Show the top ${SHORTLIST} only`
              : `Show the other ${rest} ${rest === 1 ? "gap" : "gaps"}`}
          </button>
        )}
      </Panel>
    </Reveal>
  );
}
