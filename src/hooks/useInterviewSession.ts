/**
 * The conversation loop.
 *
 * Everything else in this feature is a part — a voice, a microphone, a face, an
 * edge function. This is the thing that makes them a conversation: speak,
 * listen, wait for the silence to mean something, think for a beat, speak
 * again. The beats matter as much as the words, which is why the delays here
 * are read from the interviewer's temperament rather than being constants.
 *
 * Deliberately *not* a state machine library. There are five states and one
 * legal transition out of each; a chart would be more ceremony than the thing
 * it describes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { interviewDb } from "@/integrations/supabase/interview";
import { functionErrorMessage } from "@/lib/functionError";
import {
  ENDPOINT_SILENCE_MS,
  RESPONSE_DELAY_MS,
} from "@/lib/interview/personas";
import type { InterviewerPersona, SchoolInterviewProfile, TurnIntent } from "@/lib/interview/types";
import { useInterviewSpeech } from "./useInterviewSpeech";
import { useInterviewVoice } from "./useInterviewVoice";
import { useInterviewAvatar } from "./useInterviewAvatar";

export type InterviewPhase =
  | "idle"
  /** Creating the session and fetching the opening line. */
  | "connecting"
  /** The interviewer is talking. The microphone is closed. */
  | "speaking"
  /** The candidate's turn. The silence timer is running. */
  | "listening"
  /** Their answer is in; waiting on the next line. */
  | "thinking"
  /** Sign-off delivered; the write-up is being requested. */
  | "ended";

export type InterviewBehavior = "neutral" | "nod" | "lean-in" | "smile" | "note";

export interface LocalTurn {
  idx: number;
  speaker: "interviewer" | "student";
  text: string;
  intent?: TurnIntent;
  sourceRef?: string | null;
}

interface BeginArgs {
  school: SchoolInterviewProfile;
  persona: InterviewerPersona;
  studentNote?: string;
}

/**
 * How many times in a row the candidate can say nothing before we stop.
 *
 * Three is a real pause that the interviewer reacts to twice; the fourth is
 * someone who has walked away from the laptop. Without this the loop would
 * quietly bill a gateway call every few seconds forever.
 */
const MAX_CONSECUTIVE_SILENCES = 3;

export function useInterviewSession() {
  const [phase, setPhase] = useState<InterviewPhase>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<LocalTurn[]>([]);
  const [currentLine, setCurrentLine] = useState("");
  const [behavior, setBehavior] = useState<InterviewBehavior>("neutral");
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [reportRequested, setReportRequested] = useState(false);

  const personaRef = useRef<InterviewerPersona | null>(null);
  const schoolRef = useRef<SchoolInterviewProfile | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const phaseRef = useRef<InterviewPhase>("idle");
  const silenceCountRef = useRef(0);
  const nextIdxRef = useRef(0);
  const closingRef = useRef(false);

  phaseRef.current = phase;

  const voice = useInterviewVoice();
  const avatar = useInterviewAvatar();

  const temperament = personaRef.current?.temperament ?? "warm";

  /* ── delivering a line ────────────────────────────────────────────────── */

  const appendTurn = useCallback((turn: Omit<LocalTurn, "idx">) => {
    setTurns((prev) => [...prev, { ...turn, idx: nextIdxRef.current++ }]);
  }, []);

  /**
   * Say a line, then hand the floor back.
   *
   * The two `setPhase` calls bracket the whole utterance rather than the
   * network call, because "the interviewer is talking" is a state the
   * microphone must stay closed for — not a state that ends when the audio
   * arrives.
   */
  const deliver = useCallback(
    async (text: string, how: InterviewBehavior, closing: boolean) => {
      const persona = personaRef.current;
      if (!persona) return;

      setPhase("speaking");
      setCurrentLine(text);
      setBehavior(how);
      appendTurn({ speaker: "interviewer", text, intent: closing ? "closing" : undefined });

      // Raced against a ceiling, because every way this promise resolves runs
      // through an audio element event — and an element handed a zero-length or
      // malformed body fires neither `ended` nor `error` on every platform. One
      // such line would strand the interview in "speaking" with a closed
      // microphone and no way back. The ceiling is generous enough never to cut
      // a real utterance short: roughly four times how long the line takes to
      // say at conversational pace.
      const ceilingMs = Math.min(90_000, Math.max(8_000, text.length * 260));
      await Promise.race([
        voice.speak(text, persona.voiceId),
        new Promise((resolve) => setTimeout(resolve, ceilingMs)),
      ]);

      if (closing) {
        closingRef.current = true;
        setPhase("ended");
        return;
      }
      setBehavior("neutral");
      setPhase("listening");
    },
    [appendTurn, voice],
  );

  /* ── the candidate's turn landing ─────────────────────────────────────── */

  const sendTurn = useCallback(
    async (studentText: string) => {
      const persona = personaRef.current;
      const school = schoolRef.current;
      const id = sessionIdRef.current;
      if (!persona || !school || !id) return;

      if (studentText) {
        silenceCountRef.current = 0;
        appendTurn({ speaker: "student", text: studentText });
      } else {
        silenceCountRef.current += 1;
        if (silenceCountRef.current > MAX_CONSECUTIVE_SILENCES) {
          await deliver(
            "I think we might have lost you there. Let's stop here for now — thanks for your time, and good luck with everything.",
            "smile",
            true,
          );
          return;
        }
      }

      setPhase("thinking");

      const { data, error: fnError } = await supabase.functions.invoke("interview-turn", {
        body: {
          sessionId: id,
          studentText,
          school: {
            name: school.name,
            shortName: school.shortName,
            format: school.format,
            weight: school.weight,
            conductedBy: school.conductedBy,
            emphasis: school.emphasis,
            typicalMinutes: school.typicalMinutes,
          },
          persona: {
            name: persona.name,
            credential: persona.credential,
            temperament: persona.temperament,
            brief: persona.brief,
            setting: persona.setting,
          },
        },
      });

      if (fnError || !data?.say) {
        const message = await functionErrorMessage(
          fnError,
          "The connection dropped for a second. Try saying that again.",
        );
        setError(message);
        // Back to listening rather than dead: a dropped turn in a real call is
        // something you talk through, not something that ends the interview.
        setPhase("listening");
        return;
      }

      setError(null);

      // The beat before a person answers. Without it the interviewer replies
      // the instant you stop, which is the single clearest tell that you are
      // talking to software.
      await new Promise((r) => setTimeout(r, RESPONSE_DELAY_MS[persona.temperament]));

      await deliver(
        String(data.say),
        (data.behavior as InterviewBehavior) ?? "neutral",
        data.shouldClose === true,
      );
    },
    [appendTurn, deliver],
  );

  const sendTurnRef = useRef(sendTurn);
  sendTurnRef.current = sendTurn;

  const speech = useInterviewSpeech({
    silenceMs: ENDPOINT_SILENCE_MS[temperament],
    muted: phase !== "listening",
    onEndpoint: useCallback((text: string) => {
      if (phaseRef.current !== "listening") return;
      void sendTurnRef.current(text);
    }, []),
  });

  // The microphone opens exactly when the floor is the candidate's, and not one
  // moment before — see the echo note in useInterviewSpeech.
  //
  // Depends on the two callbacks rather than on `speech`, which is a fresh
  // object every render and would re-run this on every transcript keystroke.
  const { listen, hold } = speech;
  useEffect(() => {
    if (phase === "listening") listen();
    else hold();
  }, [phase, listen, hold]);

  /* ── lifecycle ────────────────────────────────────────────────────────── */

  const begin = useCallback(
    async ({ school, persona, studentNote }: BeginArgs) => {
      setError(null);
      setPhase("connecting");
      personaRef.current = persona;
      schoolRef.current = school;
      closingRef.current = false;
      silenceCountRef.current = 0;
      nextIdxRef.current = 0;
      setTurns([]);

      await voice.unlock();

      // The avatar rides on the voice graph, so it can only be opened once
      // `unlock` has built it. A false here is the ordinary case — no key, no
      // face id, or a failed handshake — and the room simply keeps its frames.
      const live = await avatar.connect(persona.simliFaceId, voice.getSpeechTrack());
      // Simli plays the same audio next to its video; leaving the local output
      // on as well is an echo a few tens of milliseconds wide.
      voice.setLocalOutput(!live);

      const { data, error: fnError } = await supabase.functions.invoke("interview-start", {
        body: {
          schoolId: school.id,
          interviewerKey: persona.key,
          studentNote,
          school: {
            name: school.name,
            shortName: school.shortName,
            format: school.format,
            weight: school.weight,
            conductedBy: school.conductedBy,
            emphasis: school.emphasis,
            typicalMinutes: school.typicalMinutes,
          },
          persona: {
            name: persona.name,
            credential: persona.credential,
            temperament: persona.temperament,
            brief: persona.brief,
            setting: persona.setting,
          },
        },
      });

      if (fnError || !data?.sessionId) {
        const message = await functionErrorMessage(
          fnError,
          "Couldn't connect to your interviewer. Try again.",
        );
        setError(message);
        setPhase("idle");
        return null;
      }

      sessionIdRef.current = data.sessionId;
      setSessionId(data.sessionId);
      setStartedAt(Date.now());
      await deliver(String(data.opening), (data.behavior as InterviewBehavior) ?? "smile", false);
      return data.sessionId as string;
    },
    [avatar, deliver, voice],
  );

  /** Leave the call. Ends the session server-side whether or not it ran long. */
  const end = useCallback(
    async (reason: "finished" | "left" = "finished") => {
      voice.stop();
      avatar.clearBuffer();
      avatar.disconnect();
      voice.setLocalOutput(true);
      speech.hold();
      setPhase("ended");
      const id = sessionIdRef.current;
      if (!id) return;
      const seconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;
      await interviewDb
        .from("interview_sessions")
        // `as never` matches the convention in useRoutineData: the hand-written
        // schema's Update type is an intersection, which supabase-js's generic
        // constraint won't accept directly. The shape is checked by the column
        // list above it, not by this cast.
        .update({
          status: reason === "left" && !closingRef.current ? "abandoned" : "ended",
          ended_at: new Date().toISOString(),
          duration_seconds: seconds,
        } as never)
        .eq("id", id);
    },
    [avatar, speech, startedAt, voice],
  );

  /**
   * Kick off the write-up.
   *
   * Fire-and-forget on purpose: the report page subscribes to the row over
   * realtime, so the student can navigate there immediately and watch it land
   * rather than staring at a spinner on the call screen. Guarded by
   * `reportRequested` because the room calls this from an effect that also
   * runs on a re-render.
   */
  const requestReport = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id || reportRequested) return;

    // Nothing was said, so there is nothing to grade. Asking anyway made
    // `interview-report` answer 422 NOTHING_TO_ASSESS, and because the call was
    // a bare `void invoke(...)` the rejection reached the global handler and
    // the student saw the raw JSON body in a red "Something went wrong on this
    // page" banner. Both halves of that were wrong: don't ask, and don't let an
    // expected refusal escape as an unhandled rejection.
    const answered = turns.some((t) => t.speaker === "student" && t.text.trim().length > 0);
    if (!answered) return;

    setReportRequested(true);
    try {
      await supabase.functions.invoke("interview-report", { body: { sessionId: id } });
    } catch (e) {
      // Swallowed on purpose, but not for the reason this comment used to give.
      //
      // It said the report page "subscribes to the row and shows its own failed
      // state with a Try again button, so a failure here needs no second
      // surface". That only holds when a row exists to be marked failed. If the
      // invocation never reached the function — which is exactly what lands
      // here — there is no row, nothing for realtime to report, and the report
      // page sat spinning under a line promising the write-up was coming.
      //
      // It now gives up on that promise after ninety seconds and offers the
      // same retry, so the claim is finally true. Leaving the failure quiet
      // here is still right: the student is mid-goodbye on a call screen, and
      // the place to recover is the page they are about to open.
      console.warn("interview-report request failed", e);
    }
  }, [reportRequested, turns]);

  const elapsedSeconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;

  useEffect(() => {
    return () => { voice.stop(); };
    // Intentionally on unmount only — `voice.stop` is stable via useCallback and
    // re-running this on every identity change would cut the interviewer off
    // mid-sentence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    phase,
    sessionId,
    turns,
    currentLine,
    behavior,
    error,
    elapsedSeconds,
    startedAt,
    begin,
    end,
    requestReport,
    /** Force-submit the current answer without waiting out the silence. */
    submitAnswer: speech.submitNow,
    avatar,
    transcript: speech.transcript,
    interim: speech.interim,
    micPermission: speech.permission,
    speechSupported: speech.supported,
    voice,
  };
}
