import { useRef, useState } from "react";
import { Upload, FileText, X, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { notifyLinkedInImported } from "@/hooks/useLinkedInImport";
import { readEdgeError } from "@/lib/edgeFunctionError";
import { parseLinkedInPdf, validateLinkedInPdf } from "@/lib/parseLinkedInPdf";
import linkedinLogo from "@/assets/linkedin-logo.png";

interface ImportLinkedInModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}

export function ImportLinkedInModal({ open, onOpenChange, onImported }: ImportLinkedInModalProps) {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  // Parsing a multi-page export takes a couple of seconds. Without this the
  // submit button was already enabled (it only checked `file`), so an eager
  // click hit the empty-text guard and read as "the import does nothing".
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const invalid = validateLinkedInPdf(f);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setFile(f);
    setText("");
    setParsing(true);
    try {
      const parsed = await parseLinkedInPdf(f);
      if (!parsed.trim()) {
        toast.error("Could not extract text from this PDF. Re-export from LinkedIn and try again.");
        setFile(null);
        return;
      }
      setText(parsed);
    } catch (err) {
      console.error(err);
      toast.error("Could not read PDF. Please re-export from LinkedIn and try again.");
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const reset = () => {
    setUrl(""); setFile(null); setText("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!user) { toast.error("Please sign in first."); return; }
    if (!file || !text.trim()) {
      toast.error("Please upload your LinkedIn PDF export.");
      return;
    }

    const finalUrl = url.trim() || "https://www.linkedin.com/in/imported-from-pdf";
    const finalText = text.trim();

    setBusy(true);
    try {
      const { error } = await supabase
        .from("linkedin_imports")
        .upsert(
          {
            user_id: user.id,
            linkedin_url: finalUrl,
            profile_text: finalText.slice(0, 50000),
          },
          { onConflict: "user_id" },
        );
      if (error) throw error;

      // The profile IS saved at this point. Everything below is the optional
      // AI auto-fill pass, so a failure there must NOT discard the import.
      //
      // The old code bailed out of the whole flow on any extraction problem:
      // it skipped notifyLinkedInImported(), skipped onImported(), and left
      // the dialog open — so the Connectors card still read "Not connected"
      // and the button looked broken, even though the row was in the database
      // the whole time. And because supabase-js resolves (rather than throws)
      // on a non-2xx, `extractRes` was null and the message shown was always
      // the useless "Edge Function returned a non-2xx status code" instead of
      // the real reason the function returned.
      let extractionNote: { ok: boolean; message: string } | null = null;
      try {
        const result = await supabase.functions.invoke("linkedin-extract", {
          body: { profile_text: finalText, linkedin_url: finalUrl },
        });
        const failure = await readEdgeError(result);

        if (failure) {
          extractionNote = { ok: false, message: failure.message };
        } else {
          const counts = (result.data as { counts?: Record<string, number> } | null)?.counts;
          const total = counts
            ? Object.entries(counts)
                .filter(([k]) => k.endsWith("_added"))
                .reduce((sum, [, v]) => sum + (Number(v) || 0), 0)
            : 0;
          extractionNote = {
            ok: true,
            message:
              total > 0
                ? `Imported ${total} items — projects, leadership, internships, volunteering, awards, certifications & more were auto-filled.`
                : "LinkedIn imported. We couldn't find new activities to add — add more detail to your profile and re-import.",
          };
        }
      } catch (e) {
        console.warn("linkedin-extract failed", e);
        extractionNote = {
          ok: false,
          message: e instanceof Error ? e.message : "AI auto-fill failed.",
        };
      }

      // Refresh + close regardless: the import itself succeeded.
      try { localStorage.setItem("linkedin-import-popup-dismissed", "1"); } catch { /* ignore */ }
      notifyLinkedInImported();
      onImported?.();
      onOpenChange(false);
      reset();

      if (extractionNote?.ok) {
        toast.success(extractionNote.message);
      } else {
        toast.warning("LinkedIn profile saved, but auto-fill didn't run", {
          description: extractionNote?.message,
          duration: 8000,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not save import", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[46rem] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src={linkedinLogo} alt="LinkedIn" className="h-5 w-5 rounded-sm" />
            Import your LinkedIn
          </DialogTitle>
          <DialogDescription>
            Upload your LinkedIn PDF — we'll auto-fill your Outcomes, application activities, and more across the whole site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">How to export your LinkedIn PDF:</p>
            <p>1. Open your LinkedIn profile → click <span className="font-medium text-foreground">More</span></p>
            <p>2. Choose <span className="font-medium text-foreground">Save to PDF</span></p>
            <p>3. Upload the file below</p>
          </div>
          <div>
            <Label>LinkedIn PDF export</Label>
            {file ? (
              <div className="mt-1.5 flex items-center gap-3 p-3 rounded-lg border border-accent/30 bg-accent/5">
                <FileText className="h-6 w-6 text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · {parsing ? "reading PDF…" : `${text.length.toLocaleString()} chars extracted`}</p>
                </div>
                <button
                  onClick={() => { setFile(null); setText(""); if (fileRef.current) fileRef.current.value = ""; }}
                  className="p-1.5 rounded hover:bg-destructive/10"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="mt-1.5 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to upload your PDF</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, max 10MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFile}
              className="hidden"
            />
          </div>
          <div>
            <Label htmlFor="li-url-pdf" className="text-xs">LinkedIn profile URL <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="li-url-pdf"
              placeholder="https://www.linkedin.com/in/your-handle"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={busy || parsing || !file || !text.trim()}
          className="w-full mt-2"
        >
          {parsing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reading your PDF…</> : busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing & auto-filling…</> : <><Check className="mr-2 h-4 w-4" />Import & auto-fill profile</>}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
