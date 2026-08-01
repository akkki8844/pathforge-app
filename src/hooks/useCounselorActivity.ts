import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RecentSignal {
  id: string;
  user_id: string;
  display_name: string;
  kind: "advisor" | "readiness" | "application" | "outcomes" | "journey";
  label: string;
  at: string;
}

export interface UpcomingDeadline {
  id: string;
  student_id: string;
  display_name: string;
  college_name: string;
  stage: string;
  deadline: string;
  daysAway: number;
}

export interface InactiveStudent {
  user_id: string;
  display_name: string;
  daysInactive: number;
  overall_score: number;
}

interface Props {
  studentIds: string[];
  nameMap: Map<string, string>;
  scoreMap: Map<string, number>;
}

/**
 * Pulls the real activity / deadline / inactivity signals the Command Center
 * needs. Everything is RLS-scoped to the calling counselor's linked students.
 */
export function useCounselorActivity({ studentIds, nameMap, scoreMap }: Props) {
  const { user, isTeacher, teacherProfile } = useAuth();
  const [recent, setRecent] = useState<RecentSignal[]>([]);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [inactive, setInactive] = useState<InactiveStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isTeacher || !teacherProfile?.verified || studentIds.length === 0) {
      setRecent([]); setDeadlines([]); setInactive([]); setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const sinceIso = since.toISOString();

      const [adv, ana, app, outc, jour, strat] = await Promise.all([
        supabase.from("voice_advisor_sessions")
          .select("id,user_id,name,created_at").in("user_id", studentIds)
          .gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(20),
        supabase.from("readiness_analyses")
          .select("id,user_id,name,created_at").in("user_id", studentIds)
          .gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(20),
        supabase.from("application_entries")
          .select("id,user_id,section_id,updated_at").in("user_id", studentIds)
          .gte("updated_at", sinceIso).order("updated_at", { ascending: false }).limit(20),
        supabase.from("outcomes_data")
          .select("id,user_id,updated_at").in("user_id", studentIds)
          .gte("updated_at", sinceIso).order("updated_at", { ascending: false }).limit(20),
        supabase.from("journey_scores")
          .select("user_id,updated_at,overall_score").in("user_id", studentIds)
          .order("updated_at", { ascending: false }).limit(200),
        supabase.from("counsellor_app_strategies")
          .select("id,student_id,college_name,stage,deadline")
          .eq("counsellor_id", user.id).in("student_id", studentIds)
          .not("deadline", "is", null).order("deadline", { ascending: true }).limit(50),
      ]);

      if (cancelled) return;

      const signals: RecentSignal[] = [];
      (adv.data ?? []).forEach((r) => signals.push({
        id: `adv-${r.id}`, user_id: r.user_id, display_name: nameMap.get(r.user_id) ?? "Student",
        kind: "advisor", label: "Spoke with the AI advisor", at: r.created_at,
      }));
      (ana.data ?? []).forEach((r) => signals.push({
        id: `ana-${r.id}`, user_id: r.user_id, display_name: nameMap.get(r.user_id) ?? "Student",
        kind: "readiness", label: `Ran a readiness analysis: ${r.name}`, at: r.created_at,
      }));
      (app.data ?? []).forEach((r) => signals.push({
        id: `app-${r.id}`, user_id: r.user_id, display_name: nameMap.get(r.user_id) ?? "Student",
        kind: "application", label: `Updated application: ${r.section_id}`, at: r.updated_at,
      }));
      (outc.data ?? []).forEach((r) => signals.push({
        id: `out-${r.id}`, user_id: r.user_id, display_name: nameMap.get(r.user_id) ?? "Student",
        kind: "outcomes", label: "Updated outcomes / activities", at: r.updated_at,
      }));
      signals.sort((a, b) => +new Date(b.at) - +new Date(a.at));
      setRecent(signals.slice(0, 8));

      // Deadlines in the next 60 days
      const now = Date.now();
      const upcoming: UpcomingDeadline[] = (strat.data ?? [])
        .map((r) => {
          const t = +new Date(r.deadline as string);
          const days = Math.round((t - now) / 86_400_000);
          return {
            id: r.id, student_id: r.student_id,
            display_name: nameMap.get(r.student_id) ?? "Student",
            college_name: r.college_name, stage: r.stage as string,
            deadline: r.deadline as string, daysAway: days,
          };
        })
        .filter((d) => d.daysAway >= -3 && d.daysAway <= 60);
      setDeadlines(upcoming.slice(0, 6));

      // Inactive: no journey update in 14d AND score < 70
      const lastTouch = new Map<string, string>();
      (jour.data ?? []).forEach((r) => {
        if (!lastTouch.has(r.user_id)) lastTouch.set(r.user_id, r.updated_at as string);
      });
      const inactiveList: InactiveStudent[] = studentIds
        .map((uid) => {
          const last = lastTouch.get(uid);
          // If we have no journey touch record, treat as "no data" (-1)
          // instead of the bogus 999-day sentinel that was leaking into the UI.
          const days = last ? Math.floor((now - +new Date(last)) / 86_400_000) : -1;
          return {
            user_id: uid,
            display_name: nameMap.get(uid) ?? "Student",
            daysInactive: days,
            overall_score: scoreMap.get(uid) ?? 0,
          };
        })
        // Only flag genuine inactivity (>= 7 real days) with low score.
        // Students with no journey activity yet are excluded entirely.
        .filter((s) => s.daysInactive >= 7 && s.overall_score < 70)
        .sort((a, b) => b.daysInactive - a.daysInactive)
        .slice(0, 6);
      setInactive(inactiveList);

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, isTeacher, teacherProfile?.verified, studentIds.join(","), nameMap, scoreMap]);

  return { recent, deadlines, inactive, loading };
}
