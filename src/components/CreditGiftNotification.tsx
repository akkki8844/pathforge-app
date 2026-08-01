import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface CreditGift {
  id: string;
  amount: number;
  message: string | null;
  created_at: string;
}

/**
 * Polls every 60s (and on mount + window focus) for un-seen `credit_gifts`
 * rows belonging to the signed-in user. Shows one animated popup at a time
 * and marks them seen on dismiss. Hidden for admins/teachers/guests.
 */
export function CreditGiftNotification() {
  const { user, isAdmin, isTeacher } = useAuth();
  const [queue, setQueue] = useState<CreditGift[]>([]);
  const [current, setCurrent] = useState<CreditGift | null>(null);

  const fetchGifts = useCallback(async () => {
    if (!user || isAdmin || isTeacher) return;
    const { data, error } = await supabase
      .from("credit_gifts")
      .select("id, amount, message, created_at")
      .eq("seen", false)
      .order("created_at", { ascending: true });
    if (error || !data?.length) return;
    setQueue((prev) => {
      const known = new Set(prev.map((g) => g.id));
      const fresh = (data as CreditGift[]).filter((g) => !known.has(g.id));
      return [...prev, ...fresh];
    });
  }, [user, isAdmin, isTeacher]);

  // Initial fetch + interval + window focus. Poll pauses while the tab is
  // hidden so background tabs don't hammer the DB or spend credits.
  useEffect(() => {
    if (!user || isAdmin || isTeacher) return;
    fetchGifts();
    let interval: number | null = null;
    const start = () => {
      if (interval == null) interval = window.setInterval(fetchGifts, 60_000);
    };
    const stop = () => {
      if (interval != null) { window.clearInterval(interval); interval = null; }
    };
    if (document.visibilityState === "visible") start();
    const onVisibility = () => {
      if (document.visibilityState === "visible") { fetchGifts(); start(); } else stop();
    };
    const onFocus = () => fetchGifts();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, isAdmin, isTeacher, fetchGifts]);

  // Promote next from queue when nothing is showing
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [current, queue]);

  const dismiss = async () => {
    if (!current) return;
    const id = current.id;
    setCurrent(null);
    // Best-effort mark-seen; failure just means we'll show again next session
    await supabase
      .from("credit_gifts")
      .update({ seen: true, seen_at: new Date().toISOString() })
      .eq("id", id);
    // Refresh global credits so the meter ticks up
    window.dispatchEvent(new CustomEvent("credit-consumed"));
  };

  if (!user || isAdmin || isTeacher) return null;

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className="fixed bottom-6 right-6 z-[60] max-w-sm"
          role="status"
          aria-live="polite"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            {/* Accent gradient bar */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <div className="p-5 pr-10">
              <button
                onClick={dismiss}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Gift className="h-5 w-5" />
                  </div>
                  <motion.span
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.15, type: "spring" }}
                    className="absolute -right-1 -top-1 text-accent"
                  >
                    <Gift className="h-3.5 w-3.5" />
                  </motion.span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    You've been gifted{" "}
                    <span className="text-primary">{current.amount}</span>{" "}
                    credit{current.amount === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Credits have been added to your account by Pathforge.
                  </p>
                  {current.message && (
                    <p className="text-xs text-foreground/80 mt-2 italic border-l-2 border-border pl-2">
                      "{current.message}"
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-3 h-7 px-2 text-xs"
                    onClick={dismiss}
                  >
                    Got it
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
