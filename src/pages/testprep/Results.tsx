import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { blueprintFor, domainName, domainOf, skillName, subjectName } from "@/lib/testprep/blueprints";
import { sectionHref, sessionHref } from "@/lib/testprep/nav";
import { useTestPrep } from "@/lib/testprep/store";
import { formatDuration, masteryTone } from "@/lib/testprep/stats";
import { ROW_HOVER, SURFACE } from "@/lib/testprep/ui";
import { Bar, Stat, StatGrid } from "@/components/testprep/primitives";
import { AnimatedNumber, Reveal, Stagger, StaggerItem } from "@/components/testprep/motion";
import { PageHeader, Panel, TestPrepShell } from "@/components/testprep/TestPrepShell";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";
import type { SubjectId } from "@/lib/testprep/types";

/** A skill only counts as strong or weak once there is enough of it to judge. */
const MIN_FOR_VERDICT = 2;

/**
 * What a finished sitting is worth, and what to do about it.
 *
 * The order is the order a student reads it in: the number, the change since
 * last time, the two section scores, then — the part that actually matters —
 * what went well, what cost the most, and a button that goes straight into
 * practising the second one.
 */
export default function TestPrepResults() {
  const { testId = "sat", attemptId } = useParams();
  const blueprint = blueprintFor(testId);
  const profile = useTestPrep();
  const reduced = useReducedMotion();

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
    () =>
      skills
        .filter((s) => s.wrong > 0)
        .sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy),
    [skills],
  );

  const strong = useMemo(
    () =>
      skills
        .filter((s) => s.total >= MIN_FOR_VERDICT && s.wrong === 0)
        .sort((a, b) => b.total - a.total),
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
  if (!blueprint.available)
    return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

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
        <p className="mt-6 max-w-lg text-sm leading-snug text-muted-foreground">
          That attempt is not in your history. It may have been recorded in another browser —
          practice results are stored on this device.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to={sectionHref(blueprint.id, "exams")}>Back to Practice Exams</Link>
        </Button>
      </TestPrepShell>
    );
  }

  const delta =
    attempt.score !== undefined && previous?.score !== undefined
      ? attempt.score - previous.score
      : null;
  const accuracy = attempt.totalQuestions ? attempt.correct / attempt.totalQuestions : 0;
  const history = profile.attempts
    .filter((a) => a.kind === "exam" && a.score !== undefined)
    .slice(0, 6)
    .reverse();

  return (
    <TestPrepShell
      testId={blueprint.id}
      testName={blueprint.name}
      testSubtitle={blueprint.subtitle}
      title="Results"
      path={`/test-prep/${blueprint.id}/exams`}
    >
      <div className="space-y-6">
        <PageHeader title={attempt.label} purpose={new Date(attempt.finishedAt).toLocaleString()} />

        <Reveal>
          <p className="font-display text-[52px] font-bold leading-none tabular-nums tracking-tight text-foreground">
            {attempt.score !== undefined ? (
              <AnimatedNumber value={attempt.score} from={0} />
            ) : (
              `${attempt.correct}/${attempt.totalQuestions}`
            )}
          </p>
          {attempt.score !== undefined && (
            <p className="mt-2 text-sm text-muted-foreground">
              Estimated composite
              {delta !== null && delta !== 0 && (
                <span className={delta > 0 ? "text-success" : "text-destructive"}>
                  {" · "}
                  {delta > 0 ? "+" : ""}
                  {delta} from your previous attempt
                </span>
              )}
              {delta === 0 && <span> · unchanged from your previous attempt</span>}
            </p>
          )}
        </Reveal>

        {attempt.sectionScores && Object.keys(attempt.sectionScores).length > 0 && (
          <Reveal delay={0.06}>
            <StatGrid columns={2}>
              {Object.entries(attempt.sectionScores).map(([subjectId, score]) => (
                <Stat
                  key={subjectId}
                  label={subjectName(subjectId as SubjectId)}
                  value={score}
                  hint="Estimated section score"
                />
              ))}
            </StatGrid>
          </Reveal>
        )}

        <Reveal delay={0.1}>
          <StatGrid columns={3}>
            <Stat
              label="Accuracy"
              value={`${Math.round(accuracy * 100)}%`}
              hint={`${attempt.correct} of ${attempt.totalQuestions} correct`}
            />
            <Stat
              label="Time per question"
              value={
                attempt.totalQuestions
                  ? formatDuration(attempt.elapsedMs / attempt.totalQuestions)
                  : "—"
              }
            />
            <Stat label="Total time" value={formatDuration(attempt.elapsedMs)} />
          </StatGrid>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-2">
          {weak.length > 0 && (
            <Reveal delay={0.14}>
              <Panel
                title="Weak areas"
                description="Where the marks went. Each links straight into practice."
                bodyClassName="p-0"
              >
                <Stagger as="ul" count={Math.min(5, weak.length)} step={0.03}>
                  {weak.slice(0, 5).map((s) => (
                    <StaggerItem
                      key={s.skillId}
                      as="li"
                      y={4}
                      className={cn(
                        "flex items-center justify-between gap-4 border-b border-border/60 px-4 py-2.5 last:border-b-0 sm:px-5",
                        ROW_HOVER,
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{skillName(s.skillId)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {domainName(domainOf(s.skillId) ?? "")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {s.wrong} of {s.total} wrong
                        </span>
                        <Link
                          to={sessionHref(blueprint.id, {
                            kind: "topic",
                            skill: s.skillId,
                            count: 10,
                          })}
                          className="text-xs font-medium text-[hsl(var(--bb-blue))] hover:underline"
                        >
                          Practise
                        </Link>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              </Panel>
            </Reveal>
          )}

          {strong.length > 0 && (
            <Reveal delay={0.18}>
              <Panel
                title="Strong areas"
                description={`Answered without a miss, ${MIN_FOR_VERDICT} questions or more.`}
                bodyClassName="p-0"
              >
                <Stagger as="ul" count={Math.min(5, strong.length)} step={0.03}>
                  {strong.slice(0, 5).map((s) => (
                    <StaggerItem
                      key={s.skillId}
                      as="li"
                      y={4}
                      className={cn(
                        "flex items-center justify-between gap-4 border-b border-border/60 px-4 py-2.5 last:border-b-0 sm:px-5",
                        ROW_HOVER,
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{skillName(s.skillId)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {domainName(domainOf(s.skillId) ?? "")}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-success">
                        {s.correct}/{s.total}
                      </span>
                    </StaggerItem>
                  ))}
                </Stagger>
              </Panel>
            </Reveal>
          )}
        </div>

        {byDomain.length > 0 && (
          <Reveal delay={0.22}>
            <Panel title="Domain performance" bodyClassName="p-0">
              <Stagger as="ul" count={byDomain.length} step={0.02}>
                {byDomain.map((d, i) => (
                  <StaggerItem
                    key={d.domainId}
                    as="li"
                    y={4}
                    className={cn("border-b border-border/60 px-4 py-3 last:border-b-0 sm:px-5", ROW_HOVER)}
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="truncate text-sm text-foreground">
                        {domainName(d.domainId)}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {d.correct}/{d.total}
                      </span>
                    </div>
                    <Bar
                      value={d.accuracy}
                      tone={masteryTone(d.accuracy)}
                      delay={0.24 + i * 0.03}
                      className="mt-2"
                    />
                  </StaggerItem>
                ))}
              </Stagger>
            </Panel>
          </Reveal>
        )}

        {history.length > 1 && (
          <Reveal delay={0.26}>
            <Panel title="Score progression" description="Your last six sittings.">
              <div className="flex items-end gap-2">
                {history.map((a) => {
                  const value = ((a.score ?? 400) - 400) / 1200;
                  const current = a.id === attempt.id;
                  return (
                    <div key={a.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[11px] tabular-nums",
                          current ? "font-semibold text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {a.score}
                      </span>
                      <motion.div
                        initial={reduced ? false : { height: 0 }}
                        animate={{ height: `${Math.max(6, value * 96)}px` }}
                        transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
                        className={cn(
                          "w-full rounded-t-sm",
                          current ? "bg-[hsl(var(--bb-blue))]" : "bg-muted-foreground/20",
                        )}
                      />
                      <span className="w-full truncate text-center text-[10px] text-muted-foreground">
                        {new Date(a.finishedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </Reveal>
        )}

        <Reveal delay={0.3} className={cn("flex flex-wrap items-center gap-2 p-4 sm:px-5", SURFACE)}>
          <p className="mr-auto text-sm text-muted-foreground">
            {weak.length > 0
              ? "The fastest gain is in the weak areas above."
              : "Nothing was missed in this sitting."}
          </p>
          {weak.length > 0 && (
            <Button asChild size="sm">
              <Link to={sessionHref(blueprint.id, { kind: "weak", count: 10 })}>
                Practice these areas
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link to={sectionHref(blueprint.id, "exams")}>Back to Practice Exams</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={sectionHref(blueprint.id, "progress")}>See progress</Link>
          </Button>
        </Reveal>
      </div>
    </TestPrepShell>
  );
}
