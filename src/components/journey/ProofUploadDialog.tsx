import { useState, useRef } from "react";
import { Upload, FileImage, Loader2, CheckCircle2, XCircle, AlertCircle, Clock, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProofSubmissions, type ProofSubmission } from "@/hooks/useProofSubmissions";
import { LevelTask, StageDef } from "@/lib/journeyLevels";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task: LevelTask | null;
  stage: StageDef | null;
}

const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

export function ProofUploadDialog({ open, onOpenChange, task, stage }: Props) {
  const { submitProof, getForTask } = useProofSubmissions();
  const [mode, setMode] = useState<"file" | "link">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!task || !stage) return null;
  const existing = getForTask(task.id);

  const onPick = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { toast.error("File too large (max 10MB)"); return; }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!note.trim()) { toast.error("Add a short note (1–2 sentences)"); return; }
    if (mode === "file" && !file) { toast.error("Pick a file to upload"); return; }
    if (mode === "link") {
      if (!url.trim()) { toast.error("Paste a public link"); return; }
      try { new URL(url.trim()); } catch { toast.error("That doesn't look like a valid URL"); return; }
    }
    setSubmitting(true);
    const res = await submitProof({
      file: mode === "file" ? file : null,
      url: mode === "link" ? url.trim() : null,
      note: note.trim(),
      taskId: task.id,
      stageId: stage.id,
      taskTitle: task.title,
      taskContext: `${task.why} | Outcome: ${task.outcome} | Category: ${task.category}`,
    });
    setSubmitting(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success("Evidence submitted — verifying now…");
    setFile(null); setUrl(""); setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Submit evidence</DialogTitle>
        <DialogDescription className="text-xs">
          Upload a file <em>or</em> paste a public link that proves you completed:{" "}
          <span className="font-medium text-foreground">{task.title}</span>
        </DialogDescription>

        {existing ? <ExistingSubmission submission={existing} /> : null}

        <Tabs value={mode} onValueChange={(v) => setMode(v as "file" | "link")} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="gap-2"><Upload className="h-3.5 w-3.5" />Upload file</TabsTrigger>
            <TabsTrigger value="link" className="gap-2"><Link2 className="h-3.5 w-3.5" />Paste link</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-3">
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onPick(e.dataTransfer.files?.[0] ?? null); }}
              className={cn(
                "rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition",
                "hover:border-primary hover:bg-primary/5",
                file ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <input ref={inputRef} type="file" accept={ACCEPT} className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileImage className="h-5 w-5 text-primary" />
                  <span className="font-medium truncate">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto" />
                  <div className="text-sm font-medium">Click or drag a file here</div>
                  <div className="text-xs text-muted-foreground">PNG, JPG, WEBP, or PDF · max 10MB</div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="link" className="mt-3">
            <Input
              type="url"
              placeholder="https://… (certificate, repo, post, profile, leaderboard)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="off"
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Works for: GitHub, Kaggle, Devpost, Coursera, LinkedIn, official olympiad pages, school sites, etc.
            </p>
          </TabsContent>
        </Tabs>

        <div className="mt-3 space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Short note <span className="text-muted-foreground">(required, 1–2 sentences)</span>
          </label>
          <Textarea
            placeholder="What does this evidence show, and how does it prove you completed the task?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1 mt-2">
          <div>• AI checks the evidence plausibly matches this task.</div>
          <div>• High-confidence matches auto-approve. Edge cases go to manual review.</div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Submit for verification
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



function ExistingSubmission({ submission }: { submission: ProofSubmission }) {
  const cfg = STATUS_CONFIG[submission.status];
  return (
    <div className={cn("rounded-lg border p-3 space-y-1.5", cfg.boxClass)}>
      <div className="flex items-center gap-2">
        <cfg.icon className={cn("h-4 w-4", cfg.iconClass)} />
        <Badge variant="outline" className={cfg.badgeClass}>{cfg.label}</Badge>
        {submission.ai_confidence !== null && (
          <span className="text-[10px] text-muted-foreground">
            confidence {(submission.ai_confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
      {submission.ai_reasoning && (
        <p className="text-xs text-muted-foreground leading-relaxed">{submission.ai_reasoning}</p>
      )}
      {submission.admin_notes && (
        <p className="text-xs"><span className="font-semibold">Reviewer:</span> {submission.admin_notes}</p>
      )}
    </div>
  );
}

export const STATUS_CONFIG = {
  pending: {
    label: "Pending", icon: Clock, iconClass: "text-muted-foreground",
    boxClass: "bg-muted/30 border-border",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
  verifying: {
    label: "Verifying…", icon: Loader2, iconClass: "text-primary animate-spin",
    boxClass: "bg-primary/5 border-primary/20",
    badgeClass: "bg-primary/10 text-primary border-primary/30",
  },
  approved: {
    label: "Approved", icon: CheckCircle2, iconClass: "text-emerald-500",
    boxClass: "bg-emerald-500/5 border-emerald-500/30",
    badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  rejected: {
    label: "Rejected", icon: XCircle, iconClass: "text-rose-500",
    boxClass: "bg-rose-500/5 border-rose-500/30",
    badgeClass: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  },
  needs_review: {
    label: "Pending admin review", icon: AlertCircle, iconClass: "text-amber-500",
    boxClass: "bg-amber-500/5 border-amber-500/30",
    badgeClass: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
} as const;
