import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, Check, ChevronDown, Clock3, Crosshair, Gauge, Minus, RotateCcw, Timer, Trophy, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { blueprintFor, domainName, domainOf, skillName, subjectName } from "@/lib/testprep/blueprints";
import { examHref, resultsHref, sectionHref, sessionHref } from "@/lib/testprep/nav";
import { useTestPrep } from "@/lib/testprep/store";
import { formatDuration } from "@/lib/testprep/stats";
import { questionById } from "@/lib/testprep/questions";
import { plainText } from "@/lib/testprep/text";
import { AnimatedNumber, Reveal } from "@/components/testprep/motion";
import { PageHeader, TestPrepShell } from "@/components/testprep/TestPrepShell";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";
import { QuestionView } from "@/components/testprep/QuestionView";
import { Ring, ShareBar, TrendChart } from "@/components/testprep/viz";
import { masteryColor } from "@/lib/testprep/ui";
import type { SubjectId } from "@/lib/testprep/types";

const CARD = "rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

/** A skill only counts as strong or weak once there is enough of it to judge. */
const MIN_FOR_VERDICT = 2;

/**
 * What a finished sitting is worth, and what to do about it.
 *
 * A score report in the order a student reads one: the number and its change,
 * the two sections, accuracy and pace, what went well and what cost the most,
 * then every question with the answer and the explanation.
 */
export default function TestPrepResults() {
  const { testId = "sat", attemptId } = useParams();
  const blueprint = blueprintFor(testId);
  const profile = useTestPrep();
  const navigate = useNavigate();

  const attempt = profile.attempts.find((a) => a.id === attemptId);
  const previous = useMemo(() => {
    if (!attempt) return undefined;
    const sameKind = profile.attempts.filter((a) => a.kind === attempt.kind);
    const i = sameKind.findIndex((a) => a.id === attempt.id);
    return i >= 0 ? sameKind[i + 1] : undefined;
  }, [attempt, profile.attempts]);

  const skills = useMemo(() => {
    if (!attempt) return [];
    return Object.entries(attempt.bySkill).map(([skillId, s]) => ({
      skillId,
      ...s,
      wrong: s.total - s.correct,
      accuracy: s.total ? s.correct / s.total : 0,
    }));
  }, [attempt]);
  const weak = useMemo(
    () => skills.filter((s) => s.wrong > 0).sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy),
    [skills],
  );
  const strong = useMemo(
    () => skills.filter((s) => s.total >= MIN_FOR_VERDICT && s.wrong === 0).sort((a, b) => b.total - a.total),
    [skills],
  );
  const byDomain = useMemo(() => {
    if (!attempt) return [];
    const map = new Map<string, { correct: number; total: number }>();
    for (const [skillId, s] of Object.entries(attempt.bySkill)) {
      const id = domainOf(skillId);
      if (!id) continue;
      const entry = map.get(id) ?? { correct: 0, total: 0 };
      entry.correct += s.correct;
      entry.total += s.total;
      map.set(id, entry);
    }
    return [...map.entries()]
      .map(([domainId, s]) => ({ domainId, ...s, accuracy: s.correct / s.total }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [attempt]);

  if (!blueprint) return <TestNotAvailable name="Test Prep" subtitle="Unknown test" />;
  if (!blueprint.available) return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

  if (!attempt) {
    return (
      <TestPrepShell
        testId={blueprint.id}
        testName={blueprint.name}
        testSubtitle={blueprint.subtitle}
        title="Results"
        path={`/test-prep/${blueprint.id}/exams`}
      >
        <PageHeader title="Results" />
        <div className={cn(CARD, "mt-6 max-w-xl p-6")}>
          <p className="text-sm leading-snug text-muted-foreground">
            That attempt is not in your history. It may have been recorded in another browser: practice results are
            stored on this device.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to={sectionHref(blueprint.id, "exams")}>Back to Practice Exams</Link>
          </Button>
        </div>
      </TestPrepShell>
    );
  }

  const isExam = attempt.kind === "exam";
  const delta = attempt.score !== undefined && previous?.score !== undefined ? attempt.score - previous.score : null;
  const accuracy = attempt.totalQuestions ? attempt.correct / attempt.totalQuestions : 0;
  const perQ = attempt.totalQuestions ? attempt.elapsedMs / attempt.totalQuestions : 0;
  const exams = profile.attempts.filter((a) => a.kind === "exam" && a.score !== undefined);
  const here = exams.findIndex((a) => a.id === attempt.id);
  const history = here >= 0 ? exams.slice(here, here + 8).reverse() : [];
  const skipped = attempt.items?.filter((i) => i.given.trim() === "").length ?? 0;
  const toTarget = attempt.score !== undefined ? profile.targetScore - attempt.score : null;

  return (
    <TestPrepShell
      testId={blueprint.id}
      testName={blueprint.name}
      testSubtitle={blueprint.subtitle}
      title="Results"
      path={`/test-prep/${blueprint.id}/exams`}
    >
      <div className="space-y-6">
        {/* ── Score band ─────────────────────────────────────── */}
        <Reveal className="relative overflow-hidden rounded-2xl bg-[hsl(var(--bb-navy))] text-[hsl(var(--bb-navy-foreground))]">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[36px] border-white/[0.06]" />
          <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">
                {isExam ? "Score report" : "Practice set"} {"·"}{" "}
                {new Date(attempt.finishedAt).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" })}
              </p>
              <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">{attempt.label}</h1>
              <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-2">
                <span className="font-display text-[72px] font-bold leading-[0.85] tracking-tight tabular-nums">
                  {attempt.score !== undefined ? (
                    <AnimatedNumber value={attempt.score} from={400} />
                  ) : (
                    <>
                      <AnimatedNumber value={Math.round(accuracy * 100)} from={0} />%
                    </>
                  )}
                </span>
                <div className="pb-1.5 text-sm">
                  <p className="opacity-75">
                    {attempt.score !== undefined ? `of ${blueprint.scoreRange[1]}` : `${attempt.correct} of ${attempt.totalQuestions} correct`}
                  </p>
                  {delta !== null && (
                    <p
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold",
                        delta > 0 ? "bg-emerald-400/20 text-emerald-200" : delta < 0 ? "bg-rose-400/20 text-rose-200" : "bg-white/10",
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta} vs last
                    </p>
                  )}
                </div>
              </div>
              {toTarget !== null && (
                <p className="mt-4 max-w-md text-[13px] opacity-80">
                  {toTarget <= 0
                    ? `At or above your target of ${profile.targetScore}. Keep sitting full tests to hold it.`
                    : `${toTarget} points from your target of ${profile.targetScore}.`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-5">
              <Ring value={accuracy} size={112} stroke={11} color="hsl(var(--bb-rule))">
                <div className="text-center leading-none">
                  <div className="font-display text-2xl font-bold tabular-nums">{Math.round(accuracy * 100)}%</div>
                  <div className="mt-1 text-[10px] opacity-70">accuracy</div>
                </div>
              </Ring>
              <div className="space-y-2.5 text-[13px]">
                <BandStat icon={Check} label="Correct" value={attempt.correct} />
                <BandStat icon={X} label="Wrong" value={attempt.totalQuestions - attempt.correct - skipped} />
                {skipped > 0 && <BandStat icon={Minus} label="Skipped" value={skipped} />}
              </div>
            </div>
          </div>
          <div className="h-[3px] bg-[hsl(var(--bb-rule))]" />
        </Reveal>

        {/* ── Sections + pace ────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {attempt.sectionScores && Object.keys(attempt.sectionScores).length > 0 ? (
            Object.entries(attempt.sectionScores).map(([subjectId, score], i) => (
              <Reveal key={subjectId} delay={0.05 + i * 0.04} className={cn(CARD, "p-5")}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {subjectName(subjectId as SubjectId)}
                </p>
                <p className="mt-2 font-display text-4xl font-bold tabular-nums">{score}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-[hsl(var(--bb-blue))]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(((score ?? 200) - 200) / 600) * 100}%` }}
                    transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-muted-foreground">
                  <span>200</span>
                  <span>800</span>
                </div>
                {attempt.routes?.[subjectId as SubjectId] && (
                  <p className="mt-3 border-t border-border/60 pt-2.5 text-[12px] leading-snug text-muted-foreground">
                    {attempt.routes[subjectId as SubjectId] === "harder"
                      ? "Routed to the harder Module 2, so the full 800 was in reach."
                      : "Routed to the easier Module 2, which caps the section in the low 600s. More right answers in Module 1 unlock the harder one."}
                  </p>
                )}
              </Reveal>
            ))
          ) : (
            <Reveal delay={0.05} className={cn(CARD, "p-5 lg:col-span-2")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">By domain</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {byDomain.slice(0, 4).map((d) => (
                  <ShareBar
                    key={d.domainId}
                    label={domainName(d.domainId)}
                    value={d.accuracy}
                    color={masteryColor(d.accuracy)}
                    sub={`${d.correct} of ${d.total}`}
                  />
                ))}
              </div>
            </Reveal>
          )}
          <Reveal
            delay={0.12}
            className={cn(
              CARD,
              "grid grid-cols-2 gap-3 p-5",
              Object.keys(attempt.sectionScores ?? {}).length === 1 && "lg:col-span-2 lg:grid-cols-4",
            )}
          >
            <PaceStat icon={Timer} label="Per question" value={attempt.totalQuestions ? formatDuration(perQ) : "—"} />
            <PaceStat icon={Clock3} label="Total time" value={formatDuration(attempt.elapsedMs)} />
            <PaceStat icon={Gauge} label="Questions" value={String(attempt.totalQuestions)} />
            <PaceStat icon={Trophy} label="Skills tested" value={String(skills.length)} />
          </Reveal>
        </div>

        {/* ── Weak / strong ──────────────────────────────────── */}
        {(weak.length > 0 || strong.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Reveal delay={0.14} className={cn(CARD, "p-5")}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-[15px] font-semibold">Where the points went</h2>
                  <p className="text-[12px] text-muted-foreground">Skills with misses, most costly first.</p>
                </div>
                {weak.length > 0 && (
                  <Button asChild size="sm" className="gap-1.5">
                    <Link to={sessionHref(blueprint.id, { kind: "weak", count: 10 })}>
                      <Crosshair className="h-4 w-4" />
                      Drill these
                    </Link>
                  </Button>
                )}
              </div>
              {weak.length ? (
                <ul className="mt-3 space-y-1">
                  {weak.slice(0, 6).map((s) => (
                    <li key={s.skillId}>
                      <Link
                        to={sessionHref(blueprint.id, { kind: "topic", skill: s.skillId, count: 10 })}
                        className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                      >
                        <Ring value={s.accuracy} size={38} stroke={4} color={masteryColor(s.accuracy)}>
                          <span className="text-[9px] font-bold tabular-nums">{Math.round(s.accuracy * 100)}</span>
                        </Ring>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{skillName(s.skillId)}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{domainName(domainOf(s.skillId) ?? "")}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-rose-600">
                          {s.wrong} missed
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Nothing missed in this sitting.</p>
              )}
            </Reveal>
            <Reveal delay={0.18} className={cn(CARD, "p-5")}>
              <h2 className="font-display text-[15px] font-semibold">What went well</h2>
              <p className="text-[12px] text-muted-foreground">
                Answered without a miss, {MIN_FOR_VERDICT} questions or more.
              </p>
              {strong.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {strong.slice(0, 10).map((s) => (
                    <li
                      key={s.skillId}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 py-1 pl-1 pr-3 text-[12px]"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {skillName(s.skillId)}
                      <span className="tabular-nums text-muted-foreground">
                        {s.correct}/{s.total}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No skill came up twice without a miss. That is normal early on.
                </p>
              )}
              {byDomain.length > 0 && attempt.sectionScores && Object.keys(attempt.sectionScores).length > 0 && (
                <div className="mt-5 space-y-3 border-t border-border/60 pt-4">
                  {byDomain.map((d) => (
                    <ShareBar
                      key={d.domainId}
                      label={domainName(d.domainId)}
                      value={d.accuracy}
                      color={masteryColor(d.accuracy)}
                    />
                  ))}
                </div>
              )}
            </Reveal>
          </div>
        )}

        {/* ── Score line ─────────────────────────────────────── */}
        {history.length > 1 && (
          <Reveal delay={0.2} className={cn(CARD, "p-5")}>
            <h2 className="font-display text-[15px] font-semibold">Score progression</h2>
            <p className="text-[12px] text-muted-foreground">Up to and including this sitting.</p>
            <div className="mt-3">
              <TrendChart
                points={history.map((a) => ({
                  id: a.id,
                  label: new Date(a.finishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                  value: a.score ?? 400,
                }))}
                min={Math.max(400, Math.floor((Math.min(profile.targetScore, ...history.map((h) => h.score ?? 400)) - 60) / 100) * 100)}
                max={Math.min(1600, Math.ceil((Math.max(profile.targetScore, ...history.map((h) => h.score ?? 400)) + 60) / 100) * 100)}
                target={profile.targetScore}
                onPointClick={(p) => p.id !== attempt.id && navigate(resultsHref(blueprint.id, p.id))}
              />
            </div>
          </Reveal>
        )}

        {/* ── Review ─────────────────────────────────────────── */}
        {attempt.items && attempt.items.length > 0 && <Review items={attempt.items} />}

        <Reveal delay={0.24} className={cn(CARD, "flex flex-wrap items-center gap-2 p-4 sm:px-5")}>
          <p className="mr-auto text-sm text-muted-foreground">
            {weak.length > 0 ? "The fastest gain is in the skills you missed." : "Clean sitting. Try something harder next."}
          </p>
          {isExam ? (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to={examHref(blueprint.id, ["rw", "math"])}>
                <RotateCcw className="h-4 w-4" />
                Sit another test
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to={sectionHref(blueprint.id, "practice")}>
                <RotateCcw className="h-4 w-4" />
                Another set
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <Link to={sectionHref(blueprint.id, "progress")}>See progress</Link>
          </Button>
        </Reveal>
      </div>
    </TestPrepShell>
  );
}

function BandStat({ icon: Icon, label, value }: { icon: typeof Check; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="w-6 font-display font-bold tabular-nums">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}

function PaceStat({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <Icon className="h-4 w-4 text-[hsl(var(--bb-blue))]" />
      <p className="mt-2 font-display text-xl font-bold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

type Item = NonNullable<import("@/lib/testprep/types").AttemptSummary["items"]>[number];

/** Every question in the sitting, filterable, each opening to the full explanation. */
function Review({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState<"all" | "wrong" | "correct" | "skipped">("all");
  const [open, setOpen] = useState<string | null>(null);
  const status = (i: Item) => (i.correct ? "correct" : i.given.trim() === "" ? "skipped" : "wrong");
  const counts = {
    all: items.length,
    wrong: items.filter((i) => status(i) === "wrong").length,
    correct: items.filter((i) => status(i) === "correct").length,
    skipped: items.filter((i) => status(i) === "skipped").length,
  };
  const shown = items.map((it, n) => ({ it, n })).filter(({ it }) => filter === "all" || status(it) === filter);

  return (
    <Reveal delay={0.22} className={cn(CARD, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="font-display text-[15px] font-semibold">Question review</h2>
          <p className="text-[12px] text-muted-foreground">Open any question to see the right answer and why.</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {(["all", "wrong", "skipped", "correct"] as const)
            .filter((k) => k !== "skipped" || counts.skipped > 0)
            .map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors",
                  filter === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {k} <span className="tabular-nums opacity-60">{counts[k]}</span>
              </button>
            ))}
        </div>
      </div>
      {/* The strip: every question at a glance. */}
      <div className="flex flex-wrap gap-1.5 border-b border-border/60 px-5 py-3">
        {items.map((it, n) => {
          const st = status(it);
          return (
            <button
              key={`${it.questionId}-${n}`}
              type="button"
              onClick={() => {
                setFilter("all");
                setOpen(`${it.questionId}-${n}`);
                document.getElementById(`rv-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              title={`Question ${n + 1}: ${st}`}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold tabular-nums transition-transform hover:scale-110",
                st === "correct" && "bg-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue-foreground))]",
                st === "wrong" && "bg-rose-500 text-white",
                st === "skipped" && "border border-dashed border-muted-foreground/50 text-muted-foreground",
              )}
            >
              {n + 1}
            </button>
          );
        })}
      </div>
      <ul className="divide-y divide-border/60">
        {shown.map(({ it, n }) => {
          const q = questionById(it.questionId);
          if (!q) return null;
          const key = `${it.questionId}-${n}`;
          const isOpen = open === key;
          const st = status(it);
          return (
            <li key={key} id={`rv-${n}`}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    st === "correct" && "bg-[hsl(var(--bb-blue-soft))] text-[hsl(var(--bb-blue))]",
                    st === "wrong" && "bg-rose-500/10 text-rose-600",
                    st === "skipped" && "bg-muted text-muted-foreground",
                  )}
                >
                  {st === "correct" ? <Check className="h-4 w-4" /> : st === "wrong" ? <X className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                </span>
                <span className="w-8 shrink-0 text-[12px] font-semibold tabular-nums text-muted-foreground">{n + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{plainText(q.prompt)}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {skillName(q.skillId)} {"·"} <span className="capitalize">{q.difficulty}</span>
                    {st !== "correct" && ` · answer ${q.answer}${it.given ? `, you chose ${it.given}` : ""}`}
                  </span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
                    className="overflow-hidden"
                  >
                    <div className="bg-muted/25 px-5 pb-5 pt-1 sm:pl-[4.25rem]">
                      <QuestionView question={q} value={it.given} onChange={() => {}} revealed disabled />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
}
