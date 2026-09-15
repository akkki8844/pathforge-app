import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
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
import { cn } from "@/lib/utils";
import { blueprintFor } from "@/lib/testprep/blueprints";
import { resultsHref, sectionHref, sessionHref } from "@/lib/testprep/nav";
import { resetTestPrep, useTestPrep } from "@/lib/testprep/store";
import {
  accuracyByDifficulty,
  daysUntil,
  formatDuration,
  masteryTone,
  overallStats,
  pct,
} from "@/lib/testprep/stats";
import { ROW_HOVER, SURFACE } from "@/lib/testprep/ui";
import { Bar, Stat, StatGrid } from "@/components/testprep/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/testprep/motion";
import { Empty, PageHeader, Panel, TestPrepShell } from "@/components/testprep/TestPrepShell";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";

/**
 * How it is going.
 *
 * Every figure here is derived from the answer log, and every one of them can
 * say "not yet" — a progress page that invents a trend from four questions is
 * worse than one that admits it does not know. The visualisation is bars and
 * numbers rather than charts: this is a student's own record, not a dataset.
 */
export default function TestPrepProgress() {
  const { testId = "sat" } = useParams();
  const blueprint = blueprintFor(testId);
  const profile = useTestPrep();

  const stats = useMemo(() => overallStats(profile), [profile]);
  const difficulty = useMemo(() => accuracyByDifficulty(profile), [profile]);
  const exams = useMemo(
    () => profile.attempts.filter((a) => a.kind === "exam" && a.score !== undefined),
    [profile.attempts],
  );
  const practice = useMemo(
    () => profile.attempts.filter((a) => a.kind !== "exam").slice(0, 8),
    [profile.attempts],
  );

  if (!blueprint) return <TestNotAvailable name="Test Prep" subtitle="Unknown test" />;
  if (!blueprint.available)
    return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

  const latestExam = exams[0];
  const days = daysUntil(profile.testDate);
  const gap = stats.estimatedScore !== null ? profile.targetScore - stats.estimatedScore : null;
  const untouched = stats.totalAttempts === 0;

  return (
    <TestPrepShell
      testId={blueprint.id}
      testName={blueprint.name}
      testSubtitle={blueprint.subtitle}
      title="Progress"
      path={`/test-prep/${blueprint.id}/progress`}
    >
      <div className="space-y-6">
        <PageHeader
          title="Progress"
          purpose="Everything measured from the questions you have actually answered."
        />

        {untouched ? (
          <Reveal delay={0.04} className={cn("overflow-hidden", SURFACE)}>
            <Empty
              title="Nothing measured yet"
              description="Mastery, accuracy and score estimates all come from your own answers, so this page fills in as you practise. One set of ten is enough to start it."
              action={
                <Button asChild size="sm">
                  <Link to={sessionHref(blueprint.id, { kind: "quick", count: 10 })}>
                    Start a quick set
                  </Link>
                </Button>
              }
            />
          </Reveal>
        ) : (
          <>
            <Reveal delay={0.04}>
              <StatGrid>
                <Stat
                  label="Latest exam"
                  value={latestExam?.score ?? "—"}
                  hint={
                    latestExam
                      ? new Date(latestExam.finishedAt).toLocaleDateString()
                      : "No sitting yet"
                  }
                />
                <Stat
                  label="Predicted"
                  value={stats.estimatedScore ?? "—"}
                  hint={stats.estimatedScore ? "From practice" : "Not enough answers"}
                />
                <Stat
                  label="Target"
                  value={profile.targetScore}
                  hint={
                    gap === null
                      ? undefined
                      : gap > 0
                        ? `${gap} points to go`
                        : "Practice is at or above target"
                  }
                />
                <Stat
                  label="Test date"
                  value={profile.testDate ? formatTestDate(profile.testDate) : "Not set"}
                  hint={
                    days !== null && days >= 0 ? `${days} day${days === 1 ? "" : "s"} away` : undefined
                  }
                />
              </StatGrid>
            </Reveal>

            <Reveal delay={0.08}>
              <StatGrid columns={3}>
                <Stat
                  label="Questions answered"
                  value={stats.totalAttempts}
                  hint={`${stats.completed} of ${stats.available} in the bank`}
                />
                <Stat label="Accuracy" value={pct(stats.accuracy)} />
                <Stat
                  label="Average per question"
                  value={stats.avgSeconds !== null ? `${stats.avgSeconds}s` : "—"}
                />
              </StatGrid>
            </Reveal>

            {/* Mastery, all the way down. The Overview shows this per subject;
                here it is the whole map at once, which is what a student wants
                when the question is "where am I weakest overall". */}
            <div className="space-y-5">
              {stats.subjects.map((subject, si) => (
                <Reveal key={subject.subjectId} delay={0.12 + si * 0.04}>
                  <Panel
                    title={subject.name}
                    description={
                      subject.score !== null
                        ? `Estimated ${subject.score} · ${subject.correct} of ${subject.attempts} correct`
                        : "Not enough answers for a section estimate"
                    }
                    bodyClassName="p-0"
                  >
                    <ul>
                      {subject.domains.map((d, i) => (
                        <li
                          key={d.domainId}
                          className="border-b border-border/60 px-4 py-3 last:border-b-0 sm:px-5"
                        >
                          <div className="flex items-baseline justify-between gap-4">
                            <span className="truncate text-sm text-foreground">{d.name}</span>
                            <span
                              className={cn(
                                "shrink-0 text-xs tabular-nums",
                                d.mastery === null ? "text-muted-foreground" : "text-foreground",
                              )}
                            >
                              {d.mastery === null ? "not rated" : pct(d.mastery)}
                            </span>
                          </div>
                          <Bar
                            value={d.mastery ?? 0}
                            tone={masteryTone(d.mastery)}
                            delay={0.14 + i * 0.025}
                            className="mt-2"
                          />
                          <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                            {d.attempts} answered · {d.completed}/{d.available} of the bank seen
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.2}>
              <Panel title="By difficulty" description="Accuracy at each level of the bank.">
                <div className="space-y-3.5">
                  {(["easy", "medium", "hard"] as const).map((level, i) => {
                    const d = difficulty[level];
                    const value = d.total ? d.correct / d.total : 0;
                    return (
                      <div key={level}>
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-sm capitalize text-foreground">{level}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {d.total ? `${d.correct}/${d.total}` : "none answered"}
                          </span>
                        </div>
                        <Bar
                          value={value}
                          tone={d.total ? masteryTone(value) : "muted"}
                          delay={0.22 + i * 0.03}
                          className="mt-2"
                        />
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </Reveal>

            {exams.length > 0 && (
              <Reveal delay={0.24}>
                <Panel title="Score history" bodyClassName="p-0">
                  <Stagger as="ul" count={exams.length} step={0.03}>
                    {exams.map((a) => (
                      <StaggerItem
                        key={a.id}
                        as="li"
                        y={4}
                        className={cn(
                          "flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3 last:border-b-0 sm:px-5",
                          ROW_HOVER,
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">{a.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(a.finishedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <span className="font-display text-base font-bold tabular-nums text-foreground">
                            {a.score}
                          </span>
                          <Link
                            to={resultsHref(blueprint.id, a.id)}
                            className="text-xs font-medium text-[hsl(var(--bb-blue))] hover:underline"
                          >
                            Results
                          </Link>
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </Panel>
              </Reveal>
            )}

            <Reveal delay={0.28}>
              <Panel title="Recent practice" bodyClassName="p-0">
                {practice.length === 0 ? (
                  <Empty
                    title="No practice sets finished yet"
                    description="Finished sets are listed here with their accuracy and pace."
                    action={
                      <Button asChild size="sm" variant="outline">
                        <Link to={sessionHref(blueprint.id, { kind: "quick", count: 10 })}>
                          Start a quick set
                        </Link>
                      </Button>
                    }
                  />
                ) : (
                  <Stagger as="ul" count={practice.length} step={0.03}>
                    {practice.map((a) => (
                      <StaggerItem
                        key={a.id}
                        as="li"
                        y={4}
                        className={cn(
                          "flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3 last:border-b-0 sm:px-5",
                          ROW_HOVER,
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">{a.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(a.finishedAt).toLocaleDateString()} ·{" "}
                            {formatDuration(a.elapsedMs)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                          {a.correct}/{a.totalQuestions}
                        </span>
                      </StaggerItem>
                    ))}
                  </Stagger>
                )}
              </Panel>
            </Reveal>
          </>
        )}

        <div className={cn("flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-5", SURFACE)}>
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
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all SAT progress?</AlertDialogTitle>
                <AlertDialogDescription>
                  Every answer, bookmark, practice set and exam result is deleted, and the mastery
                  figures go back to nothing. Your target score and test date are cleared too. This
                  cannot be undone.
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
          Score figures are estimates from Pathforge-written practice questions, not predictions of
          a College Board result.{" "}
          <Link to={sectionHref(blueprint.id, "exams")} className="text-[hsl(var(--bb-blue))] hover:underline">
            Sit a practice exam
          </Link>{" "}
          for a closer measure.
        </p>
      </div>
    </TestPrepShell>
  );
}

function formatTestDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
