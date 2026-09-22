import { useEffect, useState } from "react";
import { Loader2, Copy, Check, Send, Sparkles, ExternalLink, RotateCcw, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MultiStateButton } from "@/components/ui/multi-state-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/edgeFunctionError";
import { useComposioConnection } from "@/hooks/useComposioConnection";
import { ComposioMark } from "@/components/ComposioMark";
import type { Professor } from "./professorTypes";

const PURPOSES = [
  "research mentorship",
  "summer research position",
  "undergrad research (REU)",
  "PhD inquiry",
  "an informational chat",
  "reading recommendations",
];

/**
 * Draft a cold email to one professor, then send it from the student's own
 * Gmail through Composio.
 *
 * The prompt box is optional on purpose. The draft is built from the student's
 * saved profile and the professor's own page either way; the prompt is only
 * there for the things a profile cannot know — a deadline, a mutual contact, a
 * particular angle they want to take.
 */
export function ComposeProfessorEmailDialog({
  professor,
  open,
  onOpenChange,
}: {
  professor: Professor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { connection, loading: connLoading } = useComposioConnection("gmail");
  const gmailReady = connection?.status === "ACTIVE";

  const [prompt, setPrompt] = useState("");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [thinProfile, setThinProfile] = useState(false);

  // A dialog reused across professors must not carry the previous one's draft
  // into the next one — that would put a student one click away from emailing
  // the wrong person a letter written for someone else.
  useEffect(() => {
    if (!open) return;
    setPrompt("");
    setPurpose(PURPOSES[0]);
    setDraft(null);
    setSent(false);
    setCopied(false);
    setThinProfile(false);
  }, [open, professor?.email]);

  if (!professor) return null;

  const generate = async () => {
    setGenerating(true);
    try {
      const data = await invokeEdgeFunction<{
        subject?: string;
        body?: string;
        used_profile?: boolean;
      }>(
        supabase.functions.invoke("compose-professor-email", {
          body: { professor, prompt: prompt.trim(), purpose },
        }),
      );
      if (!data?.subject || !data?.body) throw new Error("The draft came back empty. Try again.");
      setDraft({ subject: data.subject, body: data.body });
      setThinProfile(data.used_profile === false);
      setSent(false);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not draft the email",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const send = async () => {
    if (!draft) return;
    setSending(true);
    try {
      await invokeEdgeFunction(
        supabase.functions.invoke("composio-send-email", {
          body: { to: professor.email, subject: draft.subject, body: draft.body },
        }),
      );
      setSent(true);
      toast({
        title: "Email sent",
        description: `Delivered to ${professor.email} from your Gmail.`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not send",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const copyAll = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const mailtoHref = draft
    ? `mailto:${encodeURIComponent(professor.email)}?subject=${encodeURIComponent(
        draft.subject,
      )}&body=${encodeURIComponent(draft.body)}`
    : "#";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose mail to {professor.name}</DialogTitle>
          <DialogDescription>
            Written from your saved profile and {professor.name.split(" ").slice(-1)[0]}
            {"'"}s own faculty page. Nothing is invented, but review it before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Recipient, always visible so it is obvious who this goes to. */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">To</span>
            <span className="min-w-0 flex-1 truncate font-medium">{professor.email}</span>
          </div>

          {!draft ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">What are you asking for?</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Anything specific to include?{" "}
                  <span className="text-muted-foreground">Optional</span>
                </Label>
                <Textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Mention their 2023 paper on graph transformers; I can start in June; my teacher Dr. Rao suggested I reach out…"
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave this blank and the draft is built from your profile and their research
                  alone.
                </p>
              </div>
            </>
          ) : (
            <>
              {thinProfile && (
                <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  Your profile is nearly empty, so this draft is thin. Fill in your background in
                  Profile Builder and regenerate for a much stronger email.
                </p>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <Input
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Body</Label>
                <Textarea
                  rows={14}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  className="font-normal leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Edit freely. What you see here is exactly what gets sent.
                </p>
              </div>

              {!gmailReady && !connLoading && (
                <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  To send straight from your own Gmail, connect it in{" "}
                  <Link to="/profile?section=connectors" className="font-medium text-foreground underline">
                    Settings → Connectors
                  </Link>
                  . Until then you can copy the draft or open it in your mail app.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {!draft ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <MultiStateButton
                onClick={generate}
                idleIcon={<Sparkles className="h-4 w-4" />}
                idleLabel="Generate draft"
                loadingLabel="Drafting…"
                successLabel="Draft ready"
                errorLabel="Could not draft"
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={generate} disabled={generating}>
                  {generating ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={copyAll}>
                  {copied ? (
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={mailtoHref}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Mail app
                  </a>
                </Button>
              </div>
              <Button
                onClick={send}
                disabled={sending || sent || !gmailReady || connLoading}
                title={gmailReady ? undefined : "Connect Gmail in Settings → Connectors first"}
              >
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : sent ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <ComposioMark size={16} className="mr-2" />
                )}
                {sending ? "Sending" : sent ? "Sent" : "Send using Composio"}
                {!sending && !sent && <Send className="ml-2 h-3.5 w-3.5 opacity-70" />}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
