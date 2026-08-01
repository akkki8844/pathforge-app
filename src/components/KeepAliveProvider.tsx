import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * KeepAliveProvider — prevents background tab throttling that interrupts
 * in-flight AI generations and silently consumes credits.
 *
 * Stack (best-effort, all fail silently if unavailable):
 *  1. navigator.wakeLock — keeps the screen awake on mobile / desktop.
 *  2. Silent AudioContext oscillator — keeps the tab in the foreground priority
 *     queue so setInterval/setTimeout/fetch don't get throttled to ~1Hz.
 *  3. Hidden Worker heartbeat — workers aren't throttled even when the main
 *     thread is, so they can post messages back to keep timers alive.
 *
 * Memory cost: ~3-5 MB (the user explicitly accepted this trade-off) — but
 * only while at least one AI generation is actually in flight. The provider
 * itself is mounted once, globally (including on the logged-out landing
 * page), so it must stay completely inert — no audio context, no worker, no
 * wake lock — until something opts in via `useKeepAlive(true)` /
 * `beginKeepAlive()`. Otherwise every visitor pays this cost for the entire
 * session regardless of whether they ever trigger a generation.
 */

type Listener = () => void;

let activeCount = 0;
const listeners = new Set<Listener>();

function getActiveCount() {
  return activeCount;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

/**
 * Imperative opt-in for call sites that aren't simple booleans (e.g. a loop
 * doing several sequential requests). Call the returned function when the
 * work is done — always from a `finally` block.
 */
export function beginKeepAlive(): () => void {
  activeCount += 1;
  notify();
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    activeCount = Math.max(0, activeCount - 1);
    notify();
  };
}

/**
 * Declarative opt-in: pass whether an AI generation is currently in flight
 * (e.g. `useKeepAlive(isProcessing)`). Keep-alive activates only while
 * `active` is true, and only for as long as this component stays mounted
 * with `active` true.
 */
export function useKeepAlive(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return beginKeepAlive();
  }, [active]);
}

export function KeepAliveProvider() {
  const isActive = useSyncExternalStore(subscribe, getActiveCount, () => 0) > 0;

  const wakeLockRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // --- 1. Wake lock ---
    const requestWakeLock = async () => {
      try {
        const nav: any = navigator;
        if (nav.wakeLock?.request) {
          wakeLockRef.current = await nav.wakeLock.request("screen");
        }
      } catch {
        /* not supported / denied — ignore */
      }
    };
    requestWakeLock();

    // --- 2. Silent audio loop ---
    const startSilentAudio = () => {
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        const ctx: AudioContext = new AC();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001; // effectively silent
        osc.connect(gain).connect(ctx.destination);
        osc.frequency.value = 1;
        osc.start();
        audioCtxRef.current = ctx;
      } catch {
        /* ignore */
      }
    };
    // AudioContext needs a user gesture in some browsers — if generation
    // starts without a fresh gesture this just no-ops, which is fine, the
    // wake lock + worker heartbeat still help.
    startSilentAudio();
    const onFirstInteraction = () => {
      if (!audioCtxRef.current) startSilentAudio();
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });

    // --- 3. Worker heartbeat ---
    try {
      const blob = new Blob(
        [
          `setInterval(() => self.postMessage({ t: Date.now() }), 5000);`,
        ],
        { type: "application/javascript" }
      );
      const url = URL.createObjectURL(blob);
      const w = new Worker(url);
      // Receiving a message wakes the main thread's task queue.
      w.onmessage = () => {
        /* no-op — receipt alone keeps the event loop active */
      };
      workerRef.current = w;
      // Worker holds a reference to the blob URL via the Worker constructor;
      // safe to revoke once created.
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }

    // --- Re-acquire wake lock when tab becomes visible again ---
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        requestWakeLock();
      }
      // Resume audio if it got suspended
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      try {
        wakeLockRef.current?.release?.();
      } catch {}
      wakeLockRef.current = null;
      try {
        audioCtxRef.current?.close();
      } catch {}
      audioCtxRef.current = null;
      try {
        workerRef.current?.terminate();
      } catch {}
      workerRef.current = null;
    };
  }, [isActive]);

  return null;
}
