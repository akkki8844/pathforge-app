import { useSyncExternalStore } from "react";

/*
 * The news desk: the reader in the armchair and the stories she tells.
 *
 * The News panel drives it (which story, whether she is speaking) and the
 * student reads it inside her frame loop, so a story being told never
 * re-renders the room. Reading aloud uses the browser's own speech
 * synthesis, preferring a voice that runs on the device; it is off until
 * asked for, and the choice is remembered.
 */

export type DeskState = {
  /** The News station is open: she lowers the paper and faces you. */
  on: boolean;
  /** Which story she is on. */
  index: number;
  /** Read stories aloud as well as captioning them. */
  voice: boolean;
  /** Mid-sentence, spoken or captioned. */
  talking: boolean;
  /** While speaking: the character the voice has reached in the line, else -1. */
  spoken: number;
};

const VOICE_KEY = "pf-zen-news-voice";

function readVoice() {
  try {
    return localStorage.getItem(VOICE_KEY) === "1";
  } catch {
    return false;
  }
}

let state: DeskState = { on: false, index: 0, voice: readVoice(), talking: false, spoken: -1 };
const listeners = new Set<() => void>();

function set(patch: Partial<DeskState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Read every frame by the student. `beat` is when the last word landed
 * (performance.now), which is what her nods keep time with.
 */
export const deskMotion: { beat: number; talking: boolean; tag: HTMLElement | null } = {
  beat: 0,
  talking: false,
  /** The label that rides over her head while she is on air; placed by her frame loop. */
  tag: null,
};

export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

function pickVoice(): SpeechSynthesisVoice | null {
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  // On-device first: a network voice would send the text off to be spoken.
  const local = all.filter((v) => v.localService);
  return local.find((v) => /natural|neural|premium|enhanced/i.test(v.name)) ?? local[0] ?? null;
}

let utter: SpeechSynthesisUtterance | null = null;
let mouthTimer = 0;

function setTalking(on: boolean) {
  deskMotion.talking = on;
  if (on) deskMotion.beat = performance.now();
  if (state.talking !== on) set({ talking: on });
}

export const desk = {
  get: () => state,
  setOn(on: boolean) {
    if (state.on === on) return;
    set({ on });
    if (!on) desk.hush();
  },
  go(index: number) {
    if (index !== state.index) set({ index });
  },
  setVoice(voice: boolean) {
    try {
      localStorage.setItem(VOICE_KEY, voice ? "1" : "0");
    } catch {
      /* private mode: remembered for this visit */
    }
    if (!voice) desk.hush();
    set({ voice });
  },
  /** A word just landed: her head keeps the beat. */
  beat() {
    deskMotion.beat = performance.now();
  },
  /** Captioned without sound: she talks for as long as the caption types. */
  mouth(ms: number) {
    setTalking(true);
    window.clearTimeout(mouthTimer);
    mouthTimer = window.setTimeout(() => setTalking(false), ms);
  },
  /**
   * Speak a line. Resolves when she finishes, or at once if speech is off,
   * unavailable, or there is no on-device English voice to use.
   */
  say(text: string): Promise<boolean> {
    desk.hush();
    if (!canSpeak || !state.voice) return Promise.resolve(false);
    const voice = pickVoice();
    if (!voice) return Promise.resolve(false);
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.rate = 1.02;
      u.pitch = 1;
      u.onstart = () => setTalking(true);
      u.onboundary = (e) => {
        if (e.name !== "word" && e.name !== undefined) return;
        desk.beat();
        set({ spoken: e.charIndex });
      };
      const done = (ok: boolean) => {
        if (utter !== u) return resolve(false);
        utter = null;
        setTalking(false);
        set({ spoken: -1 });
        resolve(ok);
      };
      u.onend = () => done(true);
      u.onerror = () => done(false);
      utter = u;
      window.speechSynthesis.speak(u);
    });
  },
  hush() {
    window.clearTimeout(mouthTimer);
    if (utter) {
      utter = null;
      if (canSpeak) window.speechSynthesis.cancel();
    }
    setTalking(false);
    if (state.spoken !== -1) set({ spoken: -1 });
  },
};

/** Whether a voice exists to offer the toggle at all. Voices load late. */
export function hasLocalVoice() {
  if (!canSpeak) return false;
  return window.speechSynthesis.getVoices().some((v) => v.localService && v.lang.toLowerCase().startsWith("en"));
}

export function useDesk(): DeskState {
  return useSyncExternalStore(subscribe, desk.get, desk.get);
}
