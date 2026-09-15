import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MultiStateButton } from "@/components/ui/multi-state-button";
import { cn } from "@/lib/utils";
import { useLorStrategy } from "@/hooks/useLorStrategy";

/*
 * Weight, not hue.
 *
 * Rating used to be emerald / amber / rose and severity rose / amber / grey,
 * which is six colours inside a card that sits on a page already carrying one
 * accent. A rating reads perfectly well as its own word set in the foreground
 * or muted ink, and severity only needs to separate "act on this" from the
 * rest, which one tone does.
 */
const ratingTone: Record<string, string> = {
  strong: "border-foreground/30 text-foreground",
  average: "border-border text-muted-foreground",
  weak: "border-destructive/40 text-destructive",
};
const severityTone: Record<string, string> = {
  high: "text-destructive",
  medium: "text-foreground",
  low: "text-muted-foreground",
};

export function StrategyCard({ disabled }: { disabled: boolean }) {
  const { run, result } = useLorStrategy();
  /*
   * Closed until asked for. Open, and with no run yet, this card is a heading
   * and a single button occupying 150px directly above the list the student
   * came to read. It opens itself once there is a result to show.
   */
  const [open, setOpen] = useState(false);

  // A result nobody can see is a result wasted, so producing one opens the card.
  useEffect(() => {
    if (result) setOpen(true);
  }, [result]);

  return (
    <div className="rounded-xl border bg-card mb-6 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition"
      >
        <div className="flex items-center gap-3">
          <div className="text-left">
            <div className="text-sm font-medium">Rank this lineup</div>
            <div className="text-xs text-muted-foreground">
              Orders your recommenders by how strong a letter each is likely to write, and names
              what the set is missing. Uses one AI credit.
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
                {/* mutateAsync, not mutate: the button's state machine is
                    driven by the promise, and `mutate` returns void so a
                    failure would never reach it. */}
                <MultiStateButton
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => run.mutateAsync()}
                  idleLabel={result ? "Re-run analysis" : "Analyze lineup"}
                  loadingLabel="Analyzing…"
                  successLabel="Ranked"
                  errorLabel="Could not analyze"
                />
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
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                                      ratingTone[r.rating]
                                    )}
                                  >
                                    {r.rating}
                                  </span>
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
