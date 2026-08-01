import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AssignmentRow {
  id: string;
  title: string;
  instructions: string | null;
  kind: string;
  target_type: "student" | "class";
  target_id: string;
  deadline: string | null;
  status: string;
  created_at: string;
}

export interface NewAssignment {
  title: string;
  instructions?: string;
  kind: "activity" | "project" | "competition" | "task";
  target_type: "student" | "class";
  target_id: string;
  deadline?: string | null;
}

export function useTeacherAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setAssignments([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("teacher_assignments")
      .select("id,title,instructions,kind,target_type,target_id,deadline,status,created_at")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    setAssignments((data ?? []) as AssignmentRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const createAssignment = async (a: NewAssignment) => {
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await supabase.from("teacher_assignments").insert({
      teacher_id: user.id,
      title: a.title,
      instructions: a.instructions ?? null,
      kind: a.kind,
      target_type: a.target_type,
      target_id: a.target_id,
      deadline: a.deadline ?? null,
    });
    if (!error) await load();
    return { error };
  };

  return { assignments, loading, createAssignment, reload: load };
}

export interface StudentAssignmentRow extends AssignmentRow {
  progress_status: "not_started" | "in_progress" | "submitted" | "completed";
  teacher_email?: string | null;
}

export function useStudentAssignments() {
  const { user } = useAuth();
  const [items, setItems] = useState<StudentAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);

    // Direct + class assignments visible via RLS
    const { data: rows } = await supabase
      .from("teacher_assignments")
      .select("id,title,instructions,kind,target_type,target_id,deadline,status,created_at,teacher_id")
      .order("deadline", { ascending: true, nullsFirst: false });

    const ids = (rows ?? []).map((r) => r.id);
    let progress = new Map<string, StudentAssignmentRow["progress_status"]>();
    if (ids.length) {
      const { data: prog } = await supabase
        .from("assignment_progress")
        .select("assignment_id,status")
        .eq("student_id", user.id)
        .in("assignment_id", ids);
      (prog ?? []).forEach((p) => progress.set(p.assignment_id, p.status as StudentAssignmentRow["progress_status"]));
    }

    setItems((rows ?? []).map((r) => ({
      ...(r as AssignmentRow),
      progress_status: progress.get(r.id) ?? "not_started",
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const updateProgress = async (assignmentId: string, status: StudentAssignmentRow["progress_status"], note?: string) => {
    if (!user) return { error: new Error("Not signed in") };
    const { error } = await supabase
      .from("assignment_progress")
      .upsert(
        { assignment_id: assignmentId, student_id: user.id, status, student_note: note ?? null },
        { onConflict: "assignment_id,student_id" } as never,
      );
    if (!error) await load();
    return { error };
  };

  return { items, loading, updateProgress, reload: load };
}
