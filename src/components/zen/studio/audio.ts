/*
 * The room's sound, synthesised on the spot so there is nothing to download:
 * rain on the window (two bands of filtered noise breathing slowly) or brown
 * noise, a chime for the end of a focus session, and a purr for the cat.
 * Nothing plays until the student asks for it, and the context is only
 * created on a click.
 */

import { useSyncExternalStore } from "react";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noiseBuffer(ac: AudioContext, seconds: number, brown: boolean) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = white;
    }
  }
  return buf;
}

/* ------------------------------------------------------------ soundscapes */

export type SoundKind = "off" | "rain" | "brown";

type Bed = { gain: GainNode; nodes: AudioNode[]; sources: AudioScheduledSourceNode[] };

let bed: Bed | null = null;
let state: { kind: SoundKind; volume: number } = { kind: "off", volume: 0.7 };
const listeners = new Set<() => void>();

/** Rain on the window: a hiss for the drops, a low body for the downpour, in gusts. */
function buildRain(ac: AudioContext, out: GainNode): Bed {
  const hiss = ac.createBufferSource();
  hiss.buffer = noiseBuffer(ac, 3, false);
  hiss.loop = true;
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 7000;
  const hissGain = ac.createGain();
  hissGain.gain.value = 0.05;
  hiss.connect(hp).connect(lp).connect(hissGain).connect(out);

  const body = ac.createBufferSource();
  body.buffer = noiseBuffer(ac, 4, true);
  body.loop = true;
  const bodyLp = ac.createBiquadFilter();
  bodyLp.type = "lowpass";
  bodyLp.frequency.value = 420;
  const bodyGain = ac.createGain();
  bodyGain.gain.value = 0.22;
  body.connect(bodyLp).connect(bodyGain).connect(out);

  // A slow swell so the rain comes in gusts rather than as a flat hiss.
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoDepth = ac.createGain();
  lfoDepth.gain.value = 0.018;
  lfo.connect(lfoDepth).connect(hissGain.gain);
  return { gain: out, nodes: [hp, lp, bodyLp, hissGain, bodyGain, lfoDepth], sources: [hiss, body, lfo] };
}

/** Brown noise: the low, even rumble people use to shut a room out. */
function buildBrown(ac: AudioContext, out: GainNode): Bed {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 5, true);
  src.loop = true;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 520;
  const g = ac.createGain();
  g.gain.value = 0.34;
  src.connect(lp).connect(g).connect(out);
  // The filter drifts a little so the ear does not lock onto the loop.
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.045;
  const depth = ac.createGain();
  depth.gain.value = 90;
  lfo.connect(depth).connect(lp.frequency);
  return { gain: out, nodes: [lp, g, depth], sources: [src, lfo] };
}

const LEVEL: Record<Exclude<SoundKind, "off">, number> = { rain: 0.9, brown: 0.8 };

function stopBed() {
  const ac = ctx;
  const b = bed;
  if (!ac || !b) return;
  bed = null;
  b.gain.gain.cancelScheduledValues(ac.currentTime);
  b.gain.gain.setValueAtTime(b.gain.gain.value, ac.currentTime);
  b.gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.6);
  window.setTimeout(() => {
    for (const s of b.sources) s.stop();
    for (const n of [...b.sources, ...b.nodes]) n.disconnect();
    b.gain.disconnect();
  }, 700);
}

function emit() {
  listeners.forEach((l) => l());
}

export const sound = {
  get: () => state,
  play(kind: SoundKind) {
    if (kind === state.kind) return;
    stopBed();
    state = { ...state, kind };
    if (kind !== "off") {
      const ac = audio();
      if (ac) {
        const out = ac.createGain();
        out.gain.value = 0;
        out.connect(ac.destination);
        bed = kind === "rain" ? buildRain(ac, out) : buildBrown(ac, out);
        for (const s of bed.sources) s.start();
        out.gain.linearRampToValueAtTime(LEVEL[kind] * state.volume, ac.currentTime + 1.2);
      }
    }
    emit();
  },
  setVolume(volume: number) {
    state = { ...state, volume: Math.max(0, Math.min(1, volume)) };
    const ac = ctx;
    if (ac && bed && state.kind !== "off") {
      bed.gain.gain.cancelScheduledValues(ac.currentTime);
      bed.gain.gain.setTargetAtTime(LEVEL[state.kind] * state.volume, ac.currentTime, 0.05);
    }
    emit();
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSound() {
  return useSyncExternalStore(subscribe, sound.get, sound.get);
}

export function chime() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  [659.25, 987.77, 1318.5].forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t + i * 0.12);
    g.gain.linearRampToValueAtTime(0.12, t + i * 0.12 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 1.8);
    o.connect(g).connect(ac.destination);
    o.start(t + i * 0.12);
    o.stop(t + i * 0.12 + 1.9);
  });
}

export function purr() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 1.4, true);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 180;
  const am = ac.createGain();
  am.gain.value = 0;
  const lfo = ac.createOscillator();
  lfo.frequency.value = 26;
  const depth = ac.createGain();
  depth.gain.value = 0.5;
  lfo.connect(depth).connect(am.gain);
  const env = ac.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.7, t + 0.15);
  env.gain.linearRampToValueAtTime(0, t + 1.3);
  src.connect(lp).connect(am).connect(env).connect(ac.destination);
  src.start(t);
  lfo.start(t);
  src.stop(t + 1.4);
  lfo.stop(t + 1.4);
}

/** Close everything when Zen is left, so no audio thread idles in the tab. */
export function shutdownAudio() {
  sound.play("off");
  const ac = ctx;
  ctx = null;
  if (ac) window.setTimeout(() => void ac.close().catch(() => undefined), 800);
}
