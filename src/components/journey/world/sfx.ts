/**
 * Sound for the journey world, synthesised with Web Audio so there are no
 * files to fetch. Every cue is short and quiet; the campus arrival is the one
 * moment allowed to ring out.
 *
 * The AudioContext is created lazily and resumed on the first gesture, since
 * browsers refuse to start audio before one. Muting persists per browser.
 */

const KEY = "pf.journey.sound";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wet: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = readMuted();
const listeners = new Set<(m: boolean) => void>();

function readMuted() {
  try {
    return localStorage.getItem(KEY) === "off";
  } catch {
    return false;
  }
}

function audio(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(comp).connect(ctx.destination);

    // A small generated hall: decaying stereo noise as the impulse.
    const len = Math.floor(ctx.sampleRate * 2.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    wet = ctx.createGain();
    wet.gain.value = 0.32;
    wet.connect(verb).connect(master);

    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

if (typeof window !== "undefined") {
  const unlock = () => {
    if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

/** Route a node to the dry bus and, optionally, the reverb. */
function out(node: AudioNode, reverb = 0) {
  node.connect(master!);
  if (reverb > 0 && wet) {
    const s = ctx!.createGain();
    s.gain.value = reverb;
    node.connect(s).connect(wet);
  }
}

/** One enveloped oscillator. */
function tone(
  freq: number,
  at: number,
  dur: number,
  gain: number,
  opts: { type?: OscillatorType; to?: number; attack?: number; reverb?: number; pan?: number } = {},
) {
  const a = ctx!;
  const o = a.createOscillator();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, at);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, at + dur);
  const g = a.createGain();
  const atk = opts.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let tail: AudioNode = g;
  if (opts.pan !== undefined && a.createStereoPanner) {
    const p = a.createStereoPanner();
    p.pan.value = opts.pan;
    g.connect(p);
    tail = p;
  }
  o.connect(g);
  out(tail, opts.reverb ?? 0);
  o.start(at);
  o.stop(at + dur + 0.05);
}

/** A struck bell: a fundamental plus the inharmonic partials of a real bell. */
function bell(freq: number, at: number, gain: number, dur = 2.4, pan = 0) {
  const partials: [number, number][] = [[1, 1], [2.0, 0.5], [2.76, 0.32], [5.4, 0.14], [8.93, 0.06]];
  for (const [ratio, amp] of partials) {
    tone(freq * ratio, at, dur / Math.sqrt(ratio), gain * amp, { reverb: 0.9, pan });
  }
}

export const sfx = {
  isMuted: () => muted,

  setMuted(m: boolean) {
    muted = m;
    try {
      localStorage.setItem(KEY, m ? "off" : "on");
    } catch {
      /* private mode: the choice lasts for this visit */
    }
    if (m && ctx && ctx.state === "running") void ctx.suspend().catch(() => {});
    if (!m) audio();
    listeners.forEach((f) => f(m));
  },

  subscribe(f: (m: boolean) => void) {
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  },

  /** Air moving past the camera; strength 0..1 scales length and loudness. */
  whoosh(strength = 0.5) {
    const a = audio();
    if (!a || !noise) return;
    const s = Math.min(Math.max(strength, 0.15), 1);
    const t = a.currentTime;
    const dur = 0.45 + s * 1.4;
    const src = a.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(260, t);
    bp.frequency.exponentialRampToValueAtTime(1500 + s * 900, t + dur * 0.45);
    bp.frequency.exponentialRampToValueAtTime(380, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1 + s * 0.16, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let tail: AudioNode = g;
    if (a.createStereoPanner) {
      const p = a.createStereoPanner();
      p.pan.setValueAtTime(-0.5, t);
      p.pan.linearRampToValueAtTime(0.5, t + dur);
      g.connect(p);
      tail = p;
    }
    src.connect(bp).connect(g);
    out(tail, 0.25);
    src.start(t);
    src.stop(t + dur + 0.05);
  },

  /** Pointer passed over a coin. */
  hover() {
    const a = audio();
    if (!a) return;
    tone(1760, a.currentTime, 0.05, 0.025, { type: "sine" });
  },

  /** One keyboard or button step along the road. */
  step() {
    const a = audio();
    if (!a) return;
    tone(640, a.currentTime, 0.09, 0.05, { type: "triangle", to: 520 });
  },

  /** An open stage was chosen. */
  select() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    tone(587.33, t, 0.35, 0.12, { type: "triangle", reverb: 0.3 });
    tone(880, t + 0.07, 0.45, 0.1, { type: "triangle", reverb: 0.3 });
  },

  /** A locked stage was tried. */
  locked() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    tone(150, t, 0.16, 0.12, { type: "square", to: 90 });
    tone(118, t + 0.09, 0.18, 0.09, { type: "square", to: 70 });
  },

  /** Arrived on a new level's island: a soft bell pitched by level. */
  chime(level: number) {
    const a = audio();
    if (!a) return;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0];
    const f = scale[(level - 1) % 5] * (level > 5 ? (level > 10 ? 4 : 2) : 1);
    bell(f, a.currentTime, 0.05, 1.6);
  },

  /**
   * Diving into a stage: air rising as the camera climbs, a falling rush as
   * it drops, then a soft landing thump and a shimmer as the iris opens.
   * Timed to the scene's 1.55s dive.
   */
  dive() {
    const a = audio();
    if (!a || !noise) return;
    const t = a.currentTime;
    const rise = 0.8;
    const fall = 0.75;
    const src = a.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(1300, t + rise);
    bp.frequency.exponentialRampToValueAtTime(700, t + rise + 0.12);
    bp.frequency.exponentialRampToValueAtTime(3200, t + rise + fall);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + rise * 0.7);
    g.gain.exponentialRampToValueAtTime(0.03, t + rise + 0.1);
    g.gain.exponentialRampToValueAtTime(0.22, t + rise + fall - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + rise + fall + 0.18);
    src.connect(bp).connect(g);
    out(g, 0.3);
    src.start(t);
    src.stop(t + rise + fall + 0.25);

    // A tone that climbs with the camera, then drops with it.
    tone(220, t, rise, 0.03, { type: "sine", to: 440, attack: 0.3 });
    tone(660, t + rise, fall, 0.025, { type: "sine", to: 1760, attack: 0.4, reverb: 0.4 });

    const land = t + rise + fall;
    tone(110, land, 0.35, 0.16, { type: "sine", to: 48 });
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) =>
      tone(f, land + 0.04 + i * 0.045, 0.6, 0.03, { reverb: 0.8, pan: (i - 1.5) * 0.3 }),
    );
  },

  /** Climbing back out of a stage. */
  surface() {
    const a = audio();
    if (!a || !noise) return;
    const t = a.currentTime;
    const dur = 0.9;
    const src = a.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1;
    bp.frequency.setValueAtTime(2400, t);
    bp.frequency.exponentialRampToValueAtTime(420, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g);
    out(g, 0.25);
    src.start(t);
    src.stop(t + dur + 0.05);
    tone(880, t, 0.5, 0.025, { type: "sine", to: 440, reverb: 0.4 });
  },

  /** The camera reached the campus: a bell chord with a rising sparkle. */
  arrive() {
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    // Low pad under everything.
    tone(130.81, t, 3.2, 0.07, { attack: 0.6, reverb: 0.6 });
    tone(196.0, t, 3.2, 0.05, { attack: 0.8, reverb: 0.6 });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, t + 0.12 + i * 0.11, 0.07, 3, (i - 1.5) * 0.25));
    [1568, 2093, 2637, 3136, 4186].forEach((f, i) =>
      tone(f, t + 0.6 + i * 0.07, 0.5, 0.025, { reverb: 1, pan: (i % 2 ? 1 : -1) * 0.4 }),
    );
  },
};
