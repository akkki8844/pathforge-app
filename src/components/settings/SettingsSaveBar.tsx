import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsForm } from "./SettingsFormContext";
import { transition } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The single commit point for the whole settings page.
 *
 * Docks to the bottom of the viewport and only appears once something is
 * actually different from the server state, so a page you're only reading
 * stays clean. Save is disabled when nothing is dirty — the old per-section
 * buttons were always enabled, which is part of why "saved" stopped meaning
 * anything.
 */
export function SettingsSaveBar() {
  const { dirtyCount, saving, saveAll, discardAll, lastResults } = useSettingsForm();

  const failures = lastResults?.filter((r) => !r.ok) ?? [];
  const successes = lastResults?.filter((r) => r.ok) ?? [];

  // A clean save leaves nothing dirty, so the bar would have nothing to say.
  // Hold the confirmation briefly, then retire the bar — an error receipt is
  // never auto-dismissed, because the user still has to act on it.
  const [receiptExpired, setReceiptExpired] = useState(false);
  useEffect(() => {
    setReceiptExpired(false);
    if (!lastResults || lastResults.some((r) => !r.ok)) return;
    const id = window.setTimeout(() => setReceiptExpired(true), 4000);
    return () => window.clearTimeout(id);
  }, [lastResults]);

  const showReceipt = !!lastResults && dirtyCount === 0 && !receiptExpired;
  const visible = dirtyCount > 0 || saving || showReceipt;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={transition.base}
          className="fixed inset-x-0 bottom-0 z-40 pointer-events-none"
        >
          <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-10">
            <div
              className={cn(
                "pointer-events-auto rounded-2xl border bg-card/95 backdrop-blur-md",
                "shadow-[0_8px_40px_-12px_hsl(var(--foreground)/0.28)]",
                failures.length > 0 ? "border-destructive/40" : "border-border",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5 sm:px-6">
                <div className="min-w-0 flex-1">
                  {failures.length > 0 ? (
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-foreground">
                          {successes.length > 0
                            ? "Saved some changes — the rest failed"
                            : "Nothing was saved"}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {failures.map((f) => (
                            <li key={f.group} className="text-[12.5px] leading-relaxed text-muted-foreground">
                              <span className="font-medium text-foreground">{f.label}:</span>{" "}
                              {f.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : showReceipt ? (
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3 w-3" />
                      </span>
                      <p className="text-[13.5px] text-foreground">
                        Saved{" "}
                        <span className="text-muted-foreground">
                          {successes.map((s) => s.label.toLowerCase()).join(", ")}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2 w-2 flex-shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                      <p className="text-[13.5px] text-foreground">
                        <span className="font-semibold tabular-nums">{dirtyCount}</span>{" "}
                        unsaved change{dirtyCount === 1 ? "" : "s"}
                        <span className="hidden text-muted-foreground sm:inline">
                          {" "}
                          across this page
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {dirtyCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={discardAll}
                      disabled={saving}
                      className="text-muted-foreground"
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Discard
                    </Button>
                  )}
                  <Button size="sm" onClick={() => void saveAll()} disabled={saving || dirtyCount === 0}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Saving…
                      </>
                    ) : failures.length > 0 ? (
                      "Retry"
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
