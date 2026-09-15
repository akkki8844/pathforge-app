import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Calculator as CalculatorIcon, ChevronDown, Eye, EyeOff, Flag, Grid2x2, Highlighter, MoreHorizontal } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { blueprintFor } from "@/lib/testprep/blueprints";
import { buildExam, isCorrect, resolve } from "@/lib/testprep/select";
import { readProfile, recordAnswer, saveAttempt } from "@/lib/testprep/store";
import { estimateSectionScore, formatClock } from "@/lib/testprep/stats";
import { resultsHref, sectionHref } from "@/lib/testprep/nav";
import {
  BB_BANNER,
  BB_NAV_CIRCLE,
  BB_NAV_CIRCLE_ANSWERED,
  BB_NAV_CIRCLE_CURRENT,
  BB_NAV_FLAG,
  BB_TOPBAR,
  BB_TOPBAR_BUTTON,
  BB_TOPBAR_BUTTON_ACTIVE,
  FOCUS,
  SURFACE,
} from "@/lib/testprep/ui";
import { ExamQuestionCard } from "@/components/testprep/QuestionView";
import { Bar } from "@/components/testprep/primitives";
import { Calculator } from "@/components/testprep/Calculator";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";
import type { AttemptSummary, SubjectId } from "@/lib/testprep/types";
import type { DomainStats } from "@/lib/testprep/stats";

/**
 * The exam interface.
 *
 * Rendered outside the app `Layout`, so there is no global navbar, no
 * notification bell and nowhere to wander off to — which is the difference
 * between a practice screen and a testing environment. The only ways out are
 * finishing and an explicit, confirmed exit.
 *
 * No answer is marked until the whole sitting is submitted. Feedback mid-module
 * would make the timing meaningless, and it is not what the real test does.
 */
const EMPTY_SET: ReadonlySet<string> = new Set();

export default function TestPrepExam() {
  const { testId = "sat" } = useParams();
  const blueprint = blueprintFor(testId);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const sections = useMemo<SubjectId[]>(() => {
    const raw = (params.get("sections") ?? "rw,math").split(",");
    const valid = raw.filter((s): s is SubjectId => s === "rw" || s === "math");
    return valid.length ? valid : ["rw", "math"];
  }, [params]);

  // Built once. Rebuilding on any re-render would reshuffle the paper.
  const [exam] = useState(() =>
    buildExam(
      readProfile(),
      sections,
      sections.length === 2 ? "SAT practice exam" : `${sections[0] === "math" ? "Math" : "Reading & Writing"} section test`,
    ),
  );

  const [phase, setPhase] = useState<"intro" | "module" | "break">("intro");
  const [moduleIndex, setModuleIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [hideTimer, setHideTimer] = useState(false);
  const [highlightOn, setHighlightOn] = useState(false);
  const [highlightedStimulus, setHighlightedStimulus] = useState<Record<string, boolean>>({});
  const [eliminatorOn, setEliminatorOn] = useState(false);
  const [eliminated, setEliminated] = useState<Record<string, Set<string>>>({});
  const [exitOpen, setExitOpen] = useState(false);
  const startedAt = useRef(Date.now());
  const submitted = useRef(false);

  const module = exam.modules[moduleIndex];
  const questions = useMemo(() => resolve(module?.questionIds ?? []), [module]);

  /** Grade the whole sitting, persist it, and hand over to the results page. */
  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;

    const all = exam.modules.flatMap((m) => resolve(m.questionIds));
    const bySkill: AttemptSummary["bySkill"] = {};
    const perSubject: Record<string, { correct: number; total: number; domains: Map<string, { correct: number; total: number; weight: number }> }> = {};
    let correct = 0;
    const now = new Date().toISOString();
    const perQuestionMs = Math.round((Date.now() - startedAt.current) / Math.max(1, all.length));

    for (const q of all) {
      const answer = given[q.id] ?? "";
      const ok = answer !== "" && isCorrect(q, answer);
      if (ok) correct += 1;

      const skill = (bySkill[q.skillId] ??= { correct: 0, total: 0 });
      skill.total += 1;
      if (ok) skill.correct += 1;

      const subject = (perSubject[q.subjectId] ??= { correct: 0, total: 0, domains: new Map() });
      subject.total += 1;
      if (ok) subject.correct += 1;
      const d = subject.domains.get(q.domainId) ?? { correct: 0, total: 0, weight: 1 };
      d.total += 1;
      if (ok) d.correct += 1;
      subject.domains.set(q.domainId, d);

      // Unanswered questions are still attempts — leaving one blank on a timed
      // module is information about pacing, and dropping it would flatter the
      // student's accuracy everywhere else in the product.
      recordAnswer({
        questionId: q.id,
        given: answer,
        correct: ok,
        elapsedMs: perQuestionMs,
        at: now,
        flagged: flags[q.id],
      });
    }

    const sectionScores: Partial<Record<SubjectId, number>> = {};
    for (const [subjectId, s] of Object.entries(perSubject)) {
      const domains = [...s.domains.entries()].map(([domainId, d]) => ({
        domainId,
        name: domainId,
        subjectId: subjectId as SubjectId,
        weight: d.weight,
        attempts: d.total,
        correct: d.correct,
        mastery: null,
        completed: d.total,
        available: d.total,
        skills: [],
      })) as DomainStats[];
      const score = estimateSectionScore(domains, s.total);
      if (score !== null) sectionScores[subjectId as SubjectId] = score;
    }

    const scored = Object.values(sectionScores);
    const attempt: AttemptSummary = {
      id: `exam-${Date.now().toString(36)}`,
      testId: "sat",
      kind: "exam",
      label: exam.label,
      finishedAt: now,
      totalQuestions: all.length,
      correct,
      elapsedMs: Date.now() - startedAt.current,
      // A composite is only meaningful when both sections were sat. A section
      // test reports its section score and no total.
      score: scored.length === 2 ? scored.reduce((a, b) => a + b, 0) : undefined,
      sectionScores,
      bySkill,
    };

    saveAttempt(attempt);
    navigate(resultsHref(testId, attempt.id), { replace: true });
  }, [exam, flags, given, navigate, testId]);

  const nextModule = useCallback(() => {
    if (moduleIndex + 1 >= exam.modules.length) {
      submit();
      return;
    }
    setModuleIndex((m) => m + 1);
    setIndex(0);
    setShowNavigator(false);
    setPhase("break");
  }, [exam.modules.length, moduleIndex, submit]);

  // One second tick, running only while a module is open.
  useEffect(() => {
    if (phase !== "module") return;
    const t = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "module" && remaining === 0) nextModule();
  }, [phase, remaining, nextModule]);

  const beginModule = () => {
    setRemaining((exam.modules[moduleIndex]?.actualMinutes ?? 1) * 60);
    setPhase("module");
    if (moduleIndex === 0) startedAt.current = Date.now();
  };

  if (!blueprint) return <TestNotAvailable name="Test Prep" subtitle="Unknown test" />;
  if (!blueprint.available)
    return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

  if (!exam.totalQuestions) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm font-medium text-foreground">This exam has no questions.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to={sectionHref(testId, "exams")}>Back to Practice Exams</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Between-module screens                                            */
  /* ---------------------------------------------------------------- */

  if (phase !== "module") {
    const upcoming = exam.modules[moduleIndex];
    const answeredSoFar = Object.keys(given).length;
    return (
      <>
        <Seo title={`${exam.label}`} description="Practice exam." path={`/test-prep/${testId}/exam`} noindex />
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
            className={cn("w-full max-w-md p-7 text-center sm:p-8", SURFACE)}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {exam.label}
            </p>
            <p className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
              {upcoming.label}
            </p>
            <p className="mt-2 text-sm tabular-nums text-muted-foreground">
              {upcoming.questionIds.length} questions · {upcoming.actualMinutes} minutes
              {upcoming.calculator && " · calculator available"}
            </p>
            <p className="mt-4 text-xs tabular-nums text-muted-foreground">
              Module {moduleIndex + 1} of {exam.modules.length}
            </p>
            {phase === "intro" ? (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The clock starts when you begin and does not pause. Answers are marked only after
                the final module.
              </p>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Module {moduleIndex} submitted. {answeredSoFar} question
                {answeredSoFar === 1 ? "" : "s"} answered so far. You cannot go back to it.
              </p>
            )}
            <Button className="mt-6 w-full" onClick={beginModule}>
              {phase === "intro" ? "Begin" : "Start next module"}
            </Button>
            <ExitExam testId={testId} className="mt-3" />
          </motion.div>
        </div>
      </>
    );
  }

  /* ---------------------------------------------------------------- */
  /* A live module                                                     */
  /* ---------------------------------------------------------------- */

  const question = questions[index];
  const answeredInModule = questions.filter((q) => given[q.id]).length;
  const eliminatedForQuestion = question ? eliminated[question.id] ?? EMPTY_SET : EMPTY_SET;

  return (
    <>
      <Seo title={`${exam.label}`} description="Practice exam." path={`/test-prep/${testId}/exam`} noindex />
      <div className="bluebook flex min-h-screen flex-col bg-background">
        {/* Exam chrome: a light top bar (title, clock, tools) over a navy
            banner naming the sitting — the digital-testing look, but built
            from Pathforge's own tokens rather than any borrowed asset. */}
        <header className={BB_TOPBAR}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{module.label}</p>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                      FOCUS,
                    )}
                  >
                    Directions
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="max-w-xs text-sm leading-relaxed text-foreground">
                  <p className="font-semibold">Directions</p>
                  <p className="mt-1.5 text-muted-foreground">
                    Read each question carefully and choose the best answer. Mark a question for
                    review to come back to it before submitting the module — you can move freely
                    between questions in this module, but not into a module you've already
                    submitted.
                  </p>
                </PopoverContent>
              </Popover>
            </div>

            <p
              className={cn(
                "shrink-0 font-display text-2xl font-bold tabular-nums transition-colors",
                hideTimer
                  ? "text-muted-foreground/50"
                  : remaining <= 60
                    ? "text-destructive"
                    : remaining <= 300
                      ? "text-warning"
                      : "text-foreground",
              )}
              aria-live="off"
            >
              {hideTimer ? "—:—" : formatClock(remaining)}
            </p>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setHideTimer((h) => !h)}
                aria-pressed={hideTimer}
                className={cn(BB_TOPBAR_BUTTON, hideTimer && BB_TOPBAR_BUTTON_ACTIVE)}
              >
                {hideTimer ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {hideTimer ? "Show" : "Hide"}
              </button>
              <button
                type="button"
                onClick={() => setHighlightOn((h) => !h)}
                aria-pressed={highlightOn}
                title="Turn on, then click the passage to highlight it"
                className={cn(BB_TOPBAR_BUTTON, highlightOn && BB_TOPBAR_BUTTON_ACTIVE)}
              >
                <Highlighter className="h-3.5 w-3.5" />
                Highlight
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={BB_TOPBAR_BUTTON}>
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    More
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {module.calculator && (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setShowCalculator((c) => !c);
                      }}
                    >
                      <CalculatorIcon className="mr-2 h-3.5 w-3.5" />
                      {showCalculator ? "Hide calculator" : "Calculator"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setExitOpen(true);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    Exit exam
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className={BB_BANNER}>This is a practice module</div>
          {/* Where you are in the module. The only progress indicator in the
              exam: a percentage of the whole sitting would be noise while a
              clock is already running on this module alone. */}
          <Bar
            value={(index + 1) / Math.max(1, questions.length)}
            className="h-[3px] rounded-none bg-transparent"
          />
        </header>

        <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-0 px-4 py-6 sm:py-8 md:grid-cols-[1fr_1px_1fr] md:gap-6">
          {question?.stimulus ? (
            <>
              <div
                onClick={() => highlightOn && setHighlightedStimulus((s) => ({ ...s, [question.id]: !s[question.id] }))}
                className={cn(
                  "whitespace-pre-line rounded-lg p-1 text-sm leading-relaxed text-foreground transition-colors",
                  highlightOn && "cursor-pointer hover:bg-muted/40",
                  highlightedStimulus[question.id] && "bg-[hsl(var(--bb-flag)/0.22)]",
                )}
              >
                {question.stimulus}
              </div>
              <div className="hidden bg-border md:block" aria-hidden="true" />
            </>
          ) : (
            <div className="hidden md:block" />
          )}

          <div className={cn(!question?.stimulus && "md:col-span-3 md:mx-auto md:w-full md:max-w-xl")}>
            <AnimatePresence mode="wait">
              {question && (
                <ExamQuestionCard
                  key={question.id}
                  question={question}
                  number={index + 1}
                  value={given[question.id] ?? ""}
                  onChange={(v) => setGiven((g) => ({ ...g, [question.id]: v }))}
                  flagged={!!flags[question.id]}
                  onToggleFlag={() => setFlags((f) => ({ ...f, [question.id]: !f[question.id] }))}
                  eliminatorOn={eliminatorOn}
                  onToggleEliminator={() => setEliminatorOn((e) => !e)}
                  eliminated={eliminatedForQuestion}
                  onToggleEliminate={(choiceId) =>
                    setEliminated((prev) => {
                      const set = new Set(prev[question.id] ?? []);
                      if (set.has(choiceId)) set.delete(choiceId);
                      else set.add(choiceId);
                      return { ...prev, [question.id]: set };
                    })
                  }
                />
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* The calculator floats above the footer rather than inside the flow,
            so opening it never reflows the question the student is reading. */}
        <AnimatePresence>
          {showCalculator && module.calculator && (
            <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-end p-4 sm:p-6">
              <div className="pointer-events-auto mb-16">
                <Calculator onClose={() => setShowCalculator(false)} />
              </div>
            </div>
          )}
        </AnimatePresence>

        <footer className={cn(BB_TOPBAR, "sticky bottom-0 border-t backdrop-blur")}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <p className="hidden text-xs text-muted-foreground sm:block">{answeredInModule} answered</p>

            <button
              type="button"
              onClick={() => setShowNavigator((s) => !s)}
              aria-expanded={showNavigator}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted",
                FOCUS,
              )}
            >
              <Grid2x2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              Question {index + 1} of {questions.length}
              <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                Back
              </Button>
              {index < questions.length - 1 ? (
                <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
                  Next
                </Button>
              ) : (
                <SubmitModule
                  last={moduleIndex + 1 >= exam.modules.length}
                  unanswered={questions.length - answeredInModule}
                  onConfirm={nextModule}
                />
              )}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {showNavigator && (
              <motion.div
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduced ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
                className="overflow-hidden border-t border-border"
              >
                <div className="mx-auto flex max-w-3xl flex-wrap gap-1.5 px-4 py-3">
                  {questions.map((q, i) => (
                    <motion.button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setIndex(i);
                        setShowNavigator(false);
                      }}
                      whileHover={{ y: -1 }}
                      whileTap={{ y: 0 }}
                      transition={{ duration: 0.12 }}
                      aria-label={`Question ${i + 1}${given[q.id] ? ", answered" : ", not answered"}${
                        flags[q.id] ? ", marked for review" : ""
                      }`}
                      aria-current={i === index ? "true" : undefined}
                      className={cn(
                        BB_NAV_CIRCLE,
                        FOCUS,
                        i === index
                          ? BB_NAV_CIRCLE_CURRENT
                          : given[q.id]
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
              </motion.div>
            )}
          </AnimatePresence>
        </footer>

        <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave the exam?</AlertDialogTitle>
              <AlertDialogDescription>
                Nothing is saved. The sitting is discarded, no score is recorded, and the
                questions you have answered will not count toward your progress.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => navigate(sectionHref(testId, "exams"))}
              >
                Leave and discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

/**
 * Submitting a module.
 *
 * Confirmed, because it cannot be undone — the real test does not let you back
 * into a module either, and an accidental click on the last question of a
 * timed section is an expensive mistake. The dialog leads with the number of
 * questions still blank, which is the only fact that would change the decision.
 */
function SubmitModule({
  last,
  unanswered,
  onConfirm,
}: {
  last: boolean;
  unanswered: number;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm">{last ? "Submit exam" : "Submit module"}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{last ? "Submit the exam?" : "Submit this module?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {unanswered > 0
              ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} still blank, and blank counts as incorrect. `
              : "Every question in this module is answered. "}
            {last
              ? "Once submitted the sitting is marked and you will see your results."
              : "You cannot return to this module afterwards."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep working</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {last ? "Submit exam" : "Submit module"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Leaving mid-exam.
 *
 * Confirmed, and honest about the consequence: nothing is saved, because a
 * half-finished timed sitting is not a score and recording it as one would
 * corrupt the history the Progress page is built from.
 */
function ExitExam({
  testId,
  compact,
  className,
}: {
  testId: string;
  compact?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {compact ? (
          <button type="button" className={cn(BB_TOPBAR_BUTTON, FOCUS)}>
            Exit
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              "rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
              FOCUS,
              className,
            )}
          >
            Exit exam
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave the exam?</AlertDialogTitle>
          <AlertDialogDescription>
            Nothing is saved. The sitting is discarded, no score is recorded, and the questions
            you have answered will not count toward your progress.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => navigate(sectionHref(testId, "exams"))}
          >
            Leave and discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
