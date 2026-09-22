import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Calculator as CalculatorIcon, ChevronDown, Eye, EyeOff, Flag, Highlighter, MoreHorizontal } from "lucide-react";
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
import { SAT_DOMAINS, blueprintFor } from "@/lib/testprep/blueprints";
import { buildExam, isCorrect, resolve } from "@/lib/testprep/select";
import { readProfile, recordAnswers, saveAttempt } from "@/lib/testprep/store";
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
import type { AnswerRecord, AttemptSummary, SubjectId } from "@/lib/testprep/types";
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

/** Published share of the section each domain carries, by domain id. */
const DOMAIN_WEIGHT = new Map(SAT_DOMAINS.map((d) => [d.id, d.weight]));

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

  /*
   * "review" is the module review page.
   *
   * The real test puts one between the last question and the Submit button:
   * every question in the module, its status, and no way past it except
   * submitting. It is a separate phase rather than a dialog because the clock
   * keeps running on it and the student can go back into any question from it.
   */
  const [phase, setPhase] = useState<"intro" | "module" | "review" | "break">("intro");
  const [moduleIndex, setModuleIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [hideTimer, setHideTimer] = useState(false);
  const [fiveMinutes, setFiveMinutes] = useState(false);
  /** The module whose five-minute warning has already been shown. */
  const warnedFor = useRef(-1);
  const [highlightOn, setHighlightOn] = useState(false);
  const [highlightedStimulus, setHighlightedStimulus] = useState<Record<string, boolean>>({});
  const [eliminatorOn, setEliminatorOn] = useState(false);
  const [eliminated, setEliminated] = useState<Record<string, Set<string>>>({});
  const [exitOpen, setExitOpen] = useState(false);
  const startedAt = useRef(Date.now());
  const submitted = useRef(false);
  /**
   * When the open module runs out, as a wall-clock timestamp.
   *
   * The clock used to be a counter decremented once per `setInterval` tick,
   * which measures ticks rather than time. Browsers throttle timers in
   * background tabs — Chrome to roughly once a minute — so switching tab
   * paused the exam, and a sitting whose entire purpose is "timed, under exam
   * conditions" could be stretched arbitrarily by leaving it. A machine going
   * to sleep did the same thing.
   *
   * So the deadline is fixed when the module opens and every tick just asks
   * how long is left. The interval now only controls how often the number on
   * screen refreshes; it no longer decides how much time the student gets.
   */
  const deadline = useRef<number>(0);

  /**
   * Real time spent per question, accumulated across visits.
   *
   * `submit` used to divide the whole sitting evenly across every question,
   * so each answer was stored with an identical synthetic duration — which
   * made every surface that reads `elapsedMs` for an exam answer wrong in the
   * same way, including Progress's "Recent practice" list and the timing
   * breakdown that groups by domain. Averaging by domain is meaningless when
   * every value is the same number.
   *
   * The exam lets you move freely within a module, so a question can be
   * visited more than once and the time has to add up rather than be
   * overwritten. Time accrues only while a module is open: the intro and the
   * between-module breaks belong to nobody.
   */
  const spent = useRef<Record<string, number>>({});
  const activeQuestion = useRef<string | undefined>(undefined);
  const lastTick = useRef(Date.now());

  /** Bank whatever has elapsed onto the question currently being timed. */
  const commitTime = useCallback(() => {
    const id = activeQuestion.current;
    const now = Date.now();
    if (id) spent.current[id] = (spent.current[id] ?? 0) + (now - lastTick.current);
    lastTick.current = now;
  }, []);

  const module = exam.modules[moduleIndex];
  const questions = useMemo(() => resolve(module?.questionIds ?? []), [module]);

  /** Grade the whole sitting, persist it, and hand over to the results page. */
  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;

    const all = exam.modules.flatMap((m) => resolve(m.questionIds));
    const records: AnswerRecord[] = [];
    const bySkill: AttemptSummary["bySkill"] = {};
    const perSubject: Record<string, { correct: number; total: number; domains: Map<string, { correct: number; total: number; weight: number }> }> = {};
    let correct = 0;
    const now = new Date().toISOString();
    // Close the book on whatever is open before reading the tallies.
    commitTime();
    activeQuestion.current = undefined;

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
      // The published weight of the domain, not 1.
      //
      // `estimateSectionScore` takes a weighted mean of per-domain accuracy,
      // and every other caller hands it the blueprint's weights. Passing 1 for
      // all four made this one estimate an unweighted mean, so a student who
      // answered the two 15%-weight Math domains well and Algebra badly got a
      // section score here that Progress — reading the same answers through
      // the real weights — would not agree with.
      const d = subject.domains.get(q.domainId) ?? {
        correct: 0,
        total: 0,
        weight: DOMAIN_WEIGHT.get(q.domainId) ?? 1,
      };
      d.total += 1;
      if (ok) d.correct += 1;
      subject.domains.set(q.domainId, d);

      // Unanswered questions are still attempts — leaving one blank on a timed
      // module is information about pacing, and dropping it would flatter the
      // student's accuracy everywhere else in the product.
      //
      // Collected rather than written one at a time: see `recordAnswers`.
      records.push({
        questionId: q.id,
        given: answer,
        correct: ok,
        // Zero for a question never opened, which is true and is what the
        // timing breakdown's own floor already knows to discard.
        elapsedMs: spent.current[q.id] ?? 0,
        at: now,
        flagged: flags[q.id],
      });
    }

    recordAnswers(records);

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
  }, [commitTime, exam, flags, given, navigate, testId]);

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

  /*
   * Move the stopwatch when the student moves.
   *
   * Runs on every change of open question, module or phase, banking the
   * elapsed time onto whichever question was open before. Leaving a module
   * stops the clock entirely rather than charging the break to the last
   * question someone happened to be looking at.
   */
  useEffect(() => {
    commitTime();
    activeQuestion.current = phase === "module" ? questions[index]?.id : undefined;
  }, [phase, moduleIndex, index, questions, commitTime]);

  // One second tick, running only while a module is open. It reads the clock
  // rather than counting its own firings — see `deadline`.
  useEffect(() => {
    if (phase !== "module" && phase !== "review") return;
    const sync = () =>
      setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    // Once immediately, so returning to a throttled tab corrects the display
    // on the same frame rather than up to a second later.
    sync();
    const t = window.setInterval(sync, 1000);
    // A tab that was backgrounded may not have ticked for minutes; resync the
    // moment it is looked at again, before the next interval would fire.
    const onVisible = () => { if (!document.hidden) sync(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [phase]);

  useEffect(() => {
    if ((phase === "module" || phase === "review") && remaining === 0) nextModule();
  }, [phase, remaining, nextModule]);

  /*
   * The five-minute warning.
   *
   * The real test interrupts you once, five minutes out, whether or not the
   * clock is on screen — which is the point of it, since the students most
   * likely to lose track of time are the ones who hid the clock. Shown once
   * per module: `warnedFor` remembers which module it fired for, so returning
   * from the review page does not fire it again.
   */
  useEffect(() => {
    if (phase !== "module" && phase !== "review") return;
    if (remaining > 300 || remaining <= 0) return;
    if (warnedFor.current === moduleIndex) return;
    warnedFor.current = moduleIndex;
    setFiveMinutes(true);
  }, [phase, remaining, moduleIndex]);

  /*
   * Don't let a stray refresh throw away a sitting.
   *
   * The exam lives entirely in component state: nothing is written until
   * `submit`, and `buildExam` reshuffles on mount, so a reload does not just
   * lose the answers, it loses the paper they were answers to. A full-length
   * sitting is over two hours. Closing the tab by accident should cost a
   * confirmation dialog, not the afternoon.
   *
   * This covers reload, close and navigation away from the origin. Leaving
   * via the app's own controls is already behind the exit dialog, and once
   * `submit` has run the attempt is saved, so neither needs guarding.
   *
   * Browsers ignore the message string and show their own wording; assigning
   * `returnValue` is still what makes the prompt appear at all.
   */
  useEffect(() => {
    if (phase === "intro") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (submitted.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  const beginModule = () => {
    const seconds = (exam.modules[moduleIndex]?.actualMinutes ?? 1) * 60;
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
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

  // The intro and break screens. The review page is part of the live module —
  // same header, same clock, same footer — so it is not handled here.
  if (phase !== "module" && phase !== "review") {
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
  // "Section 1, Module 2: Reading and Writing" — the way the real test names
  // where you are. The blueprint's own label is written for the exam list,
  // where there is no sitting to be a section of.
  const sectionOrder: SubjectId[] = [];
  for (const m of exam.modules) if (!sectionOrder.includes(m.subjectId)) sectionOrder.push(m.subjectId);
  const moduleTitle = `Section ${sectionOrder.indexOf(module.subjectId) + 1}, Module ${
    exam.modules.filter((m) => m.subjectId === module.subjectId).findIndex((m) => m.id === module.id) + 1
  }: ${module.subjectId === "rw" ? "Reading and Writing" : "Math"}`;
  const eliminatedForQuestion = question ? eliminated[question.id] ?? EMPTY_SET : EMPTY_SET;

  return (
    <>
      <Seo title={`${exam.label}`} description="Practice exam." path={`/test-prep/${testId}/exam`} noindex />
      <div className="bluebook flex min-h-screen flex-col bg-background">
        {/* Exam chrome: a blue rule, a light top bar carrying the title, clock
            and tools, then the yellow banner naming the sitting. Blue, white,
            yellow down the screen — the digital-testing look, built from
            Pathforge's own tokens rather than any borrowed asset. */}
        <header className={cn(BB_TOPBAR, "border-t-[5px] border-t-[hsl(var(--bb-blue))]")}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{moduleTitle}</p>
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
                <PopoverContent align="start" className="bluebook max-w-xs text-sm leading-relaxed text-foreground">
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
                /*
                  The five-minute warning used to be `text-warning`, which
                  inside `.bluebook` is School bus Yellow — about 1.5:1 on the
                  white top bar, so the one moment the clock most needed
                  reading was the one moment it could not be. Urgency is
                  carried by the blue and then by weight and a yellow field
                  instead, all of which survive on white.
                */
                hideTimer
                  ? "text-muted-foreground"
                  : remaining <= 60
                    ? "rounded-md bg-[hsl(var(--bb-rule))] px-2 text-[hsl(var(--bb-flag-foreground))]"
                    : remaining <= 300
                      ? "text-[hsl(var(--bb-blue))]"
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
                <DropdownMenuContent align="end" className="bluebook">
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

        {phase === "review" ? (
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
            <h1 className="text-center font-display text-2xl font-bold tracking-[-0.01em] text-foreground">
              Check Your Work
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-relaxed text-muted-foreground">
              On test day, you cannot move back to this module once you submit it. Go to a
              question by selecting its number.
            </p>

            <div className="mt-7 rounded-xl border border-border/70 bg-card p-5">
              <p className="text-center text-sm font-bold text-foreground">{moduleTitle}</p>
              <NavigatorLegend className="mt-4 justify-center" />
              <div className="mt-4 flex flex-wrap justify-center gap-2 border-t border-border/60 pt-4">
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setIndex(i);
                      setPhase("module");
                    }}
                    aria-label={`Question ${i + 1}${given[q.id] ? ", answered" : ", not answered"}${
                      flags[q.id] ? ", marked for review" : ""
                    }`}
                    className={cn(BB_NAV_CIRCLE, FOCUS, given[q.id] && BB_NAV_CIRCLE_ANSWERED)}
                  >
                    {i + 1}
                    {flags[q.id] && (
                      <span className={BB_NAV_FLAG} aria-hidden="true">
                        <Flag className="h-2 w-2 fill-current" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </main>
        ) : (
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
        )}

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
              Question {index + 1} of {questions.length}
              <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2">
              {phase === "review" ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setPhase("module")}>
                    Back
                  </Button>
                  <SubmitModule
                    last={moduleIndex + 1 >= exam.modules.length}
                    unanswered={questions.length - answeredInModule}
                    onConfirm={nextModule}
                  />
                </>
              ) : (
                <>
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
                    <Button size="sm" onClick={() => setPhase("review")}>
                      Review
                    </Button>
                  )}
                </>
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
                <div className="mx-auto max-w-3xl px-4 py-3">
                  <NavigatorLegend className="pb-3" />
                  <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
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
                  <button
                    type="button"
                    onClick={() => {
                      setShowNavigator(false);
                      setPhase("review");
                    }}
                    className={cn(
                      "mt-3 w-full rounded-full border border-[hsl(var(--bb-blue))] px-4 py-2 text-xs font-bold text-[hsl(var(--bb-blue))] transition-colors hover:bg-[hsl(var(--bb-blue-soft))]",
                      FOCUS,
                    )}
                  >
                    Go to Review Page
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </footer>

        <AlertDialog open={fiveMinutes} onOpenChange={setFiveMinutes}>
          <AlertDialogContent className="bluebook">
            <AlertDialogHeader>
              <AlertDialogTitle>5 minutes remaining</AlertDialogTitle>
              <AlertDialogDescription>
                {answeredInModule === questions.length
                  ? "Every question in this module is answered. The module submits itself when the clock runs out."
                  : `${questions.length - answeredInModule} question${
                      questions.length - answeredInModule === 1 ? " is" : "s are"
                    } still blank. The module submits itself when the clock runs out, and blank counts as incorrect.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setFiveMinutes(false)}>
                Keep working
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
          <AlertDialogContent className="bluebook">
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
 * The key to the question grid.
 *
 * The grid carries three states — where you are, what you have answered, what
 * you marked — in colour and a flag alone, which is not enough on its own:
 * colour is not information a colourblind student can read, and the flag is
 *4px across. Named here once, under both the popup grid and the review page.
 */
function NavigatorLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground", className)}>
      <li className="flex items-center gap-1.5">
        <span className={cn("h-3.5 w-3.5 rounded-full border", BB_NAV_CIRCLE_CURRENT)} aria-hidden="true" />
        Current
      </li>
      <li className="flex items-center gap-1.5">
        <span className={cn("h-3.5 w-3.5 rounded-full border", BB_NAV_CIRCLE_ANSWERED)} aria-hidden="true" />
        Answered
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-full border border-border/70" aria-hidden="true" />
        Unanswered
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[hsl(var(--bb-flag))] text-[hsl(var(--bb-flag-foreground))]"
          aria-hidden="true"
        >
          <Flag className="h-2 w-2 fill-current" />
        </span>
        Marked for review
      </li>
    </ul>
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
      <AlertDialogContent className="bluebook">
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
      <AlertDialogContent className="bluebook">
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
