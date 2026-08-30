import { useEffect, useRef, type RefObject } from "react";
import { motion } from "framer-motion";
import { Lock, Check, Star, Trophy, Sparkles, Loader2 } from "lucide-react";
import { LEVELS, LevelId, STAGES, StageDef } from "@/lib/journeyLevels";
import { cn } from "@/lib/utils";

/** Report state for a level's AI evaluation, as far as the path needs to know. */
export type LevelReportState = "none" | "generating" | "ready" | "failed";

interface Props {
  currentLevel: LevelId;
  currentStageIndex: number;
  overallScore: number;
  completedStageIds: string[];
  onStageClick: (stage: StageDef) => void;
  /** Scroll container that wraps this path. Used for in-view animations. */
  scrollRoot?: RefObject<HTMLElement | null>;
  /** True once all 20 of the level's stages are banked. */
  isLevelComplete?: (level: LevelId) => boolean;
  reportStateFor?: (level: LevelId) => LevelReportState;
  onOpenLevelReport?: (level: LevelId) => void;
}

// ── Claymorphic palette ───────────────────────────────────────────────────
// Each node is an extruded "clay coin": a bright top cap over a darker solid
// lip (the 3D edge). Colours are hue-matched so the drop-shadow reads as the
// same material, Duolingo-style. `top`/`bottom` shade the cap; `lip` is the
// solid dark bottom edge; `text` keeps the icon legible.
type Clay = { top: string; bottom: string; lip: string; text: string };

// One hue sweep across the original ten levels — sea → brand blue → indigo →
// plum → copper. Saturation is held well below the stock Tailwind ramps so the
// nodes sit on the warm cream `--background` instead of vibrating against it.
// Levels 11–15 are a second, deliberately distinct sweep (rose → slate → teal
// → gold → champagne) — see the comment above `LEVELS` in journeyLevels.ts for
// why they read as "past the original ten" rather than a seamless extension.
const LEVEL_CLAY: Record<LevelId, Clay> = {
  1:  { top: "#4fb3a6", bottom: "#3f9e93", lip: "#2b6f68", text: "#ffffff" },
  2:  { top: "#4fa3d4", bottom: "#3d8fc4", lip: "#2a6488", text: "#ffffff" },
  3:  { top: "#5b7ce4", bottom: "#4465d8", lip: "#29439c", text: "#ffffff" },
  4:  { top: "#6f6ade", bottom: "#5a55cf", lip: "#3b3796", text: "#ffffff" },
  5:  { top: "#8666d2", bottom: "#7150c4", lip: "#4d348c", text: "#ffffff" },
  6:  { top: "#9d63c6", bottom: "#8a4cb8", lip: "#5f3283", text: "#ffffff" },
  7:  { top: "#b160b3", bottom: "#a04aa4", lip: "#6f3172", text: "#ffffff" },
  8:  { top: "#c26494", bottom: "#b24d84", lip: "#7c3359", text: "#ffffff" },
  9:  { top: "#c8756f", bottom: "#b85f5a", lip: "#823f3b", text: "#ffffff" },
  10: { top: "#c49255", bottom: "#b07d3e", lip: "#7d552a", text: "#ffffff" },
  11: { top: "#cf9191", bottom: "#c17d7d", lip: "#8a5555", text: "#ffffff" },
  12: { top: "#9191cf", bottom: "#7d7dc1", lip: "#55558a", text: "#ffffff" },
  13: { top: "#82ada6", bottom: "#6f9e97", lip: "#4a726c", text: "#ffffff" },
  14: { top: "#d9b23f", bottom: "#c9a227", lip: "#96791c", text: "#ffffff" },
  15: { top: "#e2ce93", bottom: "#d9c27a", lip: "#a98f4a", text: "#ffffff" },
};

// Completed stages settle into a calm brand slate-blue rather than shouting
// gold: what's done should recede so the one live node is the loudest thing on
// the path. Locked stages use a *warm* grey mixed toward the cream paper —
// cold grey read as dirty against this background.
const DONE: Clay = { top: "#8f9dbe", bottom: "#7b8aad", lip: "#5a6782", text: "#ffffff" };
const LOCKED: Clay = { top: "#e7e2d6", bottom: "#dbd5c7", lip: "#bcb5a4", text: "#9d968a" };

function clayForLevel(level: LevelId): Clay {
  return LEVEL_CLAY[level] ?? LEVEL_CLAY[1];
}

/** The level number, extruded on the same clay rules as the nodes it heads. */
function LevelPlaque({ level }: { level: LevelId }) {
  const pal = clayForLevel(level);
  const S = 44;
  const D = 5;
  return (
    <div className="relative shrink-0" style={{ width: S, height: S + D }}>
      <span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] blur-md"
        style={{ bottom: -1, width: S * 0.72, height: 7, background: "rgba(15,23,42,0.3)" }}
      />
      <span
        aria-hidden
        className="absolute left-0 rounded-2xl"
        style={{
          top: D,
          width: S,
          height: S,
          background: `linear-gradient(180deg, ${pal.lip} 0%, ${pal.lip} 45%, rgba(0,0,0,0.35) 100%)`,
        }}
      />
      <span
        className="absolute left-0 top-0 flex items-center justify-center rounded-2xl font-black"
        style={{
          width: S,
          height: S,
          color: pal.text,
          background: `linear-gradient(180deg, ${pal.top} 0%, ${pal.bottom} 100%)`,
          boxShadow:
            "inset 0 3px 6px rgba(255,255,255,0.5), inset 0 -8px 12px rgba(0,0,0,0.18), 0 5px 10px rgba(15,23,42,0.16)",
        }}
      >
        <span className="drop-shadow-[0_2px_0_rgba(0,0,0,0.22)]">{level}</span>
      </span>
    </div>
  );
}

/**
 * Duolingo-style scrollable path. Scroll happens INSIDE the parent container,
 * not the window. Nodes spring-pop into view as the user scrolls down the path.
 */
export function LevelPath({
  currentStageIndex,
  overallScore,
  completedStageIds,
  onStageClick,
  scrollRoot,
  isLevelComplete,
  reportStateFor,
  onOpenLevelReport,
}: Props) {
  const currentNodeRef = useRef<HTMLDivElement | null>(null);

  // On mount, glide the current node into the middle of the scroll container.
  useEffect(() => {
    const t = window.setTimeout(() => {
      currentNodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
    return () => window.clearTimeout(t);
  }, []);

  // Horizontal weave amplitude — nodes snake left↔right around the centre and
  // the winding string of nodes IS the path, Duolingo-style, so there's no
  // decoupled centre line to drift out of alignment.
  const AMP = 92;
  const waveAt = (i: number) => Math.round(Math.sin((i / 3) * Math.PI) * AMP);

  return (
    <div className="relative w-full max-w-[440px] mx-auto py-4">
      {/* Soft ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(closest-side,hsl(var(--primary)/0.07),transparent_70%)]"
      />

      <div className="relative flex flex-col items-stretch">
        {STAGES.map((stage, i) => {
          const isCompleted = completedStageIds.includes(stage.id);
          const prevCompleted = i === 0 || completedStageIds.includes(STAGES[i - 1].id);
          // Sequential unlock: a stage is unlocked only when the previous one is fully completed.
          const isCurrent = !isCompleted && prevCompleted;
          const isLocked = !isCompleted && !isCurrent;

          const offsetPx = waveAt(i);
          const prevOffsetPx = i > 0 ? waveAt(i - 1) : offsetPx;

          const levelDef = LEVELS.find((l) => l.id === stage.level)!;
          const showLevelBanner = stage.subIndex === 1;

          return (
            <div
              key={stage.id}
              className="relative"
              // Depth layering: the active node sits above completed ones, which
              // sit above locked ones, so each node's drop-shadow falls cleanly
              // onto the ones behind it.
              style={{ zIndex: isCurrent ? 30 : isCompleted ? 20 : 10 }}
            >
              {showLevelBanner && (
                <motion.div
                  // Only the first banner is a tour anchor — they all look the
                  // same, and the tour needs exactly one element to point at.
                  data-tour={i === 0 ? "path-level-banner" : undefined}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                  className="mb-4 mt-9 first:mt-2 flex items-center gap-3"
                >
                  {/* The plaque is built from the same clay palette as the
                      nodes below it rather than from `levelDef.color`. A flat
                      Tailwind gradient with a blurred bar under it was the one
                      element on the path with no actual thickness, and it sat
                      directly above twenty coins that have it. */}
                  <LevelPlaque level={levelDef.id} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                      Level {levelDef.id}
                    </div>
                    <div className="text-sm font-bold text-foreground truncate">
                      {levelDef.name} — {levelDef.tagline}
                    </div>
                  </div>
                  {isLevelComplete?.(levelDef.id) && onOpenLevelReport ? (
                    <LevelReportChip
                      state={reportStateFor?.(levelDef.id) ?? "none"}
                      onClick={() => onOpenLevelReport(levelDef.id)}
                    />
                  ) : (
                    <div className="flex-1 h-px bg-gradient-to-r from-border via-border/40 to-transparent" />
                  )}
                </motion.div>
              )}

              {/* Curved connector that actually follows the weave into this node. */}
              {i > 0 && !showLevelBanner && (
                <PathConnector from={prevOffsetPx} to={offsetPx} completed={isCompleted} />
              )}

              <div
                className="flex justify-center py-1"
                style={{ transform: `translateX(${offsetPx}px)` }}
                ref={isCurrent ? currentNodeRef : undefined}
              >
                <StageNode
                  stage={stage}
                  index={i}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                  isLocked={isLocked}
                  level={stage.level}
                  onClick={() => !isLocked && onStageClick(stage)}
                  scrollRoot={scrollRoot}
                />
              </div>
            </div>
          );
        })}

        {/* Final flag (Endgame) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="mt-12 mx-auto flex flex-col items-center gap-2"
        >
          <div className="relative" style={{ width: 64, height: 64 + 10 }}>
            <span
              aria-hidden
              className="absolute left-1/2 -translate-x-1/2 rounded-[50%] blur-md"
              style={{ bottom: -2, width: 50, height: 9, background: "rgba(15,23,42,0.35)" }}
            />
            <span
              aria-hidden
              className="absolute left-0 rounded-2xl"
              style={{
                top: 10,
                width: 64,
                height: 64,
                background: "linear-gradient(180deg, #9a4a1f 0%, #9a4a1f 42%, rgba(0,0,0,0.4) 100%)",
              }}
            />
            <span
              className="absolute left-0 top-0 flex h-16 w-16 items-center justify-center rounded-2xl text-white ring-4 ring-amber-300/30"
              style={{
                background: "linear-gradient(180deg, #fbbf24 0%, #f97316 55%, #e11d48 100%)",
                boxShadow:
                  "inset 0 4px 7px rgba(255,255,255,0.5), inset 0 -10px 14px rgba(0,0,0,0.2), 0 8px 16px rgba(15,23,42,0.22)",
              }}
            >
              <Trophy className="h-7 w-7 drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]" />
            </span>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Endgame
            </div>
            <div className="text-sm font-semibold text-foreground">Submit your application</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Level report chip ────────────────────────────────────────────────────

/**
 * Entry point to a finished level's AI evaluation. Only rendered on levels
 * whose 20 stages are all banked, so it doubles as the path's "this level is
 * done" marker.
 */
function LevelReportChip({ state, onClick }: { state: LevelReportState; onClick: () => void }) {
  const generating = state === "generating";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      whileHover={{ y: -1 }}
      whileTap={{ y: 1 }}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5",
        "text-[10px] font-extrabold uppercase tracking-wider transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        state === "failed"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
          : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
      )}
    >
      {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
      {generating ? "Evaluating…" : state === "failed" ? "Retry report" : "AI report"}
    </motion.button>
  );
}

// ── Connector ────────────────────────────────────────────────────────────

/**
 * Curve linking two consecutive nodes, drawn in a full-width SVG whose
 * horizontal centre is the path centre. Completed segments are a solid warm
 * trail; upcoming segments are dashed grey — the string of these is the path.
 */
function PathConnector({ from, to, completed }: { from: number; to: number; completed: boolean }) {
  const H = 34;
  const cx = 160; // half of the 320-wide viewBox = path centre
  const x1 = cx + from;
  const x2 = cx + to;
  const d = `M ${x1} 0 C ${x1} ${H * 0.55}, ${x2} ${H * 0.45}, ${x2} ${H}`;
  return (
    <div className="relative w-full" style={{ height: H }} aria-hidden>
      <svg
        viewBox={`0 0 320 ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute left-1/2 top-0 h-full -translate-x-1/2"
        style={{ width: 320 }}
      >
        <path
          d={d}
          fill="none"
          strokeWidth={completed ? 7 : 6}
          strokeLinecap="round"
          strokeDasharray={completed ? undefined : "0.1 13"}
          style={{ stroke: completed ? "#7b8aad" : undefined }}
          className={completed ? "" : "stroke-border"}
        />
      </svg>
    </div>
  );
}

// ── Node ────────────────────────────────────────────────────────────────

const W = 80; // cap diameter
// Extrusion depth and press travel. 9px read as a drop shadow rather than as
// thickness once the cap picked up its own outer shadow; 13 is enough for the
// side wall below to be a visible surface with its own shading.
const DEPTH = 13;

function StageNode({
  stage,
  index,
  isCompleted,
  isCurrent,
  isLocked,
  level,
  onClick,
  scrollRoot,
}: {
  stage: StageDef;
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
  level: LevelId;
  onClick: () => void;
  scrollRoot?: RefObject<HTMLElement | null>;
}) {
  const pal: Clay = isLocked ? LOCKED : isCompleted ? DONE : clayForLevel(level);

  return (
    <motion.button
      type="button"
      // The tour spotlights the node itself, not its full-width centring row.
      data-tour={isCurrent ? "current-stage" : undefined}
      onClick={onClick}
      disabled={isLocked}
      initial={{ opacity: 0, scale: 0.55, y: 36, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 14,
        mass: 0.7,
        delay: (index % 8) * 0.04,
      }}
      className={cn(
        "relative group flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full",
        isLocked ? "cursor-not-allowed" : "cursor-pointer"
      )}
      aria-label={`Stage ${stage.id} ${stage.name}${isLocked ? " (locked)" : ""}`}
    >
      {isCurrent && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: [0, -3, 0] }}
          transition={{ y: { duration: 1.6, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.4 } }}
          className="absolute -top-9 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-primary text-[10px] font-extrabold uppercase tracking-[0.15em] shadow-[0_3px_0_rgba(0,0,0,0.12)] ring-1 ring-black/5 whitespace-nowrap z-20"
        >
          Start
          <span className="absolute left-1/2 -bottom-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-white" />
        </motion.div>
      )}

      {/* Clay coin: ground shadow + shaded side wall + pressable cap. The live
          node is scaled rather than sized differently, so the weave geometry
          and the connector endpoints stay on the same grid as every other node. */}
      <motion.div
        className="relative"
        style={{ width: W, height: W + DEPTH }}
        initial={false}
        animate={{ scale: isCurrent ? 1.07 : 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 20 }}
      >
        {/* Pulsing halo on the active node */}
        {isCurrent && (
          <>
            <motion.span
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ width: W, height: W, background: `${pal.bottom}55` }}
              animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.span
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ width: W, height: W, background: `${pal.top}44` }}
              animate={{ scale: [1, 2.1, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.45 }}
            />
          </>
        )}

        {/* Ground shadow */}
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 rounded-[50%] blur-md"
          style={{
            bottom: -2,
            width: W * 0.78,
            height: 10,
            background: "rgba(15,23,42,0.35)",
            opacity: isLocked ? 0.3 : isCurrent ? 0.7 : 0.5,
          }}
        />

        {/* LIP — the side wall. Shaded rather than flat: a cylinder seen from
            slightly above is lit at the top of its wall and falls to black at
            the bottom, and a single solid colour here read as a shadow copy of
            the cap instead of as material. */}
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            left: 0,
            top: DEPTH,
            width: W,
            height: W,
            background: `linear-gradient(180deg, ${pal.lip} 0%, ${pal.lip} 42%, rgba(0,0,0,0.38) 100%)`,
            boxShadow: "inset 0 -5px 8px rgba(0,0,0,0.22)",
          }}
        />

        {/* CAP — bright glossy face; presses down into the lip on tap */}
        <motion.span
          initial={false}
          // Lifting the cap off its own wall tilts it toward the viewer. The
          // rotation is what makes the lift read as the coin coming up out of
          // the page rather than the whole node sliding upward.
          whileHover={!isLocked ? { y: -4, rotateX: -9 } : undefined}
          whileTap={!isLocked ? { y: DEPTH, rotateX: 0 } : undefined}
          transition={{ type: "spring", stiffness: 700, damping: 26 }}
          className="absolute left-0 top-0 flex items-center justify-center rounded-full"
          style={{
            width: W,
            height: W,
            color: pal.text,
            transformPerspective: 620,
            transformOrigin: "50% 100%",
            background: `linear-gradient(180deg, ${pal.top} 0%, ${pal.bottom} 100%)`,
            boxShadow: isLocked
              ? "inset 0 3px 5px rgba(255,255,255,0.5), inset 0 -6px 10px rgba(0,0,0,0.10), 0 4px 8px rgba(15,23,42,0.10)"
              : "inset 0 4px 7px rgba(255,255,255,0.55), inset 0 -10px 14px rgba(0,0,0,0.18), 0 7px 14px rgba(15,23,42,0.20)",
          }}
        >
          {/* Glossy top highlight */}
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full"
            style={{
              top: "12%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "58%",
              height: "22%",
              background: "rgba(255,255,255,0.5)",
              filter: "blur(3px)",
              opacity: isLocked ? 0.5 : 0.85,
            }}
          />

          {isLocked ? (
            <Lock className="h-7 w-7" style={{ color: pal.text }} strokeWidth={2.5} />
          ) : isCompleted ? (
            <Check
              className="h-10 w-10 drop-shadow-[0_2px_0_rgba(0,0,0,0.22)]"
              style={{ color: pal.text }}
              strokeWidth={3.5}
            />
          ) : (
            <Star
              className="h-10 w-10 drop-shadow-[0_2px_0_rgba(0,0,0,0.22)]"
              style={{ color: pal.text }}
              fill="currentColor"
              strokeWidth={1.5}
            />
          )}
        </motion.span>
      </motion.div>
    </motion.button>
  );
}
