/**
 * The interviewer's voice, and the signal that drives their face.
 *
 * Two jobs that have to stay in one hook because they share an audio graph:
 *
 *  1. Turn a line of text into speech through ElevenLabs (via the
 *     `interview-speak` edge function, which holds the API key), and play it.
 *  2. Expose the live amplitude of that playback, which is what the portrait
 *     crossfades on. Mouth movement driven by the actual waveform tracks the
 *     words; mouth movement driven by a timer does not, and the eye catches the
 *     difference immediately even when it can't name it.
 *
 * `level` is a ref, not state. It updates at audio rate and a component that
 * re-rendered on every change would re-render sixty times a second for the
 * whole interview. The portrait reads the ref inside its own rAF loop instead.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL ?? "https://aupymiiwhfnaoduvxyzt.supabase.co"}/functions/v1`;

export type VoiceMode =
  /** ElevenLabs, through the edge function. What the feature is designed for. */
  | "elevenlabs"
  /** The platform synthesiser. Worse, but present, and keeps the room usable. */
  | "browser"
  /** No speech at all. Captions carry it. */
  | "silent";

export interface InterviewVoice {
  /** Speak a line. Resolves when playback finishes or is stopped. */
  speak: (text: string, voiceId: string) => Promise<void>;
  /** Cut the current line off immediately — used when the student interrupts. */
  stop: () => void;
  /** 0-1, live. Read this in a rAF loop, never in render. */
  levelRef: React.MutableRefObject<number>;
  speaking: boolean;
  mode: VoiceMode;
  /**
   * Must be called from inside a real user gesture before the first `speak`.
   * Browsers refuse to start an AudioContext otherwise, and the failure is
   * silent — the interview would simply never make a sound.
   */
  unlock: () => Promise<void>;
  /** True once `unlock` has run successfully. */
  ready: boolean;
  /**
   * A live audio track carrying whatever the interviewer is saying.
   *
   * Exists so the speech can be handed to a streaming-avatar service for
   * lip-sync. Returns null before {@link unlock} has built the graph, and on
   * the browser-synthesiser fallback path, which produces no audio node to tap.
   */
  getSpeechTrack: () => MediaStreamTrack | null;
  /**
   * Whether the speech is played through this device's speakers.
   *
   * Turned off when a streaming avatar is rendering, because that service plays
   * the same audio alongside its video — leaving both on is an echo, and a
   * doubled voice a few tens of milliseconds apart is worse than either alone.
   */
  setLocalOutput: (enabled: boolean) => void;
}

export function useInterviewVoice(enabled = true): InterviewVoice {
  const [speaking, setSpeaking] = useState(false);
  const [mode, setMode] = useState<VoiceMode>("elevenlabs");
  const [ready, setReady] = useState(false);

  const levelRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const tapRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const localOutputRef = useRef(true);
  /** Guards against a late-arriving fetch for a line we've already moved past. */
  const generationRef = useRef(0);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const settle = useCallback(() => {
    setSpeaking(false);
    levelRef.current = 0;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.();
  }, []);

  const unlock = useCallback(async () => {
    try {
      if (!ctxRef.current) {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) ctxRef.current = new Ctx();
      }
      if (ctxRef.current?.state === "suspended") await ctxRef.current.resume();

      if (!audioRef.current) {
        const el = new Audio();
        el.crossOrigin = "anonymous";
        el.preload = "auto";
        audioRef.current = el;
      }

      // Wiring the graph once and reusing the element matters: a
      // MediaElementSource can only ever be created once per element, and
      // creating a new element per line would mean a new graph, a new
      // connection, and a click at the start of every sentence.
      if (ctxRef.current && audioRef.current && !sourceRef.current) {
        const src = ctxRef.current.createMediaElementSource(audioRef.current);
        const analyser = ctxRef.current.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.55;
        src.connect(analyser);
        analyser.connect(ctxRef.current.destination);
        sourceRef.current = src;
        analyserRef.current = analyser;
      }
      setReady(true);
    } catch (e) {
      console.warn("interview voice: audio unlock failed", e);
      // Still mark ready — the browser synthesiser path needs no AudioContext,
      // so a failed unlock must not leave the room mute and stuck.
      setReady(true);
    }
  }, []);

  const getSpeechTrack = useCallback((): MediaStreamTrack | null => {
    const ctx = ctxRef.current;
    const analyser = analyserRef.current;
    if (!ctx || !analyser) return null;
    if (!tapRef.current) {
      tapRef.current = ctx.createMediaStreamDestination();
      analyser.connect(tapRef.current);
    }
    return tapRef.current.stream.getAudioTracks()[0] ?? null;
  }, []);

  const setLocalOutput = useCallback((enabled: boolean) => {
    const ctx = ctxRef.current;
    const analyser = analyserRef.current;
    if (!ctx || !analyser || localOutputRef.current === enabled) return;
    localOutputRef.current = enabled;
    try {
      // Disconnect the one edge, not the node: a bare `analyser.disconnect()`
      // would also drop the tap feeding the avatar.
      if (enabled) analyser.connect(ctx.destination);
      else analyser.disconnect(ctx.destination);
    } catch (e) {
      console.warn("interview voice: could not toggle local output", e);
    }
  }, []);

  /** Sample the analyser into `levelRef` until playback ends. */
  const startMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      // RMS around the 128 midpoint, scaled so ordinary speech sits near 0.5
      // rather than down at 0.08 where nothing visible happens.
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      levelRef.current = Math.min(1, rms * 4.2);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  /**
   * Fake an amplitude envelope for the browser-synthesiser path.
   *
   * `speechSynthesis` gives no access to its audio, so there is no waveform to
   * read. A smoothed random walk at roughly syllable rate is visibly worse than
   * the real thing but far better than a frozen face, and it only runs on the
   * fallback path.
   */
  const startFakeMeter = useCallback(() => {
    let phase = 0;
    const tick = () => {
      phase += 0.22;
      const envelope = 0.45 + 0.35 * Math.sin(phase) + 0.2 * Math.sin(phase * 2.7);
      levelRef.current = Math.max(0, Math.min(1, envelope));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stop = useCallback(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    try { window.speechSynthesis?.cancel(); } catch { /* not present everywhere */ }
    const el = audioRef.current;
    if (el) {
      el.pause();
      try { el.currentTime = 0; } catch { /* ignore */ }
    }
    releaseObjectUrl();
    settle();
  }, [releaseObjectUrl, settle]);

  /** The fallback: the platform synthesiser. */
  const speakWithBrowser = useCallback(
    (text: string, generation: number) =>
      new Promise<void>((resolve) => {
        const synth = window.speechSynthesis;
        if (!synth) {
          setMode("silent");
          resolve();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.02;
        utterance.pitch = 1;
        // Prefer a natural-sounding en-* voice where the platform has one;
        // the default is often the most robotic option installed.
        const voices = synth.getVoices();
        const preferred =
          voices.find((v) => /Google (UK|US) English/i.test(v.name)) ??
          voices.find((v) => v.lang?.startsWith("en") && /natural|premium|enhanced/i.test(v.name)) ??
          voices.find((v) => v.lang?.startsWith("en"));
        if (preferred) utterance.voice = preferred;

        const finish = () => {
          if (generation !== generationRef.current) return;
          resolve();
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        setSpeaking(true);
        startFakeMeter();
        synth.speak(utterance);
      }),
    [startFakeMeter],
  );

  const speak = useCallback(
    async (text: string, voiceId: string): Promise<void> => {
      const line = text?.trim();
      if (!line || !enabled) return;

      stop();
      const generation = ++generationRef.current;

      // Held so `stop()` can resolve the same promise the caller is awaiting —
      // an interrupted line must not leave the turn loop hanging forever.
      const done = new Promise<void>((resolve) => { resolveRef.current = resolve; });

      if (mode === "silent") { settle(); return; }
      if (mode === "browser") {
        await speakWithBrowser(line, generation);
        if (generation === generationRef.current) settle();
        return done;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("no session");

        const res = await fetch(`${FUNCTIONS_BASE}/interview-speak`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: line, voiceId }),
          signal: controller.signal,
        });

        if (!res.ok) {
          // 503 means the key isn't configured on this deployment. That is a
          // permanent condition for this session, so switch modes once rather
          // than paying a failed round trip on every line.
          if (res.status === 503) {
            setMode("browser");
            await speakWithBrowser(line, generation);
            if (generation === generationRef.current) settle();
            return done;
          }
          throw new Error(`voice ${res.status}`);
        }

        const blob = await res.blob();
        if (generation !== generationRef.current) { settle(); return done; }

        releaseObjectUrl();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const el = audioRef.current;
        if (!el) { settle(); return done; }

        el.src = url;
        el.onended = () => { if (generation === generationRef.current) settle(); };
        el.onerror = () => { if (generation === generationRef.current) settle(); };

        setSpeaking(true);
        startMeter();
        await el.play();
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return done;
        console.warn("interview voice: falling back to browser speech", e);
        setMode("browser");
        await speakWithBrowser(line, generation);
        if (generation === generationRef.current) settle();
      }

      return done;
    },
    [enabled, mode, releaseObjectUrl, settle, speakWithBrowser, startMeter, stop],
  );

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      abortRef.current?.abort();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      void ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return { speak, stop, levelRef, speaking, mode, unlock, ready, getSpeechTrack, setLocalOutput };
}
