import { useEffect, useState } from "react";
import { AlertOctagon, CheckCircle2, CircleDashed, Save, Loader2, Target, CalendarRange, Wand2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useCounsellorRoadmap, getFocusAreaOptions, type RoadmapDraft } from "@/hooks/useCounsellorRoadmap";
import type { CounsellorInsight } from "@/lib/counsellorInsights";
import { supabase } from "@/integrations/supabase/client";

interface AINextAction {
  title: string;
  why: string;
  category: string;
  effort: "low" | "medium" | "high";
  timeframe: string;
}

interface Props {
  studentId: string;
  insight: CounsellorInsight;
  academicSummary: {
    gpa: string | null;
    curriculum: string | null;
    intendedMajor: string | null;
    targetUniversities: string[] | null;
  };
  ecSummary: {
    projects: number;
    leadershipRoles: number;
    competitions: number;
    courses: number;
  };
  /**
   * Real per-dimension journey sub-scores (0–100). When present we use these
   * directly instead of a derived formula so the counsellor only ever sees
   * the same numbers the student actually earned.
   */
  scoreBreakdown?: {
    academics: number;
    activities: number;
    leadership: number;
    competitions: number;
    testPrep: number;
  } | null;
}

/**
 * Single strategic view for a student — combines:
 * - Profile score & gap summary (academic + EC strength side by side)
 * - AI-style insight panels (rule-based)
 * - Roadmap Builder (monthly focus + long-term plan + focus areas + notes)
 *
 * This replaces the teacher-style "homework" mental model with a
 * counsellor-style "strategy" mental model.
 */
export function StudentStrategyView({ studentId, insight, academicSummary, ecSummary, scoreBreakdown }: Props) {
  const { toast } = useToast();
  const { roadmap, loading, saving, save } = useCounsellorRoadmap(studentId);
  const [draft, setDraft] = useState<RoadmapDraft>({
    monthly_focus: "",
    long_term_plan: "",
    focus_areas: [],
    notes: "",
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [aiActions, setAiActions] = useState<AINextAction[]>([]);

  const runAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const { data, error } = await supabase.functions.invoke("counselor-strategy", {
        body: { studentId },
      });
      if (error) throw new Error(error.message ?? "AI strategy failed");
      if (data?.error) throw new Error(data.error);
      setAiDiagnosis(data?.diagnosis ?? "");
      setAiActions(Array.isArray(data?.nextActions) ? data.nextActions : []);
      toast({ title: "AI strategy generated", description: "1 credit used" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI strategy failed";
      setAiError(msg);
      toast({ variant: "destructive", title: "Could not generate", description: msg });
    } finally {
      setAiLoading(false);
    }
  };

  // Hydrate the draft once a roadmap loads.
  useEffect(() => {
    if (roadmap) {
      setDraft({
        monthly_focus: roadmap.monthly_focus ?? "",
        long_term_plan: roadmap.long_term_plan ?? "",
        focus_areas: roadmap.focus_areas ?? [],
        notes: roadmap.notes ?? "",
      });
    }
  }, [roadmap]);

  const toggleArea = (area: string) => {
    setDraft((d) => ({
      ...d,
      focus_areas: d.focus_areas.includes(area)
        ? d.focus_areas.filter((a) => a !== area)
        : [...d.focus_areas, area],
    }));
  };

  const onSave = async () => {
    const { error } = await save(draft);
    if (error) {
      toast({ variant: "destructive", title: "Could not save plan", description: error.message });
    } else {
      toast({ title: "Strategy saved" });
    }
  };

  // Real, audit-trail numbers — pulled straight from the student's journey
  // sub-scores. If sub-scores aren't available yet we show "—" rather than
  // invent a number.
  const academicStrength = scoreBreakdown
    ? clamp(Math.round((scoreBreakdown.academics + scoreBreakdown.testPrep) / 2))
    : null;
  const ecStrength = scoreBreakdown
    ? clamp(
        Math.round(
          (scoreBreakdown.activities + scoreBreakdown.leadership + scoreBreakdown.competitions) / 3,
        ),
      )
    : null;

  return (
    <div className="space-y-5">
      {/* Profile score banner */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Profile score</div>
            <div className="text-3xl font-bold text-foreground mt-0.5">{insight.profileScore}<span className="text-base text-muted-foreground">/100</span></div>
          </div>
          <PriorityChip insight={insight} />
        </div>
        <Progress value={insight.profileScore} className="h-2" />
        {scoreBreakdown ? (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <SignalBar label="Academic strength" value={academicStrength!} />
            <SignalBar label="Extracurricular strength" value={ecStrength!} />
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-3">
            Sub-scores appear once the student records their first journey activity.
          </p>
        )}
      </div>



      {/* AI Next Best Actions — on-demand, costs 1 credit */}
      <div className="card-elevated p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-accent" /> AI Strategy Engine
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate a personalized diagnosis and 3–6 high-leverage next actions for this student. Costs 1 credit.
            </p>
          </div>
          <Button size="sm" onClick={runAi} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
            {aiActions.length > 0 ? "Regenerate" : "Generate"}
          </Button>
        </div>

        {aiError && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 mb-3">
            {aiError}
          </div>
        )}

        {!aiDiagnosis && aiActions.length === 0 && !aiLoading && !aiError && (
          <p className="text-sm text-muted-foreground">
            Click <span className="font-medium text-foreground">Generate</span> to get an AI-tailored brief grounded in this student's real data.
          </p>
        )}

        {aiDiagnosis && (
          <div className="rounded-md bg-muted/40 border border-border p-3 text-sm text-foreground mb-3">
            {aiDiagnosis}
          </div>
        )}

        {aiActions.length > 0 && (
          <ol className="space-y-2">
            {aiActions.map((a, i) => (
              <li key={i} className="rounded-md border border-border p-3 hover:border-accent/40 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-foreground">{i + 1}. {a.title}</h4>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{a.effort}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{a.why}</p>
                <p className="text-[11px] text-accent mt-1.5 flex items-center gap-1">
                  <CalendarRange className="h-3 w-3" /> {a.timeframe}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <InsightList
          title="Strengths"
          icon={CheckCircle2}
          tone="accent"
          items={insight.strengths}
          emptyText="No clear strengths yet — focus on building one signature area."
        />
        <InsightList
          title="Gaps in profile"
          icon={CircleDashed}
          tone="muted"
          items={[...insight.missing, ...insight.weaknesses]}
          emptyText="Profile coverage looks complete."
        />
        <InsightList
          title="What this student needs next"
          icon={Target}
          tone="accent"
          items={insight.suggestions}
          emptyText="No immediate suggestions — keep the momentum."
        />
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertOctagon className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold text-foreground">Target universities</h3>
          </div>
          {(academicSummary.targetUniversities ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No targets set yet — agree on a balanced list (reach / match / safety).</p>
          ) : (
            <ul className="space-y-1 text-sm text-foreground">
              {academicSummary.targetUniversities!.map((u, i) => (
                <li key={i} className="truncate">• {u}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Roadmap builder */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" /> Strategy roadmap
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set the focus for this month and the longer-term plan. The student sees this on their side.
            </p>
          </div>
          {roadmap && (
            <span className="text-xs text-muted-foreground">
              Updated {new Date(roadmap.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5" /> This month's focus
              </Label>
              <Textarea
                value={draft.monthly_focus}
                onChange={(e) => setDraft({ ...draft, monthly_focus: e.target.value })}
                placeholder="e.g. Finalise SAT registration, draft 2 supplemental essays, lock down summer research lead."
                rows={3}
                maxLength={1000}
                className="mt-1.5 resize-none"
              />
            </div>

            <div>
              <Label className="text-xs">Long-term plan</Label>
              <Textarea
                value={draft.long_term_plan}
                onChange={(e) => setDraft({ ...draft, long_term_plan: e.target.value })}
                placeholder="e.g. Spring: standardised tests + competition prep. Summer: research project + internship. Fall: applications."
                rows={4}
                maxLength={2000}
                className="mt-1.5 resize-none"
              />
            </div>

            <div>
              <Label className="text-xs">Focus areas</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {getFocusAreaOptions().map((area) => {
                  const active = draft.focus_areas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleArea(area)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        active
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-background text-muted-foreground border-border hover:border-foreground/40"
                      }`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs">Private counsellor notes</Label>
              <Textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Notes for your eyes — context, parent conversations, watch-outs."
                rows={3}
                maxLength={2000}
                className="mt-1.5 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={onSave} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {roadmap ? "Update strategy" : "Save strategy"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

function SignalBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{value}/100</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function PriorityChip({ insight }: { insight: CounsellorInsight }) {
  if (insight.priority === "high_priority")
    return <Badge variant="destructive" className="flex-shrink-0">High priority</Badge>;
  if (insight.priority === "needs_attention")
    return <Badge variant="secondary" className="flex-shrink-0">Needs attention</Badge>;
  return <Badge variant="secondary" className="bg-accent/10 text-accent flex-shrink-0">On track</Badge>;
}

function InsightList({
  title,
  icon: Icon,
  tone,
  items,
  emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "accent" | "warn" | "muted";
  items: string[];
  emptyText: string;
}) {
  const toneCls =
    tone === "accent" ? "text-accent" : tone === "warn" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${toneCls}`} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground ml-auto">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-foreground">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <span className={`mt-1.5 inline-block h-1 w-1 rounded-full flex-shrink-0 ${
                tone === "accent" ? "bg-accent" : tone === "warn" ? "bg-destructive" : "bg-muted-foreground"
              }`} />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
