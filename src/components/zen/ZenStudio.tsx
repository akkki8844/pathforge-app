import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import * as THREE from "three";
import { setZen } from "@/lib/zen";
import { Scene } from "./studio/Scene";
import { preloadModels } from "./studio/models";
import { createAnim, TOP, BOTTOM, type Anim } from "./studio/anim";
import { HOTSPOTS, INTRO_PATH, STATIONS, isStation, type HotspotId, type StationId, type View } from "./studio/stage";
import { useFocusTimer } from "./studio/focus";
import { chime, purr, shutdownAudio, sound, useSound, type SoundKind } from "./studio/audio";
import { LiveData } from "./studio/live";
import { StationPanel } from "./studio/panels";
import { LeaveContext } from "./studio/leave";
import { StationIndex } from "./studio/Index";
import "./zen.css";

/*
 * Zen mode, the study.
 *
 * Turning Zen on leaves the app for a room: a night-time study built from
 * photoscanned furniture, with a student reading in the corner. The room is
 * the dashboard, simplified: every block of the dashboard page, and a few
 * things it never had, is an object you can walk up to.
 *
 *   laptop      focus timer          chalkboard  today's plan and scratch
 *   clock       today's classes and the next deadlines
 *   pinboard    the college list     compass     readiness, streak, essays
 *   shelves     documents, AI allowance, practice tests
 *   reader      admissions news      notebook    the weekly check-in
 *   cassette    rain or brown noise  window      a breathing break
 *
 * The index down the left edge lists them with the one number that matters at
 * each, so the room answers "how am I doing" before anything is clicked.
 * Number keys fly straight to a station; the arrows step between them.
 *
 * Interaction follows basement.studio's: hover an object and a hatched frame
 * traces it with a bracketed label; click and the camera moves to it; click
 * anywhere else to step back. The bottom toggle swaps the lit room for its
 * blueprint, which is also how the room is built on the way in: drafted as
 * line work floor to ceiling, then scanned into material, then the lights
 * come on one by one.
 */

type Phase = "loading" | "intro" | "live" | "leaving";

/**
 * A cheap check only. Creating a throwaway context to probe costs a GPU
 * round trip (seconds on a cold GPU process); if the real context then fails,
 * the boundary below catches it and the room falls back to plain panels.
 */
function hasWebGL() {
  return typeof window !== "undefined" && ("WebGL2RenderingContext" in window || "WebGLRenderingContext" in window);
}

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);
  return <>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>;
}

/** A session that ends anywhere in Zen chimes, not only at the desk. Kept in
 * its own leaf so the quarter-second tick never re-renders the studio. */
function TimerWatcher() {
  useFocusTimer(chime);
  return null;
}

/** The count while the furniture arrives. Its own leaf: progress updates
 * dozens of times during a load and should not re-render the studio. */
function Loader({ visible }: { visible: boolean }) {
  const { progress } = useProgress();
  return (
    <div
      data-zen-loader=""
      className="pointer-events-none absolute inset-0 flex items-end justify-between bg-[color:var(--zen-bg)] p-4 sm:p-8"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 400ms cubic-bezier(0.16,1,0.3,1)" }}
      aria-hidden={!visible}
    >
      <div>
        <div className="zen-mono text-[11px] uppercase text-[color:var(--zen-mute)]">
          {progress >= 100 ? "Zen mode / lighting the room" : "Zen mode / building your study"}
        </div>
        <div className="zen-mono mt-2 text-[64px] leading-none tabular-nums sm:text-[96px]">
          {String(Math.min(100, Math.round(progress))).padStart(3, "0")}
        </div>
      </div>
      <div className="mb-3 h-px w-[40vw] bg-[color:var(--zen-line)]">
        <div
          className="h-px w-full origin-left bg-[color:var(--zen-cobalt)]"
          style={{ transform: `scaleX(${Math.min(100, progress) / 100})`, transition: "transform 200ms" }}
        />
      </div>
    </div>
  );
}

const SOUND_NAME: Record<SoundKind, string> = { off: "off", rain: "rain", brown: "brown" };

/* ------------------------------------------------------------------ studio */

export default function ZenStudio({
  leaving,
  parked,
  onExited,
}: {
  leaving: boolean;
  parked: boolean;
  onExited: () => void;
}) {
  const navigate = useNavigate();
  const anim = useMemo<Anim>(() => createAnim(), []);
  const reduced = useMemo(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false, []);
  const lowPower = useMemo(
    () => (navigator.hardwareConcurrency ?? 8) <= 4 || (window.matchMedia?.("(pointer: coarse)").matches ?? false),
    [],
  );
  // Models download on first mount, not when the chunk is evaluated: ZenHost
  // prefetches this chunk while the app is idle, and that must stay cheap.
  useState(preloadModels);
  const [webgl, setWebgl] = useState(() => hasWebGL());
  const [phase, setPhase] = useState<Phase>("loading");
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("home");
  const [mode, setMode] = useState<"study" | "blueprint">("study");
  const [hover, setHover] = useState<HotspotId | null>(null);
  const [hudIn, setHudIn] = useState(false);
  const [lampOn, setLampOn] = useState(true);
  const snd = useSound();
  const lastSound = useRef<Exclude<SoundKind, "off">>("rain");
  const pointer = useRef(new THREE.Vector2());
  const frame = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const lampRef = useRef(true);

  const onReady = useCallback(() => setReady(true), []);

  /* ---- choreography ---- */

  const lightsUp = useCallback(
    (t: gsap.core.Timeline, at: number) => {
      t.to(anim, { moon: 1, duration: 1.1, ease: "power2.out" }, at).to(
        anim,
        { strip: 1, duration: 0.7, ease: "power2.out" },
        at + 0.15,
      );
      if (lampRef.current)
        t.to(
          anim,
          {
            keyframes: [
              { lamp: 1, duration: 0.05 },
              { lamp: 0.08, duration: 0.07 },
              { lamp: 0.9, duration: 0.05 },
              { lamp: 0.25, duration: 0.09 },
              { lamp: 1, duration: 0.14 },
            ],
          },
          at + 0.1,
        );
      t.to(anim, { hang: 1, duration: 0.5, ease: "power2.out" }, at + 0.3)
        .to(
          anim,
          {
            keyframes: [
              { neon: 0.9, duration: 0.03 },
              { neon: 0, duration: 0.1 },
              { neon: 0.7, duration: 0.04 },
              { neon: 0.1, duration: 0.06 },
              { neon: 1, duration: 0.3 },
            ],
          },
          at + 0.45,
        )
        .to(anim, { screen: 1, duration: 0.35, ease: "power2.out" }, at + 0.55)
        .to(anim, { dust: 1, duration: 1.4, ease: "sine.inOut" }, at + 0.4);
    },
    [anim],
  );

  const lightsDown = useCallback(
    (t: gsap.core.Timeline, at: number, d = 0.3) => {
      t.to(
        anim,
        { moon: 0, strip: 0, lamp: 0, hang: 0, neon: 0, screen: 0, dust: 0, duration: d, ease: "power2.in" },
        at,
      );
    },
    [anim],
  );

  const playEnter = useCallback(() => {
    tl.current?.kill();
    // A parked room comes back exactly as a fresh one would start.
    Object.assign(anim, createAnim(), { rain: sound.get().kind === "rain" ? 1 : 0 });
    setView("home");
    setMode("study");
    setHover(null);
    setPhase("intro");
    setHudIn(false);
    if (reduced) {
      Object.assign(anim, { draw: TOP, scan: TOP, pix: 0, cam: 1 });
      const t = gsap.timeline();
      lightsUp(t, 0);
      t.progress(1);
      setPhase("live");
      setHudIn(true);
      return;
    }
    const t = gsap.timeline({
      onComplete: () => setPhase("live"),
    });
    // 1. Drafting: lines rise from the floor while the camera starts its arc.
    t.to(anim, { draw: TOP, duration: 1.35, ease: "power2.inOut" }, 0)
      .to(anim, { pix: 1, duration: 0.5, ease: "power1.out" }, 0)
      .to(anim, { cam: 1, duration: 3.0, ease: "power3.inOut" }, 0)
      // 2. Printing: the scan follows the drawing up and leaves material.
      .to(anim, { scan: TOP, duration: 1.55, ease: "power1.inOut" }, 0.85)
      .to(anim, { pix: 0, duration: 0.9, ease: "power1.in" }, 1.5)
      // 4. HUD, staggered in once the room has settled.
      .call(() => setHudIn(true), [], 2.75);
    // 3. Lights, one at a time.
    lightsUp(t, 2.05);
    tl.current = t;
  }, [anim, lightsUp, reduced]);

  const playExit = useCallback(() => {
    tl.current?.kill();
    setPhase("leaving");
    setHudIn(false);
    setHover(null);
    sound.play("off");
    const t = gsap.timeline({ onComplete: () => onExited() });
    if (reduced) {
      t.to({}, { duration: 0.05 });
      tl.current = t;
      return;
    }
    lightsDown(t, 0, 0.22);
    t.to(anim, { pix: 1, duration: 0.3 }, 0.1)
      .to(anim, { scan: BOTTOM, duration: 0.6, ease: "power2.in" }, 0.12)
      .to(anim, { draw: BOTTOM, duration: 0.45, ease: "power2.in" }, 0.5)
      .to(anim, { pix: 0, duration: 0.25 }, 0.7);
    tl.current = t;
  }, [anim, lightsDown, onExited, reduced]);

  // Start once the room has loaded; restart if Zen is re-entered mid-exit.
  useEffect(() => {
    if (!ready || !webgl) return;
    if (leaving) playExit();
    else playEnter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, leaving, webgl]);

  // Without WebGL the tools show at once, with no room to build.
  useEffect(() => {
    if (webgl) return;
    setPhase("live");
    setHudIn(true);
  }, [webgl]);

  // Without WebGL there is nothing to animate out; hand straight back.
  useEffect(() => {
    if (!webgl && leaving) onExited();
  }, [webgl, leaving, onExited]);

  // Still loading when Zen is turned off: leave without the show.
  useEffect(() => {
    if (leaving && !ready && webgl) onExited();
  }, [leaving, ready, webgl, onExited]);

  useEffect(
    () => () => {
      tl.current?.kill();
      shutdownAudio();
    },
    [],
  );

  // Rain outside follows the rain you hear.
  useEffect(() => {
    if (snd.kind !== "off") lastSound.current = snd.kind;
    gsap.to(anim, { rain: snd.kind === "rain" ? 1 : 0, duration: snd.kind === "rain" ? 2.2 : 1.2, ease: "sine.inOut" });
  }, [anim, snd.kind]);

  const setModeAnimated = useCallback(
    (next: "study" | "blueprint") => {
      if (phase !== "live" || next === mode) return;
      setMode(next);
      setView("home");
      tl.current?.kill();
      const t = gsap.timeline();
      if (next === "blueprint") {
        lightsDown(t, 0);
        t.to(anim, { pix: 1, duration: 0.6, ease: "power1.out" }, 0.1).to(
          anim,
          { scan: BOTTOM, duration: 1.0, ease: "power2.inOut" },
          0.15,
        );
      } else {
        t.to(anim, { scan: TOP, duration: 1.2, ease: "power2.inOut" }, 0).to(anim, { pix: 0, duration: 0.8 }, 0.5);
        lightsUp(t, 0.9);
      }
      tl.current = t;
    },
    [anim, lightsDown, lightsUp, mode, phase],
  );

  /* ---- actions ---- */

  const toggleSound = useCallback(() => {
    sound.play(sound.get().kind === "off" ? lastSound.current : "off");
  }, []);

  const toggleLamp = useCallback(() => {
    const on = !lampRef.current;
    lampRef.current = on;
    setLampOn(on);
    gsap.killTweensOf(anim, "lamp");
    if (on)
      gsap.to(anim, {
        keyframes: [
          { lamp: 0.9, duration: 0.04 },
          { lamp: 0.15, duration: 0.06 },
          { lamp: 1, duration: 0.18, ease: "power2.out" },
        ],
      });
    else gsap.to(anim, { lamp: 0, duration: 0.16, ease: "power2.in" });
  }, [anim]);

  const leaveTo = useCallback(
    (path?: string) => {
      setZen(false);
      if (path) navigate(path);
    },
    [navigate],
  );

  const go = useCallback((id: StationId) => {
    setView(id);
    setHover(null);
  }, []);

  const goHome = useCallback(() => setView("home"), []);

  const activate = useCallback(
    (id: HotspotId) => {
      if (isStation(id)) {
        go(id);
        return;
      }
      switch (id) {
        case "lamp":
          toggleLamp();
          break;
        case "cat":
          purr();
          gsap.fromTo(
            anim,
            { pet: 0 },
            {
              keyframes: [
                { pet: 1, duration: 0.12, ease: "power2.out" },
                { pet: -0.35, duration: 0.18 },
                { pet: 0, duration: 0.3, ease: "back.out(2)" },
              ],
            },
          );
          break;
        case "door":
          leaveTo();
          break;
      }
    },
    [anim, go, leaveTo, toggleLamp],
  );

  const onActivate = useCallback((id: HotspotId) => activate(id), [activate]);

  const step = useCallback(
    (dir: 1 | -1) => {
      setView((v) => {
        const i = STATIONS.findIndex((s) => s.id === v);
        const n = i < 0 ? (dir === 1 ? 0 : STATIONS.length - 1) : (i + dir + STATIONS.length) % STATIONS.length;
        return STATIONS[n].id;
      });
    },
    [],
  );

  // Keys: number keys fly to a station, arrows step between them, Esc steps
  // back (it never leaves Zen by itself), M is the sound, B the blueprint.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "live" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (e.key === "Escape") {
        if (view !== "home") {
          e.preventDefault();
          goHome();
        }
        return;
      }
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const st = STATIONS.find((s) => s.key === e.key);
      if (st && mode === "study") {
        e.preventDefault();
        go(st.id);
      } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && view !== "home") {
        e.preventDefault();
        step(e.key === "ArrowRight" ? 1 : -1);
      } else if (e.key === "m" || e.key === "M") {
        toggleSound();
      } else if ((e.key === "b" || e.key === "B") && view === "home") {
        setModeAnimated(mode === "study" ? "blueprint" : "study");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, view, mode, go, goHome, step, toggleSound, setModeAnimated]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    pointer.current.set((e.clientX / w) * 2 - 1, -((e.clientY / h) * 2 - 1));
    const el = back.current;
    if (el) el.style.transform = `translate3d(${e.clientX + 14}px, ${e.clientY + 16}px, 0)`;
  }, []);

  const onPointerMissed = useCallback(() => {
    if (phase === "live" && view !== "home") goHome();
  }, [phase, view, goHome]);

  /* ---- the panel slot ---- */

  // The panel on screen lags the view by one exit: the old one leaves
  // (quick, ease-in) before the new one lands (slower, ease-out, a beat after
  // the camera starts moving), so two panels never overlap.
  const [shown, setShown] = useState<StationId | null>(null);
  const [panelIn, setPanelIn] = useState(false);
  const want = phase === "live" && view !== "home" ? view : null;
  useEffect(() => {
    if (want === shown) {
      if (!want) return;
      const id = window.setTimeout(() => setPanelIn(true), 30);
      return () => window.clearTimeout(id);
    }
    setPanelIn(false);
    const id = window.setTimeout(() => setShown(want), shown ? 170 : 0);
    return () => window.clearTimeout(id);
  }, [want, shown]);

  const interactive = phase === "live" && view === "home" && mode === "study";
  const station = view !== "home" ? STATIONS.find((s) => s.id === view) : undefined;
  const shownSide = shown ? STATIONS.find((s) => s.id === shown)?.side ?? "right" : "right";
  const hoverLabel = hover
    ? hover === "cassette"
      ? snd.kind === "off"
        ? "Sound"
        : `Sound: ${SOUND_NAME[snd.kind]}`
      : hover === "lamp"
        ? lampOn
          ? "Lamp off"
          : "Lamp on"
        : HOTSPOTS[hover].label
    : "";

  /* ---- render ---- */

  const hud = (delay: number): React.CSSProperties => ({
    opacity: hudIn ? 1 : 0,
    transform: hudIn ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 260ms ${hudIn ? delay : 0}ms cubic-bezier(0.16,1,0.3,1), transform 320ms ${hudIn ? delay : 0}ms cubic-bezier(0.16,1,0.3,1)`,
  });

  const loadingVisible = webgl && phase === "loading";
  const indexVisible = hudIn && phase === "live" && mode === "study";

  const slotClass =
    shownSide === "center"
      ? "pointer-events-none absolute inset-0 flex items-center justify-center"
      : shownSide === "left"
        ? "pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-4 sm:inset-x-auto sm:bottom-auto sm:left-6 sm:top-1/2 sm:-translate-y-1/2 sm:px-0 md:left-[256px] lg:left-[264px]"
        : "pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-4 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2 sm:px-0";
  const slideFrom = shownSide === "left" ? "-16px" : shownSide === "right" ? "16px" : "0px";
  const slotStyle: React.CSSProperties = {
    opacity: panelIn ? 1 : 0,
    transform: panelIn ? "translate3d(0,0,0)" : `translate3d(${slideFrom}, ${shownSide === "center" ? "0" : "6px"}, 0)`,
    transition: panelIn
      ? "opacity 300ms 140ms cubic-bezier(0.16,1,0.3,1), transform 420ms 140ms cubic-bezier(0.16,1,0.3,1)"
      : "opacity 150ms cubic-bezier(0.3,0,1,1), transform 150ms cubic-bezier(0.3,0,1,1)",
  };

  return (
    <LeaveContext.Provider value={leaveTo}>
      <div
        className="pf-zen absolute inset-0 select-none overflow-hidden bg-[color:var(--zen-bg)]"
        role="dialog"
        aria-modal="true"
        aria-label="Zen mode study"
        onPointerMove={onPointerMove}
        style={{ cursor: hover && interactive ? "pointer" : "default" }}
      >
        <LiveData />
        <TimerWatcher />

        {webgl ? (
          <SceneBoundary onError={() => setWebgl(false)}>
            <Canvas
              className="!absolute inset-0"
              shadows
              dpr={1}
              frameloop={parked ? "never" : "always"}
              gl={{ antialias: false, alpha: false, stencil: false, powerPreference: "high-performance" }}
              camera={{ fov: 62, near: 0.05, far: 60, position: INTRO_PATH[0] }}
              onCreated={({ gl }) => {
                // Reading every program's info log forces each shader to finish
                // compiling on the main thread; only worth it while developing.
                gl.debug.checkShaderErrors = import.meta.env.DEV;
                gl.toneMapping = THREE.ACESFilmicToneMapping;
                gl.toneMappingExposure = 1.3;
              }}
              onPointerMissed={onPointerMissed}
            >
              <Suspense fallback={null}>
                <Scene
                  anim={anim}
                  view={view}
                  hover={phase === "live" && mode === "study" ? hover : null}
                  interactive={interactive}
                  reduced={reduced}
                  lowPower={lowPower}
                  pointer={pointer}
                  frame={frame}
                  onHover={setHover}
                  onActivate={onActivate}
                  onReady={onReady}
                />
              </Suspense>
            </Canvas>
          </SceneBoundary>
        ) : null}

        {/* Hover frame, traced around the object by the scene each frame. */}
        <div
          ref={frame}
          className="zen-hatch pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity duration-100"
          aria-hidden
        >
          <span className="zen-mono absolute -bottom-6 right-0 whitespace-nowrap text-[12px] text-[color:var(--zen-ink)]">
            [{hoverLabel}]
          </span>
        </div>

        {/* In a close-up, the cursor carries the way back. */}
        <div
          ref={back}
          className="zen-mono pointer-events-none absolute left-0 top-0 hidden text-[12px] text-[color:var(--zen-mute)] md:block"
          style={{ opacity: phase === "live" && view !== "home" && !hover ? 1 : 0, transition: "opacity 160ms" }}
          aria-hidden
        >
          [Click to go back]
        </div>

        <Loader visible={loadingVisible} />

        {/* HUD */}
        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
          <div className="pointer-events-auto flex items-baseline gap-3" style={hud(0)}>
            <span className="text-[20px] font-semibold tracking-tight">pathforge.</span>
            <span className="zen-mono whitespace-nowrap text-[11px] uppercase text-[color:var(--zen-mute)]">
              Zen
              <span className="hidden sm:inline">
                {station ? ` / ${station.title}` : mode === "blueprint" ? " / Blueprint" : ""}
              </span>
            </span>
          </div>
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-2" style={hud(70)}>
            <span className="zen-mono hidden px-2 text-[12px] tabular-nums text-[color:var(--zen-mute)] sm:inline">
              <Clock />
            </span>
            <button type="button" className="zen-btn" onClick={toggleSound} aria-pressed={snd.kind !== "off"}>
              [Sound: {SOUND_NAME[snd.kind]}]
            </button>
            <button type="button" className="zen-btn" onClick={() => leaveTo()} aria-label="Leave Zen mode">
              [Exit Zen]
            </button>
          </div>
        </header>

        {webgl && (
          <StationIndex
            active={view !== "home" ? view : null}
            visible={indexVisible}
            stripVisible={indexVisible && view === "home"}
            onGo={go}
            onHover={interactive ? setHover : noop}
          />
        )}

        {/* The station's panel. */}
        {webgl && (
          <div className={slotClass} aria-hidden={!panelIn}>
            {/* Position lives on the slot, motion on this wrapper, so the
              slide never overrides the slot's own centring transform. */}
            <div style={slotStyle}>
              {shown && (
                <div className={shownSide === "center" ? "" : "pointer-events-auto"}>
                  <StationPanel id={shown} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom: the mode toggle (their HUMAN / MACHINE) and the way back. */}
        {webgl && (
          <footer className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-6">
            <div className="zen-mono hidden text-[11px] text-[color:var(--zen-mute)] sm:block" style={hud(140)}>
              {view === "home"
                ? mode === "study"
                  ? "Hover the room, or press 1 to 0."
                  : "B to switch back."
                : "Esc steps back. Arrows for the next station."}
            </div>
            <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6">
              <div style={hud(0)}>
                {view === "home" ? (
                  <div className="zen-mono flex items-center gap-1 rounded-full border border-[color:var(--zen-line)] bg-[color:var(--zen-panel)] px-2 py-1 text-[13px]">
                    {(["study", "blueprint"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={mode === m}
                        onClick={() => setModeAnimated(m)}
                        className="rounded-full px-3 py-1.5 uppercase tracking-[0.04em] transition-colors duration-100"
                        style={{ color: mode === m ? "var(--zen-cobalt)" : "var(--zen-ink)" }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="zen-mono flex items-center rounded-full border border-[color:var(--zen-line)] bg-[color:var(--zen-panel)] text-[13px]">
                    <button type="button" className="px-3 py-2 transition-colors duration-100 hover:text-[color:var(--zen-cobalt)]" onClick={() => step(-1)} aria-label="Previous station">
                      &lt;
                    </button>
                    <button
                      type="button"
                      onClick={goHome}
                      className="whitespace-nowrap border-x border-[color:var(--zen-line)] px-3 py-2 uppercase tracking-[0.04em] transition-colors duration-100 hover:text-[color:var(--zen-cobalt)] sm:px-4"
                    >
                      Back to the room
                    </button>
                    <button type="button" className="px-3 py-2 transition-colors duration-100 hover:text-[color:var(--zen-cobalt)]" onClick={() => step(1)} aria-label="Next station">
                      &gt;
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div
              className="zen-mono hidden text-right text-[11px] text-[color:var(--zen-mute)] sm:block"
              style={hud(210)}
            >
              M sound / Ctrl + . to leave
            </div>
          </footer>
        )}

        {/* No WebGL: the same stations, without the room. */}
        {!webgl && (
          <div className="absolute inset-0 overflow-y-auto p-4 pt-20">
            <div className="mx-auto grid max-w-[980px] items-start justify-items-center gap-4 md:grid-cols-2">
              {STATIONS.filter((s) => s.id !== "window").map((s) => (
                <StationPanel key={s.id} id={s.id} />
              ))}
            </div>
          </div>
        )}
      </div>
    </LeaveContext.Provider>
  );
}

function noop() {}
