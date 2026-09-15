import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { SAT, blueprintFor } from "@/lib/testprep/blueprints";
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
  ROW_HOVER,
  SURFACE,
} from "@/lib/testprep/ui";
import { Empty, PageHeader, Panel, TestPrepShell } from "@/components/testprep/TestPrepShell";
import { ActionRow } from "@/components/testprep/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/testprep/motion";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";
import { ListChecks, TrendingUp } from "lucide-react";
import type { SubjectId } from "@/lib/testprep/types";

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

        {/* The main event. Given its own block rather than being one card among
            three, because it is the thing this page exists for. */}
        <Reveal delay={0.04} as="section" className={cn("p-5 sm:p-6", SURFACE)}>
          <p className={EYEBROW}>{isFullLength ? "Full-length SAT" : "Digital SAT simulation"}</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.01em] text-foreground">
            Four modules, both sections, one clock
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Reading &amp; Writing then Math, in two modules each, in the exam interface — no
            navigation, no explanations until the end, a running timer per module and an on-screen
            calculator where the real test allows one.
          </p>
          <p className="mt-3.5 text-xs tabular-nums text-muted-foreground">
            {isFullLength
              ? `${full.target} questions · ${SAT.modules.reduce((n, m) => n + m.minutes, 0)} minutes`
              : `${full.available} questions · about ${fullMinutes} minutes`}
          </p>
          {!isFullLength && (
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              A real sitting is {full.target} questions. The bank holds {full.available} for these
              sections today, so each module runs short with its clock scaled to keep the same time
              per question. It is not a full-length test and is not presented as one.
            </p>
          )}
          <Button asChild className="mt-5">
            <Link to={examHref(blueprint.id, ["rw", "math"])}>Start exam</Link>
          </Button>
        </Reveal>

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

        <Reveal delay={0.12} as="section" className={cn("overflow-hidden", SURFACE)}>
          <ActionRow
            title="Custom exam"
            body="Choose the subject, the length and the clock."
            action={
              <Button size="sm" variant="outline" onClick={() => setCustomOpen(true)}>
                Build
              </Button>
            }
          />
        </Reveal>

        <Reveal delay={0.16}>
          <Panel title="Previous attempts" bodyClassName={examAttempts.length === 0 ? "p-0" : undefined}>
            {examAttempts.length === 0 ? (
              <Empty
                title="No sittings yet"
                description="Your exams are listed here with their scores, the change since the previous one, and a full breakdown."
              />
            ) : (
              <Stagger
                className="bluebook grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
                count={examAttempts.length}
                step={0.03}
              >
                {examAttempts.map((a, i) => {
                  const previous = examAttempts[i + 1];
                  const delta =
                    a.score !== undefined && previous?.score !== undefined
                      ? a.score - previous.score
                      : null;
                  return (
                    <StaggerItem
                      key={a.id}
                      y={4}
                      className={cn("overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm")}
                    >
                      <div className={cn("flex items-center justify-between", BB_SCORE_CARD_HEADER)}>
                        <span className="text-base font-bold tracking-tight">{blueprint.name}</span>
                      </div>
                      <div className={cn("flex items-baseline justify-between gap-2", BB_SCORE_CARD_SUBBAR)}>
                        <span className="truncate text-sm font-bold uppercase tracking-wide">{a.label}</span>
                        <span className="shrink-0 text-xs tabular-nums opacity-90">
                          {relativeDay(a.finishedAt)}
                        </span>
                      </div>

                      <div className="px-6 py-6">
                        <p className={cn(EYEBROW, "text-center")}>Your total score</p>
                        <div className="mt-2 flex items-baseline justify-center gap-2">
                          <p className="font-display text-6xl font-bold leading-none tabular-nums text-foreground">
                            {a.score ?? "—"}
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
                          {blueprint.scoreRange[0]}-{blueprint.scoreRange[1]}
                        </p>

                        <div className="mt-6 divide-y divide-border/60 border-y border-border/60">
                          {(["rw", "math"] as const).map((subjectId) => {
                            const range = sectionRange(subjectId);
                            const value = a.sectionScores?.[subjectId];
                            return (
                              <div key={subjectId} className="flex items-baseline justify-between py-3">
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {subjectId === "rw" ? "Reading and Writing" : "Math"}
                                  </p>
                                  <p className="text-xs tabular-nums text-muted-foreground">
                                    {range[0]}-{range[1]}
                                  </p>
                                </div>
                                <p className="text-2xl font-bold tabular-nums text-foreground">
                                  {value ?? "—"}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        <p className="mt-4 text-center text-xs text-muted-foreground">
                          {a.correct}/{a.totalQuestions} correct · {formatDuration(a.elapsedMs)}
                        </p>

                        <div className="mt-5 space-y-2.5">
                          <Link to={resultsHref(blueprint.id, a.id)} className={BB_SCORE_CARD_CTA}>
                            Score Details
                          </Link>
                          <Link
                            to={sessionHref(blueprint.id, { kind: "weak", count: 15 })}
                            className={BB_SCORE_CARD_SECONDARY}
                          >
                            <TrendingUp className="h-4 w-4" aria-hidden="true" />
                            Practice weak areas
                          </Link>
                          <Link
                            to={sectionHref(blueprint.id, "question-bank")}
                            className="flex items-center justify-center gap-1.5 pt-1 text-sm font-medium text-[hsl(var(--bb-blue))] transition-colors hover:text-[hsl(var(--bb-blue)/0.8)]"
                          >
                            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                            Practice specific questions
                          </Link>
                        </div>
                      </div>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            )}
          </Panel>
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
      <DialogContent className="sm:max-w-sm">
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
              <SelectContent>
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
              <SelectContent>
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
              <SelectContent>
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

function sectionRange(subjectId: SubjectId): [number, number] {
  return SAT.subjects.find((s) => s.id === subjectId)?.scoreRange ?? [200, 800];
}

function relativeDay(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Completed today";
  if (days === 1) return "Completed yesterday";
  if (days < 30) return `Completed ${days} days ago`;
  return `Completed ${then.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
