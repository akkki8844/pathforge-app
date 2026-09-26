import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check, ChevronDown, ChevronUp, Crosshair, Lock, Loader2, MousePointer2, Sparkles, Star, Hand,
} from "lucide-react";
import { toast } from "sonner";
import { LEVELS, STAGES, type LevelId, type StageDef } from "@/lib/journeyLevels";
import { LEVEL_CLAY, LevelPlaque, type LevelReportState } from "@/components/journey/LevelPath";
import { cn } from "@/lib/utils";
import { transition } from "@/lib/motion";
import { createJourneyWorld, type NodeState, type WorldHandle } from "@/components/journey/world/scene";

interface Props {
  currentStageIndex: number;
  completedStageIds: string[];
  onStageClick: (stage: StageDef) => void;
  isLevelComplete?: (level: LevelId) => boolean;
  reportStateFor?: (level: LevelId) => LevelReportState;
  onOpenLevelReport?: (level: LevelId) => void;
  /** Rendered instead of the world when WebGL is unavailable. */
  fallback: ReactNode;
}

const SEP = "·";
const DASH = "—";

function useDarkClass() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const el = document.documentElement;
    const mo = new MutationObserver(() => setDark(el.classList.contains("dark")));
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

function firstOfLevel(level: LevelId) {
  return STAGES.findIndex((s) => s.level === level);
}

/**
 * The journey rendered as a 3D world: floating level islands, a road of stage
 * coins, and a campus at the summit. The scene itself lives in
 * `world/scene.ts`; this component owns the HUD laid over it and translates
 * clicks back into the page's stage modal.
 */
export default function JourneyWorld({
  currentStageIndex,
  completedStageIds,
  onStageClick,
  isLevelComplete,
  reportStateFor,
  onOpenLevelReport,
  fallback,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const hereRef = useRef<HTMLDivElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<WorldHandle | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [focusIdx, setFocusIdx] = useState(currentStageIndex);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const dark = useDarkClass();

  const states = useMemo<NodeState[]>(() => {
    const done = new Set(completedStageIds);
    return STAGES.map((s, i) => {
      if (done.has(s.id)) return "done";
      const prevDone = i === 0 || done.has(STAGES[i - 1].id);
      return prevDone ? "current" : "locked";
    });
  }, [completedStageIds]);

  // The page's handlers change identity every render; the scene is built once,
  // so it reads them through a ref.
  const live = useRef({ states, onStageClick });
  live.current = { states, onStageClick };

  const allDone = states.every((s) => s === "done");
  const current = STAGES[Math.min(Math.max(currentStageIndex, 0), STAGES.length - 1)];

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const world = createJourneyWorld(
      mount,
      {
        onHover: (i) => setHoverIdx(i),
        onSelect: (i) => {
          const st = live.current.states[i];
          const stage = STAGES[i];
          if (st === "locked") {
            const prev = STAGES[i - 1];
            toast(`Stage ${stage.id} is locked`, {
              description: prev ? `Finish stage ${prev.id} ${DASH} ${prev.name} ${DASH} to open it.` : undefined,
            });
            return;
          }
          live.current.onStageClick(stage);
        },
        onFocusChange: (i) => setFocusIdx(i),
        onInteract: () => setTouched(true),
      },
      () => ({ here: hereRef.current, tip: tipRef.current }),
      {
        dark: document.documentElement.classList.contains("dark"),
        reducedMotion: reduced,
        initialFocus: currentStageIndex,
      },
    );
    if (!world) {
      setFailed(true);
      return;
    }
    worldRef.current = world;
    world.setStates(live.current.states);
    setReady(true);
    return () => {
      world.dispose();
      worldRef.current = null;
    };
    // Built once per mount; progress and theme are pushed in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    worldRef.current?.setStates(states);
  }, [states]);

  useEffect(() => {
    worldRef.current?.setDark(dark);
  }, [dark]);

  // Keyboard travel when the world has focus.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const w = worldRef.current;
    if (!w) return;
    const k = e.key;
    if (k === "ArrowUp" || k === "w" || k === "ArrowRight") w.nudge(1);
    else if (k === "ArrowDown" || k === "s" || k === "ArrowLeft") w.nudge(-1);
    else if (k === "PageUp") w.nudge(20);
    else if (k === "PageDown") w.nudge(-20);
    else if (k === "Home") w.flyTo(0);
    else if (k === "End") w.flyTo(currentStageIndex);
    else if (k === "Enter" || k === " ") {
      const st = states[focusIdx];
      if (st !== "locked") onStageClick(STAGES[focusIdx]);
    } else return;
    e.preventDefault();
    setTouched(true);
  };

  if (failed) return <>{fallback}</>;

  const focusStage = STAGES[focusIdx] ?? current;
  const focusLevel = LEVELS.find((l) => l.id === focusStage.level)!;
  const levelDone = STAGES.filter((s, i) => s.level === focusLevel.id && states[i] === "done").length;
  const levelTotal = STAGES.filter((s) => s.level === focusLevel.id).length;
  const far = Math.abs(focusIdx - currentStageIndex) > 3;
  const hover = hoverIdx !== null ? STAGES[hoverIdx] : null;
  const hoverState = hoverIdx !== null ? states[hoverIdx] : null;
  const clayOf = (l: LevelId) => LEVEL_CLAY[l] ?? LEVEL_CLAY[1];

  const levelStatus = (id: LevelId): "done" | "current" | "locked" => {
    const idx = STAGES.map((s, i) => (s.level === id ? i : -1)).filter((i) => i >= 0);
    if (idx.every((i) => states[i] === "done")) return "done";
    if (idx.some((i) => states[i] !== "locked")) return "current";
    return "locked";
  };

  return (
    <div
      data-tour="journey-path"
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border isolate",
        "bg-[linear-gradient(180deg,#dbe4fa_0%,#e9edf5_38%,#eef0f2_62%,#f1eee6_100%)]",
        "dark:bg-[linear-gradient(180deg,#060b18_0%,#0b1326_40%,#0f172b_70%,#0f172b_100%)]",
        "shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-24px_rgba(15,23,42,0.35)]",
      )}
    >
      {/* Sun / moon disc behind the scene. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[14%] top-[7%] h-24 w-24 rounded-full bg-[radial-gradient(circle,#fff6dc_0%,#ffe9b0_45%,rgba(255,233,176,0)_72%)] dark:bg-[radial-gradient(circle,#e8edff_0%,#b9c6f0_40%,rgba(185,198,240,0)_72%)]"
      />

      <div
        ref={mountRef}
        tabIndex={0}
        role="application"
        aria-label={`Journey world. You are on stage ${current.id}, ${current.name}. Use arrow keys to travel along the road and Enter to open a stage.`}
        onKeyDown={onKeyDown}
        className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-2xl"
      />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* World-anchored labels, positioned every frame by the scene. */}
      <div
        ref={hereRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-10 transition-opacity duration-200"
        style={{ opacity: 0 }}
      >
        <div className="-translate-x-1/2 -translate-y-full">
          <div className="relative rounded-full bg-card px-3 py-1 text-[10px] font-display font-bold uppercase tracking-[0.16em] text-primary shadow-[0_3px_0_rgba(15,23,42,0.12),0_8px_18px_-6px_rgba(15,23,42,0.35)] ring-1 ring-black/5 whitespace-nowrap">
            {allDone ? "Journey complete" : "You are here"}
            <span className="absolute left-1/2 -bottom-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-card" />
          </div>
        </div>
      </div>

      <div
        ref={tipRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-20"
        style={{ opacity: 0 }}
      >
        <AnimatePresence>
          {hover && (
            <motion.div
              key={hover.id}
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={transition.fast}
              className="-translate-x-1/2 -translate-y-[calc(100%+10px)]"
            >
              <div className="w-56 rounded-xl border bg-card/95 backdrop-blur px-3 py-2.5 shadow-[0_12px_30px_-10px_rgba(15,23,42,0.4)]">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-bold text-white tabular-nums"
                    style={{ background: clayOf(hover.level).bottom }}
                  >
                    {hover.id}
                  </span>
                  <span className="truncate font-display text-[13px] font-semibold">{hover.name}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">{hover.description}</p>
                <div
                  className={cn(
                    "mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                    hoverState === "done" ? "text-emerald-600 dark:text-emerald-400" : hoverState === "current" ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {hoverState === "done" ? <Check className="h-3 w-3" /> : hoverState === "current" ? <Star className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {hoverState === "done" ? "Completed" : hoverState === "current" ? "Open now" : "Locked"}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* HUD: level under the camera. */}
      <motion.div
        data-tour="path-level-banner"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition.slow}
        className="absolute left-3 top-3 sm:left-4 sm:top-4 z-30 max-w-[calc(100%-5rem)] sm:max-w-sm"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-card/85 backdrop-blur-md px-3 py-2.5 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.45)]">
          <LevelPlaque level={focusLevel.id} size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-display font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Level {focusLevel.id} of {LEVELS.length}
            </div>
            <div className="truncate font-display text-[15px] font-semibold leading-tight">{focusLevel.name}</div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 w-24 sm:w-32 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: clayOf(focusLevel.id).bottom }}
                  initial={false}
                  animate={{ width: `${(levelDone / Math.max(levelTotal, 1)) * 100}%` }}
                  transition={transition.base}
                />
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                {levelDone}/{levelTotal}
              </span>
            </div>
          </div>
          {isLevelComplete?.(focusLevel.id) && onOpenLevelReport && (
            <button
              type="button"
              onClick={() => onOpenLevelReport(focusLevel.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors",
                reportStateFor?.(focusLevel.id) === "failed"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                  : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
              )}
            >
              {reportStateFor?.(focusLevel.id) === "generating" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {reportStateFor?.(focusLevel.id) === "generating"
                ? "Evaluating"
                : reportStateFor?.(focusLevel.id) === "failed"
                  ? "Retry report"
                  : "AI report"}
            </button>
          )}
        </div>
        <p className="mt-1.5 hidden sm:block pl-1 text-[11.5px] text-muted-foreground/90 truncate">{focusLevel.tagline}</p>
      </motion.div>

      {/* Level rail. */}
      <nav
        aria-label="Levels"
        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 rounded-2xl border border-white/60 dark:border-white/10 bg-card/80 backdrop-blur-md p-1.5 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.45)]"
      >
        <button
          type="button"
          aria-label="Next stage"
          onClick={() => worldRef.current?.nudge(1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <div className="flex flex-col-reverse items-center gap-[3px] sm:gap-1">
          {LEVELS.map((l) => {
            const st = levelStatus(l.id);
            const on = l.id === focusLevel.id;
            const c = clayOf(l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  const target = st === "current" && l.id === current.level ? currentStageIndex : firstOfLevel(l.id);
                  worldRef.current?.flyTo(target);
                  setTouched(true);
                }}
                title={`Level ${l.id} ${SEP} ${l.name}`}
                aria-label={`Go to level ${l.id}, ${l.name}`}
                aria-current={on ? "true" : undefined}
                className="group relative flex h-[18px] w-7 sm:h-5 items-center justify-center"
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-200",
                    on ? "h-[18px] w-[18px] sm:h-5 sm:w-5" : "h-3 w-3 sm:h-3.5 sm:w-3.5 group-hover:scale-125",
                  )}
                  style={{
                    background: st === "locked" ? `${c.top}40` : `linear-gradient(180deg, ${c.top}, ${c.bottom})`,
                    boxShadow:
                      st === "locked"
                        ? `inset 0 0 0 1.5px ${c.top}80`
                        : `0 2px 0 ${c.lip}, inset 0 1px 1px rgba(255,255,255,0.5)`,
                  }}
                >
                  {on && (
                    <span className="text-[9px] font-black text-white leading-none drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]">
                      {st === "done" ? <Check className="h-2.5 w-2.5" strokeWidth={4} /> : l.id}
                    </span>
                  )}
                </span>
                {st === "current" && l.id === current.level && !on && (
                  <span className="absolute -right-0.5 top-0 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-card" />
                )}
                <span className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-semibold text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 sm:block">
                  {l.id} {SEP} {l.name}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Previous stage"
          onClick={() => worldRef.current?.nudge(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </nav>

      {/* Next quest card. */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition.slow, delay: 0.15 }}
        className="absolute inset-x-3 bottom-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-4 z-30 sm:w-[min(560px,calc(100%-8rem))]"
      >
        <div
          data-tour="current-stage"
          className="flex items-center gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-card/90 backdrop-blur-md p-2.5 pl-3 shadow-[0_18px_40px_-18px_rgba(15,23,42,0.55)]"
        >
          <div
            aria-hidden
            className="relative hidden min-[400px]:flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
            style={{
              background: `linear-gradient(180deg, ${clayOf(current.level).top}, ${clayOf(current.level).bottom})`,
              boxShadow: `0 3px 0 ${clayOf(current.level).lip}, inset 0 2px 3px rgba(255,255,255,0.45)`,
            }}
          >
            {allDone ? <Check className="h-5 w-5" strokeWidth={3} /> : <Star className="h-5 w-5" fill="currentColor" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-display font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {allDone ? "Every stage banked" : `Your next quest ${SEP} Stage ${current.id}`}
            </div>
            <div className="truncate font-display text-[15px] font-semibold leading-tight">
              {allDone ? "You finished the whole journey" : current.name}
            </div>
            <p className="hidden sm:block truncate text-[12px] text-muted-foreground">{current.description}</p>
          </div>
          <AnimatePresence>
            {far && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={transition.fast}
                onClick={() => worldRef.current?.flyTo(currentStageIndex)}
                aria-label="Back to my stage"
                title="Back to my stage"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background text-foreground hover:bg-muted"
              >
                <Crosshair className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
          {!allDone && (
            <button
              type="button"
              onClick={() => {
                worldRef.current?.flyTo(currentStageIndex);
                onStageClick(current);
              }}
              className="shrink-0 inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-[12px] font-display font-bold uppercase tracking-wider text-primary-foreground shadow-[0_3px_0_hsl(var(--highlight))] transition-transform hover:-translate-y-px active:translate-y-[2px] active:shadow-none"
            >
              Open
            </button>
          )}
        </div>
      </motion.div>

      {/* Controls hint, retired after the first move. */}
      <AnimatePresence>
        {ready && !touched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 1.2 }}
            className="pointer-events-none absolute left-1/2 top-4 z-20 hidden -translate-x-1/2 md:flex items-center gap-2 rounded-full bg-foreground/80 px-3 py-1.5 text-[11px] font-medium text-background backdrop-blur"
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            Scroll to travel {SEP} drag to look around {SEP} click a stage
          </motion.div>
        )}
        {ready && !touched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 1.2 }}
            className="pointer-events-none absolute left-1/2 top-[88px] z-20 flex md:hidden -translate-x-1/2 items-center gap-2 rounded-full bg-foreground/80 px-3 py-1.5 text-[11px] font-medium text-background"
          >
            <Hand className="h-3.5 w-3.5" />
            Swipe to travel {SEP} tap a stage
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
