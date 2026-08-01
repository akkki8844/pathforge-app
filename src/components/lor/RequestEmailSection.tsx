import { useState } from "react";
import { Mail, Send, Copy, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useRequestEmail } from "@/hooks/useRequestEmail";
import { useRecommenders, type Recommender } from "@/hooks/useRecommenders";

export function RequestEmailSection({ recommender }: { recommender: Recommender }) {
  const draft = useRequestEmail();
  const { update } = useRecommenders();
  const [deadline, setDeadline] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [hasDraft, setHasDraft] = useState(false);

  const onDraft = async () => {
    const res = await draft.mutateAsync({
      recommenderId: recommender.id,
      deadline: deadline || null,
    });
    setSubject(res.subject);
    setBody(res.body);
    setHasDraft(true);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast({ title: "Copied" });
  };

  const openMail = async () => {
    const to = recommender.email ?? "";
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    // Mark as requested
    await update.mutateAsync({
      id: recommender.id,
      patch: { status: "requested", requested_at: new Date().toISOString() } as any,
    });
  };

  return (
    <div className="rounded-lg border bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Request email</h4>
        </div>
        {recommender.requested_at && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Sent {format(new Date(recommender.requested_at), "MMM d")}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Deadline (optional)</Label>
        <Input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={onDraft}
        disabled={draft.isPending}
        className="w-full"
      >
        {draft.isPending ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        )}
        {hasDraft ? "Re-draft email" : "Draft email"}
        <span className="ml-2 text-[10px] text-muted-foreground">1 credit</span>
      </Button>

      {hasDraft && (
        <div className="space-y-2 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={copyAll} className="flex-1">
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
            </Button>
            <Button
              size="sm"
              onClick={openMail}
              disabled={!recommender.email}
              className="flex-1"
              title={!recommender.email ? "Add an email to send" : undefined}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" /> Open in mail
            </Button>
          </div>
          {!recommender.email && (
            <p className="text-[11px] text-muted-foreground">
              Add an email above to enable sending.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
