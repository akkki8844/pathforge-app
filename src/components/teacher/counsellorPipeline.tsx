import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHead, Rise } from "@/components/dashboard/deck";
import { CollegeLogo } from "@/components/CollegeLogo";
import type { RosterStudent } from "@/hooks/useTeacherRoster";
import type { UpcomingDeadline } from "@/hooks/useCounselorActivity";
import type { PendingEssay, UpcomingMeeting } from "@/hooks/useCounsellorQueue";
import { tallyTargets } from "@/lib/teacher/targets";

/**
 * The three blocks about where the cohort is heading and what is queued
 * against the counsellor personally.
 *
 * These are new — none of this was on the counsellor home before, and all three
 * answer a question a counsellor was previously opening two or three pages to
 * get at: which universities is my list actually aiming for, what is due next,
 * and what is sitting in my own inbox.
 *
 * Every university mark on this page is the real institution's logo, resolved
 * from the domain already stored against that college in `lib/colleges.ts`. A
 * name that resolves to nothing gets a lettered tile, never a stand-in logo for
 * a different school.
 */

const T = {
  row: "text-[15px] font-medium leading-[1.35] tracking-[-0.012em]",
  body: "text-[14.5px] font-normal leading-[1.6] tracking-[-0.006em]",
  note: "text-[12.5px] font-normal leading-[1.5] tracking-[-0.003em]",
} as const;

function displayName(s: { full_name: string | null; email: string | null }): string {
  return s.full_name || s.email || "Student";
}

// ── Where the cohort is applying ──────────────────────────────────────

/**
 * The cohort's target list, aggregated.
 *
 * A counsellor knows their students one at a time; what they rarely see is the
 * shape of the whole list — that eleven people are aiming at one university and
 * one person is aiming somewhere nobody else is. The first is a session worth
 * running as a group. The second is a student who needs a specialist.
 */
export function ApplyingCard({
  students,
  loading,
}: {
  students: RosterStudent[];
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const tallies = useMemo(() => tallyTargets(students), [students]);
  const shown = expanded ? tallies : tallies.slice(0, 12);

  const withTargets = students.filter(
    (s) => (s.target_universities?.filter(Boolean).length ?? 0) > 0,
  ).length;

  return (
    <Rise delay={0.05}>
      <Card>
        <CardHead
          title="Where they're applying"
          sub={
            tallies.length === 0
              ? "Universities appear here as students add them to their own target list."
              : `${tallies.length} ${tallies.length === 1 ? "university" : "universities"} named across ${withTargets} of ${students.length} students.`
          }
          to="/teacher/applications"
          action="Applications"
        />

        <div className="mt-6">
          {loading ? (
            <p className={cn("text-muted-foreground", T.body)}>Loading targets…</p>
          ) : tallies.length === 0 ? (
            <p className={cn("max-w-[60ch] text-muted-foreground", T.body)}>
              Nobody on your roster has set a target university yet. This stays empty until they
              do — there is no default list.
            </p>
          ) : (
            <>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((t) => (
                  <li key={t.name}>
                    <div
                      className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-foreground/20"
                      title={t.students.map((s) => s.name).join(", ")}
                    >
                      <CollegeLogo name={t.name} size={28} className="rounded-md" />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-foreground", T.row)}>{t.name}</span>
                        <span className={cn("block truncate text-muted-foreground", T.note)}>
                          {t.count === 1
                            ? t.students[0].name
                            : `${t.count} students`}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {tallies.length > 12 && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {expanded ? "Show fewer" : `Show all ${tallies.length}`}
                </button>
              )}
            </>
          )}
        </div>
      </Card>
    </Rise>
  );
}

// ── Deadlines ─────────────────────────────────────────────────────────

/**
 * Dated applications across the roster, soonest first.
 *
 * This used to be one third of a three-column "Signals" card, which gave the
 * only genuinely time-critical thing on the page the same weight as a list of
 * who opened the app recently. It is its own block now, with the university's
 * mark against each row so a full list is scannable by logo rather than by
 * reading thirty names.
 */
export function DeadlinesCard({
  deadlines,
  loading,
}: {
  deadlines: UpcomingDeadline[];
  loading: boolean;
}) {
  const urgent = deadlines.filter((d) => d.daysAway <= 7).length;

  return (
    <Rise delay={0.05} className="h-full">
      <Card className="flex h-full flex-col">
        <CardHead
          title="Deadlines"
          sub={
            deadlines.length === 0
              ? "Applications you have dated in a student's strategy show up here."
              : `${deadlines.length} dated${urgent ? `, ${urgent} inside a week` : ""}.`
          }
          to="/teacher/applications"
          action="All"
        />

        <div className="mt-6 flex-1">
          {loading ? (
            <p className={cn("text-muted-foreground", T.body)}>Loading deadlines…</p>
          ) : deadlines.length === 0 ? (
            <p className={cn("max-w-[46ch] text-muted-foreground", T.body)}>
              No dated applications yet. A deadline appears once you set one on a student's
              application strategy — nothing here is inferred from a published date.
            </p>
          ) : (
            <ul className="-mx-3 space-y-px">
              {deadlines.slice(0, 8).map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/teacher/students/${d.student_id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <CollegeLogo name={d.college_name} size={28} className="rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-foreground", T.row)}>
                        {d.college_name}
                      </span>
                      <span className={cn("block truncate text-muted-foreground", T.note)}>
                        {d.display_name} · {d.stage}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        T.note,
                        d.daysAway <= 7 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {d.daysAway < 0 ? "overdue" : d.daysAway === 0 ? "today" : `${d.daysAway}d`}
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

// ── The counsellor's own queue ────────────────────────────────────────

/**
 * The two things waiting on this counsellor rather than on a student: drafts
 * submitted for review, and sessions already booked.
 *
 * Both have a page. Neither was visible from the home screen, so an essay
 * submitted on Monday could sit unread until somebody thought to open the right
 * tab. The waiting time is shown per essay because a three-day-old draft and a
 * three-week-old draft are not the same task.
 */
export function QueueCard({
  essays,
  meetings,
  students,
  loading,
}: {
  essays: PendingEssay[];
  meetings: UpcomingMeeting[];
  students: RosterStudent[];
  loading: boolean;
}) {
  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, displayName(s)])),
    [students],
  );

  const oldest = essays.length > 0 ? Math.max(...essays.map((e) => e.waitingDays)) : 0;

  return (
    <Rise delay={0.05} className="h-full">
      <Card className="flex h-full flex-col">
        <CardHead
          title="On your desk"
          sub={
            essays.length === 0 && meetings.length === 0
              ? "Nothing is waiting on you right now."
              : `${essays.length} draft${essays.length === 1 ? "" : "s"} to read${
                  oldest >= 3 ? `, oldest waiting ${oldest} days` : ""
                }.`
          }
          to="/teacher/essays"
          action="Essays"
        />

        <div className="mt-6 flex-1 space-y-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Drafts waiting
            </p>
            {loading ? (
              <p className={cn("mt-3 text-muted-foreground", T.body)}>Loading…</p>
            ) : essays.length === 0 ? (
              <p className={cn("mt-3 text-muted-foreground", T.body)}>
                No drafts in the queue.
              </p>
            ) : (
              <ul className="-mx-3 mt-2 space-y-px">
                {essays.slice(0, 5).map((e) => (
                  <li key={e.id}>
                    <Link
                      to="/teacher/essays"
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <FileText
                        className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-foreground", T.row)}>
                          {e.title}
                        </span>
                        <span className={cn("block truncate text-muted-foreground", T.note)}>
                          {nameMap.get(e.student_id) ?? "Student"} ·{" "}
                          {e.status === "revision_requested"
                            ? "revision requested"
                            : e.status === "flagged"
                              ? "flagged"
                              : "pending"}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums",
                          T.note,
                          e.waitingDays >= 7 ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {e.waitingDays === 0 ? "today" : `${e.waitingDays}d`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Sessions booked
            </p>
            {loading ? (
              <p className={cn("mt-3 text-muted-foreground", T.body)}>Loading…</p>
            ) : meetings.length === 0 ? (
              <p className={cn("mt-3 text-muted-foreground", T.body)}>
                Nothing on the calendar from today onward.
              </p>
            ) : (
              <ul className="-mx-3 mt-2 space-y-px">
                {meetings.slice(0, 4).map((m) => (
                  <li key={m.id}>
                    <Link
                      to={`/teacher/students/${m.student_id}`}
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <CalendarClock
                        className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-foreground", T.row)}>
                          {nameMap.get(m.student_id) ?? "Student"}
                        </span>
                        <span className={cn("block truncate text-muted-foreground", T.note)}>
                          {new Date(m.occurred_at).toLocaleString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {m.summary ? ` · ${m.summary}` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </Rise>
  );
}
