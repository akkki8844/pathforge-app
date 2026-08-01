import { useEffect, useRef, useState } from "react";
import { Upload, FileImage, Loader2, CheckCircle2, XCircle, AlertCircle, RotateCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useProofSubmissions, type ProofSubmission } from "@/hooks/useProofSubmissions";
import { LevelTask, StageDef } from "@/lib/journeyLevels";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;
// Keyed by stage, not task: one stage is one unit of evidence.
const NOTE_KEY = (stageId: string) => `pf_proof_note_${stageId}`;

interface Props {
  /** Optional reference task — supplies context for the AI verifier. */
  task?: LevelTask;
  stage: StageDef;
  submission?: ProofSubmission;
}

/**
 * Inline (non-modal) proof upload that lives directly inside the stage popup.
 */
export function InlineProofUpload({ task, stage, submission }: Props) {
  const { submitProof } = useProofSubmissions();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState<string>(() => {
    try { return localStorage.getItem(NOTE_KEY(stage.id)) || ""; } catch { return ""; }
  });
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist note draft so it survives modal close / page revisit
  useEffect(() => {
    try {
      if (note) localStorage.setItem(NOTE_KEY(stage.id), note);
      else localStorage.removeItem(NOTE_KEY(stage.id));
    } catch {}
  }, [note, stage.id]);

  const status = submission?.status;
  const isApproved = status === "approved";
  const isVerifying = status === "verifying" || status === "pending";
  const isRejected = status === "rejected";
  const isReview = status === "needs_review";

  if (isApproved) {
    return (
      <div className="space-y-2">
        <StatusBox tone="success" icon={CheckCircle2}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              Evidence verified — you can claim this stage.
            </span>
            {submission?.ai_confidence !== null && submission?.ai_confidence !== undefined && (
              <span className="text-[10px] text-muted-foreground">
                AI confidence {(submission.ai_confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </StatusBox>
        <SubmittedFileLink submission={submission!} />
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="space-y-2">
        <StatusBox tone="info" icon={Loader2} spin>
          <div>
            <div className="font-semibold text-primary">Verifying your submission…</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              AI is checking your proof. Usually takes under a minute. This panel will update automatically.
            </div>
          </div>
        </StatusBox>
        <SubmittedFileLink submission={submission!} />
      </div>
    );
  }

  const onPick = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("File too large (max 10MB)");
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Attach a file first");
      return;
    }
    if (!note.trim()) {
      toast.error("Add a short note describing the proof (1–2 sentences)");
      return;
    }
    setSubmitting(true);
    // Verify against the *stage's* outcome — that's the bar the student is
    // claiming to have met. The Level task only adds supporting context.
    const res = await submitProof({
      file,
      note: note.trim(),
      taskId: task?.id ?? stage.id,
      stageId: stage.id,
      taskTitle: stage.name,
      taskContext: [
        `Stage ${stage.id} — ${stage.name}: ${stage.description}`,
        `Required outcome: ${stage.outcome}`,
        task ? `Related task: ${task.title} (${task.category})` : null,
      ].filter(Boolean).join(" | "),
    });
    setSubmitting(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("Evidence uploaded — verifying now…");
    setFile(null);
    setNote("");
    try { localStorage.removeItem(NOTE_KEY(stage.id)); } catch {}
  };

  return (
    <div className="space-y-2.5">
      {isRejected && submission && (
        <>
          <StatusBox tone="error" icon={XCircle}>
            <div>
              <div className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                Rejected
                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[9px]">
                  Re-upload required
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {submission.ai_reasoning || submission.admin_notes || "Proof did not match the task. Please upload a clearer certificate or screenshot."}
              </p>
            </div>
          </StatusBox>
          <SubmittedFileLink submission={submission} />
        </>
      )}

      {isReview && submission && (
        <>
          <StatusBox tone="warn" icon={AlertCircle}>
            <div>
              <div className="font-semibold text-amber-600 dark:text-amber-400">Sent to admin review</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                We couldn't auto-verify this with high confidence. An admin will review shortly. You can also upload a clearer file below.
              </p>
            </div>
          </StatusBox>
          <SubmittedFileLink submission={submission} />
        </>
      )}

      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onPick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition",
          "hover:border-primary hover:bg-primary/5",
          file ? "border-primary bg-primary/5" : "border-border bg-muted/20"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center justify-center gap-2 text-xs">
            <FileImage className="h-4 w-4 text-primary" />
            <span className="font-medium truncate max-w-[180px]">{file.name}</span>
            <span className="text-muted-foreground">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
        ) : (
          <div className="space-y-0.5">
            <Upload className="h-4 w-4 text-muted-foreground mx-auto" />
            <div className="text-xs font-medium">
              {isRejected ? "Re-upload proof (certificate / screenshot)" : "Upload proof (certificate / screenshot)"}
            </div>
            <div className="text-[10px] text-muted-foreground">PNG, JPG, WEBP or PDF · max 10MB</div>
          </div>
        )}
      </div>

      {/* Note field — required by verification flow */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
          Short note <span className="text-rose-500">*</span>
          <span className="font-normal text-muted-foreground">(1–2 sentences explaining what this proof shows)</span>
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Screenshot of my AMC 10 score report from MAA — distinction certificate, top 5%."
          className="min-h-[60px] text-xs"
          maxLength={500}
        />
        <div className="text-[10px] text-muted-foreground text-right">{note.length}/500</div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {(file || note) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setFile(null); setNote(""); try { localStorage.removeItem(NOTE_KEY(stage.id)); } catch {} }}
            className="h-7 text-[11px]"
          >
            Clear
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!file || !note.trim() || submitting}
          className="h-7 gap-1.5 text-[11px]"
        >
          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : isRejected ? <RotateCw className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
          {isRejected ? "Re-submit" : "Submit for verification"}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        AI auto-approves high-confidence matches in under a minute. Edge cases route to manual admin review.
      </p>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function SubmittedFileLink({ submission }: { submission: ProofSubmission }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!submission.file_path) return;
      const { data } = await supabase.storage.from("proof-uploads").createSignedUrl(submission.file_path, 3600);
      if (alive && data?.signedUrl) setUrl(data.signedUrl);
    })();
    return () => { alive = false; };
  }, [submission.file_path]);

  if (!submission.file_path && !submission.proof_url) return null;
  const fileName = submission.file_path?.split("/").pop() ?? "Submitted file";
  const href = url || submission.proof_url || "#";

  return (
    <div className="rounded-md border bg-muted/30 px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
      <div className="flex items-center gap-1.5 min-w-0">
        <FileImage className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="truncate font-medium">{fileName}</span>
      </div>
      {href !== "#" && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 shrink-0">
          View <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

type Tone = "success" | "info" | "error" | "warn";
const TONE_CLASSES: Record<Tone, { box: string; icon: string }> = {
  success: { box: "bg-emerald-500/5 border-emerald-500/30", icon: "text-emerald-500" },
  info:    { box: "bg-primary/5 border-primary/30",         icon: "text-primary" },
  error:   { box: "bg-rose-500/5 border-rose-500/30",       icon: "text-rose-500" },
  warn:    { box: "bg-amber-500/5 border-amber-500/30",     icon: "text-amber-500" },
};

function StatusBox({
  tone, icon: Icon, spin, children,
}: { tone: Tone; icon: any; spin?: boolean; children: React.ReactNode }) {
  const t = TONE_CLASSES[tone];
  return (
    <div className={cn("rounded-lg border p-2.5 flex items-start gap-2 text-xs", t.box)}>
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", t.icon, spin && "animate-spin")} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
