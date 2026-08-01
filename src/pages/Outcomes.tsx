import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, AlertTriangle, CheckCircle2, Target, BarChart3, Zap, Shield, FileCheck, Layers, Clock, Award, Users, BookOpen, GraduationCap, AlertCircle, TrendingDown, Calendar, FileText, Plus, X, Link as LinkIcon, Upload, ChevronDown, ChevronUp, Lock, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useOutcomesData, type EvidenceState, type Course, type Project, type LeadershipRole, type Competition, type ServiceRole, type Internship, type ResearchOutput, type CreativeWork, type OutcomesProfile } from "@/hooks/useOutcomesData";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useScoringWeights } from "@/hooks/useScoringWeights";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";

// Types - Use from hook
type StudentProfile = OutcomesProfile;

interface Signal {
  id: string;
  name: string;
  category: string;
  status: "verified" | "submitted" | "insufficient" | "missing";
  score: number;
  maxScore: number;
  reason: string;
  requirement: string;
}

interface GapTask {
  id: string;
  signal: string;
  objective: string;
  scope: string;
  timeHorizon: string;
  proofRequired: string[];
  impactScore: number;
  status: EvidenceState;
}

// Computation logic - evidence-based only
function computeSignals(profile: StudentProfile): Signal[] {
  const signals: Signal[] = [];
  
  // ── Academic Rigor ─────────────────────────────────────────────────
  // Only verified rigorous coursework; honors counts at one-third weight.
  // 6+ AP/IB needed for "verified" tier — top-20 admit median is 8+.
  const rigorousCourses = profile.courses.filter(c => c.level === "ap" || c.level === "ib");
  const honorsCourses = profile.courses.filter(c => c.level === "honors");
  // Diminishing returns; 6 rigorous = ~85, 8+ = ~100. Honors caps at 25.
  const rigorRaw = Math.min(85, rigorousCourses.length * 14) + Math.min(25, honorsCourses.length * 5);
  const academicScore = Math.min(100, rigorRaw);

  signals.push({
    id: "academic_rigor",
    name: "Academic Rigor",
    category: "Academic",
    status: rigorousCourses.length >= 6 ? "verified" : rigorousCourses.length >= 4 ? "submitted" : rigorousCourses.length >= 2 ? "insufficient" : "missing",
    score: academicScore,
    maxScore: 100,
    reason: rigorousCourses.length === 0
      ? "No AP/IB courses detected in profile"
      : rigorousCourses.length < 6
        ? `Only ${rigorousCourses.length} rigorous course(s) — top-20 admits typically present 6–8 AP/IB`
        : `${rigorousCourses.length} rigorous courses — at top-20 median`,
    requirement: "6+ AP/IB courses aligned with intended major (top-20 standard)",
  });

  // ── Standardized Testing ───────────────────────────────────────────
  // Calibrated to actual top-20 admit medians (SAT 1530+, ACT 35+).
  const hasTestScore = profile.testType !== "none" && profile.testScore !== "";
  const testScoreNum = parseInt(profile.testScore) || 0;
  let testScoreValue = 0;
  let testStatus: Signal["status"] = "missing";

  if (hasTestScore) {
    if (profile.testType === "sat") {
      // 1400=50, 1500=75, 1550=90, 1600=100. Below 1300 = near zero.
      testScoreValue = Math.max(0, Math.min(100, ((testScoreNum - 1300) / 300) * 100));
      testStatus = testScoreNum >= 1530 ? "verified" : testScoreNum >= 1450 ? "submitted" : testScoreNum >= 1300 ? "insufficient" : "missing";
    } else if (profile.testType === "act") {
      testScoreValue = Math.max(0, Math.min(100, ((testScoreNum - 28) / 8) * 100));
      testStatus = testScoreNum >= 35 ? "verified" : testScoreNum >= 33 ? "submitted" : testScoreNum >= 28 ? "insufficient" : "missing";
    } else if (profile.testType === "psat") {
      testScoreValue = Math.max(0, Math.min(100, ((testScoreNum - 1200) / 320) * 100));
      testStatus = testScoreNum >= 1450 ? "verified" : testScoreNum >= 1350 ? "submitted" : testScoreNum >= 1200 ? "insufficient" : "missing";
    }
  }

  signals.push({
    id: "test_score",
    name: "Standardized Testing",
    category: "Academic",
    status: testStatus,
    score: testScoreValue,
    maxScore: 100,
    reason: !hasTestScore
      ? "No standardized test score provided"
      : testStatus === "insufficient" || testStatus === "missing"
        ? `Score of ${profile.testScore} is below competitive threshold for top-tier targets`
        : `${profile.testType.toUpperCase()} score of ${profile.testScore} recorded`,
    requirement: profile.testType === "act" ? "ACT ≥35 for top-20 (median); ≥33 competitive" : "SAT ≥1530 for top-20 (median); ≥1450 competitive",
  });

  // ── Leadership ─────────────────────────────────────────────────────
  // ONLY verified-evidence roles count. Unverified entries grant zero
  // credit — colleges discount unverified leadership claims.
  const verifiedLeadership = profile.leadershipRoles.filter(r => r.evidenceState === "verified");
  const submittedLeadership = profile.leadershipRoles.filter(r => r.evidenceState === "evidence_submitted");
  const sustainedLeadership = verifiedLeadership.filter(r => {
    const months = parseDuration(r.duration);
    return months >= 9 && r.teamSize >= 8;
  });
  const moderateLeadership = verifiedLeadership.filter(r => {
    const months = parseDuration(r.duration);
    return months >= 6 && r.teamSize >= 5;
  });

  // Sustained = 35 each, moderate = 18, submitted-only = 8 (provisional)
  const leadershipScore = Math.min(
    100,
    sustainedLeadership.length * 35 + moderateLeadership.length * 18 + submittedLeadership.length * 8
  );
  signals.push({
    id: "leadership",
    name: "Leadership Signal",
    category: "Leadership",
    status: sustainedLeadership.length >= 2 ? "verified" : sustainedLeadership.length >= 1 ? "submitted" : moderateLeadership.length >= 1 ? "insufficient" : "missing",
    score: leadershipScore,
    maxScore: 100,
    reason: sustainedLeadership.length === 0
      ? "No verified sustained leadership (≥9 months, ≥8 team members) — submit evidence to count"
      : `${sustainedLeadership.length} sustained verified role(s)`,
    requirement: "≥2 verified leadership roles, each ≥9 months and ≥8 team members, with documented outcomes",
  });

  // ── Proof of Initiative (Projects) ─────────────────────────────────
  // A casual GitHub side project is NOT worth 20 points. Verified
  // outcome-bearing projects with public artifacts are.
  const allProjects = profile.projects.filter(p => p.title.trim().length > 0);
  const verifiedProjects = profile.projects.filter(p => p.evidenceState === "verified");
  const submittedProjects = profile.projects.filter(p => p.evidenceState === "evidence_submitted");
  // Substantial = verified + outcome >40 chars + link
  const substantialProjects = verifiedProjects.filter(p => p.outcome.length > 40 && !!p.link);
  // Solid = submitted-evidence + outcome + link
  const solidProjects = submittedProjects.filter(p => p.outcome.length > 30 && !!p.link);
  // Basic (just typed in, no proof) — capped at trivial credit
  const basicProjects = allProjects.filter(p =>
    p.evidenceState === "not_started" || p.evidenceState === "in_progress"
  );

  // Substantial = 30 each, solid = 14, basic capped at 10 total (5 each, max 2)
  const initiativeScore = Math.min(
    100,
    substantialProjects.length * 30 + solidProjects.length * 14 + Math.min(10, basicProjects.length * 5)
  );

  signals.push({
    id: "initiative",
    name: "Proof of Initiative",
    category: "Initiative",
    status: substantialProjects.length >= 2 ? "verified" : substantialProjects.length >= 1 ? "submitted" : solidProjects.length >= 1 ? "insufficient" : basicProjects.length >= 1 ? "insufficient" : "missing",
    score: initiativeScore,
    maxScore: 100,
    reason: allProjects.length === 0
      ? "No self-initiated projects added"
      : substantialProjects.length > 0
        ? `${substantialProjects.length} verified project(s) with documented outcomes`
        : `${allProjects.length} project(s) recorded — most are unverified. Submit proof (link, metrics, mentor letter) to earn meaningful credit.`,
    requirement: "≥2 verified independent projects with measurable outcome (>40 chars) and public artifact",
  });

  // ── Competition Achievement ────────────────────────────────────────
  // Only verified placements at recognized levels move the needle.
  const allCompetitions = profile.competitions.filter(c => c.name.trim().length > 0);
  const verifiedCompetitions = profile.competitions.filter(c => c.evidenceState === "verified");
  const submittedCompetitions = profile.competitions.filter(c => c.evidenceState === "evidence_submitted");
  const internationalWins = verifiedCompetitions.filter(c =>
    c.level === "international" && /(top|gold|silver|bronze|1st|2nd|3rd|finalist|medal|winner)/i.test(c.result)
  );
  const nationalWins = verifiedCompetitions.filter(c =>
    c.level === "national" && /(top|gold|silver|bronze|1st|2nd|3rd|finalist|medal|winner)/i.test(c.result)
  );
  const stateOrParticipation = verifiedCompetitions.filter(c =>
    c.level === "state" || (c.level === "national" && !nationalWins.includes(c))
  );

  const competitionScore = Math.min(
    100,
    internationalWins.length * 50 + nationalWins.length * 28 + stateOrParticipation.length * 10 + submittedCompetitions.length * 5
  );
  signals.push({
    id: "competition",
    name: "Competition Achievement",
    category: "Extracurricular",
    status: internationalWins.length >= 1 || nationalWins.length >= 2 ? "verified" : nationalWins.length >= 1 ? "submitted" : verifiedCompetitions.length >= 1 ? "insufficient" : allCompetitions.length >= 1 ? "insufficient" : "missing",
    score: competitionScore,
    maxScore: 100,
    reason: allCompetitions.length === 0
      ? "No competition participation added"
      : (internationalWins.length + nationalWins.length) === 0
        ? `${allCompetitions.length} competition(s) recorded — no verified national/international placement yet`
        : `${internationalWins.length + nationalWins.length} verified national/international placement(s)`,
    requirement: "≥1 international placement OR ≥2 national-level placements with verified results",
  });

  // ── Certifications & MOOCs ─────────────────────────────────────────
  // Certifications are weak signals — capped contribution.
  const certCourses = profile.courses.filter(c =>
    /cert|coursera|edx|nptel|mooc|online/i.test(`${c.subject} ${c.level}`)
  );
  const certScore = Math.min(60, certCourses.length * 15); // hard cap at 60
  signals.push({
    id: "certifications",
    name: "Certifications & MOOCs",
    category: "Academic",
    status: certCourses.length >= 4 ? "verified" : certCourses.length >= 2 ? "submitted" : certCourses.length >= 1 ? "insufficient" : "missing",
    score: certScore,
    maxScore: 100,
    reason: certCourses.length === 0
      ? "No certifications or online courses recorded"
      : `${certCourses.length} certification(s)/MOOC(s) — note that certs are weak signals on their own`,
    requirement: "≥3 major-aligned certifications (Coursera, edX, NPTEL) with completion proof — supplementary signal only",
  });

  // ── Real-World Impact ──────────────────────────────────────────────
  // Quantified-impact projects only; verified leadership of large/long teams.
  const impactKeywords = /raised|served|reached|users|students|funded|published|featured|grant|awarded|patent|launched|deployed|\d{2,}/i;
  const projectImpact = verifiedProjects.filter(p => impactKeywords.test(p.outcome || "") && p.outcome.length > 40);
  const sustainedImpactLeadership = verifiedLeadership.filter(
    r => r.teamSize >= 15 && parseDuration(r.duration) >= 12
  );
  const totalImpact = projectImpact.length + sustainedImpactLeadership.length;
  const impactScore = Math.min(100, totalImpact * 25);
  signals.push({
    id: "real_world_impact",
    name: "Real-World Impact",
    category: "Initiative",
    status: totalImpact >= 4 ? "verified" : totalImpact >= 2 ? "submitted" : totalImpact >= 1 ? "insufficient" : "missing",
    score: impactScore,
    maxScore: 100,
    reason: totalImpact === 0
      ? "No verified, measurable impact yet (projects with quantified reach OR 12+ month leadership of 15+ people)"
      : `${totalImpact} verified impact entry(ies)`,
    requirement: "≥3 verified entries: project outcomes with quantified impact (users, funds, reach) OR 12+ month leadership of 15+ people",
  });

  const verifiedService = profile.serviceRoles.filter(s => s.evidenceState === "verified");
  const serviceScore = Math.min(100, verifiedService.filter(s => s.hours >= 40 && impactKeywords.test(s.impact)).length * 30 + profile.serviceRoles.filter(s => s.evidenceState === "evidence_submitted").length * 10);
  signals.push({
    id: "service_impact",
    name: "Service & Community Impact",
    category: "Extracurricular",
    status: serviceScore >= 75 ? "verified" : serviceScore >= 35 ? "submitted" : profile.serviceRoles.length ? "insufficient" : "missing",
    score: serviceScore,
    maxScore: 100,
    reason: profile.serviceRoles.length === 0 ? "No community service or civic work added" : `${profile.serviceRoles.length} service entr${profile.serviceRoles.length === 1 ? "y" : "ies"} recorded`,
    requirement: "Sustained verified service with 40+ hours and documented community outcome",
  });

  const verifiedInternships = profile.internships.filter(i => i.evidenceState === "verified");
  const internshipScore = Math.min(100, verifiedInternships.length * 35 + profile.internships.filter(i => i.evidenceState === "evidence_submitted").length * 12);
  signals.push({
    id: "internships",
    name: "Internships & Work Experience",
    category: "Experience",
    status: internshipScore >= 70 ? "verified" : internshipScore >= 35 ? "submitted" : profile.internships.length ? "insufficient" : "missing",
    score: internshipScore,
    maxScore: 100,
    reason: profile.internships.length === 0 ? "No internships, shadowing, or paid work added" : `${profile.internships.length} experience entr${profile.internships.length === 1 ? "y" : "ies"} recorded`,
    requirement: "Verified internship, shadowing, lab, studio, or paid work with clear responsibilities and outcomes",
  });

  const verifiedResearch = profile.researchOutputs.filter(r => r.evidenceState === "verified" && (r.link || r.venue));
  const researchScore = Math.min(100, verifiedResearch.length * 40 + profile.researchOutputs.filter(r => r.evidenceState === "evidence_submitted").length * 15);
  signals.push({
    id: "research_output",
    name: "Research & Publications",
    category: "Academic",
    status: researchScore >= 80 ? "verified" : researchScore >= 40 ? "submitted" : profile.researchOutputs.length ? "insufficient" : "missing",
    score: researchScore,
    maxScore: 100,
    reason: profile.researchOutputs.length === 0 ? "No research outputs, posters, papers, or publications added" : `${profile.researchOutputs.length} research output(s) recorded`,
    requirement: "Verified research artifact: paper, poster, preprint, conference, journal, or mentor-confirmed project",
  });

  const verifiedCreative = profile.creativeWorks.filter(c => c.evidenceState === "verified" && (c.link || impactKeywords.test(c.reach)));
  const creativeScore = Math.min(100, verifiedCreative.length * 30 + profile.creativeWorks.filter(c => c.evidenceState === "evidence_submitted").length * 10);
  signals.push({
    id: "creative_portfolio",
    name: "Creative/Public Portfolio",
    category: "Portfolio",
    status: creativeScore >= 75 ? "verified" : creativeScore >= 30 ? "submitted" : profile.creativeWorks.length ? "insufficient" : "missing",
    score: creativeScore,
    maxScore: 100,
    reason: profile.creativeWorks.length === 0 ? "No writing, design, music, media, portfolio, or public work added" : `${profile.creativeWorks.length} portfolio item(s) recorded`,
    requirement: "Verified public portfolio with audience, publication, selection, client, or measurable reach",
  });

  // ── Timeline ───────────────────────────────────────────────────────
  const gradeLevel = parseInt(profile.gradeLevel) || 11;
  const monthsRemaining = Math.max(0, (12 - gradeLevel) * 12 + 6);
  const timelineScore = Math.min(100, monthsRemaining * 3);

  signals.push({
    id: "timeline",
    name: "Timeline Readiness",
    category: "Planning",
    status: gradeLevel <= 10 ? "verified" : gradeLevel === 11 ? "submitted" : "insufficient",
    score: timelineScore,
    maxScore: 100,
    reason: gradeLevel >= 12
      ? "Senior year — limited time for meaningful signal development"
      : `Grade ${gradeLevel} — ${monthsRemaining} months until application deadline`,
    requirement: "Earlier engagement allows stronger signal development",
  });

  return signals;
}

function parseDuration(duration: string): number {
  const lower = duration.toLowerCase();
  const yearMatch = lower.match(/(\d+)\s*year/);
  const monthMatch = lower.match(/(\d+)\s*month/);

  let months = 0;
  if (yearMatch) months += parseInt(yearMatch[1]) * 12;
  if (monthMatch) months += parseInt(monthMatch[1]);
  if (months === 0 && lower.includes("ongoing")) months = 6;

  return months;
}

/**
 * Compute CRS using admin-tunable category weights (managed_content → ai_weights).
 * Each signal maps to one of five admin categories. Within a category, signals are
 * averaged. The category contribution is its average × (categoryWeight/100) × 100.
 *
 * This routes admin Journey Score Weights changes directly into the student CRS.
 */
function computeCRS(signals: Signal[], categoryWeights: { academics: number; competitions: number; activities: number; leadership: number; test_prep: number }): number {
  const groups: Record<keyof typeof categoryWeights, string[]> = {
    academics: ["academic_rigor", "certifications", "research_output", "timeline"],
    test_prep: ["test_score"],
    leadership: ["leadership"],
    activities: ["initiative", "real_world_impact", "service_impact", "internships", "creative_portfolio"],
    competitions: ["competition"],
  };

  let total = 0;
  (Object.keys(groups) as (keyof typeof categoryWeights)[]).forEach((cat) => {
    const ids = groups[cat];
    const matched = signals.filter((s) => ids.includes(s.id));
    if (matched.length === 0) return;
    const avg = matched.reduce((sum, s) => sum + s.score / s.maxScore, 0) / matched.length;
    total += avg * (categoryWeights[cat] / 100) * 100;
  });

  // Strictness dial: 3/10 (modest) — apply a small honesty discount so the CRS
  // does not over-reward self-reported or partial signals. Keeps band thresholds
  // unchanged but makes Band A meaningfully harder to reach.
  total = total * 0.90;

  return Math.round(Math.max(0, Math.min(100, total)));
}

// ── Tier calibration: thresholds + outcome bands depend on target tier.
// Selectivity drops sharply outside the top-20 — scoring should reflect that.
type TierKey = "ivy" | "top-20" | "top-50" | "state";
const TIER_CONFIG: Record<TierKey, { label: string; bandA: number; bandB: number; multiplier: number }> = {
  "ivy":    { label: "Ivy / Top 10",     bandA: 88, bandB: 72, multiplier: 1.00 },
  "top-20": { label: "Top 20",           bandA: 82, bandB: 65, multiplier: 1.00 },
  "top-50": { label: "Top 50",           bandA: 70, bandB: 52, multiplier: 1.20 },
  "state":  { label: "State Flagships",  bandA: 58, bandB: 40, multiplier: 1.40 },
};
function getTierConfig(tier: string) {
  return TIER_CONFIG[(tier as TierKey)] ?? TIER_CONFIG["top-20"];
}

function getOutcomeBand(crs: number, tier: string): { band: "A" | "B" | "C"; label: string; color: string } {
  const cfg = getTierConfig(tier);
  if (crs >= cfg.bandA) return { band: "A", label: "Strongly Competitive", color: "text-green-500" };
  if (crs >= cfg.bandB) return { band: "B", label: "Competitive but Volatile", color: "text-yellow-500" };
  return { band: "C", label: "Reach-Heavy / High-Risk", color: "text-orange-500" };
}

function generateGapTasks(signals: Signal[], profile: StudentProfile): GapTask[] {
  const tasks: GapTask[] = [];
  
  const weakSignals = signals.filter(s => s.status === "missing" || s.status === "insufficient");
  
  weakSignals.forEach(signal => {
    if (signal.id === "academic_rigor") {
      tasks.push({
        id: `task_${signal.id}_1`,
        signal: signal.name,
        objective: "Enroll in 2+ AP/IB courses aligned with intended major for next academic term",
        scope: "Course enrollment requires school counselor approval and prerequisite verification. Must complete full academic year.",
        timeHorizon: "Before next semester enrollment deadline",
        proofRequired: ["Official course enrollment confirmation", "Syllabus for each course", "End-of-term grade report"],
        impactScore: 25,
        status: "not_started",
      });
    }
    
    if (signal.id === "test_score") {
      tasks.push({
        id: `task_${signal.id}_1`,
        signal: signal.name,
        objective: "Register for and complete SAT/ACT with score meeting target tier threshold",
        scope: "Minimum 8-week preparation period recommended. Score must be officially reported to target institutions.",
        timeHorizon: "Within 4 months",
        proofRequired: ["Official score report from College Board or ACT", "Score send confirmation to target schools"],
        impactScore: 20,
        status: "not_started",
      });
    }
    
    if (signal.id === "leadership") {
      tasks.push({
        id: `task_${signal.id}_1`,
        signal: signal.name,
        objective: "Initiate and lead a subject-specific project involving ≥5 peers for ≥8 weeks, with a measurable outcome",
        scope: "Must demonstrate: (1) You initiated the project, (2) Led a team of 5+ people, (3) Sustained effort for 8+ weeks, (4) Produced a measurable result (e.g., published resource, event with attendance, competition entry, or external review)",
        timeHorizon: "8-12 weeks from start",
        proofRequired: ["Project charter with your name as founder", "Roster of 5+ team members with roles", "Weekly meeting notes (minimum 8 weeks)", "Documentation of measurable outcome", "External validation (press, review, results)"],
        impactScore: 30,
        status: "not_started",
      });
    }
    
    if (signal.id === "initiative") {
      tasks.push({
        id: `task_${signal.id}_1`,
        signal: signal.name,
        objective: "Complete an independent project with documented outcome and public artifact",
        scope: "Self-directed project demonstrating technical skill or research capability. Must have external proof: published work, deployed application, research paper, or competition entry.",
        timeHorizon: "3-4 months",
        proofRequired: ["Project documentation with your authorship", "Public link (GitHub, publication, website)", "Metrics or results (users, downloads, citations, placement)", "Third-party validation (mentor letter, peer review)"],
        impactScore: 28,
        status: "not_started",
      });
    }
    
    if (signal.id === "competition") {
      tasks.push({
        id: `task_${signal.id}_1`,
        signal: signal.name,
        objective: "Register for and compete in a recognized state/national competition in your field",
        scope: "Competition must be recognized (e.g., Science Olympiad, DECA, USACO, Math Olympiad, Debate nationals). Participation alone is insufficient — must document preparation and result.",
        timeHorizon: "Next competition cycle (varies by competition)",
        proofRequired: ["Registration confirmation", "Competition result certificate", "Ranking or placement documentation"],
        impactScore: 22,
        status: "not_started",
      });
    }
  });
  
  return tasks.sort((a, b) => b.impactScore - a.impactScore);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const statusColors: Record<EvidenceState, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-yellow-500/20 text-yellow-600",
  evidence_submitted: "bg-blue-500/20 text-blue-600",
  verified: "bg-green-500/20 text-green-600",
};

const statusLabels: Record<EvidenceState, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  evidence_submitted: "Evidence Submitted",
  verified: "Verified",
};

const signalStatusColors: Record<Signal["status"], string> = {
  verified: "bg-green-500/20 text-green-600 border-green-500/30",
  submitted: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  insufficient: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  missing: "bg-red-500/20 text-red-600 border-red-500/30",
};

const signalStatusLabels: Record<Signal["status"], string> = {
  verified: "VERIFIED",
  submitted: "PENDING VERIFICATION",
  insufficient: "INSUFFICIENT",
  missing: "MISSING",
};

export default function Outcomes() {
  const { user } = useAuth();
  const { 
    profile, 
    taskStates, 
    followPathforge, 
    loading, 
    saving,
    updateProfile,
    updateTaskStates,
    updateFollowPathforge,
    isAuthenticated 
  } = useOutcomesData();
  const { weights: scoringWeights } = useScoringWeights();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    courses: true,
    projects: false,
    leadership: false,
    competitions: false,
    service: false,
    internships: false,
    research: false,
    creative: false,
  });

  // Computed values
  const signals = useMemo(() => computeSignals(profile), [profile]);
  const crsScore = useMemo(() => {
    const raw = computeCRS(signals, scoringWeights);
    return Math.round(Math.min(100, raw * getTierConfig(profile.targetTier).multiplier));
  }, [signals, scoringWeights, profile.targetTier]);
  const currentBand = useMemo(() => getOutcomeBand(crsScore, profile.targetTier), [crsScore, profile.targetTier]);
  const tierLabel = getTierConfig(profile.targetTier).label;
  const gapTasks = useMemo(() => generateGapTasks(signals, profile), [signals, profile]);

  const projectedScore = useMemo(() => {
    if (!followPathforge) return Math.max(0, crsScore - 5);
    // Verified evidence is the only thing that meaningfully moves the score.
    // Verified = +5, evidence_submitted = +2 (provisional). Capped at +30 total.
    const states = Object.values(taskStates);
    const verifiedCount = states.filter(s => s === "verified").length;
    const submittedCount = states.filter(s => s === "evidence_submitted").length;
    const lift = Math.min(30, verifiedCount * 5 + submittedCount * 2);
    return Math.min(100, crsScore + lift);
  }, [crsScore, followPathforge, taskStates]);

  const projectedBand = useMemo(() => getOutcomeBand(projectedScore, profile.targetTier), [projectedScore, profile.targetTier]);

  const timeToNextBand = useMemo(() => {
    if (currentBand.band === "A") return null;
    const gap = currentBand.band === "B" ? 82 - crsScore : 65 - crsScore;
    return Math.ceil(gap / 3);
  }, [crsScore, currentBand]);

  const missingSignals = useMemo(() => signals.filter(s => s.status === "missing" || s.status === "insufficient"), [signals]);
  const verifiedSignals = useMemo(() => signals.filter(s => s.status === "verified"), [signals]);

  // Handlers
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const addCourse = () => {
    updateProfile(prev => ({
      ...prev,
      courses: [...prev.courses, { id: generateId(), subject: "", level: "regular" }],
    }));
  };

  const updateCourse = (id: string, field: keyof Course, value: string) => {
    updateProfile(prev => ({
      ...prev,
      courses: prev.courses.map(c => c.id === id ? { ...c, [field]: value } : c),
    }));
  };

  const removeCourse = (id: string) => {
    updateProfile(prev => ({
      ...prev,
      courses: prev.courses.filter(c => c.id !== id),
    }));
  };

  const addProject = () => {
    updateProfile(prev => ({
      ...prev,
      projects: [...prev.projects, { 
        id: generateId(), 
        title: "", 
        description: "", 
        duration: "", 
        outcome: "",
        evidenceState: "not_started" as EvidenceState,
      }],
    }));
  };

  const updateProject = (id: string, field: keyof Project, value: string | EvidenceState) => {
    updateProfile(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p),
    }));
  };

  const removeProject = (id: string) => {
    updateProfile(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
    }));
  };

  const addLeadershipRole = () => {
    updateProfile(prev => ({
      ...prev,
      leadershipRoles: [...prev.leadershipRoles, { 
        id: generateId(), 
        title: "", 
        organization: "", 
        duration: "",
        teamSize: 0,
        evidenceState: "not_started" as EvidenceState,
      }],
    }));
  };

  const updateLeadershipRole = (id: string, field: keyof LeadershipRole, value: string | number | EvidenceState) => {
    updateProfile(prev => ({
      ...prev,
      leadershipRoles: prev.leadershipRoles.map(r => r.id === id ? { ...r, [field]: value } : r),
    }));
  };

  const removeLeadershipRole = (id: string) => {
    updateProfile(prev => ({
      ...prev,
      leadershipRoles: prev.leadershipRoles.filter(r => r.id !== id),
    }));
  };

  const addCompetition = () => {
    updateProfile(prev => ({
      ...prev,
      competitions: [...prev.competitions, { 
        id: generateId(), 
        name: "", 
        level: "school" as const,
        result: "",
        evidenceState: "not_started" as EvidenceState,
      }],
    }));
  };

  const updateCompetition = (id: string, field: keyof Competition, value: string | EvidenceState) => {
    updateProfile(prev => ({
      ...prev,
      competitions: prev.competitions.map(c => c.id === id ? { ...c, [field]: value } : c),
    }));
  };

  const removeCompetition = (id: string) => {
    updateProfile(prev => ({
      ...prev,
      competitions: prev.competitions.filter(c => c.id !== id),
    }));
  };

  const addServiceRole = () => updateProfile(prev => ({ ...prev, serviceRoles: [...prev.serviceRoles, { id: generateId(), role: "", organization: "", hours: 0, impact: "", evidenceState: "not_started" as EvidenceState }] }));
  const updateServiceRole = (id: string, field: keyof ServiceRole, value: string | number | EvidenceState) => updateProfile(prev => ({ ...prev, serviceRoles: prev.serviceRoles.map(s => s.id === id ? { ...s, [field]: value } : s) }));
  const removeServiceRole = (id: string) => updateProfile(prev => ({ ...prev, serviceRoles: prev.serviceRoles.filter(s => s.id !== id) }));

  const addInternship = () => updateProfile(prev => ({ ...prev, internships: [...prev.internships, { id: generateId(), title: "", organization: "", duration: "", outcome: "", evidenceState: "not_started" as EvidenceState }] }));
  const updateInternship = (id: string, field: keyof Internship, value: string | EvidenceState) => updateProfile(prev => ({ ...prev, internships: prev.internships.map(i => i.id === id ? { ...i, [field]: value } : i) }));
  const removeInternship = (id: string) => updateProfile(prev => ({ ...prev, internships: prev.internships.filter(i => i.id !== id) }));

  const addResearchOutput = () => updateProfile(prev => ({ ...prev, researchOutputs: [...prev.researchOutputs, { id: generateId(), title: "", venue: "", role: "", link: "", evidenceState: "not_started" as EvidenceState }] }));
  const updateResearchOutput = (id: string, field: keyof ResearchOutput, value: string | EvidenceState) => updateProfile(prev => ({ ...prev, researchOutputs: prev.researchOutputs.map(r => r.id === id ? { ...r, [field]: value } : r) }));
  const removeResearchOutput = (id: string) => updateProfile(prev => ({ ...prev, researchOutputs: prev.researchOutputs.filter(r => r.id !== id) }));

  const addCreativeWork = () => updateProfile(prev => ({ ...prev, creativeWorks: [...prev.creativeWorks, { id: generateId(), title: "", platform: "", reach: "", link: "", evidenceState: "not_started" as EvidenceState }] }));
  const updateCreativeWork = (id: string, field: keyof CreativeWork, value: string | EvidenceState) => updateProfile(prev => ({ ...prev, creativeWorks: prev.creativeWorks.map(c => c.id === id ? { ...c, [field]: value } : c) }));
  const removeCreativeWork = (id: string) => updateProfile(prev => ({ ...prev, creativeWorks: prev.creativeWorks.filter(c => c.id !== id) }));

  const updateTaskState = (taskId: string, state: EvidenceState) => {
    updateTaskStates(prev => ({ ...prev, [taskId]: state }));
  };

  const subjects = [
    "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
    "English", "History", "Economics", "Psychology", "Environmental Science",
    "Art", "Music", "Foreign Language", "Statistics", "Calculus"
  ];

  const evidenceSelect = (value: EvidenceState, onChange: (value: EvidenceState) => void) => (
    <Select value={value} onValueChange={v => onChange(v as EvidenceState)}>
      <SelectTrigger aria-label="Evidence state" className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="not_started">Not Started</SelectItem>
        <SelectItem value="in_progress">In Progress</SelectItem>
        <SelectItem value="evidence_submitted">Evidence Submitted</SelectItem>
        <SelectItem value="verified">Verified</SelectItem>
      </SelectContent>
    </Select>
  );

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Seo title='Outcomes & CRS simulator | Pathforge' description='Track your College Readiness Score and see how proven actions move you up Outcome Bands.' path='/outcomes' />
      {/* Saving indicator */}
      {saving && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
          <Save className="h-4 w-4 text-accent animate-pulse" />
          <span className="text-sm text-muted-foreground">Saving...</span>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden py-8 sm:py-12">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-background to-background" />
        
        <div className="section-container relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-4xl text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-2 text-sm">
              <Lock className="h-4 w-4 text-accent" />
              <span className="text-accent font-medium">Evidence-Based System</span>
              {isAuthenticated && (
                <span className="ml-2 text-xs text-muted-foreground">• Auto-saving enabled</span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              College Readiness Engine™
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Your score is computed from verified evidence only. No self-ratings. No assumptions. Missing signals are clearly identified.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-6">
        <div className="section-container">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left Column - Factual Inputs */}
            <div className="lg:col-span-2 space-y-4">
              {/* Basic Profile */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card-elevated p-4"
              >
                <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 text-accent" />
                  Profile Configuration
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Grade Level</Label>
                    <Select value={profile.gradeLevel} onValueChange={v => updateProfile(p => ({ ...p, gradeLevel: v }))}>
                      <SelectTrigger aria-label="Grade level" className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9">9th Grade</SelectItem>
                        <SelectItem value="10">10th Grade</SelectItem>
                        <SelectItem value="11">11th Grade</SelectItem>
                        <SelectItem value="12">12th Grade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Target Tier</Label>
                    <Select value={profile.targetTier} onValueChange={v => updateProfile(p => ({ ...p, targetTier: v }))}>
                      <SelectTrigger aria-label="Target tier" className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ivy">Ivy / Top 10</SelectItem>
                        <SelectItem value="top-20">Top 20</SelectItem>
                        <SelectItem value="top-50">Top 50</SelectItem>
                        <SelectItem value="state">State Flagships</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Test Type</Label>
                    <Select value={profile.testType} onValueChange={v => updateProfile(p => ({ ...p, testType: v, testScore: "" }))}>
                      <SelectTrigger aria-label="Test type" className="mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not Taken</SelectItem>
                        <SelectItem value="sat">SAT</SelectItem>
                        <SelectItem value="act">ACT</SelectItem>
                        <SelectItem value="psat">PSAT/NMSQT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {profile.testType !== "none" && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Score</Label>
                      <Input
                        className="mt-1 h-9"
                        type="number"
                        placeholder={profile.testType === "sat" ? "1600" : "36"}
                        value={profile.testScore}
                        onChange={e => updateProfile(p => ({ ...p, testScore: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Courses Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="card-elevated p-4"
              >
                <button
                  onClick={() => toggleSection("courses")}
                  className="w-full flex items-center justify-between font-semibold text-foreground text-sm"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-accent" />
                    Courses ({profile.courses.length})
                  </div>
                  {expandedSections.courses ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <AnimatePresence>
                  {expandedSections.courses && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs text-muted-foreground mt-2 mb-3">
                        Add your current academic courses with difficulty level
                      </p>

                      <div className="space-y-2">
                        {profile.courses.map(course => (
                          <div key={course.id} className="flex gap-2 items-center">
                            <Select value={course.subject} onValueChange={v => updateCourse(course.id, "subject", v)}>
                              <SelectTrigger aria-label="Course subject" className="flex-1 h-8 text-xs">
                                <SelectValue placeholder="Subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={course.level} onValueChange={v => updateCourse(course.id, "level", v)}>
                              <SelectTrigger aria-label="Course level" className="w-24 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="honors">Honors</SelectItem>
                                <SelectItem value="ap">AP</SelectItem>
                                <SelectItem value="ib">IB</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeCourse(course.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 h-8 text-xs"
                        onClick={addCourse}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Course
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Projects Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="card-elevated p-4"
              >
                <button
                  onClick={() => toggleSection("projects")}
                  className="w-full flex items-center justify-between font-semibold text-foreground text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    Projects ({profile.projects.length})
                  </div>
                  {expandedSections.projects ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <AnimatePresence>
                  {expandedSections.projects && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs text-muted-foreground mt-2 mb-3">
                        Independent projects with documented outcomes
                      </p>

                      <div className="space-y-3">
                        {profile.projects.map(project => (
                          <div key={project.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                            <div className="flex justify-between items-start">
                              <Input
                                className="h-8 text-xs flex-1"
                                placeholder="Project title"
                                value={project.title}
                                onChange={e => updateProject(project.id, "title", e.target.value)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 ml-2"
                                onClick={() => removeProject(project.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <Textarea
                              className="text-xs min-h-[60px]"
                              placeholder="Brief description of what you built/researched"
                              value={project.description}
                              onChange={e => updateProject(project.id, "description", e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                className="h-8 text-xs"
                                placeholder="Duration (e.g., 3 months)"
                                value={project.duration}
                                onChange={e => updateProject(project.id, "duration", e.target.value)}
                              />
                              <Input
                                className="h-8 text-xs"
                                placeholder="Outcome/result"
                                value={project.outcome}
                                onChange={e => updateProject(project.id, "outcome", e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2 items-center">
                              <Input
                                className="h-8 text-xs flex-1"
                                placeholder="Link to evidence (GitHub, publication, etc.)"
                                value={project.link || ""}
                                onChange={e => updateProject(project.id, "link", e.target.value)}
                              />
                              <Select 
                                value={project.evidenceState} 
                                onValueChange={v => updateProject(project.id, "evidenceState", v as EvidenceState)}
                              >
                                <SelectTrigger aria-label="Activity evidence state" className="w-36 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="not_started">Not Started</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="evidence_submitted">Evidence Submitted</SelectItem>
                                  <SelectItem value="verified">Verified</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 h-8 text-xs"
                        onClick={addProject}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Project
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Leadership Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="card-elevated p-4"
              >
                <button
                  onClick={() => toggleSection("leadership")}
                  className="w-full flex items-center justify-between font-semibold text-foreground text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    Leadership ({profile.leadershipRoles.length})
                  </div>
                  {expandedSections.leadership ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <AnimatePresence>
                  {expandedSections.leadership && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs text-muted-foreground mt-2 mb-3">
                        Sustained leadership roles (≥6 months, ≥5 team members required)
                      </p>

                      <div className="space-y-3">
                        {profile.leadershipRoles.map(role => (
                          <div key={role.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                            <div className="flex justify-between items-start">
                              <Input
                                className="h-8 text-xs flex-1"
                                placeholder="Role title (e.g., President, Founder)"
                                value={role.title}
                                onChange={e => updateLeadershipRole(role.id, "title", e.target.value)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 ml-2"
                                onClick={() => removeLeadershipRole(role.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <Input
                              className="h-8 text-xs"
                              placeholder="Organization name"
                              value={role.organization}
                              onChange={e => updateLeadershipRole(role.id, "organization", e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                className="h-8 text-xs"
                                placeholder="Duration (e.g., 1 year)"
                                value={role.duration}
                                onChange={e => updateLeadershipRole(role.id, "duration", e.target.value)}
                              />
                              <Input
                                className="h-8 text-xs"
                                type="number"
                                placeholder="Team size"
                                value={role.teamSize || ""}
                                onChange={e => updateLeadershipRole(role.id, "teamSize", parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <Select 
                              value={role.evidenceState} 
                              onValueChange={v => updateLeadershipRole(role.id, "evidenceState", v as EvidenceState)}
                            >
                              <SelectTrigger aria-label="Leadership role evidence state" className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="evidence_submitted">Evidence Submitted</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 h-8 text-xs"
                        onClick={addLeadershipRole}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Leadership Role
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Competitions Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="card-elevated p-4"
              >
                <button
                  onClick={() => toggleSection("competitions")}
                  className="w-full flex items-center justify-between font-semibold text-foreground text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-accent" />
                    Competitions ({profile.competitions.length})
                  </div>
                  {expandedSections.competitions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <AnimatePresence>
                  {expandedSections.competitions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs text-muted-foreground mt-2 mb-3">
                        Competition entries with documented results
                      </p>

                      <div className="space-y-3">
                        {profile.competitions.map(comp => (
                          <div key={comp.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                            <div className="flex justify-between items-start">
                              <Input
                                className="h-8 text-xs flex-1"
                                placeholder="Competition name"
                                value={comp.name}
                                onChange={e => updateCompetition(comp.id, "name", e.target.value)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 ml-2"
                                onClick={() => removeCompetition(comp.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Select value={comp.level} onValueChange={v => updateCompetition(comp.id, "level", v)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Level" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="school">School</SelectItem>
                                  <SelectItem value="regional">Regional</SelectItem>
                                  <SelectItem value="state">State</SelectItem>
                                  <SelectItem value="national">National</SelectItem>
                                  <SelectItem value="international">International</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                className="h-8 text-xs"
                                placeholder="Result (e.g., Top 10%)"
                                value={comp.result}
                                onChange={e => updateCompetition(comp.id, "result", e.target.value)}
                              />
                            </div>
                            <Select 
                              value={comp.evidenceState} 
                              onValueChange={v => updateCompetition(comp.id, "evidenceState", v as EvidenceState)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="evidence_submitted">Evidence Submitted</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 h-8 text-xs"
                        onClick={addCompetition}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Competition
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Additional Evidence Categories */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="card-elevated p-4 space-y-4"
              >
                <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                  <Layers className="h-4 w-4 text-accent" /> More Outcome Categories
                </h3>

                <div className="space-y-3">
                  <button onClick={() => toggleSection("service")} className="w-full flex items-center justify-between font-semibold text-foreground text-sm">
                    <span>Service & Community Impact ({profile.serviceRoles.length})</span>
                    {expandedSections.service ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedSections.service && <div className="space-y-2">
                    {profile.serviceRoles.map(item => <div key={item.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                      <div className="flex gap-2"><Input className="h-8 text-xs" placeholder="Role" value={item.role} onChange={e => updateServiceRole(item.id, "role", e.target.value)} /><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeServiceRole(item.id)}><X className="h-3 w-3" /></Button></div>
                      <Input className="h-8 text-xs" placeholder="Organization" value={item.organization} onChange={e => updateServiceRole(item.id, "organization", e.target.value)} />
                      <div className="grid grid-cols-2 gap-2"><Input className="h-8 text-xs" type="number" placeholder="Hours" value={item.hours || ""} onChange={e => updateServiceRole(item.id, "hours", parseInt(e.target.value) || 0)} /><Input className="h-8 text-xs" placeholder="Measured impact" value={item.impact} onChange={e => updateServiceRole(item.id, "impact", e.target.value)} /></div>
                      {evidenceSelect(item.evidenceState, v => updateServiceRole(item.id, "evidenceState", v))}
                    </div>)}
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={addServiceRole}><Plus className="h-3 w-3 mr-1" />Add Service</Button>
                  </div>}
                </div>

                <div className="space-y-3 border-t border-border pt-3">
                  <button onClick={() => toggleSection("internships")} className="w-full flex items-center justify-between font-semibold text-foreground text-sm">
                    <span>Internships & Work ({profile.internships.length})</span>
                    {expandedSections.internships ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedSections.internships && <div className="space-y-2">
                    {profile.internships.map(item => <div key={item.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                      <div className="flex gap-2"><Input className="h-8 text-xs" placeholder="Title" value={item.title} onChange={e => updateInternship(item.id, "title", e.target.value)} /><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeInternship(item.id)}><X className="h-3 w-3" /></Button></div>
                      <Input className="h-8 text-xs" placeholder="Organization" value={item.organization} onChange={e => updateInternship(item.id, "organization", e.target.value)} />
                      <div className="grid grid-cols-2 gap-2"><Input className="h-8 text-xs" placeholder="Duration" value={item.duration} onChange={e => updateInternship(item.id, "duration", e.target.value)} /><Input className="h-8 text-xs" placeholder="Outcome" value={item.outcome} onChange={e => updateInternship(item.id, "outcome", e.target.value)} /></div>
                      {evidenceSelect(item.evidenceState, v => updateInternship(item.id, "evidenceState", v))}
                    </div>)}
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={addInternship}><Plus className="h-3 w-3 mr-1" />Add Internship / Work</Button>
                  </div>}
                </div>

                <div className="space-y-3 border-t border-border pt-3">
                  <button onClick={() => toggleSection("research")} className="w-full flex items-center justify-between font-semibold text-foreground text-sm">
                    <span>Research & Publications ({profile.researchOutputs.length})</span>
                    {expandedSections.research ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedSections.research && <div className="space-y-2">
                    {profile.researchOutputs.map(item => <div key={item.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                      <div className="flex gap-2"><Input className="h-8 text-xs" placeholder="Title" value={item.title} onChange={e => updateResearchOutput(item.id, "title", e.target.value)} /><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeResearchOutput(item.id)}><X className="h-3 w-3" /></Button></div>
                      <div className="grid grid-cols-2 gap-2"><Input className="h-8 text-xs" placeholder="Venue / mentor / journal" value={item.venue} onChange={e => updateResearchOutput(item.id, "venue", e.target.value)} /><Input className="h-8 text-xs" placeholder="Your role" value={item.role} onChange={e => updateResearchOutput(item.id, "role", e.target.value)} /></div>
                      <Input className="h-8 text-xs" placeholder="Evidence link" value={item.link || ""} onChange={e => updateResearchOutput(item.id, "link", e.target.value)} />
                      {evidenceSelect(item.evidenceState, v => updateResearchOutput(item.id, "evidenceState", v))}
                    </div>)}
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={addResearchOutput}><Plus className="h-3 w-3 mr-1" />Add Research Output</Button>
                  </div>}
                </div>

                <div className="space-y-3 border-t border-border pt-3">
                  <button onClick={() => toggleSection("creative")} className="w-full flex items-center justify-between font-semibold text-foreground text-sm">
                    <span>Creative / Public Portfolio ({profile.creativeWorks.length})</span>
                    {expandedSections.creative ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {expandedSections.creative && <div className="space-y-2">
                    {profile.creativeWorks.map(item => <div key={item.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                      <div className="flex gap-2"><Input className="h-8 text-xs" placeholder="Work title" value={item.title} onChange={e => updateCreativeWork(item.id, "title", e.target.value)} /><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeCreativeWork(item.id)}><X className="h-3 w-3" /></Button></div>
                      <div className="grid grid-cols-2 gap-2"><Input className="h-8 text-xs" placeholder="Platform / publication" value={item.platform} onChange={e => updateCreativeWork(item.id, "platform", e.target.value)} /><Input className="h-8 text-xs" placeholder="Reach / result" value={item.reach} onChange={e => updateCreativeWork(item.id, "reach", e.target.value)} /></div>
                      <Input className="h-8 text-xs" placeholder="Portfolio link" value={item.link || ""} onChange={e => updateCreativeWork(item.id, "link", e.target.value)} />
                      {evidenceSelect(item.evidenceState, v => updateCreativeWork(item.id, "evidenceState", v))}
                    </div>)}
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={addCreativeWork}><Plus className="h-3 w-3 mr-1" />Add Portfolio Item</Button>
                  </div>}
                </div>
              </motion.div>
            </div>

            {/* Right Column - Outputs */}
            <div className="lg:col-span-3 space-y-4">
              {/* CRS Score */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-elevated p-4"
              >
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-accent" />
                    College Readiness Score (CRS™)
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    Calibrated for {tierLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground -mt-1 mb-3">
                  Strictness, score thresholds, and Outcome Bands are tuned to <span className="font-medium text-foreground">{tierLabel}</span> admit standards. Change <span className="font-medium text-foreground">Target Tier</span> below to recalibrate.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <div className="text-xs text-muted-foreground mb-1">Current Score</div>
                    <motion.div
                      key={crsScore}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl font-bold gradient-text"
                    >
                      {crsScore}
                    </motion.div>
                    <Progress value={crsScore} className="h-2 mt-2" />
                    <div className={`mt-2 text-xs font-medium ${currentBand.color}`}>
                      Band {currentBand.band}: {currentBand.label}
                    </div>
                  </div>

                  <div className={`text-center p-4 rounded-xl ${followPathforge ? "bg-accent/10" : "bg-destructive/10"}`}>
                    <div className="text-xs text-muted-foreground mb-1">
                      {followPathforge ? "Projected (6 months)" : "Without Action"}
                    </div>
                    <motion.div
                      key={projectedScore}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`text-4xl font-bold ${followPathforge ? "text-accent" : "text-destructive"}`}
                    >
                      {projectedScore}
                    </motion.div>
                    <Progress 
                      value={projectedScore} 
                      className={`h-2 mt-2 ${!followPathforge ? "[&>div]:bg-destructive" : ""}`}
                    />
                    <div className={`mt-2 text-xs font-medium ${projectedBand.color}`}>
                      Band {projectedBand.band}: {projectedBand.label}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Switch checked={followPathforge} onCheckedChange={updateFollowPathforge} />
                    <span className="text-xs text-muted-foreground">
                      {followPathforge ? "With Pathforge Actions" : "No Intervention"}
                    </span>
                  </div>
                  {timeToNextBand && (
                    <span className="text-xs text-muted-foreground">
                      ~{timeToNextBand} months to next band
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Signal Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card-elevated p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-accent" />
                    Signal Breakdown
                  </h3>
                  <div className="flex gap-2">
                    <Badge className="text-xs bg-green-500/20 text-green-600">{verifiedSignals.length} verified</Badge>
                    <Badge className="text-xs bg-red-500/20 text-red-600">{missingSignals.length} missing</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  {signals.map((signal, i) => (
                    <motion.div
                      key={signal.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ x: 3, scale: 1.005 }}
                      className={`p-3 rounded-lg border ${signalStatusColors[signal.status]}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{signal.name}</span>
                          <Badge variant="outline" className={`text-xs ${signalStatusColors[signal.status]}`}>
                            {signalStatusLabels[signal.status]}
                          </Badge>
                        </div>
                        <span className="text-sm font-bold">{signal.score}/{signal.maxScore}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{signal.reason}</p>
                      {(signal.status === "missing" || signal.status === "insufficient") && (
                        <p className="text-xs mt-1 italic text-muted-foreground/70">
                          Requirement: {signal.requirement}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Gap-Derived Tasks */}
              {gapTasks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="card-elevated p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-accent" />
                      Gap → Action Tasks
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {gapTasks.length} tasks derived from missing signals
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3">
                    Each task directly addresses a missing or insufficient signal. CRS updates only when evidence state changes.
                  </p>

                  <div className="space-y-3">
                    {gapTasks.map((task, index) => {
                      const state = taskStates[task.id] || task.status;
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Badge variant="secondary" className="text-xs mb-1">
                                Addresses: {task.signal}
                              </Badge>
                              <h4 className="font-medium text-sm text-foreground">{task.objective}</h4>
                            </div>
                            <Badge className="text-xs bg-accent/20 text-accent">
                              +{task.impactScore} pts
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-2">{task.scope}</p>
                          
                          <div className="text-xs space-y-1 mb-3">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Time horizon: {task.timeHorizon}</span>
                            </div>
                          </div>

                          <div className="p-2 rounded bg-background/50 mb-3">
                            <div className="text-xs font-medium text-foreground mb-1">Proof Required:</div>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {task.proofRequired.map((proof, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <FileCheck className="h-3 w-3 text-accent shrink-0" />
                                  {proof}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Evidence State:</Label>
                            <Select 
                              value={state} 
                              onValueChange={v => updateTaskState(task.id, v as EvidenceState)}
                            >
                              <SelectTrigger className="w-44 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="evidence_submitted">Evidence Submitted</SelectItem>
                                <SelectItem value="verified">Verified (Simulated)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* System Principles */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card-elevated p-4 bg-muted/30"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-accent" />
                  <h3 className="font-semibold text-foreground text-sm">System Principles</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Lock className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span>No self-assessment sliders — inputs are factual</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lock className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span>CRS computed only from verified evidence</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lock className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span>Tasks are gap-derived, not generic advice</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lock className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span>Missing signals explicitly labeled</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lock className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span>No assumed completion — evidence required</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lock className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    <span>Score starts low and increases with proof</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Quote */}
      <section className="py-8 bg-primary text-primary-foreground">
        <div className="section-container text-center">
          <p className="text-lg sm:text-xl font-semibold max-w-2xl mx-auto">
            "You cannot game this system."
          </p>
          <p className="mt-2 text-primary-foreground/70 text-sm">
            Pathforge is infrastructure — not advice.
          </p>
        </div>
      </section>
    </div>
  );
}
