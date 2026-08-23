import {
  ExternalLink, Target, Trophy, X, ShieldCheck,
  Lock, CheckCircle2, Loader2, AlertCircle, XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { LEVELS, LevelTask, StageDef } from "@/lib/journeyLevels";
import { useProofSubmissions } from "@/hooks/useProofSubmissions";
import { InlineProofUpload } from "./InlineProofUpload";
import { safeExternalUrl } from "@/lib/safeUrl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: StageDef | null;
  /** Reference guidance drawn from the Level's task library — not checkboxes. */
  tasks: LevelTask[];
  isCurrent: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  /** Called once evidence is verified, to bank the level and award a gem. */
  onClaim: (stage: StageDef, taskIds: string[]) => Promise<void> | void;
}

/**
 * A stage is the unit of work. It is completed by submitting evidence that
 * passes verification — there is deliberately no self-attestation control,
 * because a checkbox that anyone can tick carries no signal for admissions.
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

  // Reference task for this stage — supplies micro-steps and useful links.
  const guide = tasks[0];

  const statusBadge = isCompleted
    ? { label: "Completed", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" }
    : isVerified
    ? { label: "Verified — ready to claim", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" }
    : status === "verifying" || status === "pending"
    ? { label: "Verifying", cls: "bg-primary/15 text-primary border-primary/30" }
    : status === "needs_review"
    ? { label: "In admin review", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30" }
    : status === "rejected"
    ? { label: "Evidence rejected", cls: "bg-rose-500/15 text-rose-700 border-rose-500/30" }
    : isCurrent
    ? { label: "In progress", cls: "bg-primary/15 text-primary border-primary/30" }
    : isLocked
    ? { label: "Locked", cls: "bg-muted text-muted-foreground border-border" }
    : { label: "Available", cls: "bg-accent/15 text-accent border-accent/30" };

  const canClaim = isVerified && !isCompleted;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[61rem] p-0 overflow-hidden gap-0 [&>button]:hidden">
        <div className={cn("relative bg-gradient-to-br p-6 text-white", lvl.color)}>
          <DialogClose
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DialogClose>

          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-black text-2xl ring-2 ring-white/30 shrink-0">
              {stage.subIndex}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Level {lvl.id} · {lvl.name} · Stage {stage.id}
              </div>
              {/* The stage's own name/description — each of the 200 stages is
                  distinct, so this is what makes one node differ from the next. */}
              <DialogTitle className="text-2xl font-bold mt-1 text-white">{stage.name}</DialogTitle>
              <DialogDescription className="text-sm opacity-90 mt-1 leading-relaxed text-white">
                {stage.description}
              </DialogDescription>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {/* bg-white/95 must come last — twMerge keeps the final background
                utility, and the status classes carry their own tinted bg. */}
            <Badge variant="outline" className={cn("border", statusBadge.cls, "bg-white/95")}>
              {statusBadge.label}
            </Badge>
            <Badge variant="outline" className="bg-white/15 border-white/30 text-white">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Evidence required
            </Badge>
          </div>
        </div>

        <ScrollArea className="max-h-[55dvh]">
          <div className="p-6 space-y-5">
            {/* What success looks like — the stage's own outcome */}
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Trophy className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  What counts as done
                </h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{stage.outcome}</p>
            </div>

            {isLocked ? (
              <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center">
                <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">
                  Complete and verify the previous stage to unlock this one.
                </div>
              </div>
            ) : (
              <>
                {/* The Level's task library is pooled across all 20 of its
                    stages, so its entries frequently describe something other
                    than this stage (a course-enrolment task on a "set up your
                    LinkedIn" stage, say). Rendering it as "how to approach it"
                    gave students confidently wrong instructions, so the stage's
                    own description and outcome above are the brief. Only the
                    task's link is worth surfacing, and only when it exists. */}
                {/* The link is generated too, so an off-site one has to survive
                    the scheme check and an in-app one has to be a real path. */}
                {(safeExternalUrl(guide?.link) ?? (guide?.link?.startsWith("/") ? guide.link : null)) && (
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary shrink-0" />
                    <a
                      href={safeExternalUrl(guide?.link) ?? guide!.link!}
                      target={safeExternalUrl(guide?.link) ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {guide.linkLabel || "Open related tool"} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Evidence — the only way to complete a stage */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Submit your evidence
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                    Upload a certificate, screenshot, or document that shows you hit the outcome above.
                    It's checked automatically — anything unclear goes to a human reviewer.
                  </p>
                  <InlineProofUpload stage={stage} task={guide} submission={submission} />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {!isLocked && (
          <div className="border-t bg-muted/30 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {isCompleted ? (
                <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Stage banked — next one is open.</>
              ) : canClaim ? (
                <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Evidence verified. Claim it to move on.</>
              ) : status === "verifying" || status === "pending" ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Checking your evidence…</>
              ) : status === "needs_review" ? (
                <><AlertCircle className="h-3.5 w-3.5 text-amber-600" /> An admin is reviewing this.</>
              ) : status === "rejected" ? (
                <><XCircle className="h-3.5 w-3.5 text-rose-600" /> Upload clearer evidence to try again.</>
              ) : (
                <><Lock className="h-3.5 w-3.5" /> Submit verified evidence to complete this stage.</>
              )}
            </div>
            <Button
              onClick={async () => {
                if (!canClaim) return;
                await onClaim(stage, tasks.map((t) => t.id));
                onOpenChange(false);
              }}
              disabled={!canClaim}
              className="gap-2"
            >
              {isCompleted ? <Trophy className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {isCompleted ? "Completed" : "Claim stage"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
