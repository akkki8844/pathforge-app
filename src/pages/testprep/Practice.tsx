import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SAT, blueprintFor } from "@/lib/testprep/blueprints";
import { sessionHref } from "@/lib/testprep/nav";
import { useTestPrep } from "@/lib/testprep/store";
import { masteryTone, overallStats, pct, skillStats } from "@/lib/testprep/stats";
import { FOCUS, ROW_HOVER, SURFACE } from "@/lib/testprep/ui";
import { PageHeader, Panel, TestPrepShell } from "@/components/testprep/TestPrepShell";
import { Bar } from "@/components/testprep/primitives";
import { Collapse, Reveal, Stagger, StaggerItem } from "@/components/testprep/motion";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";
import type { Difficulty, SubjectId } from "@/lib/testprep/types";

/**
 * Where practice starts.
 *
 * Three one-click sets, a topic list, and one builder. The one-click sets are
 * first and are genuinely one click — the entire failure mode of a practice
 * screen is that the student has to make five decisions before answering a
 * single question, so all configuration lives behind the last row.
 */
export default function TestPrepPractice() {
  const { testId = "sat" } = useParams();
  const blueprint = blueprintFor(testId);
  const profile = useTestPrep();

  const weakest = useMemo(() => {
    const measured = skillStats(profile)
      .filter((s) => s.mastery !== null && s.available > 0)
      .sort((a, b) => (a.mastery ?? 1) - (b.mastery ?? 1));
    return measured[0] ?? null;
  }, [profile]);

  const stats = useMemo(() => overallStats(profile), [profile]);

  if (!blueprint) return <TestNotAvailable name="Test Prep" subtitle="Unknown test" />;
  if (!blueprint.available)
    return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

  const rows = [
    {
      id: "quick",
      title: "Quick practice",
      body: "Ten mixed questions across both sections. Untimed.",
      meta: "10 questions · ~12 min",
      href: sessionHref(blueprint.id, { kind: "quick", count: 10 }),
    },
    {
      id: "weak",
      title: "Weak areas",
      body: weakest
        ? `Drawn from the skills you are missing most, starting with ${weakest.name}.`
        : "Unlocks once you have answered enough questions for a skill to be rated.",
      meta: weakest ? "10 questions · ~12 min" : undefined,
      href: sessionHref(blueprint.id, { kind: "weak", count: 10 }),
      disabled: !weakest,
    },
    {
      id: "timed",
      title: "Timed practice",
      body: "Twenty questions in twenty-five minutes, at roughly test pace.",
      meta: "20 questions · 25 min",
      href: sessionHref(blueprint.id, { kind: "timed", count: 20, minutes: 25 }),
    },
  ];

  return (
    <TestPrepShell
      testId={blueprint.id}
      testName={blueprint.name}
      testSubtitle={blueprint.subtitle}
      title="Practice"
      path={`/test-prep/${blueprint.id}/practice`}
    >
      <div className="space-y-6">
        <PageHeader
          title="Practice"
          purpose="Answer questions. Everything else on this page is optional."
        />

        <Stagger className="space-y-2.5" delay={0.04} count={rows.length}>
          {rows.map((row) => (
            <StaggerItem key={row.id}>
              <div
                className={cn(
                  "flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5",
                  SURFACE,
                  row.disabled ? "opacity-70" : ROW_HOVER,
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{row.title}</p>
                  <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{row.body}</p>
                  {row.meta && (
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">{row.meta}</p>
                  )}
                </div>
                {row.disabled ? (
                  <Button size="sm" variant="outline" disabled className="shrink-0">
                    Start
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link to={row.href}>Start</Link>
                  </Button>
                )}
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <TopicPicker testId={blueprint.id} subjects={stats.subjects} />
        <CustomBuilder testId={blueprint.id} />
      </div>
    </TestPrepShell>
  );
}

/**
 * Topic practice: pick a domain, start. Two clicks, no form.
 *
 * The mastery figure is here rather than only on the Overview because this is
 * the screen where the choice is actually made — asking a student to pick a
 * domain without telling them how they are doing in it is asking them to guess.
 * It is the same number the Overview shows, from the same answer log.
 */
function TopicPicker({
  testId,
  subjects,
}: {
  testId: string;
  subjects: ReturnType<typeof overallStats>["subjects"];
}) {
  return (
    <Reveal delay={0.1}>
      <Panel
        title="Topic practice"
        description="Ten questions from one domain."
        bodyClassName="p-0"
      >
        {subjects.map((subject) => (
          <div key={subject.subjectId} className="border-b border-border/60 last:border-b-0">
            <p className="bg-muted/25 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:px-5">
              {subject.name}
            </p>
            <Stagger as="ul" count={subject.domains.length} step={0.02}>
              {subject.domains.map((domain) => (
                <StaggerItem key={domain.domainId} as="li" y={4}>
                  <Link to={sessionHref(testId, { kind: "topic", domain: domain.domainId, count: 10 })}>
                    <motion.span
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        "group flex items-center gap-4 px-4 py-2.5 text-sm sm:px-5",
                        ROW_HOVER,
                        FOCUS,
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground">{domain.name}</span>
                      <span className="hidden w-24 shrink-0 sm:block">
                        <Bar
                          value={domain.mastery ?? 0}
                          tone={masteryTone(domain.mastery)}
                          size="sm"
                        />
                      </span>
                      <span
                        className={cn(
                          "w-10 shrink-0 text-right text-xs tabular-nums",
                          domain.mastery === null ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        {pct(domain.mastery)}
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-muted-foreground/0 transition-all duration-150 group-hover:translate-x-0 group-hover:text-muted-foreground"
                      />
                    </motion.span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        ))}
      </Panel>
    </Reveal>
  );
}

/**
 * The custom builder.
 *
 * Collapsed by default, and every field has a working default, so opening it
 * and pressing Start immediately produces a valid set. Skill choices are
 * filtered by the chosen subject and domain rather than listing all thirty at
 * once.
 */
function CustomBuilder({ testId }: { testId: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const [subject, setSubject] = useState<SubjectId | "all">("all");
  const [domain, setDomain] = useState("all");
  const [skill, setSkill] = useState("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "mixed">("mixed");
  const [count, setCount] = useState("10");
  const [minutes, setMinutes] = useState("none");

  const domains = useMemo(
    () => SAT.subjects.filter((s) => subject === "all" || s.id === subject).flatMap((s) => s.domains),
    [subject],
  );
  const skills = useMemo(
    () => domains.filter((d) => domain === "all" || d.id === domain).flatMap((d) => d.skills),
    [domains, domain],
  );

  const start = () => {
    navigate(
      sessionHref(testId, {
        kind: "custom",
        subject: subject === "all" ? undefined : subject,
        domain: domain === "all" ? undefined : domain,
        skill: skill === "all" ? undefined : skill,
        difficulty,
        count: Number(count),
        minutes: minutes === "none" ? undefined : Number(minutes),
      }),
    );
  };

  return (
    <Reveal delay={0.14} as="section" className={cn(SURFACE, "overflow-hidden")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="tp-custom-builder"
        className={cn(
          "flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left sm:px-5",
          ROW_HOVER,
          FOCUS,
        )}
      >
        <span>
          <span className="block text-sm font-semibold text-foreground">Custom practice</span>
          <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
            Choose the subject, difficulty, length and time limit.
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium text-[hsl(var(--bb-blue))]">{open ? "Close" : "Open"}</span>
      </button>

      <Collapse open={open}>
        <div id="tp-custom-builder">
          <div className="grid gap-3 border-t border-border/60 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
            <Field label="Subject">
              <Select
                value={subject}
                onValueChange={(v) => {
                  setSubject(v as SubjectId | "all");
                  setDomain("all");
                  setSkill("all");
                }}
              >
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
            </Field>

            <Field label="Domain">
              <Select
                value={domain}
                onValueChange={(v) => {
                  setDomain(v);
                  setSkill("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any domain</SelectItem>
                  {domains.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Skill">
              <Select value={skill} onValueChange={setSkill}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any skill</SelectItem>
                  {skills.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Difficulty">
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as Difficulty | "mixed")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Questions">
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["5", "10", "15", "20", "30"].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Time limit">
              <Select value={minutes} onValueChange={setMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Untimed</SelectItem>
                  {["10", "15", "20", "30", "45"].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs leading-snug text-muted-foreground">
              A set is never padded with repeats. If fewer questions match, the set is shorter.
            </p>
            <Button size="sm" onClick={start} className="shrink-0 sm:w-auto">
              Start practice
            </Button>
          </div>
        </div>
      </Collapse>
    </Reveal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
