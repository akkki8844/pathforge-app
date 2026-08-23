import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Plus, Trash2, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  BRAG_STEPS,
  useBragSheets,
  type BragSheet,
  type BragSheetInput,
} from "@/hooks/useBragSheets";

const emptyDraft: BragSheetInput = {
  title: "My Brag Sheet",
  intended_major: "",
  career_goals: "",
  top_accomplishments: "",
  challenges_overcome: "",
  character_traits: "",
  anecdotes: "",
  leadership_examples: "",
  community_impact: "",
  why_this_recommender: "",
  extra_context: "",
};

export function BragSheetPanel() {
  const { list, upsert, remove, generatePdf } = useBragSheets();
  const [editing, setEditing] = useState<BragSheet | null>(null);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<BragSheetInput>(emptyDraft);

  const items = list.data ?? [];
  const open = creating || !!editing;

  useEffect(() => {
    if (!open) setStep(0);
  }, [open]);

  const startNew = () => {
    setDraft(emptyDraft);
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (s: BragSheet) => {
    setCreating(false);
    setEditing(s);
    setDraft({
      title: s.title,
      intended_major: s.intended_major ?? "",
      career_goals: s.career_goals ?? "",
      top_accomplishments: s.top_accomplishments ?? "",
      challenges_overcome: s.challenges_overcome ?? "",
      character_traits: s.character_traits ?? "",
      anecdotes: s.anecdotes ?? "",
      leadership_examples: s.leadership_examples ?? "",
      community_impact: s.community_impact ?? "",
      why_this_recommender: s.why_this_recommender ?? "",
      extra_context: s.extra_context ?? "",
    });
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = async (): Promise<BragSheet | null> => {
    try {
      const result = await upsert.mutateAsync({ id: editing?.id, patch: draft });
      setEditing(result);
      setCreating(false);
      toast({ title: "Saved" });
      return result;
    } catch {
      return null;
    }
  };

  const saveAndClose = async () => {
    const saved = await save();
    if (saved) close();
  };

  const saveAndGenerate = async () => {
    const saved = (await save()) ?? editing;
    if (!saved) return;
    const res = await generatePdf.mutateAsync(saved);
    window.open(res.url, "_blank");
    close();
  };

  const downloadExisting = async (s: BragSheet) => {
    const res = await generatePdf.mutateAsync(s);
    window.open(res.url, "_blank");
  };

  const progress = useMemo(() => ((step + 1) / BRAG_STEPS.length) * 100, [step]);
  const isLast = step === BRAG_STEPS.length - 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Brag sheets</h2>
          <p className="text-sm text-muted-foreground">
            Give every recommender a focused, story-rich packet to write from.
          </p>
        </div>
        <Button onClick={startNew} size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> New brag sheet
        </Button>
      </div>

      {list.isLoading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium mb-1">Build your first brag sheet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            A guided 4-step form gives your recommender real stories to work from. Export to PDF and send.
          </p>
          <Button onClick={startNew} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Start
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {items.map((s) => (
            <div key={s.id} className="px-5 py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <button
                className="flex-1 min-w-0 text-left"
                onClick={() => startEdit(s)}
              >
                <div className="font-medium truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                </div>
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadExisting(s)}
                disabled={generatePdf.isPending}
              >
                {generatePdf.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">PDF</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete brag sheet?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{s.title}" will be removed. This can't be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove.mutateAsync(s.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-[61rem] max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit brag sheet" : "New brag sheet"}</DialogTitle>
            <DialogDescription>
              Step {step + 1} of {BRAG_STEPS.length} · {BRAG_STEPS[step].title}
            </DialogDescription>
          </DialogHeader>

          <Progress value={progress} className="h-1.5" />

          <motion.div
            key={step}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 py-2"
          >
            <p className="text-sm text-muted-foreground">{BRAG_STEPS[step].description}</p>
            {BRAG_STEPS[step].fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                {f.type === "input" ? (
                  <Input
                    value={(draft as any)[f.key] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                  />
                ) : (
                  <Textarea
                    value={(draft as any)[f.key] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    rows={4}
                  />
                )}
              </div>
            ))}
          </motion.div>

          <DialogFooter className={cn("flex-row justify-between gap-2 sm:justify-between")}>
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={saveAndClose} disabled={upsert.isPending}>
                Save & close
              </Button>
              {isLast ? (
                <Button onClick={saveAndGenerate} disabled={upsert.isPending || generatePdf.isPending}>
                  {generatePdf.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1.5" />
                  )}
                  Save & generate PDF
                </Button>
              ) : (
                <Button onClick={() => setStep((s) => Math.min(BRAG_STEPS.length - 1, s + 1))}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
