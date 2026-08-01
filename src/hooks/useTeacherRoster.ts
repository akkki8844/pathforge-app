import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RosterStudent {
  user_id: string;
  email: string | null;
  username: string | null;
  grade: string | null;
  intended_major: string | null;
  high_school_name: string | null;
  target_universities: string[] | null;
  overall_score: number;
  status: "top" | "behind" | "steady";
}

export function useTeacherRoster() {
  const { user, isTeacher, teacherProfile } = useAuth();
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isTeacher || !teacherProfile?.verified || !teacherProfile.school_id) {
      setStudents([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase.rpc as any)("teacher_roster");
        if (error) throw error;

        const merged: RosterStudent[] = ((data as RosterStudent[] | null) ?? []).map((s) => ({
          ...s,
          overall_score: s.overall_score ?? 0,
          status: s.status ?? "behind",
          target_universities: s.target_universities ?? null,
        }));

        if (!cancelled) setStudents(merged);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, isTeacher, teacherProfile?.verified, teacherProfile?.school_id]);

  return { students, loading, error };
}
