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
import { sectionHref, sessionHref } from "@/lib/testprep/nav";
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
  useEffect(() => {
    if (finished) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
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

  return (
    <>
      <Seo
        title={`${blueprint.name} ${label}`}
        description="Practice session."
        path={`/test-prep/${blueprint.id}/session`}
        noindex
      />
      <div className="bluebook section-container py-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          {/* Session bar.

              Still one row, but now the section's own chrome rather than three
              grey labels on white: the blue field, the yellow rule closing it,
              and the progress bar underneath. A practice run and a timed module
              are the same product, and until this bar existed only one of them
              looked like it.

              The low-time colour is the yellow, not `--destructive` — inside
              `.bluebook` that token is black, which on a blue bar is not a
              warning, it is a hole. */}
          <div
            className={cn(
              BB_TOOLBAR,
              "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-xl px-4 py-2.5",
            )}
          >
            <Link
              to={sectionHref(blueprint.id, "practice")}
              className={cn(BB_TOOLBAR_BUTTON, FOCUS)}
            >
              <span aria-hidden="true">← </span>Exit practice
            </Link>

            <p className={cn("min-w-0 truncate text-sm font-bold", BB_TOOLBAR_FG)}>{label}</p>

            <div className="flex items-center gap-3">
              {remaining !== null && (
                <span
                  className={cn(
                    BB_TIMER,
                    "font-display text-sm font-bold tabular-nums transition-colors",
                    remaining <= 60 ? "text-[hsl(var(--bb-rule))]" : BB_TOOLBAR_FG,
                  )}
                >
                  {formatClock(remaining)}
                </span>
              )}
              <span className={cn("text-xs tabular-nums", BB_TOOLBAR_MUTED)}>
                {index + 1} of {questions.length}
              </span>
            </div>
          </div>
          <Bar value={(index + 1) / questions.length} className="rounded-none" />

          <div className={cn("mt-6 p-4 sm:p-6", SURFACE)}>
            <AnimatePresence mode="wait" initial={false}>
              <QuestionView
                key={question.id}
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
            </AnimatePresence>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={() => go(index - 1)} disabled={index === 0}>
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {answeredCount > 0 && index === questions.length - 1 && !isChecked && (
                <Button size="sm" variant="outline" onClick={finish}>
                  Finish now
                </Button>
              )}
              {!isChecked ? (
                <Button size="sm" onClick={check} disabled={!hasAnswer}>
                  Check answer
                </Button>
              ) : index < questions.length - 1 ? (
                <Button size="sm" onClick={() => go(index + 1)}>
                  Next question
                </Button>
              ) : (
                <Button size="sm" onClick={finish}>
                  Finish
                </Button>
              )}
            </div>
          </div>

          {/* Question navigator. Answered, flagged and current are three
              distinguishable states, so a student can jump back to the one they
              were unsure about without remembering its number. */}
          <div className="mt-8 border-t border-border/60 pt-4">
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, i) => (
                <motion.button
                  key={q.id}
                  type="button"
                  onClick={() => go(i)}
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  transition={{ duration: 0.12 }}
                  aria-label={`Question ${i + 1}${checked[q.id] ? ", answered" : ""}${
                    flags[q.id] ? ", marked for review" : ""
                  }`}
                  aria-current={i === index ? "true" : undefined}
                  className={cn(
                    BB_NAV_CIRCLE,
                    FOCUS,
                    i === index
                      ? BB_NAV_CIRCLE_CURRENT
                      : checked[q.id]
                        ? BB_NAV_CIRCLE_ANSWERED
                        : undefined,
                  )}
                >
                  {i + 1}
                  {flags[q.id] && (
                    <span className={BB_NAV_FLAG} aria-hidden="true">
                      <Flag className="h-2 w-2 fill-current" />
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {answeredCount} of {questions.length} answered. Arrow keys move between questions.
            </p>
          </div>
        </div>
      </div>
    </>
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
  const accuracy = attempt.totalQuestions
    ? Math.round((attempt.correct / attempt.totalQuestions) * 100)
    : 0;

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
    );
  }

  return (
    <div className="section-container py-10 sm:py-14">
      <div className="mx-auto max-w-2xl space-y-6">
        <Reveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {attempt.label}
          </p>
          <p className="mt-2.5 font-display text-[44px] font-bold leading-none tabular-nums tracking-tight text-foreground">
            {attempt.correct}
            <span className="text-muted-foreground"> / {attempt.totalQuestions}</span>
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <StatGrid columns={3}>
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat
              label="Per question"
              value={formatDuration(attempt.elapsedMs / attempt.totalQuestions)}
            />
            <Stat label="Total time" value={formatDuration(attempt.elapsedMs)} />
          </StatGrid>
        </Reveal>

        {missed.length > 0 && (
          <Reveal delay={0.12}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Top areas to improve
            </p>
            <Stagger as="ul" className={cn("mt-3 overflow-hidden", SURFACE)} count={Math.min(4, missed.length)} step={0.03}>
              {missed.slice(0, 4).map((s) => (
                <StaggerItem
                  key={s.skillId}
                  as="li"
                  y={4}
                  className={cn(
                    "flex items-center justify-between gap-4 border-b border-border/60 px-4 py-2.5 last:border-b-0 sm:px-5",
                    ROW_HOVER,
                  )}
                >
                  <span className="min-w-0 truncate text-sm text-foreground">
                    {skillName(s.skillId)}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {s.wrong} of {s.total} incorrect
                  </span>
                </StaggerItem>
              ))}
            </Stagger>
          </Reveal>
        )}

        <Reveal delay={0.18} className="flex flex-wrap items-center gap-2">
          {missed.length > 0 && (
            <Button asChild size="sm">
              <Link to={sessionHref(testId, { kind: "topic", skill: missed[0].skillId, count: 10 })}>
                Practice these areas
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link to={again}>Another set</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={sectionHref(testId, "")}>Back to Overview</Link>
          </Button>
        </Reveal>
      </div>
    </div>
  );
}
