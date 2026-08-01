import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, AlertTriangle, Loader2, Lightbulb } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLorStrategy } from "@/hooks/useLorStrategy";

const ratingTone: Record<string, string> = {
  strong: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  average: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  weak: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
};
const severityTone: Record<string, string> = {
  high: "text-rose-600 dark:text-rose-300",
  medium: "text-amber-600 dark:text-amber-300",
  low: "text-muted-foreground",
};

export function StrategyCard({ disabled }: { disabled: boolean }) {
  const { run, result } = useLorStrategy();
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border bg-card mb-6 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">Strategy</div>
            <div className="text-xs text-muted-foreground">
              AI ranks your lineup and surfaces gaps. 1 credit per run.
            </div>
          </div>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => run.mutate()}
                  disabled={disabled || run.isPending}
                >
                  {run.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analyzing…
                    </>
                  ) : result ? (
                    "Re-run analysis"
                  ) : (
                    "Analyze lineup"
                  )}
                </Button>
                {disabled && (
                  <span className="text-xs text-muted-foreground">
                    Add a recommender to enable.
                  </span>
                )}
              </div>

              {result && (
                <div className="space-y-5">
                  {result.summary && (
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {result.summary}
                    </p>
                  )}

                  {result.ranked.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                        Ranked lineup
                      </div>
                      <div className="space-y-2">
                        {result.ranked
                          .slice()
                          .sort((a, b) => a.rank - b.rank)
                          .map((r) => (
                            <div
                              key={r.recommender_id}
                              className="flex gap-3 rounded-lg border bg-background p-3"
                            >
                              <div className="h-7 w-7 rounded-full bg-muted text-xs font-medium flex items-center justify-center shrink-0">
                                {r.rank}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-medium text-sm truncate">{r.name}</span>
                                  <Badge
                                    variant="secondary"
                                    className={cn("text-[10px]", ratingTone[r.rating])}
                                  >
                                    {r.rating}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {r.reasoning}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {result.gaps.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                        Gaps
                      </div>
                      <div className="space-y-2">
                        {result.gaps.map((g, i) => (
                          <div key={i} className="flex gap-3 rounded-lg border border-dashed bg-background/50 p-3">
                            <AlertTriangle
                              className={cn("h-4 w-4 mt-0.5 shrink-0", severityTone[g.severity])}
                            />
                            <div className="min-w-0">
                              <div className="font-medium text-sm">{g.title}</div>
                              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                                {g.why}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.gaps.length === 0 && result.ranked.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      No critical gaps detected in your current lineup.
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
