import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AllClearIcon } from "@/components/icons/FlatIcons";

interface ProofRow {
  id: string;
  user_id: string;
  task_id: string;
  stage_id: string;
  task_title: string;
  task_context: string | null;
  file_path: string;
  file_type: string;
  status: string;
  ai_confidence: number | null;
  ai_reasoning: string | null;
  ai_extracted_text: string | null;
  admin_notes: string | null;
  created_at: string;
}

export function AdminProofReview() {
  const [rows, setRows] = useState<ProofRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("proof_submissions")
      .select("*")
      .in("status", ["needs_review", "verifying"])
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as ProofRow[];
    setRows(list);
    // Sign URLs
    const urls: Record<string, string> = {};
    await Promise.all(
      list.map(async (r) => {
        const { data: u } = await supabase.storage
          .from("proof-uploads")
          .createSignedUrl(r.file_path, 60 * 10);
        if (u?.signedUrl) urls[r.id] = u.signedUrl;
      })
    );
    setSignedUrls(urls);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, status: "approved" | "rejected") => {
    setActing(id);
    const { error } = await supabase
      .from("proof_submissions")
      .update({
        status,
        admin_notes: notesById[id] ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    setActing(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked as ${status}`);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Proof Review Queue</h2>
        <Badge variant="secondary">{rows.length} pending</Badge>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <AllClearIcon className="h-20 w-20 mx-auto mb-3" />
            No proofs awaiting manual review.
          </CardContent>
        </Card>
      ) : (
        rows.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base">{r.task_title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stage {r.stage_id} · submitted {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="capitalize">{r.status.replace("_", " ")}</Badge>
                  {r.ai_confidence !== null && (
                    <Badge variant="secondary">AI {(r.ai_confidence * 100).toFixed(0)}%</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {r.task_context && (
                <p className="text-xs text-muted-foreground"><span className="font-semibold">Context:</span> {r.task_context}</p>
              )}
              {r.ai_reasoning && (
                <div className="rounded border bg-muted/30 p-2 text-xs">
                  <span className="font-semibold">AI:</span> {r.ai_reasoning}
                </div>
              )}
              {r.ai_extracted_text && (
                <div className="rounded border bg-muted/30 p-2 text-xs">
                  <span className="font-semibold">Detected:</span> {r.ai_extracted_text}
                </div>
              )}
              {signedUrls[r.id] && (
                <div className="rounded-lg border overflow-hidden bg-muted/30">
                  {r.file_type.startsWith("image/") ? (
                    <img src={signedUrls[r.id]} alt="proof" loading="lazy" decoding="async" className="w-full max-h-96 object-contain" />
                  ) : (
                    <a href={signedUrls[r.id]} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 p-4 text-sm text-primary hover:underline">
                      <ExternalLink className="h-4 w-4" /> Open uploaded file ({r.file_type})
                    </a>
                  )}
                </div>
              )}
              <Textarea
                placeholder="Optional admin notes (visible to the user)"
                value={notesById[r.id] ?? ""}
                onChange={(e) => setNotesById((p) => ({ ...p, [r.id]: e.target.value }))}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={acting === r.id}
                  onClick={() => decide(r.id, "rejected")}
                  className="gap-1.5"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button
                  size="sm"
                  disabled={acting === r.id}
                  onClick={() => decide(r.id, "approved")}
                  className="gap-1.5"
                >
                  {acting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
