import {
  ExternalLink, Trophy, X, ShieldCheck,
  Lock, CheckCircle2, Loader2, AlertCircle, XCircle, Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEVELS, LevelTask, StageDef } from "@/lib/journeyLevels";
import { useProofSubmissions } from "@/hooks/useProofSubmissions";
import { InlineProofUpload } from "./InlineProofUpload";
import { safeExternalUrl } from "@/lib/safeUrl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: StageDef | null;
  /** Reference guidance drawn from the Level's task library, not checkboxes. */
  tasks: LevelTask[];
  isCurrent: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  /** Called once evidence is verified, to bank the level and award a gem. */
  onClaim: (stage: StageDef, taskIds: string[]) => Promise<void> | void;
}

/**
 * A stage is the unit of work. It is completed by submitting evidence that
 * passes verification. There is deliberately no self-attestation control,
 * because a checkbox that anyone can tick carries no signal for admissions.
 *
 * Layout: a coloured header, one scrolling body and a pinned footer, so the
 * claim button never scrolls away. On a phone the popup is a full-screen
 * sheet; from lg up the body splits into the brief (left) and the evidence
 * form (right) so the whole task fits without scrolling.
 */
export function LevelDetailModal({
  open, onOpenChange, stage, tasks, isCurrent, isCompleted, isLocked, onClaim,
}: Props) {
  const { getForStage } = useProofSubmissions();

  if (!stage) return null;
  const lvl = LEVELS.find((l) => l.id === stage.level)!;
  const submission = getForStage(stage.id);
  const status = submission?.status;
  const isVerified = status === "approved";
  const isChecking = status === "verifying" || status === "pending" || status === "needs_review";

  // Reference task for this stage; supplies a useful link when it has one.
  const guide = tasks[0];
  // The link is generated too, so an off-site one has to survive the scheme
  // check and an in-app one has to be a real path.
  const external = safeExternalUrl(guide?.link);
  const link = external ?? (guide?.link?.startsWith("/") ? guide.link : null);

  const statusBadge = isCompleted
    ? { label: "Completed", cls: "text-success" }
    : isVerified
    ? { label: "Verified, ready to claim", cls: "text-success" }
    : status === "verifying" || status === "pending"
    ? { label: "Verifying", cls: "text-primary" }
    : status === "needs_review"
    ? { label: "In admin review", cls: "text-warning" }
    : status === "rejected"
    ? { label: "Evidence rejected", cls: "text-destructive" }
    : isCurrent
    ? { label: "In progress", cls: "text-primary" }
    : isLocked
    ? { label: "Locked", cls: "text-muted-foreground" }
    : { label: "Available", cls: "text-foreground" };

  const canClaim = isVerified && !isCompleted;

  // Where the student is in upload -> verify -> claim.
  const step = isCompleted || canClaim ? 3 : isChecking ? 2 : 1;
  const steps = ["Upload evidence", "Get verified", "Claim stage"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // The base DialogContent pads with p-6 sm:p-7; both must be zeroed
          // or the coloured header sits inside a white frame.
          "p-0 sm:p-0 gap-0 overflow-hidden flex flex-col [&>button]:hidden",
          "h-[100dvh] max-h-[100dvh] max-w-none rounded-none border-0",
          "sm:h-auto sm:max-h-[92dvh] sm:w-[calc(100vw-3rem)] sm:max-w-[68rem] sm:rounded-2xl sm:border",
        )}
      >
        {/* Header */}
        <div className={cn("relative shrink-0 bg-gradient-to-br px-5 pb-5 pt-6 text-white sm:px-8 sm:pb-6 sm:pt-7", lvl.color)}>
          <DialogClose
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-5 sm:top-5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </DialogClose>

          <div className="flex items-start gap-4 pr-12 sm:gap-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 font-display text-2xl font-bold ring-2 ring-white/30 sm:h-20 sm:w-20 sm:text-4xl">
              {stage.subIndex}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/85 sm:text-sm">
                Level {lvl.id} <span aria-hidden="true" className="mx-1 opacity-60">/</span> {lvl.name}
                <span aria-hidden="true" className="mx-1 opacity-60">/</span> Stage {stage.id}
              </div>
              {/* The stage's own name and description: each of the 200 stages
                  is distinct, so this is what makes one node differ from the next. */}
              <DialogTitle className="mt-1.5 font-display text-[1.75rem] font-bold leading-tight tracking-tight text-white sm:text-4xl">
                {stage.name}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-[60ch] text-base leading-relaxed text-white/95 sm:text-lg">
                {stage.description}
              </DialogDescription>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 sm:ml-[6.5rem]">
            <span className={cn("inline-flex h-8 items-center rounded-full bg-white px-3.5 text-sm font-semibold", statusBadge.cls)}>
              {statusBadge.label}
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/35 bg-white/15 px-3.5 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              Evidence required
            </span>
          </div>
        </div>

        {/* Body: the only part that scrolls */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-6 p-5 sm:px-8 sm:py-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
            {/* Brief */}
            <section className="space-y-5">
              <div className="rounded-2xl border bg-muted/40 p-5 sm:p-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  <Trophy className="h-4 w-4 text-warning" />
                  What counts as done
                </h3>
                <p className="mt-3 text-lg font-medium leading-relaxed text-foreground">{stage.outcome}</p>
              </div>

              {/* The Level's task library is pooled across all 20 of its
                  stages, so its entries frequently describe something other
                  than this stage. Rendering them as instructions gave students
                  confidently wrong advice, so the stage's own description and
                  outcome are the brief. Only the task's link is surfaced. */}
              {!isLocked && link && (
                <a
                  href={link}
                  target={external ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-base font-medium text-primary transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <span>{guide?.linkLabel || "Open related tool"}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              )}

              {!isLocked && (
                <ol className="space-y-3" aria-label="Steps to complete this stage">
                  {steps.map((label, i) => {
                    const n = i + 1;
                    const done = n < step || (n === 3 && isCompleted);
                    const active = n === step && !done;
                    return (
                      <li key={label} className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                            done ? "bg-success text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                          )}
                        >
                          {done ? <Check className="h-4 w-4" /> : n}
                        </span>
                        <span className={cn("text-base", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
                          {label}
                        </span>
                        {active && <span className="sr-only">(current step)</span>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {/* Evidence */}
            {isLocked ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30 p-10 text-center">
                <Lock className="mb-3 h-7 w-7 text-muted-foreground" />
                <p className="text-lg font-semibold">This stage is locked</p>
                <p className="mt-1 max-w-[36ch] text-base text-muted-foreground">
                  Complete and verify the previous stage to unlock this one.
                </p>
              </div>
            ) : (
              <section>
                <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Submit your evidence
                </h3>
                <p className="mb-4 mt-1 text-base leading-relaxed text-muted-foreground">
                  Show you hit the outcome. Anything unclear goes to a human reviewer.
                </p>
                <InlineProofUpload stage={stage} task={guide} submission={submission} />
              </section>
            )}
          </div>
        </div>

        {/* Footer: pinned so the claim action is always in reach */}
        {!isLocked && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/40 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-4">
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground sm:text-base" role="status">
              {isCompleted ? (
                <><CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> Stage banked. The next one is open.</>
              ) : canClaim ? (
                <><CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> Evidence verified. Claim it to move on.</>
              ) : status === "verifying" || status === "pending" ? (
                <><Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" /> Checking your evidence...</>
              ) : status === "needs_review" ? (
                <><AlertCircle className="h-5 w-5 shrink-0 text-warning" /> An admin is reviewing this.</>
              ) : status === "rejected" ? (
                <><XCircle className="h-5 w-5 shrink-0 text-destructive" /> Upload clearer evidence to try again.</>
              ) : (
                <><Lock className="h-5 w-5 shrink-0" /> Claim unlocks once your evidence is verified.</>
              )}
            </div>
            <Button
              size="lg"
              onClick={async () => {
                if (!canClaim) return;
                await onClaim(stage, tasks.map((t) => t.id));
                onOpenChange(false);
              }}
              disabled={!canClaim}
              variant={canClaim ? "default" : "outline"}
              className="h-12 shrink-0 gap-2 px-5 text-base sm:px-6"
            >
              {isCompleted ? <Trophy className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              {isCompleted ? "Completed" : "Claim stage"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
