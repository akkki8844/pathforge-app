import { useMemo, useState } from "react";
import { Plus, Trash2, CalendarClock, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useAppStrategies,
  APP_STAGES,
  FIT_TIERS,
  stageLabel,
  tierLabel,
  type AppStage,
  type FitTier,
} from "@/hooks/useAppStrategies";

interface Props {
  studentId: string;
}

/**
 * Per-student application strategy tracker.
 * Counsellor adds target colleges, sets fit tier + stage + deadline,
 * and writes a short per-college strategy. Editable inline.
 */
export function AppStrategyTracker({ studentId }: Props) {
  const { toast } = useToast();
  const { items, loading, busy, add, update, remove } = useAppStrategies(studentId);

  const [newCollege, setNewCollege] = useState("");
  const [newTier, setNewTier] = useState<FitTier>("match");
  const [newStage, setNewStage] = useState<AppStage>("researching");
  const [newDeadline, setNewDeadline] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const summary = useMemo(() => {
    const by = (t: FitTier) => items.filter((i) => i.fit_tier === t).length;
    return { reach: by("reach"), match: by("match"), safety: by("safety") };
  }, [items]);

  const onAdd = async () => {
    if (newCollege.trim().length < 2) return;
    const { error } = await add({
      college_name: newCollege,
      fit_tier: newTier,
      stage: newStage,
      strategy_notes: newNotes,
      deadline: newDeadline || null,
    });
    if (error) {
      toast({ variant: "destructive", title: "Could not add", description: error.message });
    } else {
      setNewCollege("");
      setNewNotes("");
      setNewDeadline("");
      setNewTier("match");
      setNewStage("researching");
      toast({ title: "College added to strategy" });
    }
  };

  return (
    <div className="card-elevated p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" /> Application strategy
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Plan a balanced college list and track each application's stage.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Badge variant="destructive" className="text-[10px]">{summary.reach} reach</Badge>
          <Badge variant="secondary" className="text-[10px]">{summary.match} match</Badge>
          <Badge variant="secondary" className="text-[10px] bg-accent/10 text-accent">{summary.safety} safety</Badge>
        </div>
      </div>

      {/* Add row */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <div className="grid md:grid-cols-12 gap-2">
          <div className="md:col-span-4">
            <Label className="text-[11px]">College</Label>
            <Input
              value={newCollege}
              onChange={(e) => setNewCollege(e.target.value)}
              placeholder="e.g. Stanford University"
              maxLength={120}
              className="h-9 mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-[11px]">Fit</Label>
            <Select value={newTier} onValueChange={(v) => setNewTier(v as FitTier)}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIT_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>{tierLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label className="text-[11px]">Stage</Label>
            <Select value={newStage} onValueChange={(v) => setNewStage(v as AppStage)}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {APP_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label className="text-[11px]">Deadline</Label>
            <Input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="h-9 mt-1"
            />
          </div>
        </div>
        <Textarea
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          placeholder="Strategy for this college (e.g. lead with research project, ED1)"
          rows={2}
          maxLength={1000}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={onAdd} disabled={busy || newCollege.trim().length < 2}>
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
            Add college
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading strategies…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No colleges yet. Start with 2 reaches, 3 matches, and 2 safeties.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <StrategyRow
              key={item.id}
              college={item.college_name}
              tier={item.fit_tier}
              stage={item.stage}
              deadline={item.deadline}
              notes={item.strategy_notes ?? ""}
              busy={busy}
              onChange={(patch) => update(item.id, patch)}
              onRemove={() => remove(item.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function StrategyRow({
  college,
  tier,
  stage,
  deadline,
  notes,
  busy,
  onChange,
  onRemove,
}: {
  college: string;
  tier: FitTier;
  stage: AppStage;
  deadline: string | null;
  notes: string;
  busy: boolean;
  onChange: (patch: Partial<{
    college_name: string;
    fit_tier: FitTier;
    stage: AppStage;
    deadline: string | null;
    strategy_notes: string;
  }>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draftNotes, setDraftNotes] = useState(notes);
  const overdue =
    deadline && new Date(deadline) < new Date() && !["submitted", "admitted", "rejected", "waitlisted", "withdrawn"].includes(stage);

  return (
    <li className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-12 gap-2 items-center px-3 py-2.5">
        <div className="col-span-12 md:col-span-4 min-w-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm font-medium text-foreground hover:underline truncate text-left w-full"
          >
            {college}
          </button>
          {deadline && (
            <div className={`text-[11px] flex items-center gap-1 mt-0.5 ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
              <CalendarClock className="h-3 w-3" /> {new Date(deadline).toLocaleDateString()}
              {overdue && " • overdue"}
            </div>
          )}
        </div>
        <div className="col-span-4 md:col-span-3">
          <Select value={tier} onValueChange={(v) => onChange({ fit_tier: v as FitTier })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIT_TIERS.map((t) => (
                <SelectItem key={t} value={t}>{tierLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-6 md:col-span-4">
          <Select value={stage} onValueChange={(v) => onChange({ stage: v as AppStage })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {APP_STAGES.map((s) => (
                <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 md:col-span-1 flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            onClick={onRemove}
            disabled={busy}
            aria-label="Remove"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border bg-muted/20">
          <div className="pt-3">
            <Label className="text-[11px]">Deadline</Label>
            <Input
              type="date"
              value={deadline ?? ""}
              onChange={(e) => onChange({ deadline: e.target.value || null })}
              className="h-8 mt-1 text-xs max-w-[180px]"
            />
          </div>
          <div>
            <Label className="text-[11px]">Strategy notes</Label>
            <Textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              onBlur={() => {
                if (draftNotes !== notes) onChange({ strategy_notes: draftNotes });
              }}
              placeholder="What's the angle for this college? Which essay theme? ED/EA/RD?"
              rows={3}
              maxLength={1000}
              className="mt-1 resize-none text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Saves automatically when you click outside.</p>
          </div>
        </div>
      )}
    </li>
  );
}
