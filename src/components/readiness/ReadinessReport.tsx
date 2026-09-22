import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Target, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus, GraduationCap, ListChecks, ChevronDown, Building2, Lightbulb } from "lucide-react";
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
import { CollegeLogo } from "@/components/CollegeLogo";
import type { AnalysisResult } from "@/hooks/useReadinessHistory";

interface Props {
  analysis: AnalysisResult;
  analysisId?: string; // for action-plan check persistence
}

/*
 * Semantic tokens, not raw Tailwind hues.
 *
 * This file hardcoded green-600 / yellow-600 / red-600 with hand-written
 * `dark:` variants beside each one. The app already ships --success,
 * --warning and --info in both themes and maps them in tailwind.config.ts, so
 * the hardcoded set was a second palette that had to be kept in sync by hand
 * and drifted from every other surface the moment either side changed.
 *
 * These three scales stay coloured because they are genuinely ordinal — the
 * reader acts differently on "Safety" than on "Reach" — which is the one case
 * where colour carries information rather than decoration.
 */
const alignmentColor = (s: string) => {
  switch (s) {
    case "Strong":
      return "bg-success/10 text-success";
    case "Moderate":
      return "bg-warning/10 text-warning";
    case "Needs Work":
    case "Misaligned":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const fitColor = (f: string) => {
  switch (f) {
    case "Reach":
      return "border-destructive/40 text-destructive";
    case "Match":
      return "border-warning/40 text-warning";
    case "Safety":
      return "border-success/40 text-success";
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
    <TrendingUp className="h-3.5 w-3.5 text-success" />
  ) : trend === "down" ? (
    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
  ) : (
    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  );

/** Direction of travel across terms, as a word and a tone. */
const TRAJECTORY_TONE: Record<string, string> = {
  improving: "bg-success/10 text-success",
  steady: "bg-muted text-muted-foreground",
  mixed: "bg-warning/10 text-warning",
  declining: "bg-destructive/10 text-destructive",
};

/**
 * How sure the counsellor is of a finding.
 *
 * Shown as a word rather than a coloured dot: "medium" is information, a amber
 * circle beside a paragraph is decoration that the reader has to decode from a
 * legend that does not exist.
 */
function ConfidenceNote({ level }: { level: "high" | "medium" | "low" }) {
  if (level === "high") return null;
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {level === "medium" ? "Moderate confidence" : "Low confidence"}
    </span>
  );
}

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
      {/*
        * The headline.
        *
        * The report used to open on "College Alignment" and a badge, which is
        * a label, not a finding. If the review is worth paying for it has one
        * sentence that matters most, and it belongs before anything else on
        * the page rather than buried in paragraph three of the summary.
        */}
      {analysis.headline && (
        <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] p-6 dark:bg-accent/[0.10]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            The finding
          </p>
          <p className="mt-2 text-balance text-[19px] font-semibold leading-snug tracking-[-0.02em] text-foreground">
            {analysis.headline}
          </p>
        </div>
      )}

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

      {/*
        * Does the record actually support the stated major?
        *
        * The single most useful thing this report can say, and the old version
        * had nowhere to say it — a student whose marks point away from their
        * intended subject got "Moderate" on an alignment badge and no
        * explanation of what would have to change.
        */}
      {analysis.majorAlignment && (
        <div className="card-elevated p-6">
          <div className="mb-3 flex items-start justify-between gap-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <GraduationCap className="h-5 w-5 text-accent" />
              Major alignment
            </h3>
            <span
              className={`shrink-0 rounded-md px-3 py-1 text-sm font-bold ${alignmentColor(
                analysis.majorAlignment.verdict,
              )}`}
            >
              {analysis.majorAlignment.verdict}
            </span>
          </div>
          <p className="leading-relaxed text-foreground">
            {analysis.majorAlignment.explanation}
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {analysis.majorAlignment.requiredSubjects &&
              analysis.majorAlignment.requiredSubjects.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-semibold text-foreground">
                    Subjects this major expects
                  </h4>
                  <ul className="mt-2 space-y-1.5">
                    {analysis.majorAlignment.requiredSubjects.map((r) => (
                      <li key={r} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                        <span
                          aria-hidden
                          className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50"
                        />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {analysis.majorAlignment.gapsToClose &&
              analysis.majorAlignment.gapsToClose.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-semibold text-foreground">Gaps to close</h4>
                  <ul className="mt-2 space-y-1.5">
                    {analysis.majorAlignment.gapsToClose.map((g) => (
                      <li key={g} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                        <span
                          aria-hidden
                          className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-destructive/60"
                        />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </div>
      )}

      {/*
        * Direction of travel.
        *
        * A single term is a snapshot; what a family actually wants to know is
        * whether this is getting better or worse and where it lands by
        * application season.
        */}
      {analysis.trajectory && (
        <div className="card-elevated p-6">
          <div className="mb-3 flex items-start justify-between gap-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <TrendingUp className="h-5 w-5 text-accent" />
              Trajectory
            </h3>
            <span
              className={`shrink-0 rounded-md px-3 py-1 text-sm font-bold capitalize ${
                TRAJECTORY_TONE[analysis.trajectory.direction] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {analysis.trajectory.direction}
            </span>
          </div>
          <p className="leading-relaxed text-foreground">{analysis.trajectory.evidence}</p>
          <p className="mt-3 border-l-2 border-accent/30 pl-3 text-[13.5px] leading-relaxed text-muted-foreground">
            {analysis.trajectory.projection}
          </p>
        </div>
      )}

      {/*
        * Insights: the part a student could not have read off their own card.
        *
        * Deliberately the longest-form block in the report. Everything else
        * here is a list; this is where the counsellor actually reasons, and
        * compressing it into bullets is what made the old report feel generic.
        */}
      {analysis.insights && analysis.insights.length > 0 && (
        <div className="card-elevated p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Lightbulb className="h-5 w-5 text-accent" />
            What stands out
            <span className="text-sm font-normal text-muted-foreground">
              ({analysis.insights.length})
            </span>
          </h3>
          <div className="space-y-4">
            {analysis.insights.map((ins, i) => (
              <motion.div
                key={`${ins.title}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-border/70 bg-background/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                    {ins.title}
                  </h4>
                  <ConfidenceNote level={ins.confidence} />
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {ins.finding}
                </p>
                <p className="mt-2.5 text-[13.5px] font-medium leading-relaxed text-foreground">
                  {ins.soWhat}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

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
                <div className="flex min-w-0 items-start gap-3">
                  <CollegeLogo name={c.university} size={28} className="mt-0.5 rounded-md" />
                  <div className="min-w-0">
                  <div className="font-medium text-foreground">{c.university}</div>
                  {c.notes && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {c.notes}
                    </p>
                  )}
                  </div>
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
      {/*
        * What the review could not see.
        *
        * A report card shows marks and little else — no test scores, usually no
        * extracurriculars. Saying so is the difference between an assessment
        * and a verdict, and it stops a student reading silence as approval.
        */}
      {analysis.dataGaps && analysis.dataGaps.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5">
          <h3 className="text-[13px] font-semibold text-foreground">
            What this review could not see
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Based only on the report card provided. These would change the assessment.
          </p>
          <ul className="mt-3 space-y-1.5">
            {analysis.dataGaps.map((g) => (
              <li key={g} className="flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
                <span
                  aria-hidden
                  className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50"
                />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
