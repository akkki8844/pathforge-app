import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Clock3, Flame, Gauge, LineChart, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { blueprintFor } from "@/lib/testprep/blueprints";
import { examHref, resultsHref, sectionHref, sessionHref } from "@/lib/testprep/nav";
import { resetTestPrep, useTestPrep } from "@/lib/testprep/store";
import {
  accuracyByDifficulty, formatDuration, overallStats, pct, timingByDomain,
} from "@/lib/testprep/stats";
import {
  activityByDay, currentStreak, dailyGoal, longestStreak, minutesPracticed, scoreHistory, weeklyAccuracy,
} from "@/lib/testprep/insights";
import { Reveal } from "@/components/testprep/motion";
import { PageHeader, TestPrepShell } from "@/components/testprep/TestPrepShell";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";
import { ActivityHeatmap, Ring, TrendChart } from "@/components/testprep/viz";
import { masteryColor } from "@/lib/testprep/ui";
import { EASE_OUT_EXPO } from "@/lib/motion";

const CARD = "rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

/**
 * How it is going.
 *
 * Every figure is derived from the answer log and every one of them can say
 * "not yet": a progress page that invents a trend from four questions is worse
 * than one that admits it does not know.
 */
export default function TestPrepProgress() {
  const { testId = "sat" } = useParams();
  const blueprint = blueprintFor(testId);
  const profile = useTestPrep();
  const navigate = useNavigate();

  const stats = useMemo(() => overallStats(profile), [profile]);
  const difficulty = useMemo(() => accuracyByDifficulty(profile), [profile]);
  const timing = useMemo(() => timingByDomain(profile), [profile]);
  const history = useMemo(() => scoreHistory(profile), [profile]);
  const heat = useMemo(() => activityByDay(profile, 7 * 30), [profile]);
  const weekly = useMemo(() => weeklyAccuracy(profile, 12), [profile]);
  const streak = useMemo(() => currentStreak(profile), [profile]);
  const best = useMemo(() => longestStreak(profile), [profile]);
  const minutes = useMemo(() => minutesPracticed(profile), [profile]);
  const goal = dailyGoal(profile);

  if (!blueprint) return <TestNotAvailable name="Test Prep" subtitle="Unknown test" />;
  if (!blueprint.available) return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

  const untouched = stats.totalAttempts === 0;
  const first = history[0]?.score;
  const last = history[history.length - 1]?.score;
  const delta = first !== undefined && last !== undefined && history.length > 1 ? last - first : null;
  const maxMs = Math.max(1, ...timing.map((t) => t.avgMs));

  return (
    <TestPrepShell
      testId={blueprint.id}
      testName={blueprint.name}
      testSubtitle={blueprint.subtitle}
      title="Progress"
      path={`/test-prep/${blueprint.id}/progress`}
    >
      <div className="space-y-6">
        <PageHeader title="Progress" purpose="Everything measured from the questions you have actually answered." />

        {untouched ? (
          <Reveal delay={0.04} className={cn(CARD, "overflow-hidden")}>
            <div className="grid items-center gap-6 p-8 md:grid-cols-[1fr_auto]">
              <div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--bb-blue-soft))] text-[hsl(var(--bb-blue))]">
                  <LineChart className="h-6 w-6" />
                </span>
                <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">Nothing measured yet</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Mastery, accuracy, pace and your score line all come from your own answers, so this page fills in as
                  you practise. One set of ten is enough to start it.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to={sessionHref(blueprint.id, { kind: "quick", count: 10 })}>Start a quick set</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={examHref(blueprint.id, ["rw", "math"])}>Sit a practice test</Link>
                  </Button>
                </div>
              </div>
              <div className="hidden opacity-60 md:block">
                <ActivityHeatmap days={heat.slice(-7 * 12)} goal={goal} />
              </div>
            </div>
          </Reveal>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Kpi
                delay={0.02}
                icon={Trophy}
                tone="bg-amber-500/15 text-amber-600"
                label="Latest test"
                value={last ?? "—"}
                sub={delta !== null ? `${delta >= 0 ? "+" : ""}${delta} since first` : history.length ? "one sitting" : "no sitting yet"}
                good={delta !== null ? delta >= 0 : undefined}
              />
              <Kpi
                delay={0.04}
                icon={Target}
                tone="bg-[hsl(var(--bb-blue-soft))] text-[hsl(var(--bb-blue))]"
                label="Estimate"
                value={stats.estimatedScore ?? "—"}
                sub={
                  stats.estimatedScore !== null
                    ? `${Math.max(0, profile.targetScore - stats.estimatedScore)} to target ${profile.targetScore}`
                    : "not enough answers"
                }
              />
              <Kpi
                delay={0.06}
                icon={Gauge}
                tone="bg-violet-500/15 text-violet-600"
                label="Accuracy"
                value={pct(stats.accuracy)}
                sub={`${stats.totalCorrect} of ${stats.totalAttempts} correct`}
              />
              <Kpi
                delay={0.08}
                icon={Clock3}
                tone="bg-emerald-500/15 text-emerald-600"
                label="Pace"
                value={stats.avgSeconds !== null ? `${stats.avgSeconds}s` : "—"}
                sub={`${minutes} min practised`}
              />
              <Kpi
                delay={0.1}
                icon={Flame}
                tone="bg-orange-500/15 text-orange-600"
                label="Streak"
                value={`${streak}d`}
                sub={`best ${best} day${best === 1 ? "" : "s"}`}
              />
            </div>

            {/* Score line + difficulty */}
            <div className="grid gap-4 lg:grid-cols-12">
              <Reveal delay={0.1} className={cn(CARD, "p-5 lg:col-span-8")}>
                <CardHead title="Practice test scores" sub="Every full sitting, against your target. Click a point for its report." />
                {history.length >= 2 ? (
                  <div className="mt-3">
                    <TrendChart
                      points={history.map((p) => ({
                        id: p.id,
                        label: p.at.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                        value: p.score,
                      }))}
                      min={Math.max(400, Math.floor((Math.min(profile.targetScore, ...history.map((h) => h.score)) - 60) / 100) * 100)}
                      max={Math.min(1600, Math.ceil((Math.max(profile.targetScore, ...history.map((h) => h.score)) + 60) / 100) * 100)}
                      target={profile.targetScore}
                      onPointClick={(p) => navigate(resultsHref(blueprint.id, p.id))}
                    />
                  </div>
                ) : (
                  <EmptyChart
                    text={history.length === 1 ? `One sitting so far: ${history[0].score}. A second one starts the line.` : "Sit two full practice tests to see your score line."}
                    cta={<Link to={examHref(blueprint.id, ["rw", "math"])}>Sit a practice test</Link>}
                  />
                )}
              </Reveal>
              <Reveal delay={0.14} className={cn(CARD, "p-5 lg:col-span-4")}>
                <CardHead title="By difficulty" sub="Accuracy at each level of the bank." />
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as const).map((level) => {
                    const d = difficulty[level];
                    const v = d.total ? d.correct / d.total : null;
                    return (
                      <div key={level} className="flex flex-col items-center gap-2 text-center">
                        <Ring value={v} size={78} stroke={8} color={masteryColor(v)}>
                          <span className="font-display text-[15px] font-bold tabular-nums">{pct(v)}</span>
                        </Ring>
                        <div>
                          <p className="text-[13px] font-semibold capitalize">{level}</p>
                          <p className="text-[11px] tabular-nums text-muted-foreground">{d.total ? `${d.correct}/${d.total}` : "none yet"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-5 rounded-lg bg-muted/60 px-3 py-2 text-[12px] leading-snug text-muted-foreground">
                  {difficultyAdvice(difficulty)}
                </p>
              </Reveal>
            </div>

            {/* Activity + weekly accuracy */}
            <div className="grid gap-4 lg:grid-cols-12">
              <Reveal delay={0.12} className={cn(CARD, "p-5 lg:col-span-8")}>
                <CardHead
                  title="Activity"
                  sub={`Questions answered per day over the last 30 weeks. Darkest squares hit your goal of ${goal}.`}
                  icon={Activity}
                />
                <div className="mt-4">
                  <ActivityHeatmap days={heat} goal={goal} />
                </div>
              </Reveal>
              <Reveal delay={0.16} className={cn(CARD, "p-5 lg:col-span-4")}>
                <CardHead title="Weekly accuracy" sub="Weeks with five or more answers." />
                {weekly.length >= 2 ? (
                  <div className="mt-3">
                    <TrendChart
                      height={200}
                      points={weekly.map((w) => ({
                        id: w.key,
                        label: w.date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                        value: w.accuracy * 100,
                      }))}
                      min={0}
                      max={100}
                      format={(v) => `${Math.round(v)}%`}
                    />
                  </div>
                ) : (
                  <EmptyChart text="Practise across two weeks to see this line." />
                )}
              </Reveal>
            </div>

            {/* Skill map */}
            <Reveal delay={0.14} className={cn(CARD, "p-5")}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <CardHead title="Skill map" sub="Every skill on the test. Click one to practise it." />
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {([["Strong", 0.9], ["Building", 0.65], ["Weak", 0.3], ["Not rated", null]] as const).map(([l, v]) => (
                    <span key={l} className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: masteryColor(v) }} />
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                {stats.subjects.map((subject) => (
                  <div key={subject.subjectId} className="space-y-4">
                    <div className="flex items-baseline justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{subject.name}</p>
                      <p className="text-[12px] tabular-nums text-muted-foreground">
                        {subject.score !== null ? `estimate ${subject.score}` : "no estimate yet"}
                      </p>
                    </div>
                    {subject.domains.map((d) => (
                      <div key={d.domainId}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3">
                          <span className="truncate text-[13px] font-medium">{d.name}</span>
                          <span className="text-[12px] font-semibold tabular-nums">{pct(d.mastery)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                          {d.skills.map((s) => (
                            <Link
                              key={s.skillId}
                              to={sessionHref(blueprint.id, { kind: "topic", skill: s.skillId, count: Math.min(10, Math.max(1, s.available)) })}
                              title={`${s.name}: ${s.mastery === null ? "not rated" : pct(s.mastery)} (${s.correct}/${s.attempts})`}
                              className="group relative overflow-hidden rounded-lg px-2.5 py-2 text-[11px] leading-tight text-white transition-transform hover:-translate-y-0.5"
                              style={{ background: masteryColor(s.mastery) }}
                            >
                              <span className="line-clamp-2 font-medium">{s.name}</span>
                              <span className="mt-1 block text-[10px] font-bold tabular-nums opacity-90">
                                {s.mastery === null ? `${s.attempts} answered` : pct(s.mastery)}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Timing + history */}
            <div className="grid gap-4 lg:grid-cols-12">
              <Reveal delay={0.1} className={cn(CARD, "p-5 lg:col-span-6")}>
                <CardHead title="Where your time goes" sub="Mean time per question, slowest first. Topics with three or more answers." icon={Clock3} />
                {timing.length ? (
                  <ul className="mt-4 space-y-3">
                    {timing.map((row, i) => (
                      <li key={row.id}>
                        <div className="flex items-baseline justify-between gap-3 text-[13px]">
                          <span className="truncate font-medium">{row.label}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            <span className="font-semibold text-foreground">{formatDuration(row.avgMs)}</span>
                            {row.accuracy !== null && ` · ${pct(row.accuracy)}`}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className={cn("h-full rounded-full", row.avgMs > 95000 ? "bg-amber-500" : "bg-[hsl(var(--bb-blue))]")}
                            initial={{ width: 0 }}
                            animate={{ width: `${(row.avgMs / maxMs) * 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.03, ease: EASE_OUT_EXPO }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyChart text="Answer three questions in a topic to time it." />
                )}
                <p className="mt-4 text-[11.5px] text-muted-foreground">
                  The real test gives about 71 seconds per Reading and Writing question and 95 per Math question. Amber bars are
                  slower than that.
                </p>
              </Reveal>
              <Reveal delay={0.14} className={cn(CARD, "overflow-hidden lg:col-span-6")}>
                <div className="p-5 pb-3">
                  <CardHead title="History" sub="Finished sets and tests, newest first." />
                </div>
                {profile.attempts.length ? (
                  <ul className="max-h-[420px] divide-y divide-border/60 overflow-y-auto">
                    {profile.attempts.map((a) => {
                      const acc = a.totalQuestions ? a.correct / a.totalQuestions : 0;
                      return (
                        <li key={a.id}>
                          <Link
                            to={resultsHref(blueprint.id, a.id)}
                            className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                          >
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                a.kind === "exam" ? "bg-amber-500/15 text-amber-600" : "bg-[hsl(var(--bb-blue-soft))] text-[hsl(var(--bb-blue))]",
                              )}
                            >
                              {a.kind === "exam" ? <Trophy className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium">{a.label}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {new Date(a.finishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                {" · "}
                                {formatDuration(a.elapsedMs)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-[15px] font-bold tabular-nums">
                                {typeof a.score === "number" ? a.score : `${Math.round(acc * 100)}%`}
                              </p>
                              <p className="text-[11px] tabular-nums text-muted-foreground">
                                {a.correct}/{a.totalQuestions}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-5 pb-5">
                    <EmptyChart text="Finished sets are listed here." />
                  </div>
                )}
              </Reveal>
            </div>
          </>
        )}

        <div className={cn(CARD, "flex flex-wrap items-center justify-between gap-4 px-5 py-3.5")}>
          <p className="text-xs leading-snug text-muted-foreground">
            Practice history is stored in this browser. Clearing it cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={untouched && profile.bookmarks.length === 0}
                className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Reset progress
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bluebook">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all SAT progress?</AlertDialogTitle>
                <AlertDialogDescription>
                  Every answer, bookmark, practice set and exam result is deleted, and the mastery figures go back to
                  nothing. Your target score and test date are cleared too. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={resetTestPrep}
                >
                  Delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Score figures are estimates from Pathforge-written practice questions, not predictions of a College Board
          result.{" "}
          <Link to={sectionHref(blueprint.id, "exams")} className="text-[hsl(var(--bb-blue))] hover:underline">
            Sit a practice exam
          </Link>{" "}
          for a closer measure.
        </p>
      </div>
    </TestPrepShell>
  );
}

function Kpi({
  icon: Icon, tone, label, value, sub, good, delay,
}: {
  icon: typeof Trophy;
  tone: string;
  label: string;
  value: React.ReactNode;
  sub: string;
  good?: boolean;
  delay: number;
}) {
  return (
    <Reveal delay={delay} className={cn(CARD, "p-4")}>
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-3 font-display text-[28px] font-bold leading-none tabular-nums">{value}</p>
      <p
        className={cn(
          "mt-1.5 text-[12px]",
          good === true ? "font-semibold text-emerald-600" : good === false ? "font-semibold text-rose-600" : "text-muted-foreground",
        )}
      >
        {sub}
      </p>
    </Reveal>
  );
}

function CardHead({ title, sub, icon: Icon }: { title: string; sub?: string; icon?: typeof Trophy }) {
  return (
    <div>
      <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {title}
      </h2>
      {sub && <p className="mt-0.5 text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function EmptyChart({ text, cta }: { text: string; cta?: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-4 py-10 text-center">
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
      {cta && (
        <Button asChild size="sm" variant="outline">
          {cta}
        </Button>
      )}
    </div>
  );
}

function difficultyAdvice(d: ReturnType<typeof accuracyByDifficulty>): string {
  const acc = (k: "easy" | "medium" | "hard") => (d[k].total >= 3 ? d[k].correct / d[k].total : null);
  const e = acc("easy");
  const m = acc("medium");
  const h = acc("hard");
  if (e !== null && e < 0.8) return "Easy questions are still slipping. Those are the cheapest points on the test: slow down on them first.";
  if (m !== null && m < 0.65) return "Medium questions are where most of the score is. Topic practice on your weakest domain will move this fastest.";
  if (h !== null && h < 0.5) return "Easy and medium are solid. Hard questions are the next step: try a custom set at Hard.";
  if (e === null && m === null && h === null) return "Answer a few more questions at each level to see where the points are.";
  return "Solid across the board. Full timed tests are the best use of your time now.";
}
