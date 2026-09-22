import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SAT, blueprintFor, skillName } from "@/lib/testprep/blueprints";
import { examCapacity } from "@/lib/testprep/select";
import { examHref, resultsHref, sectionHref, sessionHref } from "@/lib/testprep/nav";
import { useTestPrep } from "@/lib/testprep/store";
import { formatDuration } from "@/lib/testprep/stats";
import {
  BB_SCORE_CARD_CTA,
  BB_SCORE_CARD_HEADER,
  BB_SCORE_CARD_SECONDARY,
  BB_SCORE_CARD_SUBBAR,
  EYEBROW,
  FOCUS,
  ROW_HOVER,
  SURFACE,
} from "@/lib/testprep/ui";
import { PageHeader, Panel, TestPrepShell } from "@/components/testprep/TestPrepShell";
import { ActionRow } from "@/components/testprep/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/testprep/motion";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";
import type { AttemptSummary, SubjectId } from "@/lib/testprep/types";

/**
 * Where a sitting starts, and where past ones are listed.
 *
 * The honesty problem this page has to solve: the bank does not yet hold enough
 * questions to fill all four modules of a real digital SAT. Rather than calling
 * a 40-question run a "full-length SAT", the card states the real count and the
 * scaled timing, and the phrase "full-length" only appears once the bank can
 * actually fill every module. `buildExam` computes that; this page just reads it.
 */
export default function TestPrepExams() {
  const { testId = "sat" } = useParams();
  const blueprint = blueprintFor(testId);
  const profile = useTestPrep();
  const [customOpen, setCustomOpen] = useState(false);

  const full = useMemo(() => examCapacity(["rw", "math"]), []);
  const perSubject = useMemo(
    () =>
      SAT.subjects.map((s) => ({
        subject: s,
        ...examCapacity([s.id]),
        minutes: SAT.modules
          .filter((m) => m.subjectId === s.id)
          .reduce((n, m) => n + m.minutes, 0),
      })),
    [],
  );

  const examAttempts = profile.attempts.filter((a) => a.kind === "exam");

  if (!blueprint) return <TestNotAvailable name="Test Prep" subtitle="Unknown test" />;
  if (!blueprint.available)
    return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

  const fullMinutes = SAT.modules.reduce(
    (n, m) => n + Math.round(m.minutes * Math.min(1, full.available / full.target)),
    0,
  );
  const isFullLength = full.available >= full.target;

  return (
    <TestPrepShell
      testId={blueprint.id}
      testName={blueprint.name}
      testSubtitle={blueprint.subtitle}
      title="Practice Exams"
      path={`/test-prep/${blueprint.id}/exams`}
    >
      <div className="space-y-6">
        <PageHeader title="Practice Exams" purpose="Timed sittings under exam conditions." />

        {/*
          * The practice tests, as cards.
          *
          * This page used to open with a block of prose and a Start button, and
          * kept the score card for sittings already taken — so a student who had
          * not sat one yet never saw the card at all. College Board's own app
          * lists the practice tests as cards and fills each one's score in when
          * you finish it. So does this: the next sitting is the first card, with
          * its score fields empty, and every completed sitting is a card behind
          * it, newest first.
          */}
        <Stagger
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
          count={examAttempts.length + 1}
          step={0.03}
        >
          <StaggerItem y={4}>
            <ScoreCard
              testName={blueprint.name}
              label={`Practice ${examAttempts.length + 1}`}
              meta="Not taken yet"
              total={null}
              totalRange={blueprint.scoreRange}
              sections={SECTIONS.map((s) => ({ ...s, value: null }))}
              footnote={
                isFullLength
                  ? `${full.target} questions · ${SAT.modules.reduce((n, m) => n + m.minutes, 0)} minutes`
                  : `${full.available} questions · about ${fullMinutes} minutes`
              }
              actions={
                <>
                  <Link to={examHref(blueprint.id, ["rw", "math"])} className={BB_SCORE_CARD_CTA}>
                    Start practice test
                  </Link>
                  <button
                    type="button"
                    onClick={() => setCustomOpen(true)}
                    className={cn(BB_SCORE_CARD_SECONDARY, FOCUS)}
                  >
                    Build a custom exam
                  </button>
                </>
              }
            />
          </StaggerItem>

          {examAttempts.map((a, i) => {
            const previous = examAttempts[i + 1];
            const delta =
              a.score !== undefined && previous?.score !== undefined
                ? a.score - previous.score
                : null;
            // The list is newest first, so the oldest sitting is Practice 1 and
            // the number counts up with the sittings rather than down the page.
            const number = examAttempts.length - i;
            const bothSections =
              a.sectionScores !== undefined && Object.keys(a.sectionScores).length === 2;
            return (
              <StaggerItem key={a.id} y={4}>
                <ScoreCard
                  testName={blueprint.name}
                  label={bothSections ? `Practice ${number}` : a.label}
                  meta={examDate(a.finishedAt)}
                  onDownload={() => downloadScoreReport(blueprint.name, a, number)}
                  downloadLabel={`Download the score report for ${a.label}`}
                  total={a.score ?? null}
                  totalRange={blueprint.scoreRange}
                  delta={delta}
                  sections={SECTIONS.map((s) => ({
                    ...s,
                    value: a.sectionScores?.[s.id] ?? null,
                  }))}
                  footnote={`${a.correct}/${a.totalQuestions} correct · ${formatDuration(a.elapsedMs)}`}
                  actions={
                    <>
                      <Link to={resultsHref(blueprint.id, a.id)} className={BB_SCORE_CARD_CTA}>
                        Score Details
                      </Link>
                      <Link
                        to={sessionHref(blueprint.id, { kind: "weak", count: 15 })}
                        className={BB_SCORE_CARD_SECONDARY}
                      >
                        Practice weak areas
                      </Link>
                      <Link
                        to={sectionHref(blueprint.id, "question-bank")}
                        className="flex items-center justify-center gap-1.5 pt-1 text-sm font-medium text-[hsl(var(--bb-blue))] underline underline-offset-4 transition-colors hover:text-[hsl(var(--bb-blue)/0.8)]"
                      >
                        Practice specific questions
                      </Link>
                    </>
                  }
                />
              </StaggerItem>
            );
          })}
        </Stagger>

        <Reveal delay={0.08}>
          <Panel
            title="Section tests"
            description="One section, in its own two modules."
            bodyClassName="p-0"
          >
            <Stagger count={perSubject.length} step={0.04}>
              {perSubject.map((s) => (
                <StaggerItem
                  key={s.subject.id}
                  y={4}
                  className={cn("border-b border-border/60 last:border-b-0", ROW_HOVER)}
                >
                  <ActionRow
                    title={s.subject.name}
                    body={
                      <span className="tabular-nums">
                        {Math.min(s.available, s.target)} questions
                        {s.available < s.target && ` of ${s.target}`} · about{" "}
                        {Math.max(1, Math.round(s.minutes * Math.min(1, s.available / s.target)))}{" "}
                        minutes
                      </span>
                    }
                    action={
                      <Button asChild size="sm" variant="outline">
                        <Link to={examHref(blueprint.id, [s.subject.id])}>Start</Link>
                      </Button>
                    }
                  />
                </StaggerItem>
              ))}
            </Stagger>
          </Panel>
        </Reveal>

        {/* What a sitting is, and what this one honestly is. It used to be the
            top of the page; it is reference now, under the cards you act on. */}
        <Reveal delay={0.12} as="section" className={cn("p-5 sm:p-6", SURFACE)}>
          <p className={EYEBROW}>{isFullLength ? "Full-length SAT" : "Digital SAT simulation"}</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.01em] text-foreground">
            Four modules, both sections, one clock
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Reading &amp; Writing then Math, in two modules each, in the exam interface — move
            freely within a module, but once a module is submitted it closes for good. No
            explanations until the end, a running timer per module, and an on-screen calculator
            where the real test allows one.
          </p>
          {!isFullLength && (
            <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              A real sitting is {full.target} questions. The bank holds {full.available} for these
              sections today, so each module runs short with its clock scaled to keep the same time
              per question. It is not a full-length test and is not presented as one.
            </p>
          )}
        </Reveal>
      </div>

      <CustomExamDialog testId={blueprint.id} open={customOpen} onOpenChange={setCustomOpen} />
    </TestPrepShell>
  );
}

/**
 * The custom exam builder.
 *
 * It produces a timed practice run rather than a modular sitting, and says so:
 * a "custom exam" that quietly used the real module structure with the wrong
 * number of questions would be a worse simulation than an honest timed set.
 */
function CustomExamDialog({
  testId,
  open,
  onOpenChange,
}: {
  testId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<SubjectId | "all">("all");
  const [count, setCount] = useState("20");
  const [minutes, setMinutes] = useState("25");

  const seconds = Math.round((Number(minutes) * 60) / Number(count));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bluebook sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Custom exam</DialogTitle>
          <DialogDescription>
            A timed run under exam conditions — no explanations until you finish.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Subject</span>
            <Select value={subject} onValueChange={(v) => setSubject(v as SubjectId | "all")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bluebook">
                <SelectItem value="all">Both sections</SelectItem>
                {SAT.subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Questions
            </span>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bluebook">
                {["10", "20", "27", "30", "40"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Time limit
            </span>
            <Select value={minutes} onValueChange={setMinutes}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bluebook">
                {["15", "20", "25", "32", "35", "45"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <p className="text-xs tabular-nums text-muted-foreground">
            That is about {seconds} seconds per question. The digital SAT allows roughly 71 in
            Reading &amp; Writing and 95 in Math.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              navigate(
                sessionHref(testId, {
                  kind: "timed",
                  subject: subject === "all" ? undefined : subject,
                  count: Number(count),
                  minutes: Number(minutes),
                }),
              )
            }
          >
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The two sections every card reports, in the order the score report has them. */
const SECTIONS: { id: SubjectId; name: string }[] = [
  { id: "rw", name: "Reading and Writing" },
  { id: "math", name: "Math" },
];

/**
 * The score card.
 *
 * College Board's shape: a deep blue bar with the test's name and a download
 * control, closed with the section's yellow rule; a lighter blue bar with
 * which sitting this is and when it was taken; then the
 * total over its range, the two section scores over theirs, and a yellow pill
 * for the detail.
 *
 * It renders the same whether or not the sitting has happened. An untaken test
 * shows the same fields with em dashes in them and a Start pill where Score
 * Details would be — which is the whole point of showing it before you sit:
 * the card is what you are working towards, and a page that only shows it
 * afterwards never tells you that.
 */
function ScoreCard({
  testName,
  label,
  meta,
  onDownload,
  downloadLabel,
  total,
  totalRange,
  delta = null,
  sections,
  footnote,
  actions,
}: {
  testName: string;
  /** "Practice 3", or a section test's own label. */
  label: string;
  /** The date it was taken, or why there isn't one. */
  meta: string;
  onDownload?: () => void;
  downloadLabel?: string;
  total: number | null;
  totalRange: [number, number];
  /** Change against the previous sitting, when there is one to compare with. */
  delta?: number | null;
  sections: { id: SubjectId; name: string; value: number | null }[];
  footnote: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className={cn("flex items-center justify-between", BB_SCORE_CARD_HEADER)}>
        <span className="text-base font-bold tracking-tight">{testName}</span>
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            title="Download score report"
            aria-label={downloadLabel ?? "Download score report"}
            className={cn(
              "-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15",
              FOCUS,
            )}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={cn("flex items-baseline justify-between gap-2", BB_SCORE_CARD_SUBBAR)}>
        <span className="truncate text-sm font-bold uppercase tracking-wide">{label}</span>
        <span className="shrink-0 text-xs tabular-nums opacity-90">{meta}</span>
      </div>

      <div className="px-6 py-6">
        <p className={cn(EYEBROW, "text-center")}>Your total score</p>
        <div className="mt-2 flex items-baseline justify-center gap-2">
          <p
            className={cn(
              "font-display text-6xl font-bold leading-none tabular-nums",
              total === null ? "text-muted-foreground/40" : "text-foreground",
            )}
          >
            {total ?? "—"}
          </p>
          {delta !== null && delta !== 0 && (
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                delta > 0 ? "text-success" : "text-destructive",
              )}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-center text-xs tabular-nums text-muted-foreground">
          {totalRange[0]}-{totalRange[1]}
        </p>

        <div className="mt-6 divide-y divide-border/60 border-y border-border/60">
          {sections.map((section) => {
            const range = sectionRange(section.id);
            return (
              <div key={section.id} className="flex items-baseline justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{section.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {range[0]}-{range[1]}
                  </p>
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    section.value === null ? "text-muted-foreground/40" : "text-foreground",
                  )}
                >
                  {section.value ?? "—"}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs tabular-nums text-muted-foreground">{footnote}</p>

        <div className="mt-5 space-y-2.5">{actions}</div>
      </div>
    </div>
  );
}

function sectionRange(subjectId: SubjectId): [number, number] {
  return SAT.subjects.find((s) => s.id === subjectId)?.scoreRange ?? [200, 800];
}

/** The date the sitting was taken, written out: "July 19, 2024". */
function examDate(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  return then.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * The download control on the card header.
 *
 * A plain-text report of the sitting, built from the attempt that is already
 * in local storage. Nothing is fetched and no PDF library is pulled in for it:
 * the file says what the card says, plus the per-skill tally the card has no
 * room for, and it is the student's to keep.
 */
function downloadScoreReport(testName: string, attempt: AttemptSummary, number: number): void {
  const lines: string[] = [
    `${testName} — ${attempt.label}`,
    `Practice ${number} · ${examDate(attempt.finishedAt)}`,
    "",
    attempt.score !== undefined
      ? `Total score: ${attempt.score} (${SAT.scoreRange[0]}-${SAT.scoreRange[1]})`
      : "Total score: not reported — a composite needs both sections",
  ];

  for (const subjectId of ["rw", "math"] as const) {
    const value = attempt.sectionScores?.[subjectId];
    if (value === undefined) continue;
    const range = sectionRange(subjectId);
    const name = subjectId === "rw" ? "Reading and Writing" : "Math";
    lines.push(`${name}: ${value} (${range[0]}-${range[1]})`);
  }

  lines.push(
    "",
    `${attempt.correct} of ${attempt.totalQuestions} correct`,
    `Time taken: ${formatDuration(attempt.elapsedMs)}`,
    "",
    "By skill",
  );

  for (const [skillId, tally] of Object.entries(attempt.bySkill)) {
    lines.push(`  ${skillName(skillId)}: ${tally.correct}/${tally.total}`);
  }

  lines.push(
    "",
    "Scores are estimated from practice questions written for this product.",
    "They are not an official College Board score.",
    "",
  );

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${testName.toLowerCase()}-practice-${number}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

