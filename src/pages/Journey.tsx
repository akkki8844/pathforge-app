import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Rocket, Loader2, Gauge, Target, CheckCircle2, ExternalLink,
  ChevronLeft, Compass, Flame, Gem, Heart, RotateCcw, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  useJourneyData, HEARTS_PER_MONTH, HEART_RESETS_PER_MONTH,
} from "@/hooks/useJourneyData";
import {
  getLevelById, LevelTask, LEVELS, LevelId, STAGES, StageDef,
  getStageTasks, getLevelTasksForUser,
} from "@/lib/journeyLevels";
import { useLevelEvaluations, isLevelComplete } from "@/hooks/useLevelEvaluations";
import { cn } from "@/lib/utils";
import { JourneyTour, JOURNEY_TOUR_SEEN_KEY } from "@/components/journey/JourneyTour";

import { LevelPath } from "@/components/journey/LevelPath";
import { LevelDetailModal } from "@/components/journey/LevelDetailModal";
import { LevelReportModal } from "@/components/journey/LevelReportModal";
import { CurrentFocusPanel } from "@/components/journey/CurrentFocusPanel";
import { NextStepCTA } from "@/components/journey/NextStepCTA";
import { HandledForYou } from "@/components/journey/HandledForYou";
import { PlacementTest } from "@/components/journey/PlacementTest";
import { UpgradeTaskCard } from "@/components/journey/UpgradeTaskCard";
import { StreakTracker } from "@/components/journey/StreakTracker";
import { ReflectionJournal } from "@/components/journey/ReflectionJournal";
import { DeadlineCountdowns } from "@/components/journey/DeadlineCountdowns";
import { ProgressRadar } from "@/components/journey/ProgressRadar";
import { CounsellorOverrideBanner } from "@/components/journey/CounsellorOverrideBanner";
import { CounsellorRoadmapBanner } from "@/components/journey/CounsellorRoadmapBanner";
import { Seo } from "@/components/Seo";
import { fadeUp, staggerParent, staggerStep, viewportOnce, transition, EASE_OUT_EXPO } from "@/lib/motion";

// ── Confirmation / start screen ────────────────────────────────────────

function StartScreen({
  onConfirm, onPlace, saving,
}: { onConfirm: () => void; onPlace: () => void; saving: boolean }) {
  return (
    <div className="min-h-[75svh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition.base}
        className="max-w-xl text-center space-y-6"
      >
        <div className="mx-auto h-20 w-20 rounded-lg border bg-card flex items-center justify-center shadow-sm">
          <Rocket className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-3">
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Your Journey
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Your personalized path to your dream college
          </h1>
        </div>
        <p className="text-muted-foreground">
          A 300-quest journey across 15 levels, with hyper-specific, proof-verified tasks tailored to your major,
          country, curriculum, and grade. Choose how to start:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          <Button onClick={onConfirm} disabled={saving} size="lg" className="h-14 rounded-lg gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Start from Foundation
          </Button>
          <Button onClick={onPlace} variant="outline" size="lg" className="h-14 rounded-lg gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Place My Level
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          You can switch modes anytime. Your progress saves automatically as you go.
        </p>
      </motion.div>
    </div>
  );
}

// ── Header (Duolingo-style section banner) ────────────────────────────

function JourneyHeader({
  stage, level, major, completedCount, gems, hearts, heartResetsRemaining,
  onResetHearts, onTour, onPlace, stageTasks,
}: {
  stage: StageDef | null; level: number; major: string;
  completedCount: number; gems: number; hearts: number;
  heartResetsRemaining: number; onResetHearts: () => void;
  onTour: () => void; onPlace: () => void;
  stageTasks?: LevelTask[];
}) {
  const lvl = getLevelById((stage?.level ?? level) as any);
  const firstTask = stageTasks && stageTasks.length > 0 ? stageTasks[0] : null;
  const headline = stage
    ? `${stage.id} · ${firstTask ? firstTask.title : stage.name}`
    : lvl.tagline;
  const sub = stage
    ? (firstTask ? firstTask.why : stage.description)
    : `Personalized for ${major}`;
  const stats = [
    {
      icon: Flame, cls: "text-orange-500", fill: "fill-orange-500/20",
      value: Math.min(completedCount, 99),
      title: "Streak — consecutive days with a completed action",
    },
    {
      icon: Gem, cls: "text-sky-500", fill: "fill-sky-500/20", value: gems,
      title: "Gems — one for every level you complete",
    },
    {
      icon: Heart, cls: "text-rose-500", fill: "fill-rose-500/20", value: hearts,
      title: `Hearts — ${HEARTS_PER_MONTH} a month, one lost per week without a completed level`,
    },
  ];
  return (
    <div className="space-y-4">
      <div data-tour="journey-stats" className="flex items-center justify-end gap-2 px-1 flex-wrap">
        {stats.map((s, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...transition.fast, delay: i * 0.05 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1"
            title={s.title}
          >
            <s.icon className={cn("h-3.5 w-3.5", s.cls)} />
            <span className="font-display text-[13px] font-semibold leading-none tabular-nums">
              {s.value}
            </span>
            {/* 11px, matching the dashboard pills: this label is the only thing
                telling three adjacent numbers apart. The singular/plural ternary
                this replaces had identical branches. */}
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {s.title.split(" ")[0]}
            </span>
          </motion.span>
        ))}
        {/* Only surfaced once hearts are actually short — an always-visible
            reset would read as "the weekly deadline is optional". */}
        {hearts < HEARTS_PER_MONTH && heartResetsRemaining > 0 && (
          <button
            onClick={onResetHearts}
            className="inline-flex items-center gap-1 rounded-full border border-rose-400/50 px-2.5 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
            title={`Refill to ${HEARTS_PER_MONTH} hearts. ${heartResetsRemaining} of ${HEART_RESETS_PER_MONTH} resets left this month.`}
          >
            <RotateCcw className="h-3 w-3" />
            Reset ({heartResetsRemaining})
          </button>
        )}
      </div>

      <motion.div
        data-tour="journey-banner"
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={transition.slow}
        className={cn("relative overflow-hidden rounded-lg border bg-card shadow-sm p-5 sm:p-6", lvl.color && "border-primary/20")}
      >
        {/* Subtle sheen sweep for depth */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary/5 to-transparent skew-x-12"
          initial={{ x: 0 }}
          animate={{ x: ["0%", "460%"] }}
          transition={{ duration: 6, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
        />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-display font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <ChevronLeft className="h-3.5 w-3.5" />
              Level {lvl.id} · {lvl.name}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
              {headline}
            </h1>
            <p className="max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              {sub}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-tour="tour-button"
              onClick={onTour}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-background hover:bg-muted/50 px-3.5 py-2 text-[12px] font-display font-bold uppercase tracking-wider text-foreground transition-colors"
            >
              <Compass className="h-4 w-4" />
              Tour
            </button>
            {/* The standings moved off this page to /leaderboard — a five-column
                table had no business in a 260px sidebar. `data-tour` is kept on
                this trigger so the walkthrough's leaderboard step still has an
                anchor to point at. */}
            <Link
              to="/leaderboard"
              data-tour="journey-leaderboard"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-background hover:bg-muted/50 px-3.5 py-2 text-[12px] font-display font-bold uppercase tracking-wider text-foreground transition-colors"
            >
              <Trophy className="h-4 w-4 text-amber-500" />
              Leaderboard
            </Link>
            <button
              type="button"
              data-tour="place-level"
              onClick={onPlace}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-2 text-[12px] font-display font-bold uppercase tracking-wider transition-colors"
            >
              <Gauge className="h-4 w-4" />
              Place My Level
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function Journey() {
  const { onboardingData } = useAuth();
  const {
    journeyStarted, loading, saving, scores,
    currentLevel, levelTasks, nextTask,
    completedMilestones, startJourney, setPlacementLevel, submitStage,
    submittedStageIds, gems, hearts, heartResetsRemaining, resetHearts,
  } = useJourneyData();


  const [showPlacement, setShowPlacement] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [openStage, setOpenStage] = useState<StageDef | null>(null);
  const [reportLevel, setReportLevel] = useState<LevelId | null>(null);
  const scrollRootRef = useRef<HTMLDivElement | null>(null);

  const { getForLevel, generate, ensureFor } = useLevelEvaluations();

  // Build all-level tasks once for any selected stage

  const allLevelTasksForStage = useMemo(() => {
    if (!onboardingData || !openStage) return [] as LevelTask[];
    return getLevelTasksForUser({
      major: onboardingData.intended_major || "generic",
      country: onboardingData.country || "",
      curriculum: onboardingData.curriculum || "",
      grade: onboardingData.grade || "10",
      level: openStage.level,
      targetUniversity: onboardingData.target_universities?.[0],
    });
  }, [onboardingData, openStage]);

  const stageTasks = useMemo(
    () => (openStage ? getStageTasks(allLevelTasksForStage, openStage) : []),
    [allLevelTasksForStage, openStage]
  );

  // A stage is completed when it has actually been banked server-side (i.e. its
  // evidence passed verification and the student claimed it). Deriving this
  // from task ids used to leak across stages, because a Level's handful of
  // tasks are shared by all 20 of its stages — one claim silently completed
  // every other stage that reused the same task.
  const completedStageIds = submittedStageIds;

  // Current stage = the first stage that is not yet completed (sequential unlock).
  // This keeps the header in sync with what's actually playable on the path.
  const currentStageIndex = useMemo(() => {
    for (let i = 0; i < STAGES.length; i++) {
      if (!completedStageIds.includes(STAGES[i].id)) return i;
    }
    return STAGES.length - 1;
  }, [completedStageIds]);

  /** Levels whose 20 stages are all banked — these get an AI evaluation. */
  const completedLevels = useMemo(
    () => LEVELS.map((l) => l.id).filter((id) => isLevelComplete(id, completedStageIds)),
    [completedStageIds]
  );

  // Kick off a report for every finished level that doesn't have one yet.
  // `ensureFor` is idempotent per session and the edge function returns the
  // cached row, so this settles to a no-op after the first pass.
  useEffect(() => {
    if (loading) return;
    completedLevels.forEach((id) => ensureFor(id));
  }, [loading, completedLevels, ensureFor]);

  // Surface the report the moment a level is finished, rather than waiting for
  // the student to scroll back up to that level's banner and find the chip.
  // Seeded on first settled render so pre-existing completions don't pop open.
  const seenCompleteLevels = useRef<Set<LevelId> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (seenCompleteLevels.current === null) {
      seenCompleteLevels.current = new Set(completedLevels);
      return;
    }
    const fresh = completedLevels.find((id) => !seenCompleteLevels.current!.has(id));
    seenCompleteLevels.current = new Set(completedLevels);
    if (fresh) setReportLevel(fresh);
  }, [loading, completedLevels]);

  // First run: auto-open the walkthrough once, and only once the real page is
  // actually mounted — never over the spinner or the start screen, where every
  // one of the tour's targets is absent. The short delay lets the entrance
  // animations settle so the spotlight lands on a rect that has stopped moving.
  const autoTourFired = useRef(false);
  useEffect(() => {
    if (autoTourFired.current) return;
    if (loading || !onboardingData || !journeyStarted) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(JOURNEY_TOUR_SEEN_KEY);
    } catch {
      // Private mode / storage disabled — treat as seen rather than replaying
      // the tour on every single visit.
      seen = "1";
    }
    if (seen) return;
    autoTourFired.current = true;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(JOURNEY_TOUR_SEEN_KEY, "1");
      } catch {
        /* nothing we can do; the in-session guard still holds */
      }
      setShowTour(true);
    }, 600);
    return () => window.clearTimeout(t);
  }, [loading, onboardingData, journeyStarted]);

  const handleNext = (task: LevelTask) => {
    // task.link comes from journey/milestone data, not hand-typed by this
    // user — validate the scheme before navigating so a bad record (or a
    // future AI-generated one) can't smuggle in a javascript:/data: URI or
    // a protocol-relative "//evil.com" masquerading as a relative path.
    if (task.link) {
      if (/^https?:\/\//i.test(task.link)) {
        window.open(task.link, "_blank", "noopener,noreferrer");
      } else if (/^\/(?!\/)/.test(task.link)) {
        window.location.href = task.link;
      }
      return;
    }
    const el = document.getElementById("current-focus");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="min-h-[60svh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your journey...</p>
        </div>
      </div>
    );
  }

  if (!onboardingData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="space-y-3">
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Setup
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Finish onboarding first</h1>
        </div>
        <p className="text-muted-foreground">
          We need your major, grade, and country to personalize your journey.
        </p>
        <Button asChild size="lg">
          <Link to="/profile">Complete Profile</Link>
        </Button>
      </div>
    );
  }

  if (!journeyStarted) {
    return (
      <>
        <StartScreen
          onConfirm={startJourney}
          onPlace={() => setShowPlacement(true)}
          saving={saving}
        />
        <PlacementTest
          open={showPlacement}
          onOpenChange={setShowPlacement}
          grade={onboardingData.grade}
          overallScore={scores.overall_score}
          onPlace={(lvl) => {
            setPlacementLevel(lvl as any);
            setShowPlacement(false);
          }}
        />
      </>
    );
  }

  const openStageIndex = openStage ? STAGES.findIndex((s) => s.id === openStage.id) : -1;
  const isOpenStageCompleted = openStage ? completedStageIds.includes(openStage.id) : false;
  const prevStageCompleted =
    openStageIndex <= 0 ? true : completedStageIds.includes(STAGES[openStageIndex - 1].id);
  const isOpenStageCurrent = !!openStage && !isOpenStageCompleted && prevStageCompleted;
  const isOpenStageLocked = !!openStage && !isOpenStageCompleted && !prevStageCompleted;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-4 space-y-4">
      <Seo title='Journey — Pathforge' description='Your phased dashboard roadmap to top colleges, with progress radar and next best actions.' path='/journey' />

      <motion.div
        // Single column since the leaderboard left for /leaderboard. The path
        // gets the whole measure back, which is what it wanted all along.
        className="grid grid-cols-1 gap-4"
        variants={staggerParent}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        custom={staggerStep(4)}
      >
        <div className="space-y-4 min-w-0">
          <JourneyHeader
            stage={openStage ?? (currentStageIndex >= 0 ? STAGES[currentStageIndex] : null)}
            level={currentLevel}
            major={onboardingData.intended_major}
            completedCount={completedMilestones.length}
            gems={gems ?? 0}
            hearts={hearts ?? HEARTS_PER_MONTH}
            heartResetsRemaining={heartResetsRemaining ?? 0}
            onResetHearts={resetHearts}
            onTour={() => setShowTour(true)}
            onPlace={() => setShowPlacement(true)}
            stageTasks={openStage ? stageTasks : undefined}
          />

          <motion.div variants={fadeUp}>
            <CounsellorOverrideBanner />
          </motion.div>
          <motion.div variants={fadeUp}>
            <CounsellorRoadmapBanner />
          </motion.div>

          {/* Path — fills the rest of the viewport; scrolls INSIDE, not the page */}
          <motion.div
            variants={fadeUp}
            data-tour="journey-path"
            className="relative rounded-2xl border bg-gradient-to-b from-muted/30 via-background to-muted/20 [perspective:1400px] overflow-hidden"
            style={{ height: "calc(100svh - 280px)", minHeight: "520px" }}
          >
            <div
              id="journey-path-scroll"
              ref={scrollRootRef}
              className="h-full overflow-y-auto overflow-x-hidden px-2 py-6 [scrollbar-width:thin] scroll-smooth"
            >
              <LevelPath
                currentLevel={currentLevel}
                currentStageIndex={currentStageIndex}
                overallScore={scores.overall_score}
                completedStageIds={completedStageIds}
                onStageClick={(s) => setOpenStage(s)}
                scrollRoot={scrollRootRef}
                isLevelComplete={(id) => completedLevels.includes(id)}
                reportStateFor={(id) => getForLevel(id)?.status ?? "none"}
                onOpenLevelReport={(id) => {
                  setReportLevel(id);
                  if (getForLevel(id)?.status === "failed") void generate(id, true);
                }}
              />
            </div>
            {/* Top + bottom fades for depth */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
          </motion.div>
        </div>
      </motion.div>

      <PlacementTest
        open={showPlacement}
        onOpenChange={setShowPlacement}
        grade={onboardingData.grade}
        overallScore={scores.overall_score}
        onPlace={(lvl) => {
          setPlacementLevel(lvl as any);
          setShowPlacement(false);
        }}
      />

      <JourneyTour open={showTour} onOpenChange={setShowTour} />

      <LevelDetailModal
        open={!!openStage}
        onOpenChange={(o) => !o && setOpenStage(null)}
        stage={openStage}
        tasks={stageTasks}
        isCurrent={isOpenStageCurrent}
        isCompleted={isOpenStageCompleted}
        isLocked={!!isOpenStageLocked}
        onClaim={async (stage, taskIds) => {
          await submitStage(stage.id, taskIds);
        }}
      />

      <LevelReportModal
        open={!!reportLevel}
        onOpenChange={(o) => !o && setReportLevel(null)}
        level={reportLevel}
        evaluation={reportLevel ? getForLevel(reportLevel) : undefined}
        onRegenerate={() => {
          if (reportLevel) void generate(reportLevel, true);
        }}
      />
    </div>
  );
}
