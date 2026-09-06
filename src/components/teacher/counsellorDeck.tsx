import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight, Check, ChevronDown, ChevronUp, Clock,
  FileText, GraduationCap, Mail, MessageSquare, Mic, Plus, Search,
  ClipboardList, TrendingUp, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHead, Rise } from "@/components/dashboard/deck";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCounselorDailyFocus } from "@/hooks/useCounselorDailyFocus";
import { useCounselorFollowups, type Followup } from "@/hooks/useCounselorFollowups";
import { useFellowCounsellors } from "@/hooks/useFellowCounsellors";
import type { RosterStudent } from "@/hooks/useTeacherRoster";
import type { RecentSignal } from "@/hooks/useCounselorActivity";

/**
 * The counsellor deck.
 *
 * The student home is four flat blocks in one typeface with exactly one filled
 * card, and this is the same page with the counsellor's data in it: today's
 * work is the filled card because it is the block that changes every morning,
 * the cohort takes the slot the college list takes, and everything below is a
 * reference you consult rather than read.
 *
 * The blocks here replace the six differently-styled panels this page used to
 * carry. No feature was dropped in the process — the daily focus list, the
 * follow-up tracker, the colleague list and the roster all still write to the
 * same tables through the same hooks; they are simply drawn in one language
 * now instead of five.
 *
 * Every number on this page is derived from a real row. Nothing is filled in
 * to make a card look complete: an empty cohort says it is empty.
 */

// Same steps as the student deck. Kept local rather than exported across the
// two files so neither page can quietly change the other's type scale.
const T = {
  title: "text-[clamp(1.5rem,2.6vw,2rem)] font-semibold leading-[1.1] tracking-[-0.03em]",
  row: "text-[15px] font-medium leading-[1.35] tracking-[-0.012em]",
  body: "text-[14.5px] font-normal leading-[1.6] tracking-[-0.006em]",
  note: "text-[12.5px] font-normal leading-[1.5] tracking-[-0.003em]",
} as const;

const todayISO = () => new Date().toISOString().slice(0, 10);

function initial(name: string): string {
  return (name.trim()[0] ?? "S").toUpperCase();
}

function displayName(s: { username: string | null; email: string | null }): string {
  return s.username || s.email || "Student";
}

// ── Today ─────────────────────────────────────────────────────────────

/**
 * The one filled card.
 *
 * Two lists in it: what the data says is urgent, and what you decided was.
 * The first is derived and cannot be edited; the second is yours and persists.
 */
export function TodayCard({
  students,
  followups,
  inactive,
}: {
  students: RosterStudent[];
  followups: Followup[];
  inactive: Array<{ user_id: string; display_name: string; daysInactive: number }>;
}) {
  const { items, add, toggle, remove } = useCounselorDailyFocus();
  const [draft, setDraft] = useState("");
  const today = todayISO();

  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, displayName(s)])),
    [students],
  );

  const signals = useMemo(() => {
    const out: Array<{ id: string; label: string; href: string; urgent: boolean }> = [];

    followups
      .filter((f) => f.status === "open" && f.due_date <= today)
      .slice(0, 6)
      .forEach((f) => {
        out.push({
          id: `f-${f.id}`,
          label: `Follow up with ${nameMap.get(f.student_id) ?? "a student"} — ${f.note}`,
          href: `/teacher/students/${f.student_id}`,
          urgent: f.due_date < today,
        });
      });

    students
      .filter((s) => s.status === "behind")
      .slice(0, 3)
      .forEach((s) => {
        out.push({
          id: `b-${s.user_id}`,
          label: `Set the next step for ${displayName(s)} — ${s.overall_score}/100`,
          href: `/teacher/students/${s.user_id}`,
          urgent: true,
        });
      });

    inactive.slice(0, 3).forEach((s) => {
      out.push({
        id: `i-${s.user_id}`,
        label: `Re-engage ${s.display_name} — ${s.daysInactive >= 999 ? "never active" : `${s.daysInactive} days quiet`}`,
        href: `/teacher/students/${s.user_id}`,
        urgent: false,
      });
    });

    return out;
  }, [followups, students, inactive, nameMap, today]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    await add(title);
  };

  return (
    <Rise className="h-full">
      <Card tone="filled" className="flex h-full flex-col">
        <CardHead
          title="Today"
          sub={
            signals.length > 0
              ? "What your roster is asking for, and whatever else you put on the list."
              : "Nothing is flagged across your roster right now. Your own list is below."
          }
          filled
        />

        <div className="mt-7 flex-1 space-y-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">
              From your roster
            </p>
            {signals.length === 0 ? (
              <p className={cn("mt-3 text-white/70", T.body)}>
                No overdue follow-ups, nobody below thirty, nobody quiet for a week.
              </p>
            ) : (
              <ul className="mt-3 space-y-px">
                {signals.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={s.href}
                      className="group flex items-start gap-3 rounded-xl px-3 py-2.5 -mx-3 transition-colors hover:bg-white/10"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full",
                          s.urgent ? "bg-white" : "bg-white/40",
                        )}
                      />
                      <span className={cn("min-w-0 flex-1 text-white", T.row)}>{s.label}</span>
                      <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-white/40 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">
              Your list
            </p>
            {items.length > 0 && (
              <ul className="mt-3 space-y-px">
                <AnimatePresence initial={false}>
                  {items.map((it) => (
                    <motion.li
                      key={it.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2 -mx-3 hover:bg-white/10"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(it.id, !it.done)}
                        aria-label={it.done ? "Mark as not done" : "Mark as done"}
                        className={cn(
                          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                          it.done ? "border-white bg-white" : "border-white/40 hover:border-white",
                        )}
                      >
                        {it.done && <Check className="h-3 w-3 text-[hsl(var(--primary))]" />}
                      </button>
                      <span
                        className={cn(
                          "min-w-0 flex-1",
                          T.row,
                          it.done ? "text-white/45 line-through" : "text-white",
                        )}
                      >
                        {it.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(it.id)}
                        aria-label="Remove task"
                        className="shrink-0 text-white/40 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}

            <form onSubmit={submit} className="mt-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={200}
                placeholder="Add something for today"
                aria-label="Add a task for today"
                className="h-10 min-w-0 flex-1 rounded-xl border border-white/25 bg-white/10 px-3.5 text-[14.5px] text-white placeholder:text-white/50 outline-none transition-colors focus:border-white/60"
              />
              <button
                type="submit"
                aria-label="Add task"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 text-white transition-colors hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </Card>
    </Rise>
  );
}

// ── The cohort ────────────────────────────────────────────────────────

/**
 * The counsellor's equivalent of the student's college list: the short,
 * ordered answer to "who am I responsible for, and who first".
 */
export function CohortCard({
  students,
  loading,
}: {
  students: RosterStudent[];
  loading: boolean;
}) {
  const ranked = useMemo(() => {
    const rank = (s: RosterStudent) => (s.status === "behind" ? 0 : s.status === "steady" ? 1 : 2);
    return [...students]
      .sort((a, b) => rank(a) - rank(b) || a.overall_score - b.overall_score)
      .slice(0, 7);
  }, [students]);

  const behind = students.filter((s) => s.status === "behind").length;

  return (
    <Rise delay={0.05} className="h-full">
      <Card className="flex h-full flex-col">
        <CardHead
          title="Your cohort"
          sub={
            students.length === 0
              ? "Students who pick your school during onboarding land here."
              : `${students.length} linked, ordered by who needs you first.`
          }
          to="#roster"
          action="Full roster"
        />

        <div className="mt-6 flex-1">
          {loading ? (
            <p className={cn("text-muted-foreground", T.body)}>Loading your roster…</p>
          ) : ranked.length === 0 ? (
            <p className={cn("text-muted-foreground", T.body)}>
              No students linked yet. Nothing here is estimated — the list stays empty until a
              student links to your school.
            </p>
          ) : (
            <ul className="-mx-3 space-y-px">
              {ranked.map((s) => (
                <li key={s.user_id}>
                  <Link
                    to={`/teacher/students/${s.user_id}`}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-[13px] font-semibold text-foreground">
                      {initial(displayName(s))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-foreground", T.row)}>
                        {displayName(s)}
                      </span>
                      <span className={cn("block truncate text-muted-foreground", T.note)}>
                        {s.intended_major || "Major undecided"} · Grade {s.grade ?? "—"} ·{" "}
                        {s.overall_score > 0 ? `${s.overall_score}/100` : "not scored yet"}
                      </span>
                    </span>
                    {s.status === "behind" && (
                      <span className={cn("shrink-0 text-destructive", T.note)}>Priority</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {students.length > 0 && (
          <p className={cn("mt-6 text-muted-foreground", T.note)}>
            {behind === 0
              ? "Nobody is currently below thirty."
              : `${behind} student${behind === 1 ? "" : "s"} below thirty.`}
          </p>
        )}
      </Card>
    </Rise>
  );
}

// ── Follow-ups ────────────────────────────────────────────────────────

/**
 * The follow-up tracker. Same table, same three groups it always had — the
 * form is now part of the card rather than a collapsed drawer inside it.
 */
export function FollowupsCard({ students }: { students: RosterStudent[] }) {
  const { items, add, setStatus, remove } = useCounselorFollowups();
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(true);

  const today = todayISO();
  const openItems = items.filter((i) => i.status === "open");
  const overdue = openItems.filter((i) => i.due_date < today);
  const dueToday = openItems.filter((i) => i.due_date === today);
  const upcoming = openItems.filter((i) => i.due_date > today).slice(0, 8);

  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, displayName(s)])),
    [students],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !note.trim()) {
      toast.error("Pick a student and write what the follow-up is about");
      return;
    }
    const { error } = (await add({ student_id: studentId, due_date: date, note: note.trim() })) ?? {};
    if (error) toast.error(error.message);
    else {
      toast.success("Follow-up added");
      setNote("");
    }
  };

  return (
    <Rise delay={0.05}>
      <Card>
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <h2 className={T.title}>Follow-ups</h2>
            <p className={cn("mt-2 max-w-[52ch] text-muted-foreground", T.body)}>
              {openItems.length === 0
                ? "Nothing tracked. Add one below and it appears on Today when it comes due."
                : `${openItems.length} open${overdue.length ? `, ${overdue.length} overdue` : ""}${
                    dueToday.length ? `, ${dueToday.length} due today` : ""
                  }.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="-m-2 mt-0 inline-flex min-h-[44px] shrink-0 items-center gap-1 p-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {open ? "Collapse" : "Expand"}
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <form onSubmit={submit} className="mt-6 grid gap-2 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger className="h-10 rounded-xl text-sm">
                      <SelectValue placeholder="Student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          No students linked yet
                        </div>
                      ) : (
                        students.map((s) => (
                          <SelectItem key={s.user_id} value={s.user_id}>
                            {displayName(s)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Due date"
                  className="h-10 rounded-xl text-sm md:col-span-2"
                />
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  placeholder="What to follow up on"
                  aria-label="Follow-up note"
                  className="h-10 rounded-xl text-sm md:col-span-5"
                />
                <button
                  type="submit"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 md:col-span-1"
                >
                  <Plus className="h-4 w-4" />
                  <span className="md:hidden">Add follow-up</span>
                </button>
              </form>

              {openItems.length > 0 && (
                <div className="mt-6 space-y-6">
                  <FollowupGroup title="Overdue" urgent items={overdue} nameMap={nameMap} setStatus={setStatus} remove={remove} />
                  <FollowupGroup title="Due today" urgent items={dueToday} nameMap={nameMap} setStatus={setStatus} remove={remove} />
                  <FollowupGroup title="Upcoming" items={upcoming} nameMap={nameMap} setStatus={setStatus} remove={remove} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </Rise>
  );
}

function FollowupGroup({
  title, items, nameMap, setStatus, remove, urgent = false,
}: {
  title: string;
  items: Followup[];
  nameMap: Map<string, string>;
  setStatus: (id: string, status: Followup["status"]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  urgent?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title} · {items.length}
      </p>
      <ul className="-mx-3 mt-2 space-y-px">
        <AnimatePresence initial={false}>
          {items.map((f) => (
            <motion.li
              key={f.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="group flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50"
            >
              <button
                type="button"
                onClick={() => setStatus(f.id, "done")}
                aria-label="Mark follow-up done"
                className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border border-border transition-colors hover:border-foreground"
              >
                <Check className="h-3 w-3 text-transparent group-hover:text-muted-foreground" />
              </button>
              <Link to={`/teacher/students/${f.student_id}`} className="min-w-0 flex-1">
                <span className={cn("block text-foreground", T.row)}>
                  {nameMap.get(f.student_id) ?? "Student"}
                  <span className="font-normal text-muted-foreground"> — {f.note}</span>
                </span>
                <span className={cn("block text-muted-foreground", T.note, urgent && "text-destructive")}>
                  Due {new Date(f.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => remove(f.id)}
                aria-label="Remove follow-up"
                className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

// ── Signals ───────────────────────────────────────────────────────────

const KIND_ICON = {
  advisor: Mic,
  readiness: ClipboardList,
  application: FileText,
  outcomes: GraduationCap,
  journey: TrendingUp,
} as const;

function since(iso: string): string {
  const m = Math.round((Date.now() - +new Date(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function SignalsCard({
  recent,
  deadlines,
  inactive,
  loading,
}: {
  recent: RecentSignal[];
  deadlines: Array<{ id: string; student_id: string; college_name: string; display_name: string; stage: string; daysAway: number }>;
  inactive: Array<{ user_id: string; display_name: string; daysInactive: number; overall_score: number }>;
  loading: boolean;
}) {
  return (
    <Rise delay={0.1}>
      <Card>
        <CardHead
          title="Signals"
          sub="Everything the platform noticed on its own: what students did, what is due, and who has gone quiet."
        />

        <div className="mt-7 grid gap-8 lg:grid-cols-3">
          <SignalColumn title="Activity" meta="last 14 days" loading={loading} empty={recent.length === 0}
            emptyText="Nothing in two weeks. A note from a student's profile is the fastest way to restart a conversation.">
            <ul className="-mx-3 space-y-px">
              {recent.slice(0, 6).map((r) => {
                const Icon = KIND_ICON[r.kind] ?? MessageSquare;
                return (
                  <li key={r.id}>
                    <Link
                      to={`/teacher/students/${r.user_id}`}
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <Icon className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-foreground", T.row)}>
                          {r.display_name}
                          <span className="font-normal text-muted-foreground"> — {r.label}</span>
                        </span>
                        <span className={cn("block text-muted-foreground", T.note)}>{since(r.at)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </SignalColumn>

          <SignalColumn title="Deadlines" meta="next 60 days" loading={loading} empty={deadlines.length === 0}
            emptyText="No dated applications yet. Deadlines appear once a student adds a target college with a date.">
            <ul className="-mx-3 space-y-px">
              {deadlines.slice(0, 6).map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/teacher/students/${d.student_id}`}
                    className="flex items-baseline gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-foreground", T.row)}>{d.college_name}</span>
                      <span className={cn("block truncate text-muted-foreground", T.note)}>
                        {d.display_name} · {d.stage}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        T.note,
                        d.daysAway < 0 || d.daysAway <= 7 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {d.daysAway < 0 ? "overdue" : `${d.daysAway}d`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SignalColumn>

          <SignalColumn title="Gone quiet" meta="7 days or more" loading={loading} empty={inactive.length === 0}
            emptyText="Everyone with a weak profile has been on the platform in the last week.">
            <ul className="-mx-3 space-y-px">
              {inactive.slice(0, 6).map((s) => (
                <li key={s.user_id}>
                  <Link
                    to={`/teacher/students/${s.user_id}`}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <Clock className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-foreground", T.row)}>{s.display_name}</span>
                      <span className={cn("block text-muted-foreground", T.note)}>
                        {s.daysInactive >= 999 ? "never active" : `${s.daysInactive} days quiet`} ·{" "}
                        {s.overall_score}/100
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SignalColumn>
        </div>
      </Card>
    </Rise>
  );
}

function SignalColumn({
  title, meta, loading, empty, emptyText, children,
}: {
  title: string;
  meta: string;
  loading: boolean;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={cn("text-foreground", T.row)}>{title}</h3>
        <span className={cn("text-muted-foreground", T.note)}>{meta}</span>
      </div>
      <div className="mt-3">
        {loading ? (
          <p className={cn("text-muted-foreground", T.body)}>Loading…</p>
        ) : empty ? (
          <p className={cn("text-muted-foreground", T.body)}>{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ── Colleagues ────────────────────────────────────────────────────────

export function ColleaguesCard() {
  const { items, loading, error } = useFellowCounsellors();

  return (
    <Rise delay={0.1}>
      <Card className="h-full">
        <CardHead
          title="Colleagues"
          sub="Other verified counsellors at your school."
        />
        <div className="mt-6">
          {loading ? (
            <p className={cn("text-muted-foreground", T.body)}>Loading…</p>
          ) : error ? (
            <p className={cn("text-muted-foreground", T.body)}>Unable to load colleagues right now.</p>
          ) : items.length === 0 ? (
            <p className={cn("text-muted-foreground", T.body)}>
              You are the only verified counsellor at your school so far.
            </p>
          ) : (
            <ul className="-mx-3 space-y-px">
              {items.map((c) => {
                const name = c.username || c.email?.split("@")[0] || "Counsellor";
                const role = c.school_role || c.title || "Counsellor";
                return (
                  <li key={c.user_id} className="flex items-start gap-3 rounded-xl px-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-[13px] font-semibold text-foreground">
                      {initial(name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-foreground", T.row)}>{name}</span>
                      <span className={cn("block truncate text-muted-foreground", T.note)}>
                        {role}
                        {c.subject ? ` · ${c.subject}` : ""}
                      </span>
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className={cn(
                            "mt-1 inline-flex items-center gap-1.5 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline",
                            T.note,
                          )}
                        >
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </Rise>
  );
}

// ── Roster ────────────────────────────────────────────────────────────

type PriorityFilter = "all" | "high" | "needs" | "track";
type SortKey = "priority" | "score_asc" | "score_desc" | "name";

export function RosterCard({
  students,
  loading,
}: {
  students: RosterStudent[];
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = students.filter((s) => {
      if (q) {
        const hay = `${s.username ?? ""} ${s.email ?? ""} ${s.intended_major ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (priorityFilter === "high") return s.status === "behind";
      if (priorityFilter === "needs") return s.status === "steady";
      if (priorityFilter === "track") return s.status === "top";
      return true;
    });
    const rank = (status: string) => (status === "behind" ? 0 : status === "steady" ? 1 : 2);
    return [...list].sort((a, b) => {
      if (sortKey === "score_asc") return a.overall_score - b.overall_score;
      if (sortKey === "score_desc") return b.overall_score - a.overall_score;
      if (sortKey === "name") return displayName(a).toLowerCase().localeCompare(displayName(b).toLowerCase());
      return rank(a.status) - rank(b.status) || a.overall_score - b.overall_score;
    });
  }, [students, search, priorityFilter, sortKey]);

  return (
    <Rise delay={0.1}>
      <Card as="section">
        <div id="roster" />
        <CardHead
          title="Roster"
          sub={
            students.length === 0
              ? "Every student linked to your school will be listed here."
              : `${filtered.length} of ${students.length} shown.`
          }
        />

        <div className="mt-6 grid gap-2 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or major"
              aria-label="Search roster"
              className="h-10 rounded-xl pl-10 text-sm"
            />
          </div>
          <div className="md:col-span-3">
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                <SelectItem value="high">Priority only</SelectItem>
                <SelectItem value="needs">Needs attention only</SelectItem>
                <SelectItem value="track">On track only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Sort by priority</SelectItem>
                <SelectItem value="score_asc">Sort by score, lowest first</SelectItem>
                <SelectItem value="score_desc">Sort by score, highest first</SelectItem>
                <SelectItem value="name">Sort by name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <p className={cn("text-muted-foreground", T.body)}>Loading roster…</p>
          ) : students.length === 0 ? (
            <p className={cn("max-w-[60ch] text-muted-foreground", T.body)}>
              No students linked yet. Students who select your school during onboarding appear here
              automatically — nothing is listed until they do.
            </p>
          ) : filtered.length === 0 ? (
            <p className={cn("text-muted-foreground", T.body)}>No students match those filters.</p>
          ) : (
            <ul className="-mx-3 space-y-px">
              {filtered.map((s) => (
                <li key={s.user_id}>
                  <Link
                    to={`/teacher/students/${s.user_id}`}
                    className="grid grid-cols-12 items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50"
                  >
                    <span className="col-span-12 flex min-w-0 items-center gap-3 md:col-span-5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-[13px] font-semibold text-foreground">
                        {initial(displayName(s))}
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block truncate text-foreground", T.row)}>
                          {displayName(s)}
                        </span>
                        <span className={cn("block truncate text-muted-foreground", T.note)}>
                          {s.intended_major || "Major undecided"} · Grade {s.grade ?? "—"}
                        </span>
                      </span>
                    </span>
                    <span className="col-span-8 md:col-span-4">
                      <span className="flex items-center gap-3">
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-foreground/40"
                            style={{ width: `${Math.max(0, Math.min(100, s.overall_score))}%` }}
                          />
                        </span>
                        <span className={cn("w-9 shrink-0 text-right tabular-nums text-muted-foreground", T.note)}>
                          {s.overall_score > 0 ? s.overall_score : "—"}
                        </span>
                      </span>
                    </span>
                    <span className={cn("col-span-4 text-right md:col-span-3", T.note)}>
                      {s.status === "behind" ? (
                        <span className="text-destructive">Priority</span>
                      ) : s.status === "top" ? (
                        <span className="text-muted-foreground">On track</span>
                      ) : (
                        <span className="text-muted-foreground">Needs attention</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </Rise>
  );
}

// ── Cohort summary ────────────────────────────────────────────────────

/**
 * Four numbers, drawn as text rather than as tiles. Each one is counted from
 * the roster; when there is no roster they read "—" rather than zero, because
 * zero is a measurement and this is an absence of one.
 */
export function CohortSummary({ students, inactiveCount }: { students: RosterStudent[]; inactiveCount: number }) {
  const scored = students.filter((s) => s.overall_score > 0);
  const avg = scored.length
    ? Math.round(scored.reduce((a, s) => a + s.overall_score, 0) / scored.length)
    : null;
  const total = students.length;

  const stats = [
    { label: "Linked students", value: total === 0 ? "—" : String(total) },
    { label: "Average score", value: avg === null ? "—" : `${avg}/100` },
    { label: "On track", value: total === 0 ? "—" : String(students.filter((s) => s.status === "top").length) },
    { label: "Quiet 7 days+", value: total === 0 ? "—" : String(inactiveCount) },
  ];

  return (
    <Rise>
      <Card>
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className={cn("text-muted-foreground", T.note)}>{s.label}</dt>
              <dd className="mt-1 text-[clamp(1.35rem,2.2vw,1.75rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </Rise>
  );
}
