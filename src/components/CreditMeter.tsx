import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { Zap, ChevronLeft, ChevronRight, ArrowUpRight, GripVertical } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useDraggablePosition } from "@/hooks/useDraggablePosition";
import { CreditBurn } from "@/components/credit/CreditBurn";
import { planTierFromString, tierSatisfies } from "@/lib/plans";

export function CreditMeter() {
  const { creditData, usagePercent, creditsRemaining, totalCapacity, totalUsed, getResetTime, loading } = useCredits();
  const { isAdmin, isTeacher, user } = useAuth();
  const navigate = useNavigate();

  // The meter is docked to the left rail and only travels vertically. See
  // useDraggablePosition for why horizontal movement was removed.
  const defaultPos =
    typeof window !== "undefined"
      ? { y: window.innerHeight - 220 }
      : { y: 500 };
  const { pos, commitDrag } = useDraggablePosition("pf:creditMeterPos", defaultPos);

  // Framer writes the in-flight drag offset into this value. We fold it into
  // `pos.y` and zero it on drag end so `top` stays the single source of truth.
  const dragY = useMotionValue(0);

  // Collapse-to-edge state, persisted.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pf:creditMeterCollapsed") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("pf:creditMeterCollapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  // Animated counter
  const usedMV = useMotionValue(totalUsed);
  const usedDisplay = useTransform(usedMV, (v) => Math.round(v).toString());
  useEffect(() => {
    const controls = animate(usedMV, totalUsed, { duration: 0.5, ease: "easeOut" });
    return () => controls.stop();
  }, [totalUsed]);

  // Burn animation trigger
  const [burning, setBurning] = useState(false);
  const burnTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const onBurn = () => {
      // Force-expand from edge so the burn is visible
      setCollapsed(false);
      setBurning(true);
      if (burnTimerRef.current) window.clearTimeout(burnTimerRef.current);
      burnTimerRef.current = window.setTimeout(() => setBurning(false), 1800) as unknown as number;
    };
    window.addEventListener("credit-consumed", onBurn);
    return () => {
      window.removeEventListener("credit-consumed", onBurn);
      if (burnTimerRef.current) window.clearTimeout(burnTimerRef.current);
    };
  }, []);

  if (!user || isAdmin || isTeacher) return null;
  if (loading || !creditData) return null;

  const isLow = usagePercent >= 80;
  const isEmpty = creditsRemaining <= 0;
  const hasBonus = creditData.bonusCredits > 0;
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (usagePercent / 100) * circumference;
  const isPro = tierSatisfies(planTierFromString(creditData.plan), "pro");

  // --- Collapsed tab, always on the left rail ---
  if (collapsed) {
    return (
      <motion.button
        type="button"
        onClick={() => setCollapsed(false)}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        aria-label="Show credits"
        className="hidden md:flex fixed top-1/2 -translate-y-1/2 z-40 items-center gap-1 px-1.5 py-3 bg-card/90 backdrop-blur-xl border border-border/60 shadow-lg cursor-pointer left-0 rounded-r-lg border-l-0"
      >
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex flex-col items-center">
          <Zap className={`h-3.5 w-3.5 ${isEmpty ? "text-destructive" : "text-primary"}`} />
          <span className="text-[9px] font-bold tabular-nums text-foreground mt-0.5">{creditsRemaining}</span>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      drag="y"
      dragMomentum={false}
      // No elasticity: with it, the meter could be flung past the viewport
      // bounds and settle offscreen.
      dragElastic={0}
      dragConstraints={{
        top: -pos.y + 16,
        bottom: (typeof window !== "undefined" ? window.innerHeight : 800) - pos.y - 140,
      }}
      onDragEnd={(_, info) => {
        commitDrag(info.offset.y);
        dragY.set(0);
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ left: 16, top: pos.y, y: dragY }}
      className="hidden md:flex fixed z-40 flex-col items-start gap-2"
    >
      {/* Drag handle + collapse */}
      <div className="flex items-center gap-1 self-stretch">
        <button
          type="button"
          className="p-1 rounded hover:bg-muted/60 cursor-grab active:cursor-grabbing text-muted-foreground"
          aria-label="Drag credit meter"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-muted/60 text-muted-foreground ml-auto"
          aria-label="Hide credit meter"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      </div>

      <div className="relative">
        <CreditBurn show={burning} />

        <div onClick={() => navigate("/pricing")} className="bg-card/85 backdrop-blur-xl border border-border/60 rounded-2xl p-3 shadow-lg flex items-center gap-3 min-w-[220px] cursor-pointer hover:border-primary/40 transition-colors">
          {/* Circular progress */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
              <motion.circle
                cx="40" cy="40" r="36" fill="none"
                stroke={isEmpty ? "hsl(var(--destructive))" : isLow ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                strokeWidth="4" strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <motion.div
              animate={burning ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Zap className={`h-4 w-4 ${isEmpty ? "text-destructive" : "text-primary"}`} />
            </motion.div>
          </div>

          <div className="text-xs flex-1 min-w-0">
            <div className="font-semibold text-foreground tabular-nums">
              <motion.span>{usedDisplay}</motion.span> / {totalCapacity}
            </div>
            <div className="text-muted-foreground">credits used</div>
            {isPro ? (
              <div className="text-primary/90 text-[10px] font-medium">Pro — {creditData.bonusCredits} plan + {Math.max(0, creditData.maxCredits - creditData.creditsUsed)}/{creditData.maxCredits} daily</div>
            ) : hasBonus ? (
              <div className="text-primary/80 text-[10px] font-medium">
                {creditData.bonusCredits} bonus + {Math.max(0, creditData.maxCredits - creditData.creditsUsed)}/{creditData.maxCredits} daily
              </div>
            ) : (
              <div className="text-muted-foreground/70 text-[10px]">
                Daily resets in {getResetTime()}
              </div>
            )}
          </div>
        </div>

        {/* Integrated upgrade CTA — appears ONLY when out of credits (or low) */}
        <AnimatePresence>
          {isEmpty && !isPro && (
            <motion.button
              key="upgrade"
              type="button"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              onClick={() => navigate("/pricing")}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-destructive/15 hover:bg-destructive/25 border border-destructive/40 text-destructive text-xs font-semibold transition-colors"
            >
              <span>Out of credits — upgrade to Pro</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </AnimatePresence>

        {isLow && !isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 bg-accent/15 text-accent text-[10px] text-center py-1 px-2 rounded-lg border border-accent/30"
          >
            Running low on credits
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
