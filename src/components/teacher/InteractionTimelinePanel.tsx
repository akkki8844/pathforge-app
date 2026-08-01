import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, Users, MessageCircle, MoreHorizontal, Plus, Trash2, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCounsellorInteractions, type InteractionKind } from "@/hooks/useCounsellorInteractions";
import { useToast } from "@/hooks/use-toast";

const KIND_META: Record<InteractionKind, { label: string; Icon: typeof Phone }> = {
  call: { label: "Call", Icon: Phone },
  email: { label: "Email", Icon: Mail },
  meeting: { label: "Meeting", Icon: Users },
  chat: { label: "Chat", Icon: MessageCircle },
  other: { label: "Other", Icon: MoreHorizontal },
};

interface Props {
  studentId: string;
}

/**
 * CRM-style interaction timeline. Logs every contact (call, email, meeting,
 * chat, other) and surfaces a "Last contacted X days ago" badge.
 */
export function InteractionTimelinePanel({ studentId }: Props) {
  const { toast } = useToast();
  const { items, loading, log, remove, lastContacted } = useCounsellorInteractions(studentId);
  const [kind, setKind] = useState<InteractionKind>("call");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (summary.trim().length < 2) return;
    setSaving(true);
    const { error } = await log({
      kind,
      summary: summary.trim(),
      occurred_at: new Date(date).toISOString(),
    });
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Could not log", description: error.message });
    else { setSummary(""); toast({ title: "Interaction logged" }); }
  };

  const lastDays = lastContacted
    ? Math.floor((Date.now() - +new Date(lastContacted)) / 86_400_000)
    : null;

  return (
    <div className="space-y-4">
      <div className="card-elevated p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Contact timeline</h3>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {lastDays === null
              ? "No contact logged"
              : lastDays === 0
                ? "Last contacted today"
                : `Last contacted ${lastDays} day${lastDays === 1 ? "" : "s"} ago`}
          </span>
        </div>
        <form onSubmit={submit} className="grid grid-cols-12 gap-2">
          <Select value={kind} onValueChange={(v) => setKind(v as InteractionKind)}>
            <SelectTrigger className="col-span-6 md:col-span-3 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(KIND_META).map(([k, m]) => (
                <SelectItem key={k} value={k}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="col-span-6 md:col-span-3 h-9 text-xs"
          />
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What did you discuss?"
            maxLength={500}
            className="col-span-12 md:col-span-5 h-9 text-xs"
          />
          <Button type="submit" size="sm" className="col-span-12 md:col-span-1 h-9" disabled={saving || summary.trim().length < 2}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </form>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading timeline…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
      ) : (
        <ol className="relative border-l border-border/60 ml-2 space-y-3 pl-5">
          <AnimatePresence initial={false}>
            {items.map((it) => {
              const meta = KIND_META[it.kind] ?? KIND_META.other;
              return (
                <motion.li
                  key={it.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.18 }}
                  className="relative"
                >
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-background border-2 border-accent" />
                  <div className="card-elevated p-3 group">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <meta.Icon className="h-3.5 w-3.5" />
                      <span className="font-medium text-foreground">{meta.label}</span>
                      <span>·</span>
                      <span>{new Date(it.occurred_at).toLocaleString()}</span>
                      <button
                        type="button"
                        onClick={() => remove(it.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{it.summary}</p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}
