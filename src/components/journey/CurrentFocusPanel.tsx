import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Target,
  Clock,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Loader2,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LevelTask,
  getLevelById,
  LevelId,
  taskRequiresProof,
} from "@/lib/journeyLevels";
import { useProofSubmissions } from "@/hooks/useProofSubmissions";
import { cn } from "@/lib/utils";
import { hoverNudge } from "@/lib/motion";
import { safeExternalUrl } from "@/lib/safeUrl";

interface Props {
  level: LevelId;
  tasks: LevelTask[];
  completedIds: string[];
  onToggle: (id: string) => void;
}

/**
 * Current focus list for the active level.
 *
 * Progression integrity:
 *  - Proof-required tasks (competitions / research / leadership / activities)
 *    can ONLY be marked complete by uploading evidence + AI verification.
 *    The inline checkbox is disabled for those tasks; users are routed to
 *    the stage modal where the proof upload lives.
 *  - Reflective / planning tasks (academics, test_prep, application) keep
 *    a self-check, since there is no artifact to verify.
 */
export function CurrentFocusPanel({ level, tasks, completedIds, onToggle }: Props) {
  const lvl = getLevelById(level);
  const { isTaskApproved, getForTask } = useProofSubmissions();
  const visibleTasks = tasks.slice(0, 5);

  const isComplete = (t: LevelTask) =>
    taskRequiresProof(t) ? isTaskApproved(t.id) : completedIds.includes(t.id);

  const completedCount = visibleTasks.filter(isComplete).length;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/[0.02]">
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <Target className="w-3.5 h-3.5" />
              Your Current Focus — Monthly
            </div>
            <h3 className="text-xl font-bold text-foreground mt-1">
              Level {lvl.id}: {lvl.name}
            </h3>
            <p className="text-sm text-muted-foreground">{lvl.tagline}</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {completedCount}/{visibleTasks.length} done
          </Badge>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-[11px] text-muted-foreground leading-relaxed">
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            <ShieldCheck className="w-3 h-3" /> Verified progression
          </span>
          {" — "}
          tasks marked with{" "}
          <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
            <ShieldCheck className="w-3 h-3" /> Proof
          </span>{" "}
          require uploading evidence (certificate, screenshot, link). Open the stage to submit it.
        </div>

        <div className="space-y-3">
          {visibleTasks.map((task, i) => (
            <TaskItem
              key={task.id}
              task={task}
              index={i}
              completed={isComplete(task)}
              requiresProof={taskRequiresProof(task)}
              proofStatus={getForTask(task.id)?.status}
              onToggle={() => onToggle(task.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskItem({
  task,
  index,
  completed,
  requiresProof,
  proofStatus,
  onToggle,
}: {
  task: LevelTask;
  index: number;
  completed: boolean;
  requiresProof: boolean;
  proofStatus?: "pending" | "verifying" | "approved" | "rejected" | "needs_review";
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(index === 0);

  const goToStage = () => {
    // Scroll the user to the stage path so they can pick the matching stage
    // and use the inline proof upload there.
    const el = document.getElementById("current-focus");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dispatchEvent(new CustomEvent("journey:focus-path"));
  };

  const checkBtn = (
    <button
      type="button"
      onClick={requiresProof ? goToStage : onToggle}
      disabled={requiresProof && completed}
      className={cn(
        "mt-0.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full",
        requiresProof && !completed && "cursor-pointer",
        requiresProof && completed && "cursor-default",
      )}
      aria-label={
        completed
          ? "Completed"
          : requiresProof
          ? "Upload proof to complete"
          : "Mark complete"
      }
      title={requiresProof && !completed ? "Upload proof to complete" : undefined}
    >
      {completed ? (
        <CheckCircle2 className="w-5 h-5 text-primary" />
      ) : requiresProof && proofStatus === "verifying" ? (
        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
      ) : requiresProof && proofStatus === "rejected" ? (
        <XCircle className="w-5 h-5 text-destructive" />
      ) : requiresProof ? (
        <ShieldCheck className="w-5 h-5 text-muted-foreground" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground" />
      )}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      {...hoverNudge}
      className={cn(
        "rounded-xl border bg-card transition-all",
        completed ? "border-primary/30 bg-primary/[0.03]" : "border-border hover:border-primary/30"
      )}
    >
      <div className="p-4 flex items-start gap-3">
        {checkBtn}

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-1 text-left focus:outline-none"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={cn("font-semibold text-sm text-foreground leading-tight", completed && "line-through opacity-60")}>
                {task.title}
              </h4>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{task.timeEstimate}</span>
                <span className="capitalize">{task.category.replace("_", " ")}</span>
                {requiresProof && (
                  <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                    <ShieldCheck className="w-3 h-3" /> Proof required
                  </span>
                )}
                {proofStatus === "verifying" && (
                  <span className="text-amber-600 dark:text-amber-400">Verifying…</span>
                )}
                {proofStatus === "rejected" && (
                  <span className="text-destructive">Rejected — re-upload</span>
                )}
              </div>
            </div>
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
          </div>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 ml-8">
              {/* What to do */}
              <div className="text-xs rounded-md bg-primary/5 border border-primary/20 p-2.5">
                <div className="font-semibold text-primary mb-0.5 uppercase tracking-wider text-[10px]">What to do</div>
                <p className="text-foreground leading-relaxed">{task.title}</p>
              </div>

              {/* Why it matters */}
              <div className="text-xs">
                <div className="font-semibold text-foreground mb-0.5 uppercase tracking-wider text-[10px]">Why it matters</div>
                <p className="text-muted-foreground leading-relaxed">{task.why}</p>
              </div>

              {/* Expected outcome */}
              <div className="text-xs rounded-md bg-emerald-500/5 border border-emerald-500/20 p-2.5">
                <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5 uppercase tracking-wider text-[10px]">Expected outcome</div>
                <p className="text-foreground leading-relaxed">{task.outcome}</p>
              </div>

              {/* How to do it — step by step */}
              <div className="text-xs">
                <div className="font-semibold text-foreground mb-1.5 uppercase tracking-wider text-[10px]">
                  How to do it · {task.microSteps.length} steps
                </div>
                <ol className="space-y-1.5">
                  {task.microSteps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-medium text-foreground">{s.label}</span>
                        {s.detail && <span className="text-muted-foreground"> — {s.detail}</span>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* task.link is generated, so the old `startsWith("http")`
                    test sent everything else — including a javascript: URL —
                    down the same-tab branch. Off-site links get the scheme
                    check; in-app links have to be a real path. */}
                {(safeExternalUrl(task.link) ?? (task.link?.startsWith("/") ? task.link : null)) && (
                  <Button asChild variant="outline" size="sm" className="gap-1.5 mt-2">
                    {safeExternalUrl(task.link) ? (
                      <a href={safeExternalUrl(task.link)!} target="_blank" rel="noopener noreferrer">
                        {task.linkLabel || "Open"} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <a href={task.link}>{task.linkLabel || "Open"} <ChevronRight className="w-3 h-3" /></a>
                    )}
                  </Button>
                )}
                {requiresProof && !completed && (
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5 mt-2"
                    onClick={goToStage}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    Upload proof
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
