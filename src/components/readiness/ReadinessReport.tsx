import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Target, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus, GraduationCap, ListChecks, ChevronDown, Building2 } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { AnalysisResult } from "@/hooks/useReadinessHistory";

interface Props {
  analysis: AnalysisResult;
  analysisId?: string; // for action-plan check persistence
}

const alignmentColor = (s: string) => {
  switch (s) {
    case "Strong":
      return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
    case "Moderate":
      return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "Needs Work":
      return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "text-muted-foreground bg-muted";
  }
};

const fitColor = (f: string) => {
  switch (f) {
    case "Reach":
      return "border-red-500/40 text-red-600 dark:text-red-400";
    case "Match":
      return "border-yellow-500/40 text-yellow-600 dark:text-yellow-400";
    case "Safety":
      return "border-green-500/40 text-green-600 dark:text-green-400";
    default:
      return "";
  }
};

const priorityColor = (p: string) =>
  p === "High"
    ? "destructive"
    : p === "Medium"
    ? "default"
    : "secondary";

const TrendIcon = ({ trend }: { trend: string }) =>
  trend === "up" ? (
    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
  ) : trend === "down" ? (
    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
  ) : (
    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  );

export function ReadinessReport({ analysis, analysisId }: Props) {
  const storageKey = analysisId ? `readiness-actions-${analysisId}` : null;
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    if (!storageKey || typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  });

  const toggleAction = (idx: number) => {
    setChecked((prev) => {
      const next = { ...prev, [idx]: !prev[idx] };
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const pillarsData = useMemo(() => {
    const p = analysis.pillars;
    if (!p) return [];
    return [
      { axis: "Academics", value: p.academics },
      { axis: "Rigor", value: p.rigor },
      { axis: "Major Fit", value: p.majorAlignment },
      { axis: "Growth", value: p.growth },
      { axis: "EC Readiness", value: p.ecReadiness },
    ];
  }, [analysis.pillars]);

  /**
   * The five pillars, averaged.
   *
   * Two corrections here. First, the pillars arrive from a language model and
   * are not range-checked anywhere upstream, so a stray 120 or a null used to
   * flow straight into the mean and out onto the page; they are now clamped to
   * 0–100 and non-numeric values are dropped rather than coerced to NaN.
   *
   * Second, this is an unweighted mean of five model judgements, which is a
   * summary of the chart beside it and nothing more. It is labelled as such
   * below — it is not a score with a denominator behind it, and calling it
   * "Overall /100" implied one.
   */
  const overall = useMemo(() => {
    if (!analysis.pillars) return null;
    const v = Object.values(analysis.pillars)
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n))
      .map((n) => Math.max(0, Math.min(100, n)));
    if (v.length === 0) return null;
    return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  }, [analysis.pillars]);

  const actionPlan = analysis.actionPlan ?? [];
  const completed = actionPlan.filter((_, i) => checked[i]).length;

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Executive summary + alignment */}
      <div className="card-elevated p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            College Alignment
          </h3>
          <span
            className={`text-sm font-bold px-3 py-1 rounded-md ${alignmentColor(
              analysis.alignmentScore,
            )}`}
          >
            {analysis.alignmentScore}
          </span>
        </div>
        {analysis.summary && (
          <p className="text-foreground leading-relaxed mb-3">
            {analysis.summary}
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          {analysis.alignmentExplanation}
        </p>
      </div>

      {/* Pillars: radar + bars + overall */}
      {analysis.pillars && (
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Readiness Pillars
            </h3>
            {overall !== null && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Pillar average</div>
                <div className="text-2xl font-bold text-accent leading-none">
                  {overall}
                  <span className="text-sm text-muted-foreground font-normal">
                    /100
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={pillarsData} outerRadius="75%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    dataKey="value"
                    stroke="hsl(var(--accent))"
                    fill="hsl(var(--accent))"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {pillarsData.map((p) => (
                <div key={p.axis}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{p.axis}</span>
                    <span className="font-semibold text-foreground">
                      {p.value}
                    </span>
                  </div>
                  <Progress value={p.value} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          <p className="mt-5 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
            Each pillar is a reading of your report card by a model, on a 0–100 scale where 100
            is a fully prepared profile for your stated major. The average is a summary of the
            five — not a rank against other applicants, and not a percentile.
          </p>
        </div>
      )}

      {/* Action plan */}
      {actionPlan.length > 0 && (
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-accent" />
              Your Action Plan
            </h3>
            <span className="text-xs text-muted-foreground">
              {completed}/{actionPlan.length} done
            </span>
          </div>
          <Progress
            value={(completed / actionPlan.length) * 100}
            className="h-1.5 mb-4"
          />
          <ul className="space-y-3">
            {actionPlan.map((a, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  checked[i]
                    ? "border-border bg-muted/40 opacity-70"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <Checkbox
                  checked={!!checked[i]}
                  onCheckedChange={() => toggleAction(i)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-medium text-foreground ${
                        checked[i] ? "line-through" : ""
                      }`}
                    >
                      {a.title}
                    </span>
                    <Badge variant={priorityColor(a.priority) as any} className="text-[10px]">
                      {a.priority}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {a.horizon}
                    </Badge>
                  </div>
                  {a.why && (
                    <p className="text-sm text-muted-foreground mt-1">{a.why}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* College fit */}
      {analysis.collegeFit && analysis.collegeFit.length > 0 && (
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent" />
            College Fit
          </h3>
          <div className="space-y-2">
            {analysis.collegeFit.map((c, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{c.university}</div>
                  {c.notes && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {c.notes}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className={fitColor(c.fit)}>
                  {c.fit}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject breakdown + strengths + risks + recs as accordion */}
      <div className="card-elevated p-2">
        <Accordion type="multiple" defaultValue={["subjects", "strengths"]}>
          {analysis.subjectScores && analysis.subjectScores.length > 0 && (
            <AccordionItem value="subjects" className="border-border">
              <AccordionTrigger className="px-4 hover:no-underline">
                <span className="flex items-center gap-2 text-foreground">
                  <GraduationCap className="h-4 w-4 text-accent" />
                  Subject Breakdown
                  <span className="text-xs text-muted-foreground font-normal">
                    ({analysis.subjectScores.length})
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <div className="space-y-3">
                  {analysis.subjectScores.map((s, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-1.5 text-foreground">
                          {s.subject}
                          <TrendIcon trend={s.trend} />
                        </span>
                        <span className="font-semibold text-foreground">
                          {s.score}
                        </span>
                      </div>
                      <Progress value={s.score} className="h-1.5" />
                      {s.note && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="strengths" className="border-border">
            <AccordionTrigger className="px-4 hover:no-underline">
              <span className="flex items-center gap-2 text-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Academic Strengths
                <span className="text-xs text-muted-foreground font-normal">
                  ({analysis.academicStrengths.length})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <ul className="space-y-2">
                {analysis.academicStrengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                    <span className="text-foreground text-sm">{s}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="risks" className="border-border">
            <AccordionTrigger className="px-4 hover:no-underline">
              <span className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Risk Areas
                <span className="text-xs text-muted-foreground font-normal">
                  ({analysis.riskAreas.length})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <ul className="space-y-2">
                {analysis.riskAreas.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                    <span className="text-foreground text-sm">{r}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="recs" className="border-b-0">
            <AccordionTrigger className="px-4 hover:no-underline">
              <span className="flex items-center gap-2 text-foreground">
                <TrendingUp className="h-4 w-4 text-accent" />
                Recommendations
                <span className="text-xs text-muted-foreground font-normal">
                  ({analysis.recommendations.length})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <ul className="space-y-2">
                {analysis.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-accent/10 text-accent text-[10px] flex items-center justify-center flex-shrink-0 font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-foreground text-sm">{r}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </motion.div>
  );
}
