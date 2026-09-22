/**
 * The candidate's microphone.
 *
 * Wraps the Web Speech API into something an interview can actually run on,
 * which mostly means solving two problems the raw API does not:
 *
 *  1. **Endpointing.** `SpeechRecognition` will happily listen forever. A real
 *     interviewer decides you've finished when you stop talking for a beat —
 *     and how long that beat is, is personality. So the silence timer is a
 *     parameter, set from the interviewer's temperament, and a reserved
 *     interviewer genuinely does wait longer before assuming your turn is over.
 *     That pause is where the honest answers come from.
 *
 *  2. **Staying alive.** Chrome ends a continuous session on its own after
 *     roughly a minute, and on every `no-speech`. Left alone, the microphone
 *     quietly dies halfway through the interview and the candidate is talking
 *     to nobody. Every non-fatal end is restarted.
 *
 * Recognition is paused while the interviewer is speaking, because a laptop
 * speaker feeding back into the same microphone transcribes the interviewer's
 * own question as the candidate's answer.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type MicPermission = "unknown" | "granted" | "denied" | "unsupported";

export interface InterviewSpeech {
  /** Begin (or resume) listening for the candidate's answer. */
  listen: () => void;
  /** Stop listening and discard the silence timer, keeping what's transcribed. */
  hold: () => void;
  /** Stop and clear. */
  reset: () => void;
  /** Force the current answer to be submitted now, as if the timer had fired. */
  submitNow: () => void;
  /** Words recognised so far this turn, final segments only. */
  transcript: string;
  /** The in-flight guess for the words currently being said. */
  interim: string;
  listening: boolean;
  permission: MicPermission;
  supported: boolean;
}

interface Options {
  /** Silence, in ms, before the turn is considered finished. */
  silenceMs: number;
  /** Called with the finished answer. Empty string means they said nothing. */
  onEndpoint: (text: string) => void;
  /** While true, the microphone stays closed — the interviewer is talking. */
  muted: boolean;
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

export function useInterviewSpeech({ silenceMs, onEndpoint, muted }: Options): InterviewSpeech {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [permission, setPermission] = useState<MicPermission>("unknown");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  const silenceTimerRef = useRef<number | null>(null);
  const transcriptRef = useRef("");
  const onEndpointRef = useRef(onEndpoint);
  const silenceMsRef = useRef(silenceMs);
  /** Set while we deliberately tear the recogniser down, so `onend` doesn't restart it. */
  const stoppingRef = useRef(false);

  onEndpointRef.current = onEndpoint;
  silenceMsRef.current = silenceMs;

  const supported = typeof window !== "undefined" && getRecognitionCtor() !== null;

  const clearSilence = useCallback(() => {
    if (silenceTimerRef.current != null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const fireEndpoint = useCallback(() => {
    clearSilence();
    const text = transcriptRef.current.trim();
    transcriptRef.current = "";
    setTranscript("");
    setInterim("");
    onEndpointRef.current(text);
  }, [clearSilence]);

  const armSilence = useCallback(() => {
    clearSilence();
    silenceTimerRef.current = window.setTimeout(fireEndpoint, silenceMsRef.current);
  }, [clearSilence, fireEndpoint]);

  const teardown = useCallback(() => {
    stoppingRef.current = true;
    clearSilence();
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try { rec.abort(); } catch { /* already dead */ }
    }
    setListening(false);
  }, [clearSilence]);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setPermission("unsupported");
      return;
    }
    if (recognitionRef.current) return;

    stoppingRef.current = false;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event) => {
      setPermission("granted");
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalChunk += text;
        else interimChunk += text;
      }
      if (finalChunk) {
        transcriptRef.current = `${transcriptRef.current} ${finalChunk}`.replace(/\s+/g, " ").trim();
        setTranscript(transcriptRef.current);
      }
      setInterim(interimChunk.trim());
      // Any sound at all — including an interim guess — means they're still
      // going, so the clock restarts. Only genuine silence ends the turn.
      armSilence();
    };

    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setPermission("denied");
        wantListeningRef.current = false;
        teardown();
        return;
      }
      // `no-speech` and `aborted` are routine: the first is a quiet candidate,
      // the second is us. Neither is worth surfacing, and `onend` handles the
      // restart.
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      // Chrome ends a continuous session on its own after about a minute, and
      // after every no-speech. Without this the microphone silently dies
      // mid-interview and the candidate is talking to nobody.
      if (wantListeningRef.current && !stoppingRef.current) {
        window.setTimeout(() => {
          if (wantListeningRef.current && !recognitionRef.current) start();
        }, 120);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      // `start()` throws if a previous instance hasn't finished tearing down.
      // The `onend` restart above covers it.
      recognitionRef.current = null;
    }
  }, [armSilence, teardown]);

  const listen = useCallback(() => {
    wantListeningRef.current = true;
    if (!muted) start();
  }, [muted, start]);

  const hold = useCallback(() => {
    wantListeningRef.current = false;
    clearSilence();
    teardown();
  }, [clearSilence, teardown]);

  const reset = useCallback(() => {
    transcriptRef.current = "";
    setTranscript("");
    setInterim("");
    hold();
  }, [hold]);

  const submitNow = useCallback(() => {
    fireEndpoint();
  }, [fireEndpoint]);

  // The interviewer talking closes the microphone. A laptop speaker feeding the
  // same microphone would otherwise transcribe their question as the
  // candidate's answer, and the interview would start arguing with itself.
  useEffect(() => {
    if (muted) {
      clearSilence();
      teardown();
    } else if (wantListeningRef.current) {
      start();
    }
  }, [muted, clearSilence, start, teardown]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      clearSilence();
      teardown();
    };
  }, [clearSilence, teardown]);

  return { listen, hold, reset, submitNow, transcript, interim, listening, permission, supported };
}
