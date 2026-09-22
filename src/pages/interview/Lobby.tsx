/**
 * `/interview` — where you set the call up before you join it.
 *
 * The three choices on this page are the three variables that decide whether a
 * mock interview is worth sitting: which school (because Georgetown and Penn
 * are not the same half hour), who is across the table (because a reserved
 * interviewer who lets silences run teaches something a brisk one never will),
 * and whether your camera and microphone actually work (because finding out
 * they don't at minute four wastes the session).
 *
 * Everything else here is there to make those three legible, not to fill space.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, Loader2, ChevronRight } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SchoolCrest } from "@/components/interview/SchoolCrest";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useInterviewGrounding } from "@/hooks/useInterviewGrounding";
import { interviewDb } from "@/integrations/supabase/interview";
import { useLocalMedia } from "@/hooks/useLocalMedia";
import { cn } from "@/lib/utils";
import {
  DURATION, EASE_OUT_EXPO, fadeUp, staggerParent, staggerStep, transition,
} from "@/lib/motion";
import {
  SCHOOL_INTERVIEWS, GENERIC_SCHOOL, resolveSchoolInterview, interviewsApplicants,
  FORMAT_LABEL, WEIGHT_LABEL, AVAILABILITY_LABEL, POLICIES_VERIFIED,
} from "@/lib/interview/schools";
import {
  INTERVIEWERS, interviewersForFormat, TEMPERAMENT_LABEL, SETTING_LABEL,
} from "@/lib/interview/personas";
import type {
  SchoolInterviewProfile, InterviewerPersona, InterviewSession, InterviewReport,
} from "@/lib/interview/types";

/* ───────────────────────────────────────────────────────────── small parts ── */

function StepHead({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xs font-bold text-accent-foreground">
        {n}
      </span>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

const WEIGHT_TONE: Record<SchoolInterviewProfile["weight"], string> = {
  evaluative: "border-warning/30 bg-warning/10 text-warning",
  light: "border-info/30 bg-info/10 text-info",
  informational: "border-border bg-muted text-muted-foreground",
};

function SchoolCard({
  school,
  selected,
  pinned,
  onSelect,
}: {
  school: SchoolInterviewProfile;
  selected: boolean;
  pinned?: boolean;
  onSelect: () => void;
}) {
  const offers = interviewsApplicants(school);
  return (
    <motion.button
      type="button"
      variants={fadeUp}
      onClick={onSelect}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={transition.fast}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        selected
          ? "border-accent bg-accent/[0.06] shadow-md"
          : "border-border bg-card hover:border-accent/40 hover:bg-card",
      )}
    >
      {/* The school's own colour, as a hairline. Forty cards in the brand
          indigo would be a wall; this is what makes the grid scannable. */}
      <span
        aria-hidden
        style={{ backgroundColor: school.color }}
        className="absolute inset-y-3 left-0 w-[3px] rounded-full opacity-70"
      />

      <SchoolCrest school={school} size={40} className="ml-1.5" />

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-display text-sm font-bold text-foreground">
            {school.shortName}
          </span>
          {pinned && (
            <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[9px] font-bold uppercase tracking-[0.1em]">
              Your list
            </Badge>
          )}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
              offers ? WEIGHT_TONE[school.weight] : "border-border bg-muted text-muted-foreground",
            )}
          >
            {offers ? FORMAT_LABEL[school.format] : "No interview"}
          </span>
          {offers && school.availability === "required" && (
            <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-destructive">
              Required
            </span>
          )}
        </span>
      </span>

      {selected && (
        <motion.span
          layoutId="school-check"
          className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
        >
          <Check className="h-3 w-3" />
        </motion.span>
      )}
    </motion.button>
  );
}

function InterviewerCard({
  persona,
  selected,
  onSelect,
}: {
  persona: InterviewerPersona;
  selected: boolean;
  onSelect: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = persona.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.button
      type="button"
      variants={fadeUp}
      onClick={onSelect}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={transition.fast}
      aria-pressed={selected}
      className={cn(
        "group relative overflow-hidden rounded-2xl border text-left transition-colors duration-fast",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        selected ? "border-accent shadow-lg" : "border-border hover:border-accent/40",
      )}
    >
      <span className="relative block aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-muted to-secondary">
        {imageFailed ? (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-highlight font-display text-3xl font-bold text-white">
            {initials}
          </span>
        ) : (
          <img
            src={persona.frames.rest}
            alt={persona.name}
            loading="lazy"
            draggable={false}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-600 ease-glide group-hover:scale-[1.04]"
          />
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 p-3">
          <span className="block truncate font-display text-sm font-bold text-white">
            {persona.name}
          </span>
          <span className="mt-0.5 block truncate text-[11px] leading-snug text-white/70">
            {persona.credential}
          </span>
        </span>
        {selected && (
          <span className="absolute right-2.5 top-2.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md">
            <Check className="h-3.5 w-3.5" />
          </span>
        )}
      </span>

      <span className="block border-t border-border bg-card px-3 py-2.5">
        <span className="block text-[11px] font-medium leading-snug text-foreground">
          {TEMPERAMENT_LABEL[persona.temperament]}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {SETTING_LABEL[persona.setting]}
        </span>
      </span>
    </motion.button>
  );
}

/* ──────────────────────────────────────────────────────────────── the page ── */

interface PastSession {
  id: string;
  school_name: string;
  created_at: string;
  status: string;
  turn_count: number;
  score: number | null;
  reportStatus: string | null;
}

export default function InterviewLobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const media = useLocalMedia();

  const [query, setQuery] = useState("");
  const [school, setSchool] = useState<SchoolInterviewProfile | null>(null);
  const [persona, setPersona] = useState<InterviewerPersona | null>(null);
  const [note, setNote] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  const [past, setPast] = useState<PastSession[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);
  const [starting, setStarting] = useState(false);

  /* What the interviewer will actually have read. See the hook for why this
     is checked here rather than discovered mid-session. */
  const grounding = useInterviewGrounding(user?.id);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const meterRef = useRef<HTMLDivElement | null>(null);

  /* The student's own list, pinned to the top of the grid. Practising for a
     school you are not applying to is the most common way this kind of tool
     gets used badly. */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("onboarding_data")
        .select("target_universities")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const list = Array.isArray(data?.target_universities) ? (data!.target_universities as string[]) : [];
      setTargets(list);
    })();
    return () => { cancelled = true; };
  }, [user]);

  /*
   * Warm the interviewer portraits.
   *
   * `interview-portraits` is idempotent — it skips every frame already in the
   * bucket — so this costs one cheap round trip after the first run and nothing
   * at all thereafter. Fire-and-forget, once per tab: the page renders monogram
   * tiles in the meantime and picks up the real faces on the next visit, which
   * is strictly better than blocking the lobby on an image model.
   */
  useEffect(() => {
    if (!user) return;
    try {
      if (sessionStorage.getItem("pf-portraits-warmed")) return;
      sessionStorage.setItem("pf-portraits-warmed", "1");
    } catch {
      // Private mode with storage blocked. Warming twice is harmless.
    }
    void (async () => {
      // The function generates at most two frames per invocation — three
      // exceeds the edge runtime's wall clock — and reports how many it left.
      // So this drains it rather than calling once, bounded so a persistent
      // failure can't spin. Everything it hasn't reached yet simply renders as
      // a monogram until a later visit finishes the set.
      for (let i = 0; i < 16; i++) {
        const { data, error } = await supabase.functions.invoke("interview-portraits", { body: {} });
        if (error || !data || data.done || typeof data.remaining !== "number") break;
        if (data.remaining <= 0) break;
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      // `select("*")` rather than a column list, and the cast that follows it,
      // are the same convention useRoutineData uses: supabase-js cannot parse a
      // column list against this repo's hand-written schema types and silently
      // resolves the row to `never`. RLS already scopes both reads to the
      // signed-in student, so there is no cross-user data in the "*".
      const { data: sessions } = await interviewDb
        .from("interview_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);
      if (cancelled) return;
      const rows = (sessions ?? []) as InterviewSession[];
      const ids = rows.map((r) => r.id);
      let reports: Record<string, { overall_score: number | null; status: string }> = {};
      if (ids.length) {
        const { data: reportRows } = await interviewDb
          .from("interview_reports")
          .select("*")
          .in("session_id", ids);
        reports = Object.fromEntries(
          ((reportRows ?? []) as InterviewReport[]).map(
            (r) => [r.session_id, { overall_score: r.overall_score, status: r.status }],
          ),
        );
      }
      if (cancelled) return;
      setPast(rows.map((r) => ({
        id: r.id,
        school_name: r.school_name,
        created_at: r.created_at,
        status: r.status,
        turn_count: r.turn_count,
        score: reports[r.id]?.overall_score ?? null,
        reportStatus: reports[r.id]?.status ?? null,
      })));
      setLoadingPast(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  /* Pinned targets first, then everything, deduplicated. A resolved target that
     isn't in the table still appears — as a generic-format row carrying the
     student's own wording — rather than silently vanishing from their list. */
  const { pinned, rest } = useMemo(() => {
    const resolvedTargets = targets.map(resolveSchoolInterview);
    const seen = new Set<string>();
    const pinnedList: SchoolInterviewProfile[] = [];
    for (const t of resolvedTargets) {
      const key = t.id === "generic" ? `generic:${t.name}` : t.id;
      if (seen.has(key)) continue;
      seen.add(key);
      pinnedList.push(t);
    }
    const restList = SCHOOL_INTERVIEWS.filter((s) => !seen.has(s.id));
    return { pinned: pinnedList, rest: restList };
  }, [targets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (s: SchoolInterviewProfile) =>
      !q || s.name.toLowerCase().includes(q) || s.shortName.toLowerCase().includes(q);
    return { pinned: pinned.filter(match), rest: rest.filter(match) };
  }, [pinned, rest, query]);

  const availablePersonas = useMemo(
    () => (school ? interviewersForFormat(school.format === "none" ? "alumni" : school.format) : INTERVIEWERS),
    [school],
  );

  // A school change can strand a persona that doesn't run that format.
  useEffect(() => {
    if (persona && !availablePersonas.some((p) => p.key === persona.key)) setPersona(null);
  }, [availablePersonas, persona]);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== media.stream) el.srcObject = media.stream;
  }, [media.stream]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const bar = meterRef.current;
      if (bar) bar.style.transform = `scaleX(${Math.max(0.02, media.levelRef.current).toFixed(3)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [media.levelRef]);

  const canJoin = Boolean(school && persona);

  const join = () => {
    if (!school || !persona) return;
    setStarting(true);
    // The devices are released here and re-requested inside the room. Handing a
    // live MediaStream across a route change works until a remount kills it
    // mid-call, and a camera that dies thirty seconds in is worse than a
    // second permission prompt that never appears (the grant is remembered).
    media.release();
    navigate("/interview/room", {
      state: { schoolId: school.id, schoolName: school.name, interviewerKey: persona.key, note: note.trim() },
    });
  };

  return (
    <>
      <Seo
        title="Interview Simulator"
        description="Practise the interview your school actually runs — grounded in your own essays and activities, with a real-time interviewer and a report on how it went."
        path="/interview"
        noindex
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-highlight via-accent to-[hsl(262_60%_52%)]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 100% / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 30% 0%, black, transparent 72%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl"
        />
        <div className="section-container relative py-12 sm:py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerParent}
            custom={staggerStep(4)}
            className="max-w-3xl"
          >
            <motion.p
              variants={fadeUp}
              className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm"
            >
              Interview Simulator
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-4 text-balance font-display text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl"
            >
              The interview you're actually walking into.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg">
              Not a list of twenty questions. A real conversation with someone who has read
              your essays and your activities list, shaped to the format your school runs —
              and afterwards, a straight answer on how it went.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
              <span>Live voice, both ways</span>
              <span aria-hidden className="text-white/30">/</span>
              <span>Ends when the conversation does</span>
              <span aria-hidden className="text-white/30">/</span>
              <span>Nothing is recorded</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom padding clears the floating message dock, which is pinned to the
          bottom centre on every signed-in route and otherwise sits directly on
          top of the optional note field. */}
      <div className="section-container py-8 pb-16 sm:py-10 sm:pb-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
          {/* ── Steps ──────────────────────────────────────────────────── */}
          <div className="min-w-0 space-y-10">
            {/* 1 — School */}
            <section>
              <StepHead
                n={1}
                title="Who are you interviewing with?"
                hint={`Every school runs this differently. Policies checked ${POLICIES_VERIFIED}.`}
              />

              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search schools…"
                  className="pl-9"
                  aria-label="Search schools"
                />
              </div>

              {filtered.pinned.length > 0 && (
                <>
                  <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    On your list
                  </p>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerParent}
                    custom={staggerStep(filtered.pinned.length)}
                    className="mb-6 grid gap-2.5 sm:grid-cols-2"
                  >
                    {filtered.pinned.map((s) => (
                      <SchoolCard
                        key={`pin-${s.id}-${s.name}`}
                        school={s}
                        pinned
                        selected={school?.name === s.name}
                        onSelect={() => setSchool(s)}
                      />
                    ))}
                  </motion.div>
                </>
              )}

              <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {filtered.pinned.length > 0 ? "Every other school" : "Schools"}
              </p>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerParent}
                custom={staggerStep(Math.min(filtered.rest.length, 12))}
                className="grid gap-2.5 sm:grid-cols-2"
              >
                {filtered.rest.map((s) => (
                  <SchoolCard
                    key={s.id}
                    school={s}
                    selected={school?.name === s.name}
                    onSelect={() => setSchool(s)}
                  />
                ))}
              </motion.div>

              {filtered.rest.length === 0 && filtered.pinned.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No school matching “{query}”. You can still practise a general alumni
                    interview — it's the shape most US schools use.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSchool({ ...GENERIC_SCHOOL, name: query.trim() || GENERIC_SCHOOL.name, shortName: query.trim() || GENERIC_SCHOOL.shortName })}
                  >
                    Practise generally
                  </Button>
                </div>
              )}
            </section>

            {/* 2 — Interviewer */}
            <AnimatePresence initial={false}>
              {school && (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
                >
                  <StepHead
                    n={2}
                    title="Who's across the table?"
                    hint="Temperament changes the interview more than the questions do."
                  />
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerParent}
                    custom={staggerStep(availablePersonas.length)}
                    className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                  >
                    {availablePersonas.map((p) => (
                      <InterviewerCard
                        key={p.key}
                        persona={p}
                        selected={persona?.key === p.key}
                        onSelect={() => setPersona(p)}
                      />
                    ))}
                  </motion.div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* 3 — Devices */}
            <AnimatePresence initial={false}>
              {school && persona && (
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
                >
                  <StepHead
                    n={3}
                    title="Check your camera and mic"
                    hint="Find out here, not four minutes into the conversation."
                  />

                  <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-5">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-900">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={cn(
                          "h-full w-full -scale-x-100 object-cover transition-opacity duration-320",
                          media.status === "ready" ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {media.status !== "ready" && (
                        <div className="absolute inset-0 flex items-center justify-center text-white/50">
                          <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em]">
                            {media.status === "requesting" ? "Asking…" : "Camera off"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-center gap-3">
                      {media.status === "ready" ? (
                        <>
                          <p className="text-sm font-medium text-success">
                            Camera and microphone are live.
                          </p>
                          <div>
                            <p className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                              Say something
                            </p>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                ref={meterRef}
                                className="h-full origin-left rounded-full bg-gradient-to-r from-accent to-highlight"
                                style={{ transform: "scaleX(0.02)" }}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {media.error ??
                              "You'll be speaking out loud and seeing yourself in the corner, the way a real interview over video works."}
                          </p>
                          <Button onClick={() => void media.request()} className="w-fit gap-2" disabled={media.status === "requesting"}>
                            {media.status === "requesting" && <Loader2 className="h-4 w-4 animate-spin" />}
                            {media.status === "requesting" ? "Asking…" : "Turn on camera and mic"}
                          </Button>
                        </>
                      )}

                      <div className="mt-1">
                        <label htmlFor="interview-note" className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Anything they should know? <span className="font-normal normal-case tracking-normal">(optional)</span>
                        </label>
                        <Textarea
                          id="interview-note"
                          value={note}
                          onChange={(e) => setNote(e.target.value.slice(0, 400))}
                          rows={2}
                          placeholder="e.g. Push me on the research project — I always fumble that one."
                          className="resize-none text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Past sittings */}
            {!loadingPast && past.length > 0 && (
              <section>
                <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                  Your past interviews
                </h2>
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                  {past.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => navigate(`/interview/report/${s.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-fast hover:bg-muted/60"
                    >
                      <SchoolCrest school={resolveSchoolInterview(s.school_name)} size={30} rounded="rounded-lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{s.school_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          {" · "}
                          {Math.floor(s.turn_count / 2)} exchange{Math.floor(s.turn_count / 2) === 1 ? "" : "s"}
                        </span>
                      </span>
                      {s.score != null ? (
                        <span className="font-display text-lg font-bold tabular-nums text-foreground">{s.score}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {s.reportStatus === "generating" ? "Writing up…" : s.reportStatus === "failed" ? "No report" : "—"}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Sticky summary ─────────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
            >
              <div
                className="h-1.5 w-full"
                style={{ background: school ? `linear-gradient(90deg, ${school.color}, ${school.colorSecondary ?? school.color})` : "hsl(var(--muted))" }}
              />

              <div className="p-5">
                {school ? (
                  <>
                    <div className="flex items-start gap-3">
                      <SchoolCrest school={school} size={44} />
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-bold leading-tight text-foreground">
                          {school.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {FORMAT_LABEL[school.format]}
                          {interviewsApplicants(school) && ` · ~${school.typicalMinutes} min`}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-4 space-y-2 border-t border-border pt-4 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-muted-foreground">Counts for</dt>
                        <dd className="text-right font-medium text-foreground">{WEIGHT_LABEL[school.weight]}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-muted-foreground">Availability</dt>
                        <dd className="text-right font-medium text-foreground">{AVAILABILITY_LABEL[school.availability]}</dd>
                      </div>
                      {interviewsApplicants(school) && (
                        <div className="flex items-start justify-between gap-3">
                          <dt className="shrink-0 text-muted-foreground">Conducted by</dt>
                          <dd className="text-right font-medium text-foreground">{school.conductedBy}</dd>
                        </div>
                      )}
                    </dl>

                    <p className="mt-3 rounded-xl bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
                      {school.notes}
                    </p>

                    {/*
                      Said before they sit down, not after.

                      The pitch on this page is an interviewer who has read
                      their essays and activities list. If there is nothing to
                      read, the session still runs — it just becomes the
                      generic mock interview this was built to replace, and
                      they would find that out a minute in.
                    */}
                    {!grounding.loading && (grounding.empty || grounding.thin) && (
                      <div className="mt-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
                        <p className="font-semibold">
                          {grounding.empty
                            ? "Your application is empty"
                            : "There's not much to draw on yet"}
                        </p>
                        <p className="mt-1">
                          {grounding.empty
                            ? "The interviewer reads your essays and activities to ask about the things you actually wrote. You haven't written any yet, so this session would be generic questions — which is the thing it exists to avoid."
                            : `You have ${grounding.essays + grounding.activities} ${grounding.essays + grounding.activities === 1 ? "entry" : "entries"} written. Enough to start, but the follow-ups will run out quickly.`}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <Link
                            to="/application-builder"
                            className="rounded-lg border border-warning/40 px-2.5 py-1 font-medium transition-colors hover:bg-warning/15"
                          >
                            Application Builder
                          </Link>
                          <Link
                            to="/outcomes"
                            className="rounded-lg border border-warning/40 px-2.5 py-1 font-medium transition-colors hover:bg-warning/15"
                          >
                            Outcomes
                          </Link>
                        </div>
                      </div>
                    )}

                    {!interviewsApplicants(school) && (
                      <p className="mt-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
                        {school.shortName} doesn't interview applicants — this will run as a
                        general alumni-style session, which is still worth doing for the
                        schools on your list that do.
                      </p>
                    )}

                    {persona && (
                      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                        <img
                          src={persona.frames.rest}
                          alt=""
                          aria-hidden
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                          className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-accent/25"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{persona.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {TEMPERAMENT_LABEL[persona.temperament]}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <p className="font-display text-sm font-bold text-foreground">Pick a school to begin</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      We'll show you exactly how that school runs its interview before you join.
                    </p>
                  </div>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="mt-5 block">
                      <Button
                        size="lg"
                        className="w-full gap-2"
                        disabled={!canJoin || starting}
                        onClick={join}
                      >
                        {starting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Join the call
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canJoin && (
                    <TooltipContent side="top">
                      {school ? "Choose an interviewer first" : "Choose a school first"}
                    </TooltipContent>
                  )}
                </Tooltip>

                <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                  Uses one credit. Your camera and voice stay in the browser — only the
                  transcript is saved, so you can be graded on it.
                </p>
              </div>
            </motion.div>
          </aside>
        </div>
      </div>
    </>
  );
}
