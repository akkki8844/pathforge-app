import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { applicationSections } from "@/lib/applicationSections";
import {
  calibrateList,
  standingFor,
  tierFor,
  type ListCalibration,
  type PillarCoverage,
  type Standing,
  type Tier,
} from "@/lib/collegeCalibration";

/**
 * One batched read of everything the dashboard shows.
 *
 * The dashboard is the first screen a signed-in student sees, so it must not
 * fan out into a dozen sequential round-trips. Every table is queried in
 * parallel and each result is tolerated independently — a single failing
 * table degrades one panel instead of blanking the whole page.
 */

export type ReadinessPillars = {
  academics: number;
  activities: number;
  leadership: number;
  competitions: number;
  testPrep: number;
};

export interface PortfolioCounts {
  courses: number;
  projects: number;
  leadership: number;
  competitions: number;
  internships: number;
  research: number;
  creative: number;
  service: number;
  total: number;
}

export interface EssayProgress {
  started: number;
  refined: number;
  words: number;
}

export interface RecommenderRow {
  id: string;
  name: string;
  status: string;
  subject: string | null;
  due_date: string | null;
  submitted_at: string | null;
  strength: string | null;
}

export interface DeadlineItem {
  id: string;
  label: string;
  detail: string;
  date: Date;
  kind: "application" | "recommender" | "test";
}

export interface CollegeItem {
  name: string;
  tier: Tier;
  fit: Standing;
  /** Readiness measured against this school's tier. 100 = at the admitted bar. */
  readinessIndex: number;
  probability: number | null;
  hasRequirements: boolean;
}

export interface ArtifactItem {
  id: string;
  title: string;
  kind: string;
  created_at: string | null;
}

export interface DashboardData {
  loading: boolean;
  refresh: () => Promise<void>;

  overall: number;
  pillars: ReadinessPillars;
  /** Profile scored against the tiers of the schools actually on the list. */
  calibration: ListCalibration;
  coverage: PillarCoverage;
  journeyStarted: boolean;
  gems: number;
  hearts: number;
  completedMilestones: number;
  currentLevel: number;

  portfolio: PortfolioCounts;
  essays: EssayProgress;
  totalEssaySections: number;
  applications: { university: string; status: string; updated_at: string }[];
  recommenders: RecommenderRow[];
  colleges: CollegeItem[];
  deadlines: DeadlineItem[];
  artifacts: ArtifactItem[];
  unreadNotifications: number;

  /** Activity count per ISO week for the last 12 weeks, oldest first. */
  momentum: { weekStart: Date; count: number }[];
  activeDays: number;
  currentStreak: number;
  lastActiveAt: Date | null;

  readinessTrend: { label: string; score: number; date: string }[];
  latestVerdict: string | null;
}

function len(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Local midnight for a date, so day-bucketing isn't skewed by UTC offset. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday-anchored week start. */
function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7; // Mon = 0
  s.setDate(s.getDate() - dow);
  return s;
}

/**
 * Standard US application deadlines for a given application year. These are the
 * dates the overwhelming majority of the target schools use; they're shown as
 * orientation, not as a per-school promise, which is why the label says so.
 */
function standardDeadlines(applicationYear: string | null | undefined): DeadlineItem[] {
  const year = Number(String(applicationYear || "").match(/\d{4}/)?.[0]);
  if (!Number.isFinite(year)) return [];
  // An applicant entering in Fall `year` submits in the autumn of `year - 1`.
  const submitYear = year - 1;
  return [
    {
      id: "dl-ed",
      label: "Early Decision / Early Action",
      detail: "Most selective US colleges",
      date: new Date(submitYear, 10, 1),
      kind: "application" as const,
    },
    {
      id: "dl-ed2",
      label: "Early Decision II",
      detail: "Second-round binding option",
      date: new Date(submitYear + 1, 0, 1),
      kind: "application" as const,
    },
    {
      id: "dl-rd",
      label: "Regular Decision",
      detail: "Common App standard deadline",
      date: new Date(submitYear + 1, 0, 1),
      kind: "application" as const,
    },
    {
      id: "dl-fafsa",
      label: "Financial aid (CSS / FAFSA)",
      detail: "Typically due with the application",
      date: new Date(submitYear + 1, 1, 1),
      kind: "application" as const,
    },
  ];
}

export function useDashboardData(): DashboardData {
  const { user, onboardingData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState<any>(null);
  const [outcomes, setOutcomes] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [recs, setRecs] = useState<any[]>([]);
  const [reqReports, setReqReports] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [evals, setEvals] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const uid = user.id;
    const since = new Date();
    since.setDate(since.getDate() - 84); // 12 weeks of momentum

    const [
      journeyRes, outcomesRes, entriesRes, appsRes, recsRes, reqRes,
      artifactsRes, activityRes, readinessRes, admissionsRes, evalsRes, unreadRes,
    ] = await Promise.all([
      supabase.from("journey_scores").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("outcomes_data").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("application_entries").select("section_id,input_text,refined_text").eq("user_id", uid),
      supabase.from("full_applications").select("university,status,updated_at").eq("user_id", uid).order("updated_at", { ascending: false }),
      supabase.from("recommenders").select("id,name,status,subject,due_date,submitted_at,strength").eq("user_id", uid),
      supabase.from("requirements_reports").select("college,updated_at").eq("user_id", uid),
      supabase.from("advisor_artifacts").select("id,title,kind,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(6),
      supabase.from("user_activity_logs").select("created_at").eq("user_id", uid).gte("created_at", since.toISOString()),
      supabase.from("readiness_analyses").select("name,sequence_number,analysis_result,created_at").eq("user_id", uid).order("sequence_number", { ascending: true }),
      supabase.from("admissions_data").select("analysis_results,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1),
      supabase.from("level_evaluations").select("level,verdict,score,summary,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("is_read", false),
    ]);

    setJourney(journeyRes.data ?? null);
    setOutcomes(outcomesRes.data ?? null);
    setEntries(entriesRes.data ?? []);
    setApps(appsRes.data ?? []);
    setRecs(recsRes.data ?? []);
    setReqReports(reqRes.data ?? []);
    setArtifacts(artifactsRes.data ?? []);
    setActivity(activityRes.data ?? []);
    setReadiness(readinessRes.data ?? []);
    setAdmissions(admissionsRes.data ?? []);
    setEvals(evalsRes.data ?? []);
    setUnread(unreadRes.count ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const pillars: ReadinessPillars = useMemo(
    () => ({
      academics: journey?.academics_score ?? 0,
      activities: journey?.activities_score ?? 0,
      leadership: journey?.leadership_score ?? 0,
      competitions: journey?.competitions_score ?? 0,
      testPrep: journey?.test_prep_score ?? 0,
    }),
    [journey]
  );

  /**
   * Which pillars carry a real signal.
   *
   * Only academics and testing can legitimately be *absent* rather than empty:
   * a test-optional applicant has not failed testing, and a student who hasn't
   * entered their transcript yet has not failed academics. Both are excluded
   * from the index instead of being scored zero.
   *
   * Activities, leadership and competitions are deliberately NOT treated that
   * way. An empty list there is not missing data — it is the finding. Excluding
   * them would flatter exactly the profile that most needs the warning.
   */
  const coverage: PillarCoverage = useMemo(
    () => ({
      academics: Boolean(onboardingData?.gpa_range) || len(outcomes?.courses) > 0,
      activities: true,
      leadership: true,
      competitions: true,
      testPrep: Boolean(
        outcomes?.test_type && outcomes.test_type !== "none" && outcomes?.test_score
      ),
    }),
    [onboardingData, outcomes]
  );

  const calibration: ListCalibration = useMemo(
    () => calibrateList(pillars, coverage, onboardingData?.target_universities || []),
    [pillars, coverage, onboardingData]
  );

  const portfolio: PortfolioCounts = useMemo(() => {
    const p = {
      courses: len(outcomes?.courses),
      projects: len(outcomes?.projects),
      leadership: len(outcomes?.leadership_roles),
      competitions: len(outcomes?.competitions),
      internships: len(outcomes?.internships),
      research: len(outcomes?.research_outputs),
      creative: len(outcomes?.creative_works),
      service: len(outcomes?.service_roles),
    };
    return { ...p, total: Object.values(p).reduce((a, b) => a + b, 0) };
  }, [outcomes]);

  const essays: EssayProgress = useMemo(() => {
    let started = 0;
    let refined = 0;
    let words = 0;
    for (const e of entries) {
      if (e.input_text?.trim()) {
        started += 1;
        words += countWords(e.input_text);
      }
      if (e.refined_text?.trim()) refined += 1;
    }
    return { started, refined, words };
  }, [entries]);

  const recommenders: RecommenderRow[] = useMemo(
    () =>
      recs.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        subject: r.subject,
        due_date: r.due_date,
        submitted_at: r.submitted_at,
        strength: r.strength,
      })),
    [recs]
  );

  const colleges: CollegeItem[] = useMemo(() => {
    const targets: string[] = onboardingData?.target_universities || [];
    // The most recent admissions run carries a per-school probability; match it
    // to the target list by name so the college rail shows real odds when they
    // exist and stays honest (null) when they don't.
    const results: any[] = Array.isArray(admissions[0]?.analysis_results)
      ? admissions[0].analysis_results
      : [];
    const byName = new Map<string, any>();
    for (const r of results) {
      const n = (r?.university || r?.college || r?.name || "").toString().toLowerCase();
      if (n) byName.set(n, r);
    }
    const reqSet = new Set(reqReports.map((r) => String(r.college).toLowerCase()));

    const calibratedByName = new Map(calibration.colleges.map((c) => [c.name, c]));

    return targets.map((name) => {
      const hit = byName.get(name.toLowerCase());
      const raw = hit?.probability ?? hit?.chance ?? hit?.admitProbability ?? null;
      const num = typeof raw === "number" ? raw : Number(raw);
      // Fit comes from the calibration model, not from regex-matching whatever
      // tier string the last AI run happened to emit. That string was frequently
      // absent — leaving every school "Unrated" — and when present it could
      // contradict the probability shown beside it. One model, one answer.
      const c = calibratedByName.get(name);
      return {
        name,
        tier: c?.tier ?? tierFor(name),
        fit: c?.standing ?? standingFor(0),
        readinessIndex: c?.index ?? 0,
        probability: Number.isFinite(num) ? (num > 1 ? num : num * 100) : null,
        hasRequirements: reqSet.has(name.toLowerCase()),
      };
    });
  }, [onboardingData, admissions, reqReports, calibration]);

  const deadlines: DeadlineItem[] = useMemo(() => {
    const now = startOfDay(new Date());
    const items: DeadlineItem[] = [...standardDeadlines(onboardingData?.application_year)];

    for (const r of recs) {
      if (!r.due_date || r.submitted_at) continue;
      const d = new Date(r.due_date);
      if (Number.isNaN(d.getTime())) continue;
      items.push({
        id: `rec-${r.id}`,
        label: `Letter from ${r.name}`,
        detail: r.subject ? `${r.subject} · ${r.status.replace(/_/g, " ")}` : r.status.replace(/_/g, " "),
        date: d,
        kind: "recommender",
      });
    }

    return items
      .filter((i) => i.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 6);
  }, [onboardingData, recs]);

  const { momentum, activeDays, currentStreak, lastActiveAt } = useMemo(() => {
    const dates = activity
      .map((a) => new Date(a.created_at))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const weeks: { weekStart: Date; count: number }[] = [];
    const thisWeek = startOfWeek(new Date());
    for (let i = 11; i >= 0; i--) {
      const ws = new Date(thisWeek);
      ws.setDate(ws.getDate() - i * 7);
      weeks.push({ weekStart: ws, count: 0 });
    }
    const dayKeys = new Set<string>();
    for (const d of dates) {
      dayKeys.add(startOfDay(d).toDateString());
      const ws = startOfWeek(d).getTime();
      const bucket = weeks.find((w) => w.weekStart.getTime() === ws);
      if (bucket) bucket.count += 1;
    }

    // Streak counts back from today; a gap of one day is allowed at the head so
    // opening the app in the evening after a quiet morning doesn't read as a break.
    let streak = 0;
    const cursor = startOfDay(new Date());
    if (!dayKeys.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
    while (dayKeys.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      momentum: weeks,
      activeDays: dayKeys.size,
      currentStreak: streak,
      lastActiveAt: dates.length ? dates[dates.length - 1] : null,
    };
  }, [activity]);

  const readinessTrend = useMemo(() => {
    const pillarAvg = (r: any): number | null => {
      const p = r?.analysis_result?.pillars;
      if (!p) return null;
      const vals = Object.values(p).filter((v): v is number => typeof v === "number");
      if (!vals.length) return null;
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    };
    return readiness
      .map((r) => ({ label: r.name, score: pillarAvg(r), date: r.created_at }))
      .filter((r): r is { label: string; score: number; date: string } => r.score !== null)
      .slice(-6);
  }, [readiness]);

  return {
    loading,
    refresh: load,
    overall: journey?.overall_score ?? 0,
    pillars,
    calibration,
    coverage,
    journeyStarted: !!journey?.journey_started,
    gems: journey?.diamonds ?? 0,
    hearts: journey?.hearts ?? 0,
    completedMilestones: len(journey?.completed_milestones),
    currentLevel: evals[0]?.level ?? 0,
    portfolio,
    essays,
    totalEssaySections: applicationSections.length,
    applications: apps as any,
    recommenders,
    colleges,
    deadlines,
    artifacts: artifacts as ArtifactItem[],
    unreadNotifications: unread,
    momentum,
    activeDays,
    currentStreak,
    lastActiveAt,
    readinessTrend,
    latestVerdict: evals[0]?.verdict ?? null,
  };
}
