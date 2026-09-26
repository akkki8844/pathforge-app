import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { blueprintFor, domainName, skillName } from "@/lib/testprep/blueprints";
import { isCorrect, pickQuestions, resolve } from "@/lib/testprep/select";
import { questionById } from "@/lib/testprep/questions";
import {
  readProfile,
  recordAnswer,
  saveAttempt,
  toggleBookmark,
  useTestPrep,
} from "@/lib/testprep/store";
import { formatClock, formatDuration } from "@/lib/testprep/stats";
import { resultsHref, sectionHref, sessionHref } from "@/lib/testprep/nav";
import {
  BB_NAV_CIRCLE,
  BB_NAV_CIRCLE_ANSWERED,
  BB_NAV_CIRCLE_CURRENT,
  BB_NAV_FLAG,
  BB_TIMER,
  BB_TOOLBAR,
  BB_TOOLBAR_BUTTON,
  BB_TOOLBAR_FG,
  BB_TOOLBAR_MUTED,
  FOCUS,
  ROW_HOVER,
  SURFACE,
} from "@/lib/testprep/ui";
import { Flag } from "lucide-react";
import { QuestionView } from "@/components/testprep/QuestionView";
import { Bar, Stat, StatGrid } from "@/components/testprep/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/testprep/motion";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";
import { Ring } from "@/components/testprep/viz";
import type { AttemptSummary, PracticeConfig, SessionKind } from "@/lib/testprep/types";

/**
 * The practice runner.
 *
 * Configured entirely by the query string (see `sessionHref`), so every
 * "practice this" link in the section lands here without any state being
 * threaded through the router. The set is built once, on arrival, from a
 * snapshot of the profile — rebuilding it as answers land would reshuffle the
 * questions under the student mid-session.
 *
 * Practice marks each answer as it is submitted and shows the explanation. That
 * is the difference between this and the exam runner, and it is the whole point
 * of practice: feedback at the moment the reasoning is still in your head.
 */
export default function TestPrepSession() {
  const [params] = useSearchParams();
  /*
   * The query string is the session.
   *
   * Changing it — "Another set", or any practice link followed from the summary
   * — updates the URL without remounting the route, so the set built in
   * `useState` on arrival would survive into what is supposed to be a new run.
   * Keying on the query string makes a different configuration a different
   * component instance, which is what the runner already assumes.
   */
  return <SessionRunner key={params.toString()} />;
}

function SessionRunner() {
  const { testId = "sat" } = useParams();
  const blueprint = blueprintFor(testId);
  const [params] = useSearchParams();
  const profile = useTestPrep();

  const config = useMemo<PracticeConfig>(() => {
    const count = Number(params.get("count")) || 10;
    const minutes = Number(params.get("minutes")) || undefined;
    const idsParam = params.get("ids");
    const ids = idsParam ? idsParam.split(",").filter(Boolean) : undefined;
    return {
      kind: (params.get("kind") as SessionKind) || "quick",
      subjectId: (params.get("subject") as PracticeConfig["subjectId"]) || undefined,
      domainId: params.get("domain") || undefined,
      skillId: params.get("skill") || undefined,
      difficulty: (params.get("difficulty") as PracticeConfig["difficulty"]) || "mixed",
      count: ids ? ids.length : count,
      timeLimit: minutes,
      ids,
    };
    // The query string is the identity of this session; nothing else may change it.
  }, [params]);

  // Built once from a snapshot, deliberately not from the live profile. An
  // explicit `ids` list (a hand-picked selection from the Question Bank) is
  // used verbatim, filtered to ids the bank still holds, rather than run back
  // through the filter-based picker — the whole point of picking exact
  // questions is that the set is not reshuffled or resized on arrival.
  const [questionIds] = useState(() =>
    config.ids
      ? config.ids.filter((id) => Boolean(questionById(id)))
      : pickQuestions(readProfile(), config),
  );
  const questions = useMemo(() => resolve(questionIds), [questionIds]);

  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [attempt, setAttempt] = useState<AttemptSummary | null>(null);
  const startedAt = useRef(Date.now());
  const questionStart = useRef(Date.now());

  const label = useMemo(() => sessionLabel(config), [config]);

  const finish = useCallback(() => {
    if (finished) return;
    const bySkill: AttemptSummary["bySkill"] = {};
    let correct = 0;
    for (const q of questions) {
      if (!checked[q.id]) continue;
      const ok = isCorrect(q, given[q.id] ?? "");
      if (ok) correct += 1;
      const entry = (bySkill[q.skillId] ??= { correct: 0, total: 0 });
      entry.total += 1;
      if (ok) entry.correct += 1;
    }
    const answeredCount = questions.filter((q) => checked[q.id]).length;
    const summary: AttemptSummary = {
      id: `att-${Date.now().toString(36)}`,
      testId: "sat",
      kind: config.kind,
      label,
      finishedAt: new Date().toISOString(),
      totalQuestions: answeredCount,
      correct,
      elapsedMs: Date.now() - startedAt.current,
      bySkill,
      items: questions
        .filter((q) => checked[q.id])
        .map((q) => ({
          questionId: q.id,
          given: given[q.id] ?? "",
          correct: isCorrect(q, given[q.id] ?? ""),
          elapsedMs: 0,
        })),
    };
    // A set where nothing was answered is not a result. Recording it would put
    // a 0/0 row in the history and drag the practice averages toward nothing.
    if (answeredCount > 0) saveAttempt(summary);
    setAttempt(summary);
    setFinished(true);
  }, [checked, config.kind, finished, given, label, questions]);

  /*
   * Countdown, for timed sets only.
   *
   * Measured against a deadline rather than by decrementing once per
   * `setInterval` tick. Browsers throttle timers in background tabs — Chrome
   * to roughly once a minute — so a counter measures how long the tab was
   * watched rather than how long the set took, and a "20 minute" set became
   * as long as the student wanted by switching away. The same fix as the exam
   * runner's module clock, for the same reason.
   *
   * The interval now only decides how often the number refreshes.
   */
  const [remaining, setRemaining] = useState(config.timeLimit ? config.timeLimit * 60 : null);
  const deadline = useRef(
    config.timeLimit ? Date.now() + config.timeLimit * 60 * 1000 : 0,
  );
  const timed = config.timeLimit ? true : false;
  useEffect(() => {
    if (!timed || finished) return;
    const sync = () =>
      setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    sync();
    const t = window.setInterval(sync, 1000);
    // A backgrounded tab may not have ticked for minutes; correct the display
    // as soon as it is looked at again rather than on the next interval.
    const onVisible = () => { if (!document.hidden) sync(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [timed, finished]);

  useEffect(() => {
    if (remaining === 0 && !finished) finish();
  }, [remaining, finished, finish]);

  const total = questions.length;
  const go = useCallback(
    (next: number) => {
      setIndex((i) => {
        const clamped = Math.max(0, Math.min(total - 1, next));
        if (clamped !== i) questionStart.current = Date.now();
        return clamped;
      });
    },
    [total],
  );

  /*
   * Arrow keys move between questions.
   *
   * Guarded on the focused element: a student typing a produced response uses
   * the arrow keys inside the field, and stealing them there would make the
   * input unusable.
   */
  // The handler is rebuilt every render (it needs the current question and
  // `check`, which are defined below the early returns) and read through a ref.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else keyHandler.current(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, go, index]);

  if (!blueprint) return <TestNotAvailable name="Test Prep" subtitle="Unknown test" />;
  if (!blueprint.available)
    return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

  if (!questions.length) {
    return (
      <div className="section-container py-20 text-center">
        <p className="text-sm font-medium text-foreground">No questions match that set.</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-snug text-muted-foreground">
          The bank does not hold any questions for this combination yet. Widening the difficulty
          or choosing the whole domain will find some.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to={sectionHref(blueprint.id, "practice")}>Back to Practice</Link>
        </Button>
      </div>
    );
  }

  if (finished && attempt) {
    return <SessionSummary testId={blueprint.id} attempt={attempt} config={config} />;
  }

  const question = questions[index];
  const isChecked = !!checked[question.id];
  const answeredCount = questions.filter((q) => checked[q.id]).length;
  const hasAnswer = !!given[question.id];

  const check = () => {
    if (isChecked || !hasAnswer) return;
    const ok = isCorrect(question, given[question.id]);
    recordAnswer({
      questionId: question.id,
      given: given[question.id],
      correct: ok,
      elapsedMs: Date.now() - questionStart.current,
      at: new Date().toISOString(),
      flagged: flags[question.id],
    });
    setChecked((c) => ({ ...c, [question.id]: true }));
  };

  keyHandler.current = (e: KeyboardEvent) => {
    const k = e.key.toUpperCase();
    if (!isChecked && question.choices && ["A", "B", "C", "D"].includes(k)) {
      if (question.choices.some((c) => c.id === k)) {
        e.preventDefault();
        setGiven((g) => ({ ...g, [question.id]: k }));
      }
    } else if (e.key === "Enter") {
      if (!isChecked) {
        if (hasAnswer) {
          e.preventDefault();
          check();
        }
      } else if (index < questions.length - 1) {
        e.preventDefault();
        go(index + 1);
      } else {
        e.preventDefault();
        finish();
      }
    }
  };

  const correctSoFar = questions.filter((q) => checked[q.id] && isCorrect(q, given[q.id] ?? "")).length;
  const lowTime = remaining !== null && remaining <= 60;

  return (
    <>
      <Seo
        title={`${blueprint.name} ${label}`}
        description="Practice session."
        path={`/test-prep/${blueprint.id}/session`}
        noindex
      />
      <div className="bluebook min-h-svh bg-background">
        {/* Session bar: the section's own chrome, full width. */}
        <div className={cn(BB_TOOLBAR, "sticky top-16 z-20")}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
            <Link to={sectionHref(blueprint.id, "practice")} className={cn(BB_TOOLBAR_BUTTON, FOCUS)}>
              <span aria-hidden="true">{"←"} </span>Exit
            </Link>
            <p className={cn("min-w-0 truncate text-sm font-bold", BB_TOOLBAR_FG)}>{label}</p>
            <div className="flex items-center gap-3">
              {remaining !== null && (
                <span
                  className={cn(
                    BB_TIMER,
                    "font-display text-sm font-bold tabular-nums transition-colors",
                    lowTime ? "animate-pulse text-[hsl(var(--bb-rule))]" : BB_TOOLBAR_FG,
                  )}
                >
                  {formatClock(remaining)}
                </span>
              )}
              <span className={cn("text-xs tabular-nums", BB_TOOLBAR_MUTED)}>
                {index + 1} / {questions.length}
              </span>
            </div>
          </div>
          <div className="h-1 bg-[hsl(var(--bb-navy-foreground)/0.12)]">
            <motion.div
              className="h-full bg-[hsl(var(--bb-rule))]"
              initial={false}
              animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-7">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                >
                  <QuestionView
                    question={question}
                    value={given[question.id] ?? ""}
                    onChange={(v) => setGiven((g) => ({ ...g, [question.id]: v }))}
                    revealed={isChecked}
                    disabled={isChecked}
                    bookmarked={profile.bookmarks.includes(question.id)}
                    onToggleBookmark={() => toggleBookmark(question.id)}
                    flagged={!!flags[question.id]}
                    onToggleFlag={() => setFlags((f) => ({ ...f, [question.id]: !f[question.id] }))}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => go(index - 1)} disabled={index === 0} className="rounded-xl">
                {"←"} Previous
              </Button>
              <div className="flex items-center gap-2">
                {answeredCount > 0 && index === questions.length - 1 && !isChecked && (
                  <Button variant="outline" onClick={finish} className="rounded-xl">
                    Finish now
                  </Button>
                )}
                {!isChecked ? (
                  <Button onClick={check} disabled={!hasAnswer} className="min-w-[140px] rounded-xl font-bold">
                    Check answer
                  </Button>
                ) : index < questions.length - 1 ? (
                  <Button onClick={() => go(index + 1)} className="min-w-[140px] rounded-xl font-bold">
                    Next question {"→"}
                  </Button>
                ) : (
                  <Button onClick={finish} className="min-w-[140px] rounded-xl bg-[hsl(var(--bb-rule))] font-bold text-black hover:bg-[hsl(var(--bb-rule)/0.9)]">
                    See results
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Side panel: how the set is going, and every question in it. */}
          <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex items-center gap-4">
                <Ring value={answeredCount ? correctSoFar / answeredCount : null} size={64} stroke={7}>
                  <span className="font-display text-sm font-bold tabular-nums">
                    {answeredCount ? `${Math.round((correctSoFar / answeredCount) * 100)}%` : "—"}
                  </span>
                </Ring>
                <div className="space-y-0.5 text-[13px]">
                  <p>
                    <span className="font-display font-bold tabular-nums">{correctSoFar}</span>
                    <span className="text-muted-foreground"> correct</span>
                  </p>
                  <p>
                    <span className="font-display font-bold tabular-nums">{answeredCount}</span>
                    <span className="text-muted-foreground"> of {questions.length} checked</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Questions</p>
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
                {questions.map((q, i) => {
                  const done = !!checked[q.id];
                  const ok = done && isCorrect(q, given[q.id] ?? "");
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`Question ${i + 1}${done ? (ok ? ", correct" : ", incorrect") : ""}${flags[q.id] ? ", marked for review" : ""}`}
                      aria-current={i === index ? "true" : undefined}
                      className={cn(
                        "relative flex h-9 items-center justify-center rounded-lg border text-[12px] font-semibold tabular-nums transition-all hover:-translate-y-0.5",
                        FOCUS,
                        i === index && "ring-2 ring-[hsl(var(--bb-blue))] ring-offset-1 ring-offset-card",
                        done
                          ? ok
                            ? "border-transparent bg-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue-foreground))]"
                            : "border-transparent bg-rose-500 text-white"
                          : "border-border/70 text-muted-foreground",
                      )}
                    >
                      {i + 1}
                      {flags[q.id] && (
                        <span className={BB_NAV_FLAG} aria-hidden="true">
                          <Flag className="h-2 w-2 fill-current" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="hidden rounded-2xl border border-dashed border-border p-4 text-[12px] text-muted-foreground lg:block">
              <p className="mb-2 font-semibold text-foreground">Shortcuts</p>
              <ul className="space-y-1.5">
                <li><Kbd>A</Kbd>{"–"}<Kbd>D</Kbd> choose an answer</li>
                <li><Kbd>Enter</Kbd> check, then next</li>
                <li><Kbd>{"←"}</Kbd> <Kbd>{"→"}</Kbd> move between questions</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex min-w-[1.4rem] items-center justify-center rounded border border-border bg-muted px-1 font-sans text-[11px] font-semibold text-foreground">
      {children}
    </kbd>
  );
}

/**
 * What a set is called.
 *
 * Built from the config rather than passed in, so a link written anywhere in
 * the product produces a session with a sensible name in the history without
 * the caller having to supply one.
 */
function sessionLabel(config: PracticeConfig): string {
  if (config.ids) return `Selected questions (${config.ids.length})`;
  if (config.skillId) return `${skillName(config.skillId)} practice`;
  if (config.domainId) return `${domainName(config.domainId)} practice`;
  switch (config.kind) {
    case "weak":
      return "Weak areas practice";
    case "timed":
      return "Timed practice";
    case "custom":
      return "Custom practice";
    default:
      return "Quick practice";
  }
}

/** What a finished practice run says. */
function SessionSummary({
  testId,
  attempt,
  config,
}: {
  testId: string;
  attempt: AttemptSummary;
  config: PracticeConfig;
}) {
  const accuracy = attempt.totalQuestions ? attempt.correct / attempt.totalQuestions : 0;
  const pctText = Math.round(accuracy * 100);
  const missed = Object.entries(attempt.bySkill)
    .map(([skillId, s]) => ({ skillId, ...s, wrong: s.total - s.correct }))
    .filter((s) => s.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong);

  const again = sessionHref(testId, {
    kind: config.kind,
    subject: config.subjectId,
    domain: config.domainId,
    skill: config.skillId,
    difficulty: config.difficulty,
    count: config.count,
    minutes: config.timeLimit,
    ids: config.ids,
    nonce: attempt.id,
  });

  if (attempt.totalQuestions === 0) {
    return (
      <div className="bluebook min-h-svh bg-background">
        <div className="section-container py-20 text-center">
          <p className="text-sm font-medium text-foreground">Nothing answered.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-snug text-muted-foreground">
            This set was closed before any answer was checked, so nothing was recorded.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild size="sm">
              <Link to={again}>Try again</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={sectionHref(testId, "practice")}>Back to Practice</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const verdict =
    accuracy >= 0.9 ? "Excellent set." : accuracy >= 0.7 ? "Solid work." : accuracy >= 0.5 ? "Good practice." : "Every miss is a lesson.";

  return (
    <div className="bluebook min-h-svh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Reveal className="overflow-hidden rounded-2xl bg-[hsl(var(--bb-navy))] text-[hsl(var(--bb-navy-foreground))]">
          <div className="flex flex-col items-center gap-6 p-7 sm:flex-row sm:p-8">
            <Ring value={accuracy} size={128} stroke={12} color="hsl(var(--bb-rule))">
              <div className="text-center leading-none">
                <div className="font-display text-3xl font-bold tabular-nums">{pctText}%</div>
                <div className="mt-1 text-[10px] opacity-70">accuracy</div>
              </div>
            </Ring>
            <div className="text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">{attempt.label}</p>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{verdict}</h1>
              <p className="mt-2 text-sm opacity-80">
                {attempt.correct} of {attempt.totalQuestions} correct {"·"}{" "}
                {formatDuration(attempt.elapsedMs / attempt.totalQuestions)} a question {"·"}{" "}
                {formatDuration(attempt.elapsedMs)} in total
              </p>
            </div>
          </div>
          <div className="h-[3px] bg-[hsl(var(--bb-rule))]" />
        </Reveal>

        {missed.length > 0 && (
          <Reveal delay={0.08} className="mt-6 rounded-2xl border border-border/70 bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Top areas to improve</p>
            <Stagger as="ul" className="mt-3 space-y-1" count={Math.min(4, missed.length)} step={0.03}>
              {missed.slice(0, 4).map((s) => (
                <StaggerItem key={s.skillId} as="li" y={4}>
                  <Link
                    to={sessionHref(testId, { kind: "topic", skill: s.skillId, count: 10 })}
                    className={cn("flex items-center justify-between gap-4 rounded-lg px-3 py-2.5", ROW_HOVER)}
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">{skillName(s.skillId)}</span>
                    <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-rose-600">
                      {s.wrong} of {s.total} missed
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>
        )}

        <Reveal delay={0.14} className="mt-6 flex flex-wrap items-center gap-2">
          <Button asChild className="rounded-xl font-bold">
            <Link to={resultsHref(testId, attempt.id)}>Review every answer</Link>
          </Button>
          {missed.length > 0 && (
            <Button asChild variant="outline" className="rounded-xl">
              <Link to={sessionHref(testId, { kind: "topic", skill: missed[0].skillId, count: 10 })}>
                Drill {skillName(missed[0].skillId)}
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="rounded-xl">
            <Link to={again}>Another set</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl">
            <Link to={sectionHref(testId, "")}>Back to Overview</Link>
          </Button>
        </Reveal>
      </div>
    </div>
  );
}
