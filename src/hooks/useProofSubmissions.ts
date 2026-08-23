import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ProofStatus = "pending" | "verifying" | "approved" | "rejected" | "needs_review";

export interface ProofSubmission {
  id: string;
  task_id: string;
  stage_id: string;
  file_path: string | null;
  file_type: string | null;
  proof_url: string | null;
  proof_note: string | null;
  task_title: string;
  status: ProofStatus;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  admin_notes: string | null;
  created_at: string;
}

/** Gems credited the first time a submission is approved. Awarded server-side. */
export const PROOF_GEM_AWARD = 5;

export function useProofSubmissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<ProofSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("proof_submissions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSubmissions((data ?? []) as ProofSubmission[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase.channel(`proof-${user.id}-${suffix}`);
    try {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "proof_submissions", filter: `user_id=eq.${user.id}` },
        () => load()
      ).subscribe();
    } catch (e) {
      console.warn('proof_submissions realtime unavailable', e);
    }
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  /** Upload file OR submit link + note. */
  async function submitProof(args: {
    file?: File | null;
    url?: string | null;
    note?: string | null;
    taskId: string;
    stageId: string;
    taskTitle: string;
    taskContext?: string;
    /**
     * Gems credited by this submission, straight from the verifier's response.
     * 0 for anything that didn't auto-approve — including a submission routed
     * to admin review, which may still pay out later, when an admin approves
     * it and the database trigger fires.
     */
  }): Promise<{ id: string; gemsAwarded: number } | { error: string }> {
    if (!user) return { error: "Not signed in" };
    const { file, url, note, taskId, stageId, taskTitle, taskContext } = args;

    if (!file && !url) return { error: "Attach a file or paste a link" };
    if (!note || !note.trim()) return { error: "Add a short note (1–2 sentences)" };

    // 1 credit per submission-for-verification (only credit charge on Journey).
    const { data: ok, error: credErr } = await supabase.rpc("consume_credit", {
      _feature_type: "proof_submission",
    });
    if (credErr) {
      // A genuine RPC/database failure, distinct from the function's own
      // considered "insufficient credits" answer (data === false below).
      return { error: "Couldn't save right now — please try again." };
    }
    if (ok === false) {
      window.dispatchEvent(new CustomEvent("credit-exhausted"));
      return { error: "Out of credits — upgrade to keep submitting evidence." };
    }
    window.dispatchEvent(new CustomEvent("credit-consumed"));

    let filePath: string | null = null;
    let fileType: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "bin";
      filePath = `${user.id}/${taskId}-${Date.now()}.${ext}`;
      fileType = file.type || "application/octet-stream";
      const { error: upErr } = await supabase.storage
        .from("proof-uploads")
        .upload(filePath, file, { upsert: false, contentType: fileType });
      if (upErr) return { error: upErr.message };
    }

    const { data: row, error: insErr } = await supabase
      .from("proof_submissions")
      .insert({
        user_id: user.id,
        task_id: taskId,
        stage_id: stageId,
        file_path: filePath,
        file_type: fileType,
        proof_url: url?.trim() || null,
        proof_note: note.trim(),
        task_title: taskTitle,
        task_context: taskContext ?? null,
        status: "verifying",
      } as any)
      .select("id")
      .single();

    if (insErr || !row) return { error: insErr?.message ?? "Insert failed" };

    // Await the verifier rather than firing and forgetting. If the edge
    // function is unreachable (not deployed, cold-start failure, network drop)
    // nothing else would ever move the row off "verifying", so the student
    // sat on a spinner forever. Park it in admin review instead.
    let gemsAwarded = 0;
    try {
      const { data: verdict, error: fnErr } = await supabase.functions.invoke("verify-proof", {
        body: { submissionId: row.id },
      });
      if (fnErr) throw fnErr;
      // The verifier is the only thing that knows whether this submission was
      // the one that earned the gems; the client never decides that, and never
      // writes the balance.
      gemsAwarded = Number(verdict?.gemsAwarded) || 0;
    } catch (e) {
      console.error("verify-proof invoke failed", e);
      await supabase
        .from("proof_submissions")
        .update({
          status: "needs_review",
          ai_reasoning: "Automatic verification is unavailable right now — an admin will review this shortly.",
        } as any)
        .eq("id", row.id);
    }

    await load();
    return { id: row.id, gemsAwarded };
  }

  function getForTask(taskId: string): ProofSubmission | undefined {
    return submissions.find((s) => s.task_id === taskId);
  }

  function isTaskApproved(taskId: string): boolean {
    return submissions.some((s) => s.task_id === taskId && s.status === "approved");
  }

  /** Most recent submission for a stage — `submissions` is ordered newest-first. */
  function getForStage(stageId: string): ProofSubmission | undefined {
    return submissions.find((s) => s.stage_id === stageId);
  }

  /** A stage is verified once any of its submissions has been approved. */
  function isStageApproved(stageId: string): boolean {
    return submissions.some((s) => s.stage_id === stageId && s.status === "approved");
  }

  return {
    submissions, loading, submitProof,
    getForTask, isTaskApproved, getForStage, isStageApproved,
    reload: load,
  };
}
