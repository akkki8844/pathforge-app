import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PortalData {
  ok?: true;
  error?: string;
  packet_url: string | null;
  student_name?: string;
  recommender?: {
    id: string;
    name: string;
    subject: string | null;
    school: string | null;
    due_date: string | null;
    submitted_at: string | null;
    last_packet_artifact_id: string | null;
  };
  expires_at?: string;
}

const MAX_BYTES = 15 * 1024 * 1024;

function fileToB64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function LorPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data: res, error } = await supabase.functions.invoke("lor-portal", {
          body: { action: "load", token },
        });
        if (error) throw error;
        setData(res as PortalData);
      } catch (e: any) {
        setData({ error: e.message ?? "load_failed", packet_url: null });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const onSubmit = async () => {
    if (!file || !token) return;
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Max 15 MB", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const b64 = await fileToB64(file);
      const { data: res, error } = await supabase.functions.invoke("lor-portal", {
        body: {
          action: "submit",
          token,
          file_b64: b64,
          filename: file.name,
          notes: notes.trim() || null,
        },
      });
      if (error) throw error;
      const r = res as { ok?: boolean; error?: string };
      if (r?.error) throw new Error(r.error);
      setDone(true);
      toast({ title: "Letter received", description: "Thank you for submitting." });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Seo
        title="Letter portal — Pathforge"
        description="Private portal for uploading a letter of recommendation."
        path={`/lor/portal/${token ?? ""}`}
      />
      <div className="min-h-[100svh] bg-background">
        <header className="border-b">
          <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">Pathforge</span>
            <span className="text-xs text-muted-foreground ml-2">Recommender portal</span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-10">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : data?.error ? (
            <ErrorState code={data.error} />
          ) : done || data?.recommender?.submitted_at ? (
            <ThankYou name={data?.recommender?.name ?? ""} />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-8"
            >
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  [ Recommendation request ]
                </p>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  Hello {data?.recommender?.name?.split(" ")[0] ?? "there"} —
                </h1>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  <span className="font-medium text-foreground">{data?.student_name}</span> has asked
                  you to write a letter of recommendation
                  {data?.recommender?.subject ? <> for their work in <span className="font-medium text-foreground">{data.recommender.subject}</span></> : null}.
                  When you're ready, upload your letter below — it goes directly to the student and is never shared elsewhere.
                </p>
                {data?.recommender?.due_date && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                    Deadline: {format(new Date(data.recommender.due_date), "PPP")}
                  </p>
                )}
              </div>

              {data?.packet_url && (
                <div className="rounded-xl border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-medium">Reference packet</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The student has prepared a one-pager with their profile, goals, and accomplishments
                    so you can write a more specific letter. Optional but helpful.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => window.open(data.packet_url!, "_blank")}>
                    <Download className="h-4 w-4 mr-1.5" /> Download packet
                  </Button>
                </div>
              )}

              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-medium">Upload your letter</h2>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">PDF or Word document (max 15 MB)</Label>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-border file:bg-muted file:text-foreground file:text-xs file:font-medium file:cursor-pointer cursor-pointer"
                  />
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      {file.name} · {(file.size / 1024).toFixed(0)} KB
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Note to the student (optional)</Label>
                  <Textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything you'd like them to know…"
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button onClick={onSubmit} disabled={!file || submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                    Submit letter
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Encrypted in transit and at rest. Only {data?.student_name} can read it.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </>
  );
}

function ErrorState({ code }: { code: string }) {
  const copy: Record<string, { title: string; body: string }> = {
    invalid: {
      title: "This link isn't valid",
      body: "Please double-check the URL or ask the student to send a fresh link.",
    },
    expired: {
      title: "This link has expired",
      body: "Ask the student to generate a new share link from their dashboard.",
    },
    revoked: {
      title: "This link was revoked",
      body: "The student turned off this link. Ask them to send a new one.",
    },
  };
  const c = copy[code] ?? { title: "Something went wrong", body: code };
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
      <h2 className="font-semibold text-lg mb-1">{c.title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{c.body}</p>
    </div>
  );
}

function ThankYou({ name }: { name: string }) {
  return (
    <div className="rounded-xl border bg-card p-10 text-center">
      <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-4" />
      <h2 className="text-2xl font-semibold tracking-tight mb-2">Letter received</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Thank you{ name ? `, ${name.split(" ")[0]}` : ""}. The student has been notified and can now access your letter.
      </p>
    </div>
  );
}
