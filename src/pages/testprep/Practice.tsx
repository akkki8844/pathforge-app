import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Bookmark, Crosshair, Lock, RotateCcw, SlidersHorizontal, Timer, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SAT, blueprintFor } from "@/lib/testprep/blueprints";
import { sessionHref } from "@/lib/testprep/nav";
import { useTestPrep } from "@/lib/testprep/store";
import { overallStats, skillStats, type DomainStats } from "@/lib/testprep/stats";
import { historyIndex } from "@/lib/testprep/select";
import { SAT_QUESTIONS } from "@/lib/testprep/questions";
import { PageHeader, TestPrepShell } from "@/components/testprep/TestPrepShell";
import { Reveal } from "@/components/testprep/motion";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";
import { Ring } from "@/components/testprep/viz";
import { masteryColor } from "@/lib/testprep/ui";
import type { Difficulty, SubjectId } from "@/lib/testprep/types";

const CARD = "rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

/**
 * Where practice starts.
 *
 * One-click sets first, because the failure mode of a practice screen is five
 * decisions before the first question. Then every domain as a card with its
 * mastery, then a builder whose every field has a working default and which
 * says how many questions match before you start.
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
  const missed = useMemo(() => {
    const out: string[] = [];
    historyIndex(profile).forEach((h, id) => {
      if (h.lastOutcome === "incorrect" || h.lastOutcome === "skipped") out.push(id);
    });
    return out;
  }, [profile]);

  if (!blueprint) return <TestNotAvailable name="Test Prep" subtitle="Unknown test" />;
  if (!blueprint.available) return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

  const modes: Mode[] = [
    {
      id: "quick",
      icon: Zap,
      accent: "bg-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue-foreground))]",
      title: "Quick ten",
      body: "Ten mixed questions across both sections, untimed. The fastest way to keep a streak.",
      meta: ["10 questions", "~12 min"],
      href: sessionHref(blueprint.id, { kind: "quick", count: 10 }),
    },
    {
      id: "weak",
      icon: Crosshair,
      accent: "bg-amber-500 text-white",
      title: "Weak areas",
      body: weakest
        ? `Built from the skills costing you most, starting with ${weakest.name}.`
        : "Unlocks once a skill has enough answers to be rated. Three per skill is enough.",
      meta: weakest ? ["10 questions", "adaptive"] : ["locked"],
      href: sessionHref(blueprint.id, { kind: "weak", count: 10 }),
      disabled: !weakest,
    },
    {
      id: "timed",
      icon: Timer,
      accent: "bg-[hsl(var(--bb-navy))] text-[hsl(var(--bb-navy-foreground))]",
      title: "Timed twenty",
      body: "Twenty questions in twenty-five minutes, at roughly the pace of the real test.",
      meta: ["20 questions", "25 min"],
      href: sessionHref(blueprint.id, { kind: "timed", count: 20, minutes: 25 }),
    },
    {
      id: "mistakes",
      icon: RotateCcw,
      accent: "bg-rose-500 text-white",
      title: "Mistake review",
      body: missed.length
        ? `Every question you last got wrong or skipped: ${missed.length} waiting. Clear them and they leave the list.`
        : "Questions you get wrong or skip collect here for a second go.",
      meta: missed.length ? [`${Math.min(missed.length, 20)} questions`, "untimed"] : ["nothing to review"],
      href: sessionHref(blueprint.id, { kind: "custom", ids: missed.slice(0, 20) }),
      disabled: missed.length === 0,
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
      <div className="space-y-8">
        <PageHeader
          title="Practice"
          purpose="Pick a set and start answering. Everything is saved as you go."
          actions={
            profile.bookmarks.length > 0 ? (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to={sessionHref(blueprint.id, { kind: "custom", ids: profile.bookmarks.slice(0, 30) })}>
                  <Bookmark className="h-4 w-4" />
                  Bookmarked ({profile.bookmarks.length})
                </Link>
              </Button>
            ) : undefined
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modes.map((m, i) => (
            <Reveal key={m.id} delay={0.03 + i * 0.04} className="h-full">
              <ModeCard mode={m} />
            </Reveal>
          ))}
        </div>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">Practise by topic</h2>
              <p className="text-[13px] text-muted-foreground">Ten questions from one domain. Unseen questions come first.</p>
            </div>
            <Legend />
          </div>
          {stats.subjects.map((subject, si) => (
            <div key={subject.subjectId} className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{subject.name}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {subject.domains.map((d, di) => (
                  <Reveal key={d.domainId} delay={0.08 + si * 0.05 + di * 0.03} className="h-full">
                    <DomainCard testId={blueprint.id} domain={d} />
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </section>

        <CustomBuilder testId={blueprint.id} />
      </div>
    </TestPrepShell>
  );
}

interface Mode {
  id: string;
  icon: typeof Zap;
  accent: string;
  title: string;
  body: string;
  meta: string[];
  href: string;
  disabled?: boolean;
}

function ModeCard({ mode }: { mode: Mode }) {
  const Icon = mode.icon;
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl shadow-sm", mode.disabled ? "bg-muted text-muted-foreground" : mode.accent)}>
          {mode.disabled ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        {!mode.disabled && (
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        )}
      </div>
      <h3 className="mt-4 font-display text-[16px] font-semibold tracking-tight">{mode.title}</h3>
      <p className="mt-1 flex-1 text-[13px] leading-snug text-muted-foreground">{mode.body}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {mode.meta.map((m) => (
          <span key={m} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {m}
          </span>
        ))}
      </div>
    </>
  );
  if (mode.disabled) {
    return <div className={cn(CARD, "flex h-full flex-col p-5 opacity-70")} aria-disabled>{inner}</div>;
  }
  return (
    <Link
      to={mode.href}
      className={cn(
        CARD,
        "group flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--bb-blue)/0.45)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {inner}
    </Link>
  );
}

function DomainCard({ testId, domain }: { testId: string; domain: DomainStats }) {
  const cover = domain.available ? domain.completed / domain.available : 0;
  return (
    <div className={cn(CARD, "flex h-full flex-col p-4")}>
      <div className="flex items-start gap-3">
        <Ring value={domain.mastery} size={48} stroke={5} color={masteryColor(domain.mastery)}>
          <span className="text-[11px] font-bold tabular-nums">
            {domain.mastery === null ? "—" : Math.round(domain.mastery * 100)}
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold leading-snug">{domain.name}</h3>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {domain.completed}/{domain.available} seen {"·"} ~{Math.round(domain.weight * 100)}% of section
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-[hsl(var(--bb-blue)/0.6)]"
          initial={{ width: 0 }}
          animate={{ width: `${cover * 100}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {domain.skills.slice(0, 4).map((s) => (
          <Link
            key={s.skillId}
            to={sessionHref(testId, { kind: "topic", skill: s.skillId, count: Math.min(10, Math.max(1, s.available)) })}
            title={`Practise ${s.name}`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 py-0.5 pl-0.5 pr-2 text-[11px] transition-colors hover:border-[hsl(var(--bb-blue)/0.5)] hover:bg-[hsl(var(--bb-blue-soft))]"
          >
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: masteryColor(s.mastery) }} />
            <span className="truncate">{s.name}</span>
          </Link>
        ))}
      </div>
      <Link
        to={sessionHref(testId, { kind: "topic", domain: domain.domainId, count: 10 })}
        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--bb-blue-soft))] px-3 py-2 text-[13px] font-semibold text-[hsl(var(--bb-blue))] transition-colors hover:bg-[hsl(var(--bb-blue))] hover:text-[hsl(var(--bb-blue-foreground))]"
      >
        Start 10 questions
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function Legend() {
  const items: [string, number | null][] = [
    ["Strong", 0.9],
    ["Building", 0.65],
    ["Weak", 0.3],
    ["Not rated", null],
  ];
  return (
    <div className="hidden items-center gap-3 sm:flex">
      {items.map(([l, v]) => (
        <span key={l} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: masteryColor(v) }} />
          {l}
        </span>
      ))}
    </div>
  );
}

/**
 * The custom builder. Always open, every field defaulted, and it counts the
 * matching questions as you change them so the set is never a surprise.
 */
function CustomBuilder({ testId }: { testId: string }) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<SubjectId | "all">("all");
  const [domain, setDomain] = useState("all");
  const [skill, setSkill] = useState("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "mixed">("mixed");
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState<number | null>(null);

  const domains = useMemo(
    () => SAT.subjects.filter((s) => subject === "all" || s.id === subject).flatMap((s) => s.domains),
    [subject],
  );
  const skills = useMemo(
    () => domains.filter((d) => domain === "all" || d.id === domain).flatMap((d) => d.skills),
    [domains, domain],
  );
  const matching = useMemo(
    () =>
      SAT_QUESTIONS.filter(
        (q) =>
          (subject === "all" || q.subjectId === subject) &&
          (domain === "all" || q.domainId === domain) &&
          (skill === "all" || q.skillId === skill) &&
          (difficulty === "mixed" || q.difficulty === difficulty),
      ).length,
    [subject, domain, skill, difficulty],
  );
  const setSize = Math.min(count, matching);

  const start = () => {
    navigate(
      sessionHref(testId, {
        kind: "custom",
        subject: subject === "all" ? undefined : subject,
        domain: domain === "all" ? undefined : domain,
        skill: skill === "all" ? undefined : skill,
        difficulty,
        count,
        minutes: minutes ?? undefined,
      }),
    );
  };

  return (
    <Reveal delay={0.1} as="section" className={cn(CARD, "overflow-hidden")}>
      <header className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <SlidersHorizontal className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-[16px] font-semibold tracking-tight">Build your own set</h2>
          <p className="text-[12px] text-muted-foreground">Choose the material, the difficulty, the length and the clock.</p>
        </div>
      </header>
      <div className="grid gap-0 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Section">
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
                <SelectContent className="bluebook">
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
                <SelectContent className="bluebook">
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
                <SelectContent className="bluebook">
                  <SelectItem value="all">Any skill</SelectItem>
                  {skills.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Difficulty">
            <Segmented
              value={difficulty}
              onChange={(v) => setDifficulty(v as Difficulty | "mixed")}
              options={[
                ["mixed", "Mixed"],
                ["easy", "Easy"],
                ["medium", "Medium"],
                ["hard", "Hard"],
              ]}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Questions">
              <Segmented
                value={String(count)}
                onChange={(v) => setCount(Number(v))}
                options={["5", "10", "15", "20", "30"].map((n) => [n, n])}
              />
            </Field>
            <Field label="Time limit">
              <Segmented
                value={minutes === null ? "none" : String(minutes)}
                onChange={(v) => setMinutes(v === "none" ? null : Number(v))}
                options={[
                  ["none", "Off"],
                  ["10", "10m"],
                  ["20", "20m"],
                  ["30", "30m"],
                  ["45", "45m"],
                ]}
              />
            </Field>
          </div>
        </div>
        <aside className="flex flex-col justify-between gap-4 border-t border-border/60 bg-muted/35 p-5 lg:border-l lg:border-t-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your set</p>
            <p className="mt-2 font-display text-4xl font-bold tabular-nums">{setSize}</p>
            <p className="text-[13px] text-muted-foreground">
              question{setSize === 1 ? "" : "s"} {"·"} {minutes ? `${minutes} min limit` : `~${Math.max(1, Math.round(setSize * 1.2))} min untimed`}
            </p>
            <p className="mt-3 text-[12px] leading-snug text-muted-foreground">
              {matching === 0
                ? "Nothing in the bank matches that combination. Loosen a filter."
                : matching < count
                  ? `Only ${matching} match, so the set is shorter. It is never padded with repeats.`
                  : `${matching} questions match. Ones you haven't seen come first.`}
            </p>
          </div>
          <Button onClick={start} disabled={matching === 0} className="h-11 w-full rounded-xl font-bold">
            Start set
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </aside>
      </div>
    </Reveal>
  );
}

function Segmented({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: string[][] }) {
  return (
    <div role="radiogroup" className="inline-flex w-full flex-wrap gap-1 rounded-xl bg-muted p-1">
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={cn(
              "relative min-w-[3rem] flex-1 rounded-lg px-3 py-1.5 text-[13px] font-semibold tabular-nums transition-colors",
              on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {on && (
              <motion.span
                layoutId={`seg-${options.map((o) => o[0]).join("")}`}
                className="absolute inset-0 rounded-lg bg-card shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
