import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  LevelId,
  MAX_LEVEL,
  STAGES,
  getCurrentLevel,
  getLevelTasksForUser,
  LevelTask,
} from "@/lib/journeyLevels";
import { toast } from "sonner";

/**
 * Journey pace economy. Kept in sync with the `journey_sync_hearts` /
 * `journey_reset_hearts` migration — the server is authoritative, these are
 * only for rendering counts before a round-trip.
 */
export const HEARTS_PER_MONTH = 5;
export const HEART_RESETS_PER_MONTH = 2;

// ── Types ──────────────────────────────────────────────────────────────

export interface JourneyScores {
  academics_score: number;
  activities_score: number;
  leadership_score: number;
  competitions_score: number;
  test_prep_score: number;
  overall_score: number;
}

export type JourneyPhase = "foundation" | "build" | "excel" | "launch";

export interface PhaseInfo {
  id: JourneyPhase;
  label: string;
  tagline: string;
  description: string;
  unlockScore: number; // overall score needed to unlock
}

export const PHASES: PhaseInfo[] = [
  {
    id: "foundation",
    label: "Foundation",
    tagline: "Build your academic base",
    description: "Establish strong academics, discover your interests, and start exploring activities aligned with your goals.",
    unlockScore: 0,
  },
  {
    id: "build",
    label: "Build",
    tagline: "Develop depth & impact",
    description: "Deepen your involvement, take leadership roles, start meaningful projects, and begin competition prep.",
    unlockScore: 25,
  },
  {
    id: "excel",
    label: "Excel",
    tagline: "Stand out from the crowd",
    description: "Compete at high levels, demonstrate measurable impact, and build a compelling narrative for applications.",
    unlockScore: 50,
  },
  {
    id: "launch",
    label: "Launch",
    tagline: "Finalize & apply",
    description: "Polish your applications, secure recommendations, and present your strongest self to admissions committees.",
    unlockScore: 75,
  },
];

export interface MilestoneItem {
  id: string;
  phase: JourneyPhase;
  category: "academics" | "activities" | "leadership" | "competitions" | "test_prep" | "application";
  title: string;
  why: string; // 1-2 sentence explanation of WHY this matters
  howTo: string; // actionable steps
  link?: string;
  linkLabel?: string;
  priority: "critical" | "high" | "recommended";
  completed: boolean;
  countrySpecific?: boolean;
}

export interface InsightCard {
  type: "strength" | "gap" | "opportunity" | "warning";
  title: string;
  body: string;
  action?: string;
  actionLink?: string;
}

interface OutcomesData {
  courses: any[];
  projects: any[];
  leadership_roles: any[];
  competitions: any[];
  test_type?: string;
  test_score?: string;
  grade_level?: string;
}

// ── Main hook ──────────────────────────────────────────────────────────

export function useJourneyData() {
  const { user, onboardingData } = useAuth();
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outcomesData, setOutcomesData] = useState<OutcomesData | null>(null);
  const [completedMilestones, setCompletedMilestones] = useState<string[]>([]);
  const [dbRecord, setDbRecord] = useState<any>(null);

  // Load data
  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      // Settle the calendar before reading: the monthly refill and the weekly
      // decay both happen server-side, so hearts read straight from the table
      // would be whatever they were at last write. The RPC is idempotent, so
      // calling it on every load is safe.
      const { error: syncError } = await supabase.rpc("journey_sync_hearts");
      if (syncError) console.error("heart sync failed", syncError);

      const [journeyRes, outcomesRes] = await Promise.all([
        supabase.from("journey_scores").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("outcomes_data").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (journeyRes.data) {
        setDbRecord(journeyRes.data);
        setJourneyStarted(journeyRes.data.journey_started);
        setCompletedMilestones((journeyRes.data.completed_milestones as string[]) || []);
      }
      if (outcomesRes.data) {
        setOutcomesData({
          courses: (outcomesRes.data.courses as any[]) || [],
          projects: (outcomesRes.data.projects as any[]) || [],
          leadership_roles: (outcomesRes.data.leadership_roles as any[]) || [],
          competitions: (outcomesRes.data.competitions as any[]) || [],
          test_type: outcomesRes.data.test_type || undefined,
          test_score: outcomesRes.data.test_score || undefined,
          grade_level: outcomesRes.data.grade_level || undefined,
        });
      }
    } catch (e) {
      console.error("Error loading journey data:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  /**
   * Realtime on `journey_scores`, so gems/hearts move the moment the server
   * moves them.
   *
   * `verify-proof` (an approved evidence submission pays 5 gems) and
   * `journey_reset_hearts`'s monthly refill both write this row under service
   * role, from an edge function or a cron job the client never calls directly.
   * Without this subscription the only thing that ever re-read the row was
   * `submitStage`/`resetHearts` explicitly re-fetching after their own RPC, or
   * `loadData` re-running because `user` happened to get a new object
   * identity from an unrelated Supabase auth token refresh. A student who
   * submitted proof, watched it get approved, and stayed on the page would
   * see gems still at the pre-submission number — correct on the next visit,
   * wrong for as long as this tab stayed open.
   */
  useEffect(() => {
    if (!user) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase.channel(`journey-scores-${user.id}-${suffix}`);
    try {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "journey_scores", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload?.new) setDbRecord(payload.new);
        },
      ).subscribe();
    } catch (e) {
      console.warn("journey_scores realtime unavailable", e);
    }
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Score computation (weighted, evidence-based) ────────────────────
  // Each sub-score is 0–100. Diminishing returns + quality weighting so
  // numbers move meaningfully with input quality, not just count.

  const scores: JourneyScores = useMemo(() => {
    const o = outcomesData;
    const od = onboardingData;

    // Helper: log-curve diminishing returns. saturates near `cap` at `target` count.
    const dimReturn = (n: number, target: number, cap: number) => {
      if (n <= 0) return 0;
      return Math.min(cap, cap * (Math.log(1 + n) / Math.log(1 + target)));
    };

    // ── Academics (0–100) ──
    // GPA base (45) + course rigor (35) + test contribution (20)
    let gpaBase = 0;
    if (od?.gpa_range) {
      const g = od.gpa_range;
      if (g.includes("3.9") || g.includes("4.0") || g === "95-100%") gpaBase = 45;
      else if (g.includes("3.8") || g === "90-94%" || g === "90-100%") gpaBase = 40;
      else if (g.includes("3.5") || g === "85-89%") gpaBase = 33;
      else if (g.includes("3.0") || g === "80-84%") gpaBase = 25;
      else if (g.includes("2.5") || g === "70-79%") gpaBase = 15;
      else gpaBase = 8;
    }
    let rigor = 0;
    if (o?.courses?.length) {
      const advanced = o.courses.filter((c: any) =>
        ["AP", "IB", "Honors", "A-Level", "Dual Enrollment"].includes(c.level)
      ).length;
      const totalCourses = o.courses.length;
      // Diminishing returns past 6 advanced courses
      rigor = dimReturn(advanced, 6, 25) + Math.min(10, totalCourses * 1.2);
    }
    // Test contribution into academics (small slice)
    let testContrib = 0;
    if (o?.test_type && o.test_type !== "none" && o?.test_score) {
      const s = parseInt(o.test_score);
      if (!isNaN(s)) {
        if (o.test_type === "SAT") testContrib = Math.max(0, Math.min(20, ((s - 1000) / 600) * 20));
        else if (o.test_type === "ACT") testContrib = Math.max(0, Math.min(20, ((s - 20) / 16) * 20));
        else if (o.test_type === "PSAT") testContrib = Math.max(0, Math.min(20, ((s - 800) / 720) * 20));
      }
    }
    const academics = Math.min(100, gpaBase + rigor + testContrib);

    // ── Activities (0–100) ──
    // Project count (log curve, max 8) + impact multiplier per project
    let activitiesScore = 0;
    if (o?.projects?.length) {
      const countComponent = dimReturn(o.projects.length, 6, 55);
      // Quality: avg description length + presence of links/outcomes
      const qualitySum = o.projects.reduce((acc: number, p: any) => {
        const desc = (p.description || p.outcome || "").length;
        const hasLink = !!(p.link || p.url);
        const hasMetric = /\d+/.test(p.description || p.outcome || "");
        let q = 0;
        if (desc > 80) q += 6;
        else if (desc > 30) q += 3;
        if (hasLink) q += 3;
        if (hasMetric) q += 4; // quantified outcomes signal real work
        return acc + q;
      }, 0);
      const qualityComponent = Math.min(45, qualitySum);
      activitiesScore = Math.min(100, countComponent + qualityComponent);
    }

    // ── Leadership (0–100) ──
    // Role count (max 4) × scope multiplier + duration bonus
    let leadership = 0;
    if (o?.leadership_roles?.length) {
      const roles = o.leadership_roles as any[];
      const scopeMult = (s: string) => {
        if (s === "International") return 1.2;
        if (s === "National") return 1.0;
        if (s === "Regional" || s === "State") return 0.75;
        return 0.5; // Local / School
      };
      const weightedRoles = roles.reduce((acc, r) => acc + scopeMult(r.scope || "Local"), 0);
      const roleComponent = dimReturn(weightedRoles, 4, 70);
      // Duration bonus: only months the student actually recorded. This used to
      // default a missing duration to 6 months, which invented up to 30 points
      // of tenure out of blank fields — two undated roles scored the same as two
      // year-long ones.
      const monthsTotal = roles.reduce((acc, r) => {
        const m = parseInt(r.duration_months, 10);
        return acc + (Number.isFinite(m) && m > 0 ? m : 0);
      }, 0);
      const durationBonus = Math.min(30, monthsTotal * 1.2);
      leadership = Math.min(100, roleComponent + durationBonus);
    }

    // ── Competitions (0–100) ──
    // Tier × result weighted contribution
    let competitionsScore = 0;
    if (o?.competitions?.length) {
      const tierWeight = (t: string) => {
        if (t === "International") return 30;
        if (t === "National") return 22;
        if (t === "State" || t === "Regional") return 14;
        return 8; // Local / School
      };
      const resultMult = (r: string) => {
        const v = (r || "").toLowerCase();
        if (v.includes("winner") || v.includes("gold") || v.includes("1st")) return 1.0;
        if (v.includes("finalist") || v.includes("silver") || v.includes("2nd") || v.includes("3rd") || v.includes("bronze")) return 0.65;
        if (v.includes("honorable") || v.includes("semifinalist")) return 0.45;
        return 0.3; // Participant
      };
      // Take the strongest results first, then let additional entries decay.
      // A flat sum let breadth substitute for quality — twelve local
      // participations (12 × 8 × 0.3) outscored a national win (22 × 1.0),
      // which inverts how competitions are actually read. Every other pillar
      // already uses diminishing returns; this one now matches.
      const contributions = (o.competitions as any[])
        .map((c) => tierWeight(c.tier || c.scope || "Local") * resultMult(c.result || "Participant"))
        .sort((a, b) => b - a);
      const sum = contributions.reduce((acc, v, i) => acc + v * Math.pow(0.75, i), 0);
      competitionsScore = Math.min(100, sum);
    }

    // ── Test prep (0–100) ──
    // Piecewise linear with floors so partial scores still register
    let testPrep = 0;
    if (o?.test_type && o.test_type !== "none" && o?.test_score) {
      const s = parseInt(o.test_score);
      if (!isNaN(s)) {
        if (o.test_type === "SAT") {
          if (s >= 1500) testPrep = 95 + Math.min(5, (s - 1500) / 20);
          else if (s >= 1300) testPrep = 70 + ((s - 1300) / 200) * 25;
          else if (s >= 1100) testPrep = 40 + ((s - 1100) / 200) * 30;
          else testPrep = Math.max(10, ((s - 800) / 300) * 30);
        } else if (o.test_type === "ACT") {
          if (s >= 33) testPrep = 90 + Math.min(10, (s - 33) / 0.3);
          else if (s >= 28) testPrep = 65 + ((s - 28) / 5) * 25;
          else if (s >= 22) testPrep = 35 + ((s - 22) / 6) * 30;
          else testPrep = Math.max(10, ((s - 16) / 6) * 25);
        } else if (o.test_type === "PSAT") {
          if (s >= 1400) testPrep = 90;
          else if (s >= 1200) testPrep = 65 + ((s - 1200) / 200) * 25;
          else if (s >= 1000) testPrep = 35 + ((s - 1000) / 200) * 30;
          else testPrep = Math.max(10, ((s - 800) / 200) * 25);
        } else {
          testPrep = 30; // generic prep recorded
        }
        testPrep = Math.min(100, Math.max(0, testPrep));
      }
    }

    // ── Overall: rebalanced weights ──
    // academics 0.30 · competitions 0.20 · activities 0.18 · leadership 0.17 · test 0.15
    const overall = Math.round(
      academics * 0.30 +
      competitionsScore * 0.20 +
      activitiesScore * 0.18 +
      leadership * 0.17 +
      testPrep * 0.15
    );

    return {
      academics_score: Math.round(academics),
      activities_score: Math.round(activitiesScore),
      leadership_score: Math.round(leadership),
      competitions_score: Math.round(competitionsScore),
      test_prep_score: Math.round(testPrep),
      overall_score: overall,
    };
  }, [outcomesData, onboardingData]);

  // ── Current phase ───────────────────────────────────────────────────

  const currentPhase: JourneyPhase = useMemo(() => {
    const s = scores.overall_score;
    if (s >= 75) return "launch";
    if (s >= 50) return "excel";
    if (s >= 25) return "build";
    return "foundation";
  }, [scores]);

  // `milestones`/`insights`/`countryContext` (the pre-Level-system roadmap)
  // were computed here but never read by anything — Journey.tsx renders the
  // Level/Stage path from journeyLevels.ts instead. Computing them pulled in
  // the full activities.ts + competitionCalendar.ts data (~600KB minified)
  // as a hard dependency of every Journey page load. Removed; see
  // MilestoneItem/InsightCard type exports above for the shape other
  // (currently unused) journey/* components still import.
  // ── Actions ─────────────────────────────────────────────────────────

  const startJourney = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const data = {
        journey_started: true,
        started_at: new Date().toISOString(),
        ...scores,
        completed_milestones: JSON.parse("[]"),
      };
      if (dbRecord) {
        await supabase.from("journey_scores").update(data).eq("user_id", user.id);
      } else {
        await supabase.from("journey_scores").insert([{ user_id: user.id, ...data }]);
      }
      setJourneyStarted(true);
    } catch (e) {
      console.error("Error starting journey:", e);
    } finally {
      setSaving(false);
    }
  }, [user, dbRecord, scores]);

  const toggleMilestone = useCallback(async (milestoneId: string) => {
    if (!user) return;
    const updated = completedMilestones.includes(milestoneId)
      ? completedMilestones.filter(m => m !== milestoneId)
      : [...completedMilestones, milestoneId];
    setCompletedMilestones(updated);
    await supabase.from("journey_scores").update({
      completed_milestones: JSON.parse(JSON.stringify(updated)),
      ...scores,
    }).eq("user_id", user.id);
  }, [user, completedMilestones, scores]);

  // ── Level system (Duolingo-style) ───────────────────────────────────

  const placementOverride = useMemo<LevelId | undefined>(() => {
    const r = (dbRecord?.roadmap as any) || {};
    const p = r?.placement_level;
    return p && p >= 1 && p <= MAX_LEVEL ? (p as LevelId) : undefined;
  }, [dbRecord]);

  const currentLevel: LevelId = useMemo(
    () => getCurrentLevel(scores.overall_score, placementOverride),
    [scores.overall_score, placementOverride]
  );

  // AI-personalized tasks per major (cached in journey_personalizations).
  // Falls back to static getLevelTasksForUser while loading / on failure.
  const [aiTasks, setAiTasks] = useState<LevelTask[] | null>(null);
  useEffect(() => {
    if (!user || !onboardingData?.intended_major) { setAiTasks(null); return; }
    const major = onboardingData.intended_major;
    let cancelled = false;
    (async () => {
      // 1) Try cache
      const { data: cached } = await supabase
        .from("journey_personalizations")
        .select("tasks")
        .eq("user_id", user.id)
        .eq("major", major)
        .maybeSingle();
      if (cancelled) return;
      // Rows written before generate-journey stopped persisting its offline
      // fallback are still in this table. Reading them here would bypass the
      // identical guard inside the function and pin the student to the fallback
      // roadmap permanently; skipping them falls through to a regeneration,
      // which caches a real journey the moment the gateway is healthy again.
      const isFallbackSet = Array.isArray(cached?.tasks) &&
        (cached!.tasks as unknown as { id?: string }[])
          .some((t) => String(t?.id ?? "").startsWith("fallback-"));
      if (cached?.tasks && Array.isArray(cached.tasks) && cached.tasks.length > 0 && !isFallbackSet) {
        setAiTasks(cached.tasks as unknown as LevelTask[]);
        return;
      }
      // 2) Generate
      try {
        const { data, error } = await supabase.functions.invoke("generate-journey", {
          body: {
            major,
            country: onboardingData.country || "",
            curriculum: onboardingData.curriculum || "",
            grade: onboardingData.grade || "",
            targetUniversity: onboardingData.target_universities?.[0] || "",
          },
        });
        if (cancelled) return;
        if (!error && data?.tasks?.length) setAiTasks(data.tasks as LevelTask[]);
      } catch (e) {
        console.warn("generate-journey failed, using static fallback", e);
      }
    })();
    return () => { cancelled = true; };
  }, [user, onboardingData?.intended_major, onboardingData?.country, onboardingData?.curriculum, onboardingData?.grade]);

  const levelTasks: LevelTask[] = useMemo(() => {
    if (!onboardingData) return [];
    const all = aiTasks ?? getLevelTasksForUser({
      major: onboardingData.intended_major || "generic",
      country: onboardingData.country || "",
      curriculum: onboardingData.curriculum || "",
      grade: onboardingData.grade || "10",
      level: currentLevel,
      targetUniversity: onboardingData.target_universities?.[0],
    });
    return aiTasks ? all.filter((t) => t.level === currentLevel) : all;
  }, [onboardingData, currentLevel, aiTasks]);

  const nextTask: LevelTask | null = useMemo(() => {
    return levelTasks.find((t) => !completedMilestones.includes(t.id)) || null;
  }, [levelTasks, completedMilestones]);

  /**
   * Placement: the diagnostic tells the student "We've unlocked everything
   * below — start where you are, skip what you've already proven"
   * (`PlacementTest.tsx`), so it has to actually bank the stages below the
   * placed level, not just note the level number in `roadmap`. Recording only
   * `roadmap.placement_level` — the whole of this function before this
   * comment — left the path exactly as sequential as it was for a brand-new
   * account: every stage from 1.1 still required its own evidence, so a
   * student placed at Level 8 read a promise to skip seven levels and then
   * found seven levels' worth of locked stages waiting anyway.
   *
   * Only stages STRICTLY BELOW the placed level are banked — "start where you
   * are" means the placement level itself is where evidence starts being
   * required again, not one more thing already ticked off. Skipped stages
   * bypass `journey_submit_stage` entirely: they were not verified, so they
   * are not gemmed, which also closes off placement as a way to farm gems by
   * repeatedly retaking the diagnostic. The merge is additive — union with
   * whatever is already banked — so placing at a level at or below a
   * student's real progress can never erase a stage they already claimed.
   */
  const setPlacementLevel = useCallback(async (level: LevelId) => {
    if (!user) return;
    const existingRoadmap = (dbRecord?.roadmap as any) || {};
    const newRoadmap = { ...existingRoadmap, placement_level: level };
    const existingStageIds: string[] = Array.isArray(dbRecord?.submitted_stage_ids)
      ? (dbRecord!.submitted_stage_ids as string[])
      : [];
    const skippedStageIds = STAGES.filter((s) => s.level < level).map((s) => s.id);
    const newStageIds = Array.from(new Set([...existingStageIds, ...skippedStageIds]));
    if (dbRecord) {
      await supabase
        .from("journey_scores")
        .update({ roadmap: newRoadmap, submitted_stage_ids: newStageIds })
        .eq("user_id", user.id);
    } else {
      await supabase.from("journey_scores").insert([{
        user_id: user.id,
        journey_started: true,
        started_at: new Date().toISOString(),
        ...scores,
        roadmap: newRoadmap,
        submitted_stage_ids: newStageIds,
        completed_milestones: [],
      }]);
      setJourneyStarted(true);
    }
    setDbRecord((prev: any) => ({
      ...(prev || {}),
      roadmap: newRoadmap,
      submitted_stage_ids: newStageIds,
    }));
  }, [user, dbRecord, scores]);

  /** Stages banked server-side — the single source of truth for path progress. */
  const submittedStageIds: string[] = useMemo(() => {
    const raw = dbRecord?.submitted_stage_ids;
    return Array.isArray(raw) ? (raw as string[]) : [];
  }, [dbRecord]);

  /**
   * Claim a level: bank it and award 1 gem the first time. Uses an atomic RPC
   * so gems can't be farmed by re-clicks. Only reachable once the stage's
   * evidence has been verified — there is no self-attestation path. Completing
   * a level also resets the weekly heart clock, server-side.
   */
  const submitStage = useCallback(async (stageId: string, taskIds: string[]) => {
    if (!user) return;
    const merged = Array.from(new Set([...completedMilestones, ...taskIds]));
    setCompletedMilestones(merged);
    const { data, error } = await supabase.rpc("journey_submit_stage", {
      stage_id: stageId,
      task_ids: taskIds as any,
    });
    if (error) {
      console.error("submit_stage failed", error);
      toast.error("Could not submit stage — try again.");
      return;
    }
    const { data: row } = await supabase
      .from("journey_scores").select("*").eq("user_id", user.id).maybeSingle();
    if (row) setDbRecord(row);
    const awarded = (data as any)?.awarded_gems ?? (data as any)?.awarded_diamonds ?? 0;
    if (awarded > 0) toast.success(`Level complete — +${awarded} gem!`);
    else toast.success("Level submitted — moving on!");
  }, [user, completedMilestones]);

  const gems: number = (dbRecord?.diamonds as number) ?? 0;
  const hearts: number = (dbRecord?.hearts as number) ?? 5;
  const heartResetsUsed: number = (dbRecord?.heart_resets_used as number) ?? 0;
  const heartResetsRemaining = Math.max(0, HEART_RESETS_PER_MONTH - heartResetsUsed);

  /**
   * Spend one of the two monthly heart resets. The cap lives in the RPC — this
   * is only the optimistic client half, so a stale render can't grant a third.
   */
  const resetHearts = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("journey_reset_hearts");
    if (error) {
      console.error("reset_hearts failed", error);
      toast.error("Could not reset hearts — try again.");
      return;
    }
    const result = data as any;
    if (!result?.ok) {
      toast.error("You've used both heart resets this month. They come back on the 1st.");
    } else {
      toast.success(
        `Hearts back to 5 — ${result.resets_remaining} reset${result.resets_remaining === 1 ? "" : "s"} left this month.`,
      );
    }
    const { data: row } = await supabase
      .from("journey_scores").select("*").eq("user_id", user.id).maybeSingle();
    if (row) setDbRecord(row);
  }, [user]);

  return {
    journeyStarted,
    loading,
    saving,
    scores,
    currentPhase,
    startJourney,
    toggleMilestone,
    completedMilestones,
    currentLevel,
    levelTasks,
    nextTask,
    setPlacementLevel,
    submitStage,
    submittedStageIds,
    gems,
    hearts,
    heartResetsRemaining,
    resetHearts,
  };
}

