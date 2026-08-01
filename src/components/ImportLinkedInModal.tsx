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
import linkedinLogo from "@/assets/linkedin-logo.png";

interface ImportLinkedInModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url" as string)).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it: any) => it.str).join(" ") + "\n\n";
  }
  return out.trim();
}

export function ImportLinkedInModal({ open, onOpenChange, onImported }: ImportLinkedInModalProps) {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("Please upload a PDF (LinkedIn → More → Save to PDF).");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Max file size is 10MB.");
      return;
    }
    setFile(f);
    try {
      const parsed = await parsePdf(f);
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

      try {
        const { data: extractRes, error: extractErr } = await supabase.functions.invoke("linkedin-extract", {
          body: { profile_text: finalText, linkedin_url: finalUrl },
        });
        const errMsg = (extractRes as any)?.error || extractErr?.message;
        if (errMsg) {
          toast.error(errMsg);
          return;
        }
        const counts = (extractRes as any)?.counts;
        if (counts) {
          const total =
            (counts.projects_added || 0) +
            (counts.leadership_added || 0) +
            (counts.competitions_added || 0) +
            (counts.internships_added || 0) +
            (counts.service_added || 0) +
            (counts.research_added || 0) +
            (counts.awards_added || 0) +
            (counts.certifications_added || 0);
          toast.success(
            total > 0
              ? `Imported ${total} items — projects, leadership, internships, volunteering, awards, certifications & more were auto-filled.`
              : "LinkedIn imported, but we couldn't find new activities. Add more detail to your PDF.",
          );
        } else {
          toast.success("LinkedIn imported.");
        }
      } catch (e) {
        console.warn("extract failed", e);
        toast.error(e instanceof Error ? e.message : "LinkedIn saved, but AI extraction failed.");
        return;
      }

      try { localStorage.setItem("linkedin-import-popup-dismissed", "1"); } catch { /* ignore */ }
      notifyLinkedInImported();
      onImported?.();
      onOpenChange(false);
      reset();
    } catch (err) {
      console.error(err);
      toast.error("Could not save import. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · {text.length.toLocaleString()} chars extracted</p>
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
          disabled={busy || !file}
          className="w-full mt-2"
        >
          {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing & auto-filling…</> : <><Check className="mr-2 h-4 w-4" />Import & auto-fill profile</>}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
