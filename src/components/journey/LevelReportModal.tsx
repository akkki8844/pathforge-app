import { motion } from "framer-motion";
import {
  X, Sparkles, Loader2, AlertCircle, RotateCw,
  TrendingUp, Target, ArrowRight, FileCheck2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { LEVELS, LevelId } from "@/lib/journeyLevels";
import type { LevelEvaluation } from "@/hooks/useLevelEvaluations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: LevelId | null;
  evaluation?: LevelEvaluation;
  onRegenerate: () => void;
}

// Band the score so the headline colour carries the verdict at a glance,
// matching the calibration the evaluator prompt is anchored to.
function bandFor(score: number) {
  if (score >= 85) return { label: "Exceptional", cls: "text-emerald-600", ring: "#10b981" };
  if (score >= 70) return { label: "Solid", cls: "text-sky-600", ring: "#0284c7" };
  if (score >= 55) return { label: "Adequate", cls: "text-amber-600", ring: "#d97706" };
  if (score >= 40) return { label: "Weak", cls: "text-orange-600", ring: "#ea580c" };
  return { label: "Needs work", cls: "text-rose-600", ring: "#e11d48" };
}

function ScoreRing({ score }: { score: number }) {
  const band = bandFor(score);
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={R} fill="none" strokeWidth="7" className="stroke-muted" />
        <motion.circle
          cx="40" cy="40" r={R} fill="none" strokeWidth="7" strokeLinecap="round"
          style={{ stroke: band.ring }}
          initial={{ strokeDasharray: C, strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (Math.max(0, Math.min(100, score)) / 100) * C }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-black tabular-nums leading-none", band.cls)}>{score}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
          / 100
        </span>
      </div>
    </div>
  );
}

function Section({
  icon: Icon, title, items, tone, ordered,
}: {
  icon: any; title: string; items: string[];
  tone: "positive" | "negative" | "action"; ordered?: boolean;
}) {
  if (!items.length) return null;
  const dot = tone === "positive"
    ? "bg-emerald-500"
    : tone === "negative"
    ? "bg-amber-500"
    : "bg-primary";
  const iconCls = tone === "positive"
    ? "text-emerald-600"
    : tone === "negative"
    ? "text-amber-600"
    : "text-primary";

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", iconCls)} />
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
            className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed"
          >
            {ordered ? (
              <span className={cn(
                "mt-0.5 h-4 w-4 shrink-0 rounded-full text-[10px] font-bold text-white",
                "flex items-center justify-center", dot
              )}>
                {i + 1}
              </span>
            ) : (
              <span className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
            )}
            <span>{item}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The report a student gets once all 20 stages of a Level are banked. Per-stage
 * verification answers "did this one artefact count?"; this answers "did the
 * level add up to anything?" — which is the question admissions actually asks.
 */
export function LevelReportModal({ open, onOpenChange, level, evaluation, onRegenerate }: Props) {
  if (!level) return null;
  const lvl = LEVELS.find((l) => l.id === level)!;
  const status = evaluation?.status;
  const isReady = status === "ready";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 [&>button]:hidden">
        <div className={cn("relative bg-gradient-to-br p-6 text-white", lvl.color)}>
          <DialogClose
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DialogClose>

          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/30 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Level {lvl.id} · {lvl.name} · Complete
              </div>
              <DialogTitle className="text-2xl font-bold mt-1 text-white">
                Your Level {lvl.id} evaluation
              </DialogTitle>
              <DialogDescription className="text-sm opacity-90 mt-1 leading-relaxed text-white">
                An AI read across every piece of evidence you banked in this level — not just whether
                each one passed, but whether the level adds up.
              </DialogDescription>
            </div>
          </div>

          {isReady && evaluation?.evidence_count !== undefined && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-white/15 border-white/30 text-white">
                <FileCheck2 className="h-3 w-3 mr-1" />
                {evaluation.evidence_count} piece{evaluation.evidence_count === 1 ? "" : "s"} of evidence reviewed
              </Badge>
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[58vh]">
          <div className="p-6">
            {!evaluation || status === "generating" ? (
              <div className="py-12 flex flex-col items-center text-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <div className="text-sm font-semibold">Reading your level…</div>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Weighing all 20 stages of evidence together. This usually takes under a minute —
                  the report appears here automatically.
                </p>
              </div>
            ) : status === "failed" ? (
              <div className="py-10 flex flex-col items-center text-center gap-3">
                <AlertCircle className="h-7 w-7 text-amber-500" />
                <div className="text-sm font-semibold">Couldn't generate the report</div>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  {evaluation.error || "Something went wrong. Your level progress is safe — this is just the report."}
                </p>
                <Button size="sm" variant="outline" onClick={onRegenerate} className="gap-1.5 mt-1">
                  <RotateCw className="h-3.5 w-3.5" />
                  Try again
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Headline verdict */}
                <div className="flex items-start gap-5">
                  <ScoreRing score={evaluation.score ?? 0} />
                  <div className="min-w-0 flex-1 pt-1">
                    <div className={cn("text-[10px] font-bold uppercase tracking-wider", bandFor(evaluation.score ?? 0).cls)}>
                      {bandFor(evaluation.score ?? 0).label} for this level
                    </div>
                    {evaluation.verdict && (
                      <p className="text-base font-bold text-foreground mt-1 leading-snug">
                        {evaluation.verdict}
                      </p>
                    )}
                    {evaluation.summary && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {evaluation.summary}
                      </p>
                    )}
                  </div>
                </div>

                <div className="h-px bg-border" />

                <Section icon={TrendingUp} title="What landed" items={evaluation.strengths ?? []} tone="positive" />
                <Section icon={Target} title="Where it's thin" items={evaluation.gaps ?? []} tone="negative" />
                <Section
                  icon={ArrowRight}
                  title={level < 10 ? `Prioritize in Level ${level + 1}` : "Prioritize before you submit"}
                  items={evaluation.priorities ?? []}
                  tone="action"
                  ordered
                />

                <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
                  AI-generated from the evidence you submitted. It's a read on your profile, not an
                  admissions decision — treat the priorities as a starting point, not a rulebook.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {isReady && (
          <div className="border-t bg-muted/30 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              Level {lvl.id} banked. {level < 10 ? `Level ${level + 1} is open.` : "You're at the end of the path."}
            </div>
            <Button size="sm" variant="outline" onClick={onRegenerate} className="gap-1.5">
              <RotateCw className="h-3.5 w-3.5" />
              Re-run evaluation
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
