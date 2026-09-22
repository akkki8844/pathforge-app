/**
 * `/interview/report/:sessionId` — how it actually went.
 *
 * The report is written server-side and arrives over realtime, so this page is
 * openable the moment the call ends and fills in underneath the student rather
 * than making them wait on a spinner and then refresh.
 *
 * The section order is the argument: the number first because that is what they
 * came for, then the moments — their own words, quoted back — because a score
 * without evidence is just an opinion, then the consistency check, which is the
 * one thing no other interview-prep tool can do and the thing real interviewers
 * actually notice.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, ChevronDown } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { SchoolCrest } from "@/components/interview/SchoolCrest";
import { supabase } from "@/integrations/supabase/client";
import { interviewDb } from "@/integrations/supabase/interview";
import { useAuth } from "@/contexts/AuthContext";
import { resolveSchoolInterview } from "@/lib/interview/schools";
import { interviewerByKey } from "@/lib/interview/personas";
import { SCORE_AXES } from "@/lib/interview/types";
import type { InterviewReport, InterviewSession, InterviewTurn } from "@/lib/interview/types";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO, fadeUp, staggerParent, staggerStep } from "@/lib/motion";

/* ───────────────────────────────────────────────────────────── small parts ── */

/** Bands, not a gradient. A 61 and a 59 should not look like different worlds. */
function toneFor(score: number | null): { text: string; bg: string; ring: string; label: string } {
  if (score == null) return { text: "text-muted-foreground", bg: "bg-muted", ring: "stroke-muted-foreground/30", label: "—" };
  if (score >= 80) return { text: "text-success", bg: "bg-success/10", ring: "stroke-success", label: "Strong" };
  if (score >= 65) return { text: "text-info", bg: "bg-info/10", ring: "stroke-info", label: "Solid" };
  if (score >= 45) return { text: "text-warning", bg: "bg-warning/10", ring: "stroke-warning", label: "Uneven" };
  return { text: "text-destructive", bg: "bg-destructive/10", ring: "stroke-destructive", label: "Needs work" };
}

function ScoreRing({ score }: { score: number | null }) {
  const tone = toneFor(score);
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const r = 54;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="relative h-32 w-32 shrink-0 sm:h-36 sm:w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="9" className="stroke-border" />
        <motion.circle
          cx="64" cy="64" r={r} fill="none" strokeWidth="9" strokeLinecap="round"
          className={tone.ring}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${(pct / 100) * circumference} ${circumference}` }}
          transition={{ duration: 1.1, ease: EASE_OUT_EXPO, delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-display text-4xl font-bold tabular-nums sm:text-5xl", tone.text)}>
          {score ?? "—"}
        </span>
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {tone.label}
        </span>
      </div>
    </div>
  );
}

function AxisBar({ label, blurb, score, delay }: { label: string; blurb: string; score: number | null; delay: number }) {
  const tone = toneFor(score);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-xs font-bold uppercase tracking-[0.1em] text-foreground">{label}</span>
        <span className={cn("font-display text-sm font-bold tabular-nums", tone.text)}>{score ?? "—"}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn("h-full rounded-full", tone.ring.replace("stroke-", "bg-"))}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, score ?? 0))}%` }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO, delay }}
        />
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{blurb}</p>
    </div>
  );
}

function Panel({
  title, children, accent, className,
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <motion.section
      variants={fadeUp}
      className={cn(
        "rounded-2xl border bg-card",
        accent ? "border-accent/30 shadow-md" : "border-border",
        className,
      )}
    >
      <header className="border-b border-border/70 px-4 py-3 sm:px-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-foreground">
          {title}
        </h2>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </motion.section>
  );
}

const SEVERITY: Record<string, { label: string; className: string }> = {
  aligned: { label: "Matches", className: "border-success/30 bg-success/10 text-success" },
  thin: { label: "Thin", className: "border-warning/30 bg-warning/10 text-warning" },
  contradiction: { label: "Doesn't match", className: "border-destructive/30 bg-destructive/10 text-destructive" },
};

const VERDICT: Record<string, { className: string; label: string }> = {
  strong: { className: "border-success/30 bg-success/10 text-success", label: "Landed" },
  mixed: { className: "border-warning/30 bg-warning/10 text-warning", label: "Half there" },
  weak: { className: "border-destructive/30 bg-destructive/10 text-destructive", label: "Didn't land" },
};

/* ──────────────────────────────────────────────────────────────── the page ── */

export default function InterviewReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [notFound, setNotFound] = useState(false);
  /**
   * The write-up has been "coming" for longer than it should.
   *
   * The waiting state promises the report "will appear here on its own",
   * which is true when the function runs and writes a row — realtime picks
   * that up. It is not true if the invocation never landed, or if the
   * function died before it could mark the row failed. In both cases there is
   * no row to change, nothing fires, and the page spins indefinitely under a
   * sentence telling the student to wait.
   *
   * Retry already exists; it was only reachable from `status === "failed"`.
   * After the grace period the same escape hatch is offered here, and the
   * copy stops making a promise it cannot keep.
   */
  const [stalled, setStalled] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const [{ data: s }, { data: r }, { data: t }] = await Promise.all([
      interviewDb.from("interview_sessions").select("*").eq("id", sessionId).maybeSingle(),
      interviewDb.from("interview_reports").select("*").eq("session_id", sessionId).maybeSingle(),
      interviewDb.from("interview_turns").select("*").eq("session_id", sessionId).order("idx", { ascending: true }),
    ]);
    if (!s) { setNotFound(true); setLoading(false); return; }
    setSession(s as InterviewSession);
    setReport((r as InterviewReport) ?? null);
    setTurns((t ?? []) as InterviewTurn[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { void load(); }, [load]);

  /*
   * Three times the promised half a minute before admitting something is
   * wrong. Generous on purpose: a slow model run that finishes at forty
   * seconds should look like patience, not like a failure the student then
   * retries on top of a request that was about to succeed.
   *
   * Polled against the clock rather than a single `setTimeout`, because a
   * backgrounded tab throttles timers — the same reason the exam clock reads
   * `Date.now()`. Here a late verdict is harmless, so this only has to not be
   * early.
   */
  const waiting = !loading && !notFound && (!report || report.status === "generating");
  useEffect(() => {
    if (!waiting) { setStalled(false); return; }
    const since = Date.now();
    const STALL_MS = 90_000;
    const check = () => { if (Date.now() - since > STALL_MS) setStalled(true); };
    const t = window.setInterval(check, 5_000);
    const onVisible = () => { if (!document.hidden) { check(); void load(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [waiting, load]);

  // The write-up is generated after the call ends, so the row flips from
  // `generating` to `ready` while this page is already open. Realtime is what
  // makes that an animation rather than a refresh button.
  useEffect(() => {
    if (!user || !sessionId) return;
    const channel = supabase.channel(`interview-report-${sessionId}`);
    try {
      channel
        .on(
          "postgres_changes" as never,
          { event: "*", schema: "public", table: "interview_reports", filter: `session_id=eq.${sessionId}` },
          () => { void load(); },
        )
        .subscribe();
    } catch (e) {
      console.warn("interview report realtime unavailable", e);
    }
    return () => { void supabase.removeChannel(channel); };
  }, [user, sessionId, load]);

  const retry = useCallback(async () => {
    if (!sessionId) return;
    setRetrying(true);
    await supabase.functions.invoke("interview-report", { body: { sessionId, force: true } });
    await load();
    setRetrying(false);
  }, [sessionId, load]);

  const school = useMemo(
    () => resolveSchoolInterview(session?.school_id || session?.school_name || ""),
    [session],
  );
  const persona = session ? interviewerByKey(session.interviewer_key) : undefined;

  if (loading) {
    return (
      <div className="section-container py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-48 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <div className="section-container py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">That interview isn't here</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been deleted, or it belongs to another account.
        </p>
        <Button asChild className="mt-6"><Link to="/interview">Back to the simulator</Link></Button>
      </div>
    );
  }

  const answered = turns.filter((t) => t.speaker === "student" && t.text.trim()).length;
  const minutes = session.duration_seconds ? Math.max(1, Math.round(session.duration_seconds / 60)) : null;

  return (
    <>
      <Seo
        title={`Interview report — ${school.shortName}`}
        description="How your mock interview went, scored against your own application."
        path={`/interview/report/${sessionId}`}
        noindex
      />

      <div className="section-container py-6 sm:py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/interview")} className="-ml-2 mb-5 gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Interview Simulator
        </Button>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <div
            className="h-1.5 w-full"
            style={{ background: `linear-gradient(90deg, ${school.color}, ${school.colorSecondary ?? school.color})` }}
          />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-7 sm:p-6">
            <ScoreRing score={report?.overall_score ?? null} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <SchoolCrest school={school} size={28} rounded="rounded-lg" />
                <p className="truncate font-display text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  {session.school_name}
                </p>
              </div>

              <h1 className="mt-2.5 text-balance font-display text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
                {report?.status === "ready"
                  ? report.headline || "Here's how it went."
                  : report?.status === "failed"
                    ? "Couldn't write this one up"
                    : "Reading it back against your application…"}
              </h1>

              {report?.status === "ready" && report.summary && (
                <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {report.summary}
                </p>
              )}

              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {persona && <span>with {persona.name}</span>}
                <span>{answered} answer{answered === 1 ? "" : "s"}</span>
                {minutes && <span>{minutes} min</span>}
                <span>
                  {new Date(session.created_at).toLocaleDateString(undefined, {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </span>
              </p>
            </div>
          </div>
        </motion.header>

        {/* Nothing was said. There is no report coming, and a spinner that
            never resolves is worse than saying so. */}
        {answered === 0 && (!report || report.status !== "ready") && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-sm font-bold text-foreground">Nothing to assess</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              You didn't answer anything in this session, so there's nothing to grade. Check
              your microphone is on before the next one.
            </p>
            <Button asChild size="sm" className="mt-4"><Link to="/interview">Run another one</Link></Button>
          </div>
        )}

        {/* ── Still writing ────────────────────────────────────────────── */}
        {answered > 0 && (!report || report.status === "generating") && (
          <div
            className={cn(
              "mt-4 flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between",
              stalled ? "border-warning/30 bg-warning/5" : "border-border bg-card",
            )}
          >
            <div className="flex items-center gap-3">
              {!stalled && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-accent" />}
              <div>
                <p className="font-display text-sm font-bold text-foreground">
                  {stalled ? "This is taking longer than it should" : "Writing up your interview"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stalled
                    ? "It normally takes about half a minute. Nothing has come back, so the write-up may not have started. Your answers are saved either way — asking again costs nothing."
                    : "Every answer is being read against what your application already says. This takes about half a minute, and it'll appear here on its own."}
                </p>
              </div>
            </div>
            {stalled && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void retry()}
                disabled={retrying}
                className="shrink-0 gap-1.5"
              >
                {retrying ? "Asking again…" : "Try again"}
              </Button>
            )}
          </div>
        )}

        {answered > 0 && report?.status === "failed" && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-sm font-bold text-foreground">No report yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{report.error}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => void retry()} disabled={retrying} className="shrink-0 gap-1.5">
              {retrying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Try again
            </Button>
          </div>
        )}

        {/* ── The report ───────────────────────────────────────────────── */}
        {report?.status === "ready" && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerParent}
            custom={staggerStep(6)}
            className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]"
          >
            <div className="min-w-0 space-y-4">
              {report.moments.length > 0 && (
                <Panel title="What you actually said" accent>
                  <ul className="space-y-4">
                    {report.moments.map((m, i) => {
                      const v = VERDICT[m.verdict] ?? VERDICT.mixed;
                      return (
                        <li key={`${i}-${m.quote.slice(0, 16)}`} className="border-l-2 border-border pl-4">
                          <span className={cn(
                            "mb-2 inline-flex items-center rounded-full border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.1em]",
                            v.className,
                          )}>
                            {v.label}
                          </span>
                          <blockquote className="font-serif text-[15px] italic leading-relaxed text-foreground">
                            “{m.quote}”
                          </blockquote>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{m.note}</p>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              )}

              {report.consistency_notes.length > 0 && (
                <Panel title="Spoken vs. written">
                  <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                    Interviewers notice when what you say doesn't line up with what you wrote.
                    This is the part nobody practises.
                  </p>
                  <ul className="space-y-3">
                    {report.consistency_notes.map((n, i) => {
                      const sev = SEVERITY[n.severity] ?? SEVERITY.thin;
                      return (
                        <li key={`${i}-${n.topic}`} className="rounded-xl border border-border bg-background/60 p-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-display text-sm font-bold text-foreground">{n.topic}</p>
                            <span className={cn(
                              "shrink-0 rounded-full border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.1em]",
                              sev.className,
                            )}>
                              {sev.label}
                            </span>
                          </div>
                          <dl className="mt-2.5 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg bg-muted/60 p-2.5">
                              <dt className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                Your application
                              </dt>
                              <dd className="mt-1 text-[13px] leading-snug text-foreground">{n.written}</dd>
                            </div>
                            <div className="rounded-lg bg-muted/60 p-2.5">
                              <dt className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                Out loud
                              </dt>
                              <dd className="mt-1 text-[13px] leading-snug text-foreground">{n.spoken}</dd>
                            </div>
                          </dl>
                          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{n.note}</p>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {report.strengths.length > 0 && (
                  <Panel title="Worked">
                    <ul className="space-y-2.5">
                      {report.strengths.map((s, i) => (
                        <li key={i} className="border-l-2 border-success/50 pl-3 text-sm leading-relaxed text-foreground">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
                {report.improvements.length > 0 && (
                  <Panel title="Fix">
                    <ul className="space-y-2.5">
                      {report.improvements.map((s, i) => (
                        <li key={i} className="border-l-2 border-warning/50 pl-3 text-sm leading-relaxed text-foreground">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
              </div>

              {/* Full transcript. Collapsed, because the report is the point and
                  the transcript is the evidence you go to when you disagree
                  with it. */}
              {turns.length > 0 && (
                <Collapsible>
                  <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-fast hover:bg-muted/50 sm:px-5">
                      <span className="font-display text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                        Full transcript
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-250 group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-4 border-t border-border px-4 py-4 sm:px-5">
                        {turns.map((t) => (
                          <div key={t.id}>
                            <p className={cn(
                              "font-display text-[10px] font-bold uppercase tracking-[0.14em]",
                              t.speaker === "student" ? "text-accent" : "text-muted-foreground",
                            )}>
                              {t.speaker === "student" ? "You" : persona?.name ?? "Interviewer"}
                              {t.source_ref && (
                                <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground">
                                  · on your {t.source_ref}
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-foreground">{t.text}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </motion.div>
                </Collapsible>
              )}
            </div>

            {/* ── Side rail ──────────────────────────────────────────── */}
            <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Panel title="The five axes">
                <div className="space-y-4">
                  {SCORE_AXES.map((axis, i) => (
                    <AxisBar
                      key={axis.key}
                      label={axis.label}
                      blurb={axis.blurb}
                      score={(report[axis.key] as number | null) ?? null}
                      delay={0.25 + i * 0.07}
                    />
                  ))}
                </div>
              </Panel>

              {report.next_actions.length > 0 && (
                <Panel title="Before the real one" accent>
                  <ol className="space-y-3">
                    {report.next_actions.map((a, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed text-foreground">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-[11px] font-bold text-accent">
                          {i + 1}
                        </span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ol>
                </Panel>
              )}

              <Button asChild size="lg" className="w-full gap-2">
                <Link to="/interview">Run it again</Link>
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                A second sitting with a different interviewer is the fastest way to find out
                whether a good answer was actually good or just well-rehearsed.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
