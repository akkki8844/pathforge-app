import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ClassRow {
  id: string;
  name: string;
  grade_level: string | null;
  invite_code: string;
  member_count: number;
}

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function useTeacherClasses() {
  const { user, teacherProfile } = useAuth();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setClasses([]); setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from("classes")
      .select("id,name,grade_level,invite_code")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    const ids = (rows ?? []).map((r) => r.id);
    let counts = new Map<string, number>();
    if (ids.length) {
      const { data: members } = await supabase
        .from("class_members").select("class_id").in("class_id", ids);
      (members ?? []).forEach((m) => counts.set(m.class_id, (counts.get(m.class_id) ?? 0) + 1));
    }

    setClasses((rows ?? []).map((r) => ({ ...r, member_count: counts.get(r.id) ?? 0 })));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const createClass = async (name: string, gradeLevel?: string) => {
    if (!user) return { error: new Error("Not signed in") };
    // Try a few times to avoid invite-code collisions.
    for (let i = 0; i < 4; i++) {
      const code = generateInviteCode();
      const { error } = await supabase.from("classes").insert({
        teacher_id: user.id,
        school_id: teacherProfile?.school_id ?? null,
        name,
        grade_level: gradeLevel ?? null,
        invite_code: code,
      });
      if (!error) { await load(); return { error: null, code }; }
      if (!error || !`${error.message}`.includes("duplicate")) {
        await load();
        return { error };
      }
    }
    return { error: new Error("Could not generate unique invite code") };
  };

  return { classes, loading, createClass, reload: load };
}
