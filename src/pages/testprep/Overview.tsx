import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, BookOpenCheck, CalendarDays, ChevronDown, Clock3, Flame, Gauge, Sparkles,
  Target, Timer, Trophy, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { blueprintFor } from "@/lib/testprep/blueprints";
import { examHref, resultsHref, sectionHref, sessionHref } from "@/lib/testprep/nav";
import { setDailyGoal, setTargetScore, setTestDate, useTestPrep } from "@/lib/testprep/store";
import { daysUntil, nextBestAction, overallStats, pct, type DomainStats, type SubjectStats } from "@/lib/testprep/stats";
import {
  activityByDay, answeredToday, currentStreak, dailyGoal, greeting, minutesPracticed, scoreHistory,
} from "@/lib/testprep/insights";
import { PageHeader, TestPrepShell } from "@/components/testprep/TestPrepShell";
import { CredlyCredentials } from "@/components/credentials/CredlyCredentials";
import { Reveal } from "@/components/testprep/motion";
import { TestNotAvailable } from "@/components/testprep/TestNotAvailable";
import { DayBars, Ring, ScoreGauge, TrendChart } from "@/components/testprep/viz";
import { masteryColor } from "@/lib/testprep/ui";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";

const CARD = "rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

/**
 * The SAT command centre.
 *
 * Top row: where you stand (the score dial against the target), how today is
 * going (goal ring, streak, the last two weeks), and how long is left. Then
 * the one thing to do next with the other ways in beside it, then both
 * sections domain by domain, then the score line and recent sittings.
 */
export default function TestPrepOverview() {
  const { testId = "sat" } = useParams();
  const blueprint = blueprintFor(testId);
  const profile = useTestPrep();
  const navigate = useNavigate();
  const stats = useMemo(() => overallStats(profile), [profile]);
  const next = useMemo(() => nextBestAction(profile), [profile]);
  const days14 = useMemo(() => activityByDay(profile, 14), [profile]);
  const streak = useMemo(() => currentStreak(profile), [profile]);
  const today = useMemo(() => answeredToday(profile), [profile]);
  const history = useMemo(() => scoreHistory(profile), [profile]);
  const minutes = useMemo(() => minutesPracticed(profile), [profile]);
  const goal = dailyGoal(profile);

  if (!blueprint) return <TestNotAvailable name="Test Prep" subtitle="Unknown test" />;
  if (!blueprint.available) return <TestNotAvailable name={blueprint.name} subtitle={blueprint.subtitle} />;

  const days = daysUntil(profile.testDate);
  const remaining = stats.available - stats.completed;
  const perDay = days && days > 0 ? Math.ceil(remaining / days) : null;
  const gap = stats.estimatedScore !== null ? profile.targetScore - stats.estimatedScore : null;
  const recent = profile.attempts.slice(0, 5);

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
          title={`${blueprint.name} Prep`}
          purpose={greeting(streak, today, goal)}
          actions={<TargetsDialog />}
        />

        {/* ── Top row ─────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <Reveal delay={0.02} className={cn(CARD, "relative overflow-hidden p-5 lg:col-span-5")}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Estimated score</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--bb-rule)/0.22)] px-2.5 py-1 text-[11px] font-semibold text-foreground">
                <Target className="h-3.5 w-3.5" />
                Target {profile.targetScore}
              </span>
            </div>
            <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
              <ScoreGauge
                value={stats.estimatedScore}
                target={profile.targetScore}
                size={210}
                caption={
                  <>
                    <span className="font-display text-[44px] font-bold leading-none tracking-tight tabular-nums text-foreground">
                      {stats.estimatedScore ?? "—"}
                    </span>
                    <span className="mt-1.5 text-[11px] text-muted-foreground">
                      {stats.estimatedScore !== null ? "of 1600" : "needs 8+ answers per section"}
                    </span>
                  </>
                }
              />
              <div className="w-full flex-1 space-y-3">
                {stats.subjects.map((s) => (
                  <SectionScore key={s.subjectId} subject={s} />
                ))}
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-[12px] leading-snug text-muted-foreground">
                  {gap === null
                    ? "Answer a few questions in both sections and your estimate appears here."
                    : gap <= 0
                      ? "Your practice is at or above target. Sit a full test to confirm it."
                      : `${gap} points from target. The fastest points are in your weakest domains below.`}
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06} className={cn(CARD, "p-5 lg:col-span-4")}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Today</p>
              <GoalEditor goal={goal} />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <Ring value={Math.min(1, today / goal)} size={84} stroke={9}>
                <div className="text-center leading-none">
                  <div className="font-display text-xl font-bold tabular-nums">{today}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">of {goal}</div>
                </div>
              </Ring>
              <div className="grid flex-1 grid-cols-2 gap-2">
                <MiniStat icon={Flame} tone="text-orange-500" value={streak} label={streak === 1 ? "day streak" : "day streak"} />
                <MiniStat icon={Clock3} tone="text-[hsl(var(--bb-blue))]" value={minutes} label="minutes total" />
                <MiniStat icon={BookOpenCheck} tone="text-emerald-600" value={stats.totalAttempts} label="answers" />
                <MiniStat icon={Gauge} tone="text-violet-600" value={pct(stats.accuracy)} label="accuracy" />
              </div>
            </div>
            <div className="mt-4">
              <DayBars days={days14} goal={goal} />
            </div>
          </Reveal>

          <Reveal delay={0.1} className={cn(CARD, "flex flex-col overflow-hidden lg:col-span-3")}>
            <div className="border-b-[3px] border-[hsl(var(--bb-rule))] bg-[hsl(var(--bb-navy))] px-5 py-4 text-[hsl(var(--bb-navy-foreground))]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">Test day</p>
              {days !== null && days >= 0 ? (
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-5xl font-bold leading-none tabular-nums">{days}</span>
                  <span className="text-sm opacity-80">day{days === 1 ? "" : "s"} to go</span>
                </div>
              ) : (
                <p className="mt-1.5 font-display text-2xl font-bold">{days === null ? "Not booked" : "Passed"}</p>
              )}
              <p className="mt-1.5 text-[12px] opacity-75">
                {profile.testDate ? formatLongDate(profile.testDate) : "Set a date to pace your practice"}
              </p>
            </div>
            <div className="flex flex-1 flex-col justify-between gap-3 p-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Bank covered</span>
                  <span className="font-semibold tabular-nums">{stats.completed}/{stats.available}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-[hsl(var(--bb-blue))]"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.coverage * 100}%` }}
                    transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
                  />
                </div>
                <p className="text-[12px] leading-snug text-muted-foreground">
                  {perDay !== null
                    ? `${perDay} new question${perDay === 1 ? "" : "s"} a day covers the rest before test day.`
                    : remaining > 0
                      ? `${remaining} questions you haven't seen yet.`
                      : "You've seen every question in the bank."}
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to={examHref(blueprint.id, ["rw", "math"])}>
                  <Trophy className="mr-1.5 h-4 w-4 text-amber-500" />
                  Full practice test
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>

        {/* ── Next move + ways in ─────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-12">
          {next && (
            <Reveal
              delay={0.12}
              className="relative overflow-hidden rounded-2xl bg-[hsl(var(--bb-blue))] p-5 text-[hsl(var(--bb-blue-foreground))] lg:col-span-7"
            >
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
              <div className="relative">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Your next move
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">{next.skillName}</h2>
                <p className="mt-1 max-w-lg text-sm leading-snug opacity-85">{next.reason}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
                  <Chip>{next.domainName}</Chip>
                  <Chip>{next.count} questions</Chip>
                  <Chip>~{next.minutes} min</Chip>
                  {next.mastery !== null && <Chip>{pct(next.mastery)} mastery</Chip>}
                </div>
                <Button
                  onClick={() => navigate(sessionHref(blueprint.id, { kind: "topic", skill: next.skillId, count: next.count }))}
                  className="mt-5 h-11 rounded-xl bg-[hsl(var(--bb-rule))] px-5 font-bold text-black shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:bg-[hsl(var(--bb-rule)/0.9)]"
                >
                  Start this set
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </Reveal>
          )}
          <div className={cn("grid gap-3 sm:grid-cols-3 lg:grid-cols-1", next ? "lg:col-span-5" : "lg:col-span-12 lg:grid-cols-3")}>
            <QuickLink
              delay={0.14}
              icon={Zap}
              title="Quick ten"
              sub="Mixed, untimed"
              href={sessionHref(blueprint.id, { kind: "quick", count: 10 })}
            />
            <QuickLink
              delay={0.16}
              icon={Timer}
              title="Timed twenty"
              sub="25 minutes, test pace"
              href={sessionHref(blueprint.id, { kind: "timed", count: 20, minutes: 25 })}
            />
            <QuickLink
              delay={0.18}
              icon={CalendarDays}
              title="Section test"
              sub="One section, two modules"
              href={sectionHref(blueprint.id, "exams")}
            />
          </div>
        </div>

        {/* ── Sections ────────────────────────────────────────── */}
        <div className="grid gap-4 xl:grid-cols-2">
          {stats.subjects.map((subject, i) => (
            <Reveal key={subject.subjectId} delay={0.18 + i * 0.05} className={cn(CARD, "overflow-hidden")}>
              <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Ring value={subject.available ? subject.completed / subject.available : 0} size={44} stroke={5}>
                    <span className="text-[10px] font-bold tabular-nums">
                      {Math.round((subject.available ? subject.completed / subject.available : 0) * 100)}%
                    </span>
                  </Ring>
                  <div>
                    <h2 className="font-display text-[17px] font-semibold tracking-tight">{subject.name}</h2>
                    <p className="text-[12px] text-muted-foreground">
                      {subject.score !== null
                        ? `Section estimate ${subject.score} · ${subject.correct}/${subject.attempts} correct`
                        : `${subject.completed} of ${subject.available} questions seen`}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <Link to={sessionHref(blueprint.id, { kind: "topic", subject: subject.subjectId, count: 10 })}>
                    Practise
                  </Link>
                </Button>
              </header>
              <ul className="divide-y divide-border/60">
                {subject.domains.map((d) => (
                  <DomainRow key={d.domainId} testId={blueprint.id} domain={d} />
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        {/* ── Score line + recent sittings ────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <Reveal delay={0.08} className={cn(CARD, "p-5 lg:col-span-8")}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-[15px] font-semibold">Score over time</h2>
                <p className="text-[12px] text-muted-foreground">Full practice tests, against your target.</p>
              </div>
              <Link to={sectionHref(blueprint.id, "progress")} className="text-[12px] font-semibold text-[hsl(var(--bb-blue))] hover:underline">
                All progress
              </Link>
            </div>
            {history.length >= 2 ? (
              <div className="mt-3">
                <TrendChart
                  points={history.slice(-8).map((p) => ({
                    id: p.id,
                    label: p.at.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                    value: p.score,
                  }))}
                  min={Math.max(400, Math.floor((Math.min(profile.targetScore, ...history.map((h) => h.score)) - 60) / 100) * 100)}
                  max={Math.min(1600, Math.ceil((Math.max(profile.targetScore, ...history.map((h) => h.score)) + 60) / 100) * 100)}
                  target={profile.targetScore}
                  onPointClick={(p) => navigate(resultsHref(blueprint.id, p.id))}
                />
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
                <Trophy className="h-7 w-7 text-amber-500" />
                <p className="max-w-sm text-sm text-muted-foreground">
                  {history.length === 1
                    ? `One sitting so far: ${history[0].score}. Sit another and your trend line starts.`
                    : "Your score line starts after your first two full practice tests."}
                </p>
                <Button asChild size="sm">
                  <Link to={examHref(blueprint.id, ["rw", "math"])}>Sit a practice test</Link>
                </Button>
              </div>
            )}
          </Reveal>

          <Reveal delay={0.12} className={cn(CARD, "p-5 lg:col-span-4")}>
            <h2 className="font-display text-[15px] font-semibold">Recent activity</h2>
            {recent.length ? (
              <ul className="mt-3 space-y-1">
                {recent.map((a) => {
                  const acc = a.totalQuestions ? a.correct / a.totalQuestions : 0;
                  return (
                    <li key={a.id}>
                      <Link
                        to={resultsHref(blueprint.id, a.id)}
                        className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                      >
                        <Ring value={acc} size={36} stroke={4} color={masteryColor(acc)}>
                          <span className="text-[9px] font-bold tabular-nums">{Math.round(acc * 100)}</span>
                        </Ring>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{a.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {a.correct}/{a.totalQuestions} correct
                            {typeof a.score === "number" ? ` · ${a.score}` : ""}
                            {" · "}
                            {relTime(a.finishedAt)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Finished sets and tests show up here.</p>
            )}
          </Reveal>
        </div>

        {/* Official results, as opposed to the practice estimate above. Only
            what an issuer published as a Credly badge can be verified here;
            everything else stays self-reported on the student's profile. */}
        <Reveal delay={0.14} className={cn(CARD, "p-5")}>
          <CredlyCredentials
            categories={["test"]}
            title="Verified scores and certificates"
            description="Official results issued as Credly badges, such as AP, IB, IELTS or TOEFL, checked with Credly and kept next to your practice scores."
            emptyText="Nothing verified yet. When an exam body issues you a Credly badge, add it here so it sits on your file as proof."
          />
        </Reveal>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Questions are written by Pathforge to the published digital SAT specification. They are not College Board
          material.{" "}
          <Link to={sectionHref(blueprint.id, "question-bank")} className="text-[hsl(var(--bb-blue))] hover:underline">
            Browse the bank
          </Link>
          .
        </p>
      </div>
    </TestPrepShell>
  );
}

function SectionScore({ subject }: { subject: SubjectStats }) {
  const [lo, hi] = [200, 800];
  const v = subject.score;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium">{subject.name}</span>
        <span className="font-display text-[15px] font-bold tabular-nums">{v ?? "—"}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-[hsl(var(--bb-blue))]"
          initial={{ width: 0 }}
          animate={{ width: `${v === null ? 0 : ((v - lo) / (hi - lo)) * 100}%` }}
          transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
        />
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon, tone, value, label,
}: { icon: typeof Flame; tone: string; value: number | string; label: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", tone)} />
        <span className="font-display text-[15px] font-bold tabular-nums leading-none">{value}</span>
      </div>
      <p className="mt-1 text-[10.5px] leading-none text-muted-foreground">{label}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">{children}</span>;
}

function QuickLink({
  icon: Icon, title, sub, href, delay,
}: { icon: typeof Zap; title: string; sub: string; href: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <Link
        to={href}
        className={cn(
          CARD,
          "group flex h-full items-center gap-3.5 p-4 transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--bb-blue)/0.45)] hover:shadow-md",
        )}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--bb-blue-soft))] text-[hsl(var(--bb-blue))] transition-colors group-hover:bg-[hsl(var(--bb-blue))] group-hover:text-[hsl(var(--bb-blue-foreground))]">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">{title}</span>
          <span className="block text-[12px] text-muted-foreground">{sub}</span>
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Reveal>
  );
}

/** One domain: its mastery ring, coverage, weight, and its skills on demand. */
function DomainRow({ testId, domain }: { testId: string; domain: DomainStats }) {
  const [open, setOpen] = useState(false);
  const cover = domain.available ? domain.completed / domain.available : 0;
  return (
    <li>
      <div className="flex items-center gap-3 px-5 py-3">
        <Ring value={domain.mastery} size={42} stroke={5} color={masteryColor(domain.mastery)}>
          <span className="text-[10px] font-bold tabular-nums">
            {domain.mastery === null ? "—" : Math.round(domain.mastery * 100)}
          </span>
        </Ring>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-medium">{domain.name}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="h-1 w-24 overflow-hidden rounded-full bg-muted sm:w-32">
              <span className="block h-full rounded-full bg-[hsl(var(--bb-blue)/0.55)]" style={{ width: `${cover * 100}%` }} />
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {domain.completed}/{domain.available} seen
            </span>
            <span className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              ~{Math.round(domain.weight * 100)}% of section
            </span>
          </span>
        </button>
        <Link
          to={sessionHref(testId, { kind: "topic", domain: domain.domainId, count: 10 })}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-[hsl(var(--bb-blue))] transition-colors hover:bg-[hsl(var(--bb-blue-soft))]"
        >
          Practise
        </Link>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 px-5 pb-4 pl-[76px]">
              {domain.skills.map((s) => (
                <Link
                  key={s.skillId}
                  to={sessionHref(testId, { kind: "topic", skill: s.skillId, count: Math.min(10, Math.max(1, s.available)) })}
                  className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-background py-1 pl-1 pr-3 text-[12px] transition-colors hover:border-[hsl(var(--bb-blue)/0.5)] hover:bg-[hsl(var(--bb-blue-soft))]"
                >
                  <span
                    className="flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[9.5px] font-bold tabular-nums text-white"
                    style={{ background: masteryColor(s.mastery) }}
                  >
                    {s.mastery === null ? "–" : Math.round(s.mastery * 100)}
                  </span>
                  {s.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function GoalEditor({ goal }: { goal: number }) {
  const [open, setOpen] = useState(false);
  const options = [10, 20, 30, 50];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        Goal {goal}/day
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-20 mt-1.5 flex gap-1 rounded-xl border bg-card p-1.5 shadow-lg"
          >
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  setDailyGoal(o);
                  setOpen(false);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[12px] font-semibold tabular-nums transition-colors",
                  o === goal ? "bg-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue-foreground))]" : "hover:bg-muted",
                )}
              >
                {o}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  const presets = [1200, 1350, 1450, 1500, 1550];

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
        <Button variant="outline" size="sm" className="gap-1.5">
          <Target className="h-4 w-4" />
          Target and date
        </Button>
      </DialogTrigger>
      <DialogContent className="bluebook sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Target and test date</DialogTitle>
          <DialogDescription>Both are used to pace practice. Neither is shared with anyone.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tp-target">Target score</Label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTarget(String(p))}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12px] font-semibold tabular-nums transition-colors",
                    Number(target) === p
                      ? "border-[hsl(var(--bb-blue))] bg-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue-foreground))]"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <Input
              id="tp-target"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-invalid={!valid}
              aria-describedby="tp-target-hint"
              className={valid ? undefined : "border-destructive focus-visible:ring-destructive"}
            />
            <p id="tp-target-hint" className={`text-xs ${valid ? "text-muted-foreground" : "text-destructive"}`}>
              {valid ? "Between 400 and 1600. Rounded to the nearest ten." : "Enter a number between 400 and 1600."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tp-date">Test date</Label>
            <Input id="tp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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

function formatLongDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
