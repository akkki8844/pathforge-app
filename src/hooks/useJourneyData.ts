import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { activities, calculatePriority, isActivityAvailableInCountry } from "@/lib/activities";
import { competitionCalendar, getCompetitionStatus } from "@/lib/competitionCalendar";
import {
  LevelId,
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

// ── Grade-awareness helpers ────────────────────────────────────────────

function gradeToNumber(grade: string): number {
  const match = grade.match(/\d+/);
  return match ? parseInt(match[0]) : 11;
}

function getTimeHorizon(grade: string): { monthsToApply: number; urgency: "early" | "mid" | "urgent" | "imminent" } {
  const g = gradeToNumber(grade);
  if (g <= 9) return { monthsToApply: 36, urgency: "early" };
  if (g === 10) return { monthsToApply: 24, urgency: "mid" };
  if (g === 11) return { monthsToApply: 12, urgency: "urgent" };
  return { monthsToApply: 6, urgency: "imminent" };
}

// ── Country-specific education system context ──────────────────────────

function getCountryContext(country: string): { testNames: string; curriculum: string; tip: string } {
  const contexts: Record<string, { testNames: string; curriculum: string; tip: string }> = {
    "India": { testNames: "JEE/NEET/SAT", curriculum: "CBSE/ICSE/State Board", tip: "Indian universities value board exam performance and entrance exam ranks. For US universities, strong extracurriculars differentiate Indian applicants." },
    "United States": { testNames: "SAT/ACT/AP", curriculum: "US High School", tip: "Course rigor (AP/IB) matters as much as GPA. Admissions officers look for a 'spike' — one area of deep commitment." },
    "United Kingdom": { testNames: "A-Levels/GCSE", curriculum: "UK System", tip: "UK universities focus heavily on predicted grades and personal statements. Supercurriculars (academic extras beyond school) are key." },
    "Canada": { testNames: "SAT/Provincial", curriculum: "Provincial Curriculum", tip: "Canadian universities focus on academic averages. For top US schools, strong extracurriculars are essential." },
    "UAE": { testNames: "SAT/IELTS/EmSAT", curriculum: "CBSE/IB/American", tip: "UAE students benefit from international competitions and research opportunities. Showcase cross-cultural experiences." },
    "Singapore": { testNames: "A-Levels/SAT/IB", curriculum: "Singapore System", tip: "Singapore's competitive environment means you need distinct achievements beyond academics to stand out globally." },
  };
  return contexts[country] || { testNames: "SAT/ACT", curriculum: "Local Curriculum", tip: "Focus on demonstrating genuine passion and measurable impact in your chosen area." };
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
      // Duration bonus: total months across all roles
      const monthsTotal = roles.reduce((acc, r) => acc + (parseInt(r.duration_months) || 6), 0);
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
      const sum = (o.competitions as any[]).reduce(
        (acc, c) => acc + tierWeight(c.tier || c.scope || "Local") * resultMult(c.result || "Participant"),
        0
      );
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

  // ── Milestone generation (deeply personalized) ──────────────────────

  const milestones: MilestoneItem[] = useMemo(() => {
    if (!onboardingData) return [];

    const items: MilestoneItem[] = [];
    const country = onboardingData.country;
    const major = onboardingData.intended_major;
    const grade = onboardingData.grade;
    const targets = onboardingData.target_universities || [];
    const { urgency } = getTimeHorizon(grade);
    const countryCtx = getCountryContext(country);
    const gradeNum = gradeToNumber(grade);

    // Get top relevant activities with real links, excluding past competitions
    const pastCompetitionIds = new Set(
      competitionCalendar
        .filter(c => getCompetitionStatus(c) === "past")
        .map(c => c.activityId)
    );

    const relevantActivities = activities
      .filter(a => isActivityAvailableInCountry(a, country))
      .filter(a => !pastCompetitionIds.has(a.id)) // exclude expired
      .map(a => ({ ...a, calcPriority: calculatePriority(a, major, targets[0]) }))
      .sort((a, b) => {
        const order = { High: 0, Medium: 1, Low: 2 };
        return order[a.calcPriority] - order[b.calcPriority];
      });

    const highActivities = relevantActivities.filter(a => a.calcPriority === "High").slice(0, 5);
    const medActivities = relevantActivities.filter(a => a.calcPriority === "Medium").slice(0, 5);

    // ═══ FOUNDATION PHASE ═══

    // Academics foundation
    if (scores.academics_score < 60) {
      items.push({
        id: "f-academics-rigor",
        phase: "foundation",
        category: "academics",
        title: `Enroll in advanced ${major}-aligned courses`,
        why: `Universities evaluate course rigor as heavily as GPA. Taking AP/IB/${countryCtx.curriculum} courses in ${major}-related subjects shows you can handle college-level work.`,
        howTo: `1. Meet with your school counselor this week. 2. Request the highest-level courses available in subjects related to ${major}. 3. If your school doesn't offer them, explore dual enrollment or online options.`,
        priority: urgency === "imminent" ? "critical" : "high",
        completed: completedMilestones.includes("f-academics-rigor"),
      });
    }

    if (!onboardingData.gpa_range || onboardingData.gpa_range.includes("below") || onboardingData.gpa_range.includes("60") || onboardingData.gpa_range.includes("70")) {
      items.push({
        id: "f-gpa-improve",
        phase: "foundation",
        category: "academics",
        title: "Create a GPA improvement plan",
        why: "Your GPA is the first filter admissions officers use. Even a small improvement in your weakest subjects can significantly change your competitiveness.",
        howTo: `1. Identify your 2-3 weakest subjects. 2. Allocate 30 minutes daily to focused study. 3. Seek tutoring or form study groups. 4. Talk to teachers about extra credit opportunities.`,
        priority: "critical",
        completed: completedMilestones.includes("f-gpa-improve"),
      });
    }

    // Test prep foundation
    if (scores.test_prep_score < 30) {
      items.push({
        id: "f-test-baseline",
        phase: "foundation",
        category: "test_prep",
        title: `Take a diagnostic ${countryCtx.testNames} practice test`,
        why: `A baseline score tells you exactly where you stand and how much improvement you need. ${targets.length > 0 ? `${targets[0]} typically expects scores in the top 5-10%.` : "Top universities use test scores as a key differentiator."}`,
        howTo: `1. Take a full-length official practice test under timed conditions. 2. Score it and identify your weakest sections. 3. Create a study plan targeting those areas. 4. Aim to study 30-45 minutes daily.`,
        priority: urgency === "early" ? "recommended" : "critical",
        completed: completedMilestones.includes("f-test-baseline"),
        countrySpecific: true,
      });
    }

    // First activities
    highActivities.slice(0, 2).forEach((a, i) => {
      items.push({
        id: `f-activity-${a.id}`,
        phase: "foundation",
        category: "activities",
        title: `Start with: ${a.name}`,
        why: `${a.whyRelevant || a.detailedDescription.slice(0, 150)}. This is a high-impact activity for ${major} applicants${a.countries.length > 0 ? ` available in ${country}` : " available globally"}.`,
        howTo: `Visit the official page to understand requirements and deadlines. ${a.deadline ? `Deadline: ${a.deadline}.` : "Registration is typically open year-round."} ${a.cost === "Free" ? "This is completely free." : a.cost === "Scholarships Available" ? "Fee waivers/scholarships are available." : ""}`,
        link: a.learnMoreUrl || a.applyUrl || undefined,
        linkLabel: a.applyUrl ? "Register Now" : "Learn More",
        priority: "high",
        completed: completedMilestones.includes(`f-activity-${a.id}`),
      });
    });

    // ═══ BUILD PHASE ═══

    // Leadership development
    if (scores.leadership_score < 40) {
      items.push({
        id: "b-leadership-start",
        phase: "build",
        category: "leadership",
        title: `Take a leadership role related to ${major}`,
        why: "Universities don't want followers — they want people who create change. A leadership role shows you can organize, inspire, and deliver results. Even small-scale leadership counts if you can show impact.",
        howTo: `1. List all clubs/organizations at your school related to ${major}. 2. If none exist, start one — that's even more impressive. 3. Run for an officer position or propose a new initiative. 4. Document everything: attendance, events organized, outcomes achieved.`,
        priority: "high",
        completed: completedMilestones.includes("b-leadership-start"),
      });
    }

    // Meaningful project
    items.push({
      id: "b-project-depth",
      phase: "build",
      category: "activities",
      title: `Build a substantive ${major} project with measurable impact`,
      why: `A personal project is the #1 way to demonstrate genuine passion. Admissions officers look for students who go beyond what's required. A project in ${major} that solves a real problem or creates real value is incredibly compelling.`,
      howTo: `1. Identify a problem in your community that relates to ${major}. 2. Design a solution and set a 3-month timeline. 3. Document your process, challenges, and results. 4. Quantify impact: people helped, money raised, efficiency improved. 5. Share it on LinkedIn or a personal website.`,
      link: "/activities",
      linkLabel: "Browse Project Ideas",
      priority: "critical",
      completed: completedMilestones.includes("b-project-depth"),
    });

    // More activities
    highActivities.slice(2).concat(medActivities.slice(0, 2)).forEach(a => {
      items.push({
        id: `b-activity-${a.id}`,
        phase: "build",
        category: a.type === "Competition" ? "competitions" : "activities",
        title: `Pursue: ${a.name}`,
        why: `${a.whyRelevant || a.detailedDescription.slice(0, 150)}`,
        howTo: `Check the official website for requirements and timelines. ${a.difficulty === "Advanced" ? "This is competitive — start preparing early." : "This is accessible and a great way to build your profile."}`,
        link: a.learnMoreUrl || a.applyUrl || undefined,
        linkLabel: a.applyUrl ? "Apply" : "Learn More",
        priority: a.calcPriority === "High" ? "high" : "recommended",
        completed: completedMilestones.includes(`b-activity-${a.id}`),
      });
    });

    // University research
    if (targets.length > 0) {
      items.push({
        id: "b-uni-research",
        phase: "build",
        category: "application",
        title: `Deep-dive into what ${targets.slice(0, 2).join(" & ")} actually value`,
        why: "Each university has a distinct culture and set of values. Understanding what they truly look for — beyond just grades — lets you shape your entire profile strategically.",
        howTo: `1. Read the admissions blog/website of each target school. 2. Note their mission statement and values. 3. Research accepted student profiles on forums and Reddit. 4. Identify 2-3 qualities they emphasize and align your activities accordingly.`,
        priority: "high",
        completed: completedMilestones.includes("b-uni-research"),
      });
    }

    // ═══ EXCEL PHASE ═══

    // Competition excellence
    if (scores.competitions_score < 60) {
      const topCompetitions = relevantActivities.filter(a => a.type === "Competition" && a.calcPriority === "High").slice(0, 3);
      topCompetitions.forEach(a => {
        items.push({
          id: `e-comp-${a.id}`,
          phase: "excel",
          category: "competitions",
          title: `Compete in ${a.name}`,
          why: `${a.whyRelevant || "High-level competition results are among the strongest signals of ability that admissions committees evaluate."}`,
          howTo: `Visit the official website for registration. ${a.difficulty === "Advanced" ? "Dedicate significant preparation time — past papers and coaching are recommended." : "Start with practice rounds to familiarize yourself with the format."}`,
          link: a.learnMoreUrl || a.applyUrl || undefined,
          linkLabel: "Official Website",
          priority: "critical",
          completed: completedMilestones.includes(`e-comp-${a.id}`),
        });
      });
    }

    // Research/mentorship
    items.push({
      id: "e-research-mentor",
      phase: "excel",
      category: "activities",
      title: `Seek a research opportunity or mentorship in ${major}`,
      why: "Working with a professor or professional demonstrates initiative and intellectual maturity. Research experience is particularly valued by top-tier universities and can lead to publications or presentations.",
      howTo: `1. Identify professors at local universities working in ${major}. 2. Email them a concise, specific request to assist with research. 3. Alternatively, look for structured programs like RSI, SSP, or local equivalents. 4. Even a short summer experience is valuable.`,
      priority: gradeNum <= 10 ? "recommended" : "high",
      completed: completedMilestones.includes("e-research-mentor"),
    });

    // Narrative building
    items.push({
      id: "e-narrative",
      phase: "excel",
      category: "application",
      title: "Craft your personal narrative",
      why: "Your application needs a coherent story. The strongest applications aren't a list of achievements — they're a narrative about who you are, what drives you, and where you're headed. This narrative connects all your activities.",
      howTo: `1. Write down: "Why ${major}? What's the story?" 2. Identify 3 activities/experiences that form a thread. 3. Practice explaining your journey in 2 minutes. 4. Use this narrative in essays, interviews, and recommendations.`,
      priority: urgency === "imminent" || urgency === "urgent" ? "critical" : "recommended",
      completed: completedMilestones.includes("e-narrative"),
    });

    // ═══ LAUNCH PHASE ═══

    if (urgency === "urgent" || urgency === "imminent") {
      items.push({
        id: "l-essays",
        phase: "launch",
        category: "application",
        title: "Write and refine your application essays",
        why: "Essays are where you become a person to the admissions committee, not just a transcript. Your essays must be authentic, specific, and reveal something no other part of your application shows.",
        howTo: `1. Start with the Common App personal statement — brainstorm 5 topics before writing. 2. Write supplemental essays for each target school. 3. Get feedback from 2-3 trusted readers. 4. Revise at least 3 times. 5. Package your full story with the Pathforge Resume Builder.`,
        link: "/resume",
        linkLabel: "Resume Builder",
        priority: "critical",
        completed: completedMilestones.includes("l-essays"),
      });

      items.push({
        id: "l-recommendations",
        phase: "launch",
        category: "application",
        title: "Secure strong recommendation letters",
        why: "Recommendations from teachers who know you well and can speak to your character, growth, and intellectual curiosity are incredibly powerful. Generic letters hurt more than they help.",
        howTo: `1. Choose 2-3 teachers who know you beyond just grades. 2. Ask them at least 6 weeks before the deadline. 3. Provide a 'brag sheet' listing your key achievements and goals. 4. Send a thank-you note after they submit.`,
        priority: "critical",
        completed: completedMilestones.includes("l-recommendations"),
      });

      items.push({
        id: "l-final-check",
        phase: "launch",
        category: "application",
        title: "Complete your application checklist",
        why: "Small mistakes — wrong essays, missing supplements, incorrect deadlines — can derail even the strongest applications. A systematic final review prevents costly errors.",
        howTo: `1. Create a spreadsheet with every school's requirements and deadlines. 2. Verify test scores have been sent. 3. Confirm recommendation letters are submitted. 4. Proofread every essay one final time. 5. Submit at least 48 hours before the deadline.`,
        priority: "critical",
        completed: completedMilestones.includes("l-final-check"),
      });
    } else {
      items.push({
        id: "l-future-prep",
        phase: "launch",
        category: "application",
        title: "Plan your application timeline",
        why: "Even though applications are still ahead, having a clear timeline prevents last-minute scrambling and lets you make strategic decisions about what to prioritize.",
        howTo: `You're in ${grade}, so you have time. Focus on building your profile now. Start thinking about essays and recommendations in Grade 11.`,
        priority: "recommended",
        completed: completedMilestones.includes("l-future-prep"),
      });
    }

    return items;
  }, [onboardingData, scores, completedMilestones]);

  // ── Insights (smart analysis) ───────────────────────────────────────

  const insights: InsightCard[] = useMemo(() => {
    if (!onboardingData) return [];
    const items: InsightCard[] = [];
    const major = onboardingData.intended_major;
    const grade = onboardingData.grade;
    const { urgency } = getTimeHorizon(grade);

    // Strengths
    if (scores.academics_score >= 70) items.push({ type: "strength", title: "Strong Academic Foundation", body: "Your course rigor and GPA put you in a competitive position. Maintain this and focus on building depth in other areas." });
    if (scores.leadership_score >= 60) items.push({ type: "strength", title: "Leadership Track Record", body: "Your leadership experience differentiates you. Continue scaling your impact and documenting measurable outcomes." });
    if (scores.competitions_score >= 60) items.push({ type: "strength", title: "Competition Credentials", body: "Competition results provide strong evidence of ability. Use these as anchors in your application narrative." });

    // Gaps
    if (scores.activities_score < 30) items.push({ type: "gap", title: "Activity Depth is Low", body: `You need substantive projects demonstrating passion for ${major}. Quality matters more than quantity — focus on 1-2 impactful projects.`, action: "Browse Activities", actionLink: "/activities" });
    if (scores.leadership_score < 20) items.push({ type: "gap", title: "No Leadership Evidence", body: "Universities want students who take initiative. Start small: organize an event, lead a project, or start a club.", action: "Log Leadership", actionLink: "/outcomes" });
    if (scores.competitions_score === 0) items.push({ type: "gap", title: "No Competitions Logged", body: `Competitions in ${major} validate your skills objectively. Even participating without winning shows initiative.`, action: "Find Competitions", actionLink: "/activities" });
    if (scores.test_prep_score === 0 && urgency !== "early") items.push({ type: "gap", title: "No Test Scores", body: "Standardized test scores are still important for most universities. Start preparation now.", action: "Update Scores", actionLink: "/outcomes" });

    // Opportunities
    if (scores.academics_score > 60 && scores.activities_score < 40) items.push({ type: "opportunity", title: "Academics Are Solid — Now Build Your Spike", body: `Your grades are solid. The biggest ROI now is building a compelling extracurricular narrative around ${major}. This is what differentiates admitted students.` });
    if (!onboardingData.target_universities?.length) items.push({ type: "opportunity", title: "Set Target Universities", body: "Adding target schools lets us tailor your roadmap to their specific values and expectations.", action: "Update Profile", actionLink: "/profile" });

    // Warnings
    if (outcomesData?.projects?.length && outcomesData.projects.length > 6 && scores.activities_score < 50) items.push({ type: "warning", title: "Spreading Too Thin", body: "You have many projects but limited depth. Admissions officers prefer 2-3 deep commitments over 8 surface-level ones. Consider dropping your weakest activities." });
    if (urgency === "imminent" && scores.overall_score < 40) items.push({ type: "warning", title: "Time is Short", body: "You're close to application deadlines with significant gaps. Focus exclusively on your strongest 2-3 activities and your essays. Quality of narrative matters most now." });

    return items;
  }, [onboardingData, outcomesData, scores]);

  // ── Country context ─────────────────────────────────────────────────

  const countryContext = useMemo(() => {
    if (!onboardingData) return null;
    return getCountryContext(onboardingData.country);
  }, [onboardingData]);

  // ── Actions ─────────────────────────────────────────────────────────

  const startJourney = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const data = {
        journey_started: true,
        started_at: new Date().toISOString(),
        ...scores,
        roadmap: JSON.parse(JSON.stringify(milestones)),
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
  }, [user, dbRecord, scores, milestones]);

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
    return p && p >= 1 && p <= 10 ? (p as LevelId) : undefined;
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
      if (cached?.tasks && Array.isArray(cached.tasks) && cached.tasks.length > 0) {
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

  const setPlacementLevel = useCallback(async (level: LevelId) => {
    if (!user) return;
    const existingRoadmap = (dbRecord?.roadmap as any) || {};
    const newRoadmap = { ...existingRoadmap, placement_level: level };
    if (dbRecord) {
      await supabase
        .from("journey_scores")
        .update({ roadmap: newRoadmap })
        .eq("user_id", user.id);
    } else {
      await supabase.from("journey_scores").insert([{
        user_id: user.id,
        journey_started: true,
        started_at: new Date().toISOString(),
        ...scores,
        roadmap: newRoadmap,
        completed_milestones: [],
      }]);
      setJourneyStarted(true);
    }
    setDbRecord((prev: any) => ({ ...(prev || {}), roadmap: newRoadmap }));
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
    milestones,
    insights,
    countryContext,
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

