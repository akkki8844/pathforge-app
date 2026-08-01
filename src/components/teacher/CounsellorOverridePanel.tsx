import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Plus, Trash2, Loader2, Power, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCounsellorOverrides, type OverridePriority, type OverrideType } from "@/hooks/useCounsellorOverrides";
import { useToast } from "@/hooks/use-toast";

const TYPE_LABEL: Record<OverrideType, string> = {
  priority: "Priority shift",
  roadmap_note: "Roadmap note",
  task: "Manual task",
  warning: "Warning",
};

const PRIORITY_TONE: Record<OverridePriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/10 text-accent",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  urgent: "bg-destructive/10 text-destructive",
};

interface Props {
  studentId: string;
}

/**
 * Counsellor override editor. These items overrule AI recommendations and are
 * visible to the student on their dashboard while active.
 */
export function CounsellorOverridePanel({ studentId }: Props) {
  const { toast } = useToast();
  const { items, loading, create, update, remove } = useCounsellorOverrides(studentId, "counsellor");

  const [type, setType] = useState<OverrideType>("priority");
  const [priority, setPriority] = useState<OverridePriority>("high");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 2) return;
    setSaving(true);
    const { error } = await create({
      override_type: type,
      title: title.trim(),
      body: body.trim() || undefined,
      priority,
    });
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Could not save", description: error.message });
    else {
      setTitle(""); setBody("");
      toast({ title: "Override added", description: "The student will see this on their dashboard." });
    }
  };

  return (
    <div className="space-y-4">
      <div className="card-elevated p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Counsellor overrides</h3>
          <span className="ml-auto text-[11px] text-muted-foreground">
            Overrules AI · visible to the student on their dashboard
          </span>
        </div>

        <form onSubmit={submit} className="grid grid-cols-12 gap-2">
          <Select value={type} onValueChange={(v) => setType(v as OverrideType)}>
            <SelectTrigger className="col-span-6 md:col-span-3 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABEL).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => setPriority(v as OverridePriority)}>
            <SelectTrigger className="col-span-6 md:col-span-2 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What should the student see?"
            maxLength={200}
            className="col-span-12 md:col-span-7 h-9 text-xs"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Optional details — guidance, deadline, why this overrules the AI plan…"
            rows={2}
            maxLength={1500}
            className="col-span-12 resize-none text-sm"
          />
          <div className="col-span-12 flex justify-end">
            <Button type="submit" size="sm" disabled={saving || title.trim().length < 2}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
              Push override
            </Button>
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading overrides…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No overrides set. Add one above to overrule the AI roadmap for this student.
        </p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((o) => (
              <motion.li
                key={o.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className={`card-elevated p-4 ${o.is_active ? "" : "opacity-60"}`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${o.priority === "urgent" || o.priority === "high" ? "text-destructive" : "text-accent"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">{o.title}</h4>
                      <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[o.override_type]}</Badge>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${PRIORITY_TONE[o.priority]}`}>
                        {o.priority}
                      </span>
                      {!o.is_active && (
                        <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                      )}
                    </div>
                    {o.body && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{o.body}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Added {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                      <Power className="h-3 w-3" />
                      <Switch
                        checked={o.is_active}
                        onCheckedChange={(v) => update(o.id, { is_active: v })}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => remove(o.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete override"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
