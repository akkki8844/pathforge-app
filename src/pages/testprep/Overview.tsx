import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { blueprintFor } from "@/lib/testprep/blueprints";
import { sectionHref, sessionHref } from "@/lib/testprep/nav";
import { setTargetScore, setTestDate, useTestPrep } from "@/lib/testprep/store";
import { daysUntil, nextBestAction, overallStats, pct } from "@/lib/testprep/stats";
import { EYEBROW_ACCENT } from "@/lib/testprep/ui";
import { Panel, PageHeader, TestPrepShell } from "@/components/testprep/TestPrepShell";
import { LabelledBar, Stat, StatGrid, TopicRow } from "@/components/testprep/primitives";
import { AnimatedNumber, Reveal } from "@/components/testprep/motion";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";

/**
 * The SAT command centre.
 *
 * Four things, in the order a student needs them: where they stand, what to do
 * next, what the material is, and how far through it they are. It is a
 * dashboard — it opens with a score, not with a sentence about potential.
 *
 * The page arrives in that same order, a few hundredths apart, so the eye is
 * led down it once on load and never again.
 */
export default function TestPrepOverview() {
  const { testId = "sat" } = useParams();
  const blueprint = blueprintFor(testId);
  const profile = useTestPrep();
  const stats = useMemo(() => overallStats(profile), [profile]);
  const next = useMemo(() => nextBestAction(profile), [profile]);

  if (!blueprint) return <TestNotAvailable name="Test Prep" subtitle="Unknown test" />;
  if (!blueprint.available)
    return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

  const days = daysUntil(profile.testDate);

  return (
    <TestPrepShell
      testId={blueprint.id}
      testName={blueprint.name}
      testSubtitle={blueprint.subtitle}
      title="Overview"
      path={`/test-prep/${blueprint.id}`}
    >
      <div className="space-y-6">
        <PageHeader
          title={blueprint.name}
          purpose={blueprint.subtitle}
          actions={<TargetsDialog />}
        />

        {/* The status strip. Four figures and one bar — everything a student
            checks on arrival, in a block short enough that the material below
            it is still on the fold. */}
        <Reveal delay={0.04}>
          <StatGrid
            footer={
              <LabelledBar
                label="Overall preparation"
                value={stats.coverage}
                delay={0.18}
                caption={`${stats.completed} of ${stats.available} questions in the bank answered at least once.`}
              />
            }
          >
            <Stat
              label="Current score"
              value={
                stats.estimatedScore !== null ? (
                  <AnimatedNumber value={stats.estimatedScore} from={0} />
                ) : (
                  "—"
                )
              }
              hint={
                stats.estimatedScore !== null
                  ? "Estimated from practice"
                  : "Answer a few more questions"
              }
            />
            <Stat
              label="Target score"
              value={profile.targetScore}
              hint={
                stats.estimatedScore !== null
                  ? gapHint(profile.targetScore - stats.estimatedScore)
                  : undefined
              }
            />
            <Stat
              label="Test date"
              value={profile.testDate ? formatTestDate(profile.testDate) : "Not set"}
              hint={
                days === null
                  ? "Set one to pace your practice"
                  : days >= 0
                    ? `${days} day${days === 1 ? "" : "s"} away`
                    : "Date has passed"
              }
            />
            <Stat
              label="Questions done"
              value={`${stats.completed} / ${stats.available}`}
              hint={stats.accuracy !== null ? `${pct(stats.accuracy)} accuracy` : "No answers yet"}
            />
          </StatGrid>
        </Reveal>

        {next && <NextMove testId={blueprint.id} next={next} />}

        {/* Subject → Domain → Skill. Two panels, one per section of the test. */}
        <div className="space-y-5">
          {stats.subjects.map((subject, i) => (
            <Reveal key={subject.subjectId} delay={0.12 + i * 0.05}>
              <Panel
                title={subject.name}
                description={
                  subject.score !== null
                    ? `Estimated section score ${subject.score} · ${subject.correct} of ${subject.attempts} correct`
                    : "Not enough answers yet for a section estimate"
                }
                actions={
                  <Button asChild size="sm" variant="ghost" className="h-8 px-2.5 text-xs">
                    <Link
                      to={sessionHref(blueprint.id, {
                        kind: "topic",
                        subject: subject.subjectId,
                        count: 10,
                      })}
                    >
                      Practice section
                    </Link>
                  </Button>
                }
                bodyClassName="p-0"
              >
                {subject.domains.map((domain) => (
                  <TopicRow
                    key={domain.domainId}
                    domain={domain}
                    practiceHref={sessionHref(blueprint.id, {
                      kind: "topic",
                      domain: domain.domainId,
                      count: 10,
                    })}
                    skillHref={(skill) =>
                      sessionHref(blueprint.id, {
                        kind: "topic",
                        skill: skill.skillId,
                        count: Math.min(10, Math.max(1, skill.available)),
                      })
                    }
                  />
                ))}
              </Panel>
            </Reveal>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Questions are written by Pathforge to the published digital SAT specification. They are
          not College Board material.{" "}
          <Link
            to={sectionHref(blueprint.id, "question-bank")}
            className="text-[hsl(var(--bb-blue))] hover:underline"
          >
            Browse the bank
          </Link>
          .
        </p>
      </div>
    </TestPrepShell>
  );
}

/**
 * The one thing to do next.
 *
 * Directly under the status strip, because the whole point of the strip is to
 * raise the question this answers. It names the skill, the measured mastery,
 * why it was chosen, and how long the set will take — then a single button.
 *
 * It is the only tinted surface on the page. That is what makes it the focal
 * point without needing to be large.
 */
function NextMove({
  testId,
  next,
}: {
  testId: string;
  next: NonNullable<ReturnType<typeof nextBestAction>>;
}) {
  return (
    <Reveal
      delay={0.08}
      as="section"
      className="rounded-xl border border-[hsl(var(--bb-blue)/0.35)] bg-[hsl(var(--bb-blue)/0.045)] px-4 py-4 sm:px-5"
    >
      <p className={EYEBROW_ACCENT}>Your next move</p>
      <div className="mt-2.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-base font-semibold tracking-[-0.01em] text-foreground">
              {next.skillName}
            </span>
            {next.mastery !== null && (
              <span className="text-sm font-medium tabular-nums text-muted-foreground">
                {pct(next.mastery)} mastery
              </span>
            )}
          </p>
          <p className="mt-1.5 max-w-xl text-sm leading-snug text-muted-foreground">
            {next.reason}
          </p>
          <p className="mt-2 text-xs tabular-nums text-muted-foreground">
            {next.domainName} · {next.count} questions · ~{next.minutes} min
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to={sessionHref(testId, { kind: "topic", skill: next.skillId, count: next.count })}>
            Start practice
          </Link>
        </Button>
      </div>
    </Reveal>
  );
}

/** Target score and test date. The only two things a student sets by hand. */
function TargetsDialog() {
  const profile = useTestPrep();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(String(profile.targetScore));
  const [date, setDate] = useState(profile.testDate);

  const parsed = Number(target);
  const valid = Number.isFinite(parsed) && parsed >= 400 && parsed <= 1600;

  const save = () => {
    if (!valid) return;
    setTargetScore(Math.min(1600, Math.max(400, Math.round(parsed / 10) * 10)));
    setTestDate(date);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setTarget(String(profile.targetScore));
          setDate(profile.testDate);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit target and date
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Target and test date</DialogTitle>
          <DialogDescription>
            Both are used to pace practice. Neither is shared with anyone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tp-target">Target score</Label>
            <Input
              id="tp-target"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-invalid={!valid}
              aria-describedby="tp-target-hint"
              className={valid ? undefined : "border-destructive focus-visible:ring-destructive"}
            />
            <p
              id="tp-target-hint"
              className={`text-xs ${valid ? "text-muted-foreground" : "text-destructive"}`}
            >
              {valid
                ? "Between 400 and 1600. Rounded to the nearest ten."
                : "Enter a number between 400 and 1600."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tp-date">Test date</Label>
            <Input
              id="tp-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Leave blank if you have not booked one.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The one-line reading of the gap between practice and target. */
function gapHint(gap: number): string {
  if (gap <= 0) return "Practice is at or above target";
  return `${gap} points to go`;
}

function formatTestDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
