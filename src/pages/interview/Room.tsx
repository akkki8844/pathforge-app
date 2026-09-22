/**
 * `/interview/room` — the call itself.
 *
 * Deliberately outside `Layout`. A mock interview with the site's navbar above
 * it is a web page about an interview; the whole point of this screen is that
 * for the next half hour there is nothing else on it.
 *
 * The one piece of chrome that isn't furniture is the join overlay. It exists
 * because browsers will not start an AudioContext outside a user gesture and
 * fail silently when you try — without a real button to press, the interviewer
 * would open their mouth and no sound would ever come out.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InterviewerStage } from "@/components/interview/InterviewerStage";
import { SelfView } from "@/components/interview/SelfView";
import { CallControls } from "@/components/interview/CallControls";
import { LiveCaption } from "@/components/interview/LiveCaption";
import { SchoolCrest } from "@/components/interview/SchoolCrest";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { useLocalMedia } from "@/hooks/useLocalMedia";
import { interviewerByKey } from "@/lib/interview/personas";
import { schoolInterviewById, resolveSchoolInterview, GENERIC_SCHOOL } from "@/lib/interview/schools";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { SchoolInterviewProfile, InterviewerPersona } from "@/lib/interview/types";

interface RoomState {
  schoolId?: string;
  schoolName?: string;
  interviewerKey?: string;
  note?: string;
}

const PHASE_LABEL: Record<string, string> = {
  connecting: "Connecting…",
  speaking: "Speaking",
  listening: "Your turn",
  thinking: "Thinking",
  ended: "Call ended",
};

export default function InterviewRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as RoomState;

  const media = useLocalMedia();
  const session = useInterviewSession();

  const [joined, setJoined] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  // `elapsedSeconds` is derived from the session's start time on every render,
  // so the clock only needs something to force a render once a second. The
  // value itself is never read — hence the discarded first element.
  const [, tickClock] = useReducer((n: number) => n + 1, 0);
  const leavingRef = useRef(false);

  const persona: InterviewerPersona | null = state.interviewerKey
    ? interviewerByKey(state.interviewerKey) ?? null
    : null;

  const school: SchoolInterviewProfile = state.schoolId
    ? schoolInterviewById(state.schoolId)
      ?? (state.schoolName ? resolveSchoolInterview(state.schoolName) : GENERIC_SCHOOL)
    : GENERIC_SCHOOL;

  /* A direct hit on this URL has no state and therefore no interviewer. Send
     them to set one up rather than rendering an empty room. */
  useEffect(() => {
    if (!persona) navigate("/interview", { replace: true });
  }, [persona, navigate]);

  // Drives the call clock. One re-render a second is the cheapest correct way
  // to tick a timer; the amplitude-driven surfaces deliberately do not use it.
  useEffect(() => {
    if (!joined || session.phase === "ended") return;
    const id = window.setInterval(tickClock, 1000);
    return () => window.clearInterval(id);
  }, [joined, session.phase, tickClock]);

  // Closing the tab mid-interview loses the conversation. Browsers only honour
  // this when the page has been interacted with, which by this point it has.
  useEffect(() => {
    if (!joined || session.phase === "ended") return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [joined, session.phase]);

  // The sign-off has been delivered. Ask for the write-up immediately so it is
  // already being written while the student reads the end card, and let the
  // camera light go out — the call is over.
  //
  // Destructured rather than read off `session` inside the effect so the
  // dependency list names the three things that actually matter; depending on
  // the whole hook return would re-run this on every transcript keystroke.
  const { phase, sessionId: liveSessionId, requestReport } = session;
  const releaseMedia = media.release;
  useEffect(() => {
    if (phase === "ended" && liveSessionId) {
      void requestReport();
      releaseMedia();
    }
  }, [phase, liveSessionId, requestReport, releaseMedia]);

  const join = useCallback(async () => {
    if (!persona) return;
    setJoined(true);
    if (media.status === "idle") await media.request();
    await session.begin({ school, persona, studentNote: state.note });
  }, [media, persona, school, session, state.note]);

  const leave = useCallback(async () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    await session.end("left");
    await session.requestReport();
    media.release();
  }, [media, session]);

  if (!persona) return null;

  const speaking = session.phase === "speaking";
  const listening = session.phase === "listening";
  const answeredCount = session.turns.filter(
    (t) => t.speaker === "student" && t.text.trim().length > 0,
  ).length;

  return (
    <TooltipProvider delayDuration={200}>
      <Seo
        title={`Interview — ${school.shortName}`}
        description="Your mock interview is in progress."
        path="/interview/room"
        noindex
      />

      <div className="fixed inset-0 flex flex-col bg-stone-950 text-white">
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <SchoolCrest school={school} size={30} rounded="rounded-lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold leading-tight text-white">
                {school.shortName}
              </p>
              <p className="truncate text-[11px] leading-tight text-white/50">
                {persona.credential}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={session.phase}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: DURATION.fast }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.14em]",
                listening
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : speaking
                    ? "border-white/20 bg-white/10 text-white/80"
                    : "border-white/10 bg-white/[0.06] text-white/55",
              )}
            >
              {(session.phase === "thinking" || session.phase === "connecting") && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {PHASE_LABEL[session.phase] ?? "Live"}
            </motion.div>
          </AnimatePresence>
        </header>

        {/* ── Stage ────────────────────────────────────────────────────── */}
        <main className="relative min-h-0 flex-1 px-3 pb-3 sm:px-6 sm:pb-4">
          <div className="relative h-full w-full overflow-hidden rounded-2xl sm:rounded-3xl">
            <InterviewerStage
              persona={persona}
              levelRef={session.voice.levelRef}
              phase={session.phase}
              behavior={session.behavior}
              avatar={session.avatar}
            />

            {/* Lower third — the name plate a call app puts on the speaker. */}
            <div className="pointer-events-none absolute bottom-3 left-3 sm:bottom-5 sm:left-5">
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO, delay: 0.3 }}
                className="rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-md"
              >
                <p className="font-display text-sm font-bold leading-tight text-white">{persona.name}</p>
                <p className="text-[11px] leading-tight text-white/60">{persona.credential}</p>
              </motion.div>
            </div>

            <SelfView
              stream={media.stream}
              cameraOn={media.cameraOn}
              micOn={media.micOn}
              levelRef={media.levelRef}
              listening={listening}
              className="absolute right-3 top-3 sm:right-5 sm:top-5"
            />

            {captionsOn && joined && session.phase !== "ended" && (
              <LiveCaption
                phase={session.phase}
                interviewerName={persona.name}
                line={session.currentLine}
                transcript={session.transcript}
                interim={session.interim}
                className="absolute inset-x-0 bottom-[5.5rem] sm:bottom-24"
              />
            )}

            {/* A dropped turn. Non-blocking: the call is still live underneath. */}
            <AnimatePresence>
              {session.error && session.phase !== "ended" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute inset-x-0 top-3 mx-auto w-fit max-w-[90%] rounded-xl border border-destructive/40 bg-destructive/20 px-3 py-2 text-center text-xs text-white backdrop-blur-md"
                >
                  {session.error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Speech recognition is Chromium-only. Say so plainly rather than
                letting the microphone appear to work and transcribe nothing. */}
            {joined && !session.speechSupported && (
              <div className="absolute inset-x-0 top-3 mx-auto w-fit max-w-[90%] rounded-xl border border-warning/40 bg-warning/20 px-3 py-2 text-center text-xs text-white backdrop-blur-md">
                This browser can't transcribe speech. Use Chrome or Edge for the full interview.
              </div>
            )}

            {/* ── Join overlay ─────────────────────────────────────────── */}
            <AnimatePresence>
              {!joined && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DURATION.base }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-stone-950/80 backdrop-blur-md"
                >
                  <motion.div
                    initial={{ y: 16, scale: 0.97 }}
                    animate={{ y: 0, scale: 1 }}
                    transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
                    className="mx-4 max-w-md rounded-2xl border border-white/10 bg-stone-900/90 p-6 text-center shadow-2xl sm:p-8"
                  >
                    <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                      {school.shortName} · {persona.credential.split("·")[0]?.trim()}
                    </p>
                    <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
                      {persona.name} is waiting
                    </h1>
                    <p className="mt-2.5 text-sm leading-relaxed text-white/65">
                      They've read your essays and your activities list. Speak out loud —
                      they'll wait for you to finish, then reply. There's no question counter,
                      and it ends when the conversation does.
                    </p>
                    <Button size="lg" className="mt-6 w-full" onClick={() => void join()}>
                      Join now
                    </Button>
                    <button
                      type="button"
                      onClick={() => navigate("/interview")}
                      className="mt-3 text-xs text-white/45 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
                    >
                      Go back and change something
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── End card ─────────────────────────────────────────────── */}
            <AnimatePresence>
              {session.phase === "ended" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: DURATION.slow, delay: 0.4 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-stone-950/85 backdrop-blur-md"
                >
                  <motion.div
                    initial={{ y: 16, scale: 0.97 }}
                    animate={{ y: 0, scale: 1 }}
                    transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO, delay: 0.5 }}
                    className="mx-4 max-w-md rounded-2xl border border-white/10 bg-stone-900/90 p-6 text-center shadow-2xl sm:p-8"
                  >
                    <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                      Call ended
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
                      That's the interview.
                    </h2>
                    {answeredCount > 0 ? (
                      <>
                        <p className="mt-2.5 text-sm leading-relaxed text-white/65">
                          {answeredCount} answer{answeredCount === 1 ? "" : "s"} over{" "}
                          {Math.floor(session.elapsedSeconds / 60)} minute
                          {Math.floor(session.elapsedSeconds / 60) === 1 ? "" : "s"}. We're reading it
                          back against your application now.
                        </p>
                        <Button
                          size="lg"
                          className="mt-6 w-full"
                          onClick={() => navigate(`/interview/report/${session.sessionId}`)}
                          disabled={!session.sessionId}
                        >
                          See how it went
                        </Button>
                        <button
                          type="button"
                          onClick={() => navigate("/interview")}
                          className="mt-3 text-xs text-white/45 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
                        >
                          Run another one
                        </button>
                      </>
                    ) : (
                      /* Nothing was said, so there is no report and offering one
                         would send them to a page that can only apologise. */
                      <>
                        <p className="mt-2.5 text-sm leading-relaxed text-white/65">
                          You didn't answer anything, so there's nothing to assess. Check your
                          microphone is on and give it a real go — the feedback is only worth
                          as much as the conversation.
                        </p>
                        <Button size="lg" className="mt-6 w-full" onClick={() => navigate("/interview")}>
                          Try again
                        </Button>
                      </>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* ── Controls ─────────────────────────────────────────────────── */}
        {joined && session.phase !== "ended" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-4 sm:bottom-7">
            <div className="pointer-events-auto">
              <CallControls
                phase={session.phase}
                elapsedSeconds={session.elapsedSeconds}
                micOn={media.micOn}
                cameraOn={media.cameraOn}
                captionsOn={captionsOn}
                onToggleMic={media.toggleMic}
                onToggleCamera={media.toggleCamera}
                onToggleCaptions={() => setCaptionsOn((v) => !v)}
                onSubmitAnswer={session.submitAnswer}
                onLeave={() => void leave()}
              />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
