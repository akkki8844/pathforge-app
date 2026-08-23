import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Loader2,
  ListPlus,
  Puzzle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { transition } from "@/lib/motion";
import {
  describeCall,
  TOOL_SPECS,
  type AdvisorToolCall,
} from "@/lib/advisorTools";

/**
 * The receipt for anything the advisor did to the app.
 *
 * Every tool call renders one of these, including the ones that were rejected
 * — a silent side effect and a silently-dropped action are both worse than a
 * small card saying what happened. Calls that need confirmation sit here with
 * their buttons until the user decides; nothing runs behind the card.
 */

const ICONS = {
  navigate: ArrowRight,
  add_outcome_item: ListPlus,
  install_skill: Puzzle,
  remove_skill: Puzzle,
} as const;

/** Confirmation verb. "Do it" is fine for navigation and wrong for everything else. */
const CONFIRM_LABEL: Partial<Record<AdvisorToolCall["name"], string>> = {
  add_outcome_item: "Add it",
  install_skill: "Install it",
  remove_skill: "Remove it",
};

export interface ToolActionCardProps {
  call: AdvisorToolCall;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function ToolActionCard({ call, onConfirm, onDismiss }: ToolActionCardProps) {
  const spec = TOOL_SPECS[call.name];
  const Icon = ICONS[call.name] ?? ArrowRight;
  const detail = describeCall(call.call);

  const isFailed = call.status === "failed";
  const isRejected = call.status === "rejected";
  const isDismissed = call.status === "dismissed";
  const isPending = call.status === "pending";
  const isRunning = call.status === "running";
  const isDone = call.status === "done";

  const tone = isFailed || isRejected ? "destructive" : isDone ? "accent" : "neutral";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.fast}
      className={cn(
        "not-prose mt-2 flex items-start gap-3 rounded-xl border px-3 py-2.5",
        tone === "destructive" && "border-destructive/40 bg-destructive/5",
        tone === "accent" && "border-accent/40 bg-accent/5",
        tone === "neutral" && "border-border bg-card",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          tone === "destructive" && "bg-destructive/15 text-destructive",
          tone === "accent" && "bg-accent/15 text-accent",
          tone === "neutral" && "bg-muted text-muted-foreground",
        )}
      >
        {isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isFailed || isRejected ? (
          <CircleAlert className="h-3.5 w-3.5" />
        ) : isDone ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {isRejected
            ? "Action blocked"
            : isFailed
              ? "Action failed"
              : isDismissed
                ? "Action dismissed"
                : isDone
                  ? spec.doneLabel
                  : isRunning
                    ? `${spec.pendingLabel}…`
                    : spec.pendingLabel}
        </div>
        <div className="mt-0.5 truncate text-sm text-foreground">{detail}</div>
        {(call.error || call.summary) && (
          <div className="mt-0.5 text-xs text-muted-foreground">{call.error || call.summary}</div>
        )}

        {isPending && spec.requiresConfirmation && (
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" className="h-7 px-3 text-xs" onClick={() => onConfirm(call.id)}>
              {CONFIRM_LABEL[call.name] ?? "Do it"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => onDismiss(call.id)}
            >
              <X className="mr-1 h-3 w-3" />
              No thanks
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
