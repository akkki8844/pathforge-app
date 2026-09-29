import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import * as THREE from "three";
import { ArrowLeft, ChevronLeft, ChevronRight, Footprints, Moon, Search, Sun, Volume2, VolumeX, X } from "lucide-react";
import pathforgeLogo from "@/assets/pathforge-logo.webp";
import { setZen, setZenTime, zenTime, type ZenTime } from "@/lib/zen";
import { Scene } from "./studio/Scene";
import { preloadModels } from "./studio/models";
import { createAnim, TOP, BOTTOM, type Anim } from "./studio/anim";
import { HOTSPOTS, INTRO_PATH, STATIONS, ZONES, isStation, stationForKey, type HotspotId, type StationId, type View } from "./studio/stage";
import { useFocusTimer } from "./studio/focus";
import { chime, purr, shutdownAudio, sound, useSound, type SoundKind } from "./studio/audio";
import { LiveData } from "./studio/live";
import { StationPanel } from "./studio/panels";
import { directoryIntent, GoContext, LeaveContext } from "./studio/leave";
import { StationIndex } from "./studio/Index";
import { applyPreset, enterWalk, explore, type Area } from "./studio/explore";
import { desk, deskMotion, useDesk } from "./studio/newsdesk";
import "./zen.css";

/*
 * Zen mode, the study.
 *
 * Turning Zen on leaves the app for a room: a study built from photoscanned
 * furniture, with a student reading in the corner, sunlit by day and
 * lamp-lit by night (T switches; it starts from the app's own theme). The
 * room is the whole app, laid out as places: every section of Pathforge
 * lives at an object, grouped into parts of the room.
 *
 *   the desk      laptop (focus), chalkboard (plan), binder (essays and
 *                 applications), phone (messages), compass (journey)
 *   the wall      clock (today), calendar (the week), pinboard (colleges)
 *   the shelves   binders (documents), prep books (test prep), trophy
 *                 (activities)
 *   the chair     the news desk        around the room: sound, a breathing
 *                                      break, and the directory by the door
 *
 * Each station's panel has its figures and the pages that live there. The
 * index down the left edge lists them with the one number that matters at
 * each, so the room answers "how am I doing" before anything is clicked.
 * Each station has a key; the arrows step between them.
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
      className="pointer-events-none absolute inset-0 flex items-end justify-between gap-6 bg-[color:var(--zen-bg)] p-5 sm:p-10"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 400ms cubic-bezier(0.16,1,0.3,1)" }}
      aria-hidden={!visible}
    >
      <div>
        <div className="zen-label !text-[color:var(--zen-blue)]">Zen mode</div>
        <div className="zen-display mt-3 text-[40px] font-semibold leading-none tracking-[-0.03em] sm:text-[56px]">
          {progress >= 100 ? "Lighting the room" : "Building your study"}
          <span className="text-[color:var(--zen-blue)]">.</span>
        </div>
      </div>
      <div className="mb-2 flex w-[34vw] items-center gap-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--zen-line)]">
          <div
            className="h-full w-full origin-left rounded-full bg-[color:var(--zen-blue)]"
            style={{ transform: `scaleX(${Math.min(100, progress) / 100})`, transition: "transform 200ms" }}
          />
        </div>
        <span className="zen-num w-10 text-right text-[14px] font-semibold text-[color:var(--zen-mute)]">
          {Math.min(100, Math.round(progress))}%
        </span>
      </div>
    </div>
  );
}

const AREAS: Array<[Area, string]> = [
  ["study", "Downstairs"],
  ["loft", "Upstairs"],
  ["terrace", "Terrace"],
];

const SOUND_NAME: Record<SoundKind, string> = { off: "Sound off", rain: "Rain", brown: "Brown noise" };

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
  // Walking needs a keyboard.
  const touch = useMemo(() => window.matchMedia?.("(pointer: coarse)").matches ?? false, []);
  const [webgl, setWebgl] = useState(() => hasWebGL());
  const [phase, setPhase] = useState<Phase>("loading");
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("home");
  const [mode, setMode] = useState<"study" | "blueprint">("study");
  const [area, setArea] = useState<Area>("study");
  const [hover, setHover] = useState<HotspotId | null>(null);
  const [hudIn, setHudIn] = useState(false);
  const [lampOn, setLampOn] = useState(true);
  const [time, setTime] = useState<ZenTime>(zenTime);
  const timeRef = useRef(time);
  // The reflections are baked for one lighting; they follow the time of day
  // once a dusk or a dawn has run.
  const [daylight, setDaylight] = useState(time === "day");
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
    Object.assign(anim, createAnim(), {
      rain: sound.get().kind === "rain" ? 1 : 0,
      day: timeRef.current === "day" ? 1 : 0,
    });
    setView("home");
    setMode("study");
    applyPreset("study", false);
    setArea("study");
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
    // 3. Lights, one at a time. By day the sun is already up, so the room
    // scans in lit rather than switching on afterwards.
    lightsUp(t, timeRef.current === "day" ? 0.85 : 2.05);
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

  // The reader lowers her paper and faces you while the News station is open.
  useEffect(() => {
    desk.setOn(phase === "live" && view === "reader");
  }, [phase, view]);
  useEffect(() => () => desk.setOn(false), []);

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

  const toggleTime = useCallback(() => {
    const next: ZenTime = timeRef.current === "day" ? "night" : "day";
    timeRef.current = next;
    setTime(next);
    setZenTime(next);
    gsap.killTweensOf(anim, "day");
    // Swap the baked reflections at the darkest point of the change.
    if (next === "night") setDaylight(false);
    gsap.to(anim, {
      day: next === "day" ? 1 : 0,
      duration: reduced ? 0.01 : 1.6,
      ease: "sine.inOut",
      onComplete: () => setDaylight(next === "day"),
    });
  }, [anim, reduced]);

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

  // Free exploration: walking the floors, and flying to a part of the building
  // (the stair is the way upstairs, so the flight climbs it).
  const startWalk = useCallback(() => {
    if (phase !== "live" || mode !== "study") return;
    enterWalk();
    setHover(null);
    setView("walk");
  }, [phase, mode]);
  const goArea = useCallback(
    (next: Area) => {
      if (phase !== "live" || mode !== "study") return;
      setArea(next);
      applyPreset(next);
      setHover(null);
      setView("home");
    },
    [phase, mode],
  );

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
      }
    },
    [anim, go, toggleLamp],
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
      if (phase !== "live") return;
      // Ctrl + K, the app's search shortcut, opens the directory here.
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === "k" || e.key === "K") && mode === "study") {
        e.preventDefault();
        e.stopPropagation();
        directoryIntent.focus = true;
        go("door");
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (e.key === "Escape") {
        if (view !== "home") {
          e.preventDefault();
          goHome();
        }
        return;
      }
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (view === "walk" && (/^[a-z]$/i.test(e.key) || e.key.startsWith("Arrow"))) {
        // The letters are walking here; the few that are not are handled first.
        const k = e.key.toLowerCase();
        if (k === "f") goHome();
        else if (k === "m") toggleSound();
        else if (k === "t") toggleTime();
        if (e.key.startsWith("Arrow")) e.preventDefault();
        return;
      }
      if (e.key === "/" && mode === "study") {
        e.preventDefault();
        directoryIntent.focus = true;
        go("door");
        return;
      }
      const st = stationForKey(e.key);
      if (st && mode === "study") {
        e.preventDefault();
        go(st.id);
      } else if ((e.key === "f" || e.key === "F") && view === "home" && mode === "study") {
        startWalk();
      } else if ((e.key === "r" || e.key === "R") && view === "home" && mode === "study") {
        goArea("study");
      } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && view !== "home") {
        e.preventDefault();
        step(e.key === "ArrowRight" ? 1 : -1);
      } else if (e.key === "m" || e.key === "M") {
        toggleSound();
      } else if (e.key === "t" || e.key === "T") {
        toggleTime();
      } else if ((e.key === "b" || e.key === "B") && view === "home") {
        setModeAnimated(mode === "study" ? "blueprint" : "study");
      }
    };
    // Capture, so the app's own Ctrl + K search underneath never opens.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [phase, view, mode, go, goHome, goArea, startWalk, step, toggleSound, toggleTime, setModeAnimated]);

  // The way-back label follows the cursor, so it stays hidden until there is one.
  const [pointerSeen, setPointerSeen] = useState(false);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setPointerSeen(true);
    const w = window.innerWidth;
    const h = window.innerHeight;
    pointer.current.set((e.clientX / w) * 2 - 1, -((e.clientY / h) * 2 - 1));
    const el = back.current;
    if (!el) return;
    el.style.transform = `translate3d(${e.clientX + 14}px, ${e.clientY + 16}px, 0)`;
    // Over a panel or the HUD a click does not step back, so say nothing.
    const overUi = !!(e.target as HTMLElement | null)?.closest?.(".zen-panel, nav, header, footer, button");
    el.style.visibility = overUi ? "hidden" : "";
  }, []);

  const onPointerMissed = useCallback(() => {
    // The release of a drag is not a click.
    if (explore.moved) return;
    if (phase === "live" && view !== "home" && view !== "walk") goHome();
  }, [phase, view, goHome]);

  /* ---- the panel slot ---- */

  // The panel on screen lags the view by one exit: the old one leaves
  // (quick, ease-in) before the new one lands (slower, ease-out, a beat after
  // the camera starts moving), so two panels never overlap.
  const [shown, setShown] = useState<StationId | null>(null);
  const [panelIn, setPanelIn] = useState(false);
  const want = phase === "live" && view !== "home" && view !== "walk" ? view : null;
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

  const free = view === "home" || view === "walk";
  const interactive = phase === "live" && free && mode === "study";
  const station = !free ? STATIONS.find((s) => s.id === view) : undefined;
  const shownSide = shown ? STATIONS.find((s) => s.id === shown)?.side ?? "right" : "right";
  const hoverKey = hover && isStation(hover) ? STATIONS.find((x) => x.id === hover)?.key : undefined;
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
        ? "pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-4 sm:inset-x-auto sm:bottom-auto sm:left-6 sm:top-1/2 sm:-translate-y-1/2 sm:px-0 md:left-[76px] lg:left-[84px]"
        : "pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-4 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2 sm:px-0";
  const slideFrom = shownSide === "left" ? "-16px" : shownSide === "right" ? "16px" : "0px";
  const slotStyle: React.CSSProperties = {
    opacity: panelIn ? 1 : 0,
    transform: panelIn ? "translate3d(0,0,0)" : `translate3d(${slideFrom}, ${shownSide === "center" ? "0" : "6px"}, 0)`,
    transition: panelIn
      ? "opacity 300ms 140ms cubic-bezier(0.16,1,0.3,1), transform 420ms 140ms cubic-bezier(0.16,1,0.3,1)"
      : "opacity 150ms cubic-bezier(0.3,0,1,1), transform 150ms cubic-bezier(0.3,0,1,1)",
  };

  const zone = station ? ZONES.find((z) => z.id === station.zone)?.title : undefined;

  return (
    <LeaveContext.Provider value={leaveTo}>
      <GoContext.Provider value={go}>
      <div
        className="pf-zen absolute inset-0 select-none overflow-hidden bg-[color:var(--zen-bg)]"
        data-time={time}
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
              camera={{ fov: 62, near: 0.05, far: 200, position: INTRO_PATH[0] }}
              onCreated={(state) => {
                const { gl } = state;
                // For poking at the scene from the console while developing.
                if (import.meta.env.DEV) (window as unknown as { __zen?: unknown }).__zen = state;
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
                  daylight={daylight}
                />
              </Suspense>
            </Canvas>
          </SceneBoundary>
        ) : null}

        {/* Hover frame, traced around the object by the scene each frame. */}
        <div
          ref={frame}
          className="zen-frame pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity duration-100"
          aria-hidden
        >
          <span className="zen-hover-label absolute -bottom-11 left-1/2 -translate-x-1/2 whitespace-nowrap">
            {hoverLabel}
            {hoverKey && <kbd>{hoverKey}</kbd>}
          </span>
        </div>

        {/* Over the reader's head while she is telling the news. */}
        <OnAirTag />

        {/* In a close-up, the cursor carries the way back. */}
        <div
          ref={back}
          className="pointer-events-none absolute left-0 top-0 hidden md:block"
          style={{ opacity: pointerSeen && phase === "live" && !free && !hover ? 1 : 0, transition: "opacity 160ms" }}
          aria-hidden
        >
          <span className="zen-chip">
            <ArrowLeft className="h-3.5 w-3.5" />
            Click to go back
          </span>
        </div>

        <Loader visible={loadingVisible} />

        {/* HUD */}
        <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-6">
          <div className="pointer-events-auto flex min-w-0 items-center gap-3" style={hud(0)}>
            <div className="zen-chip !h-11 shrink-0 !gap-2.5 !pl-2 !pr-4 !text-[color:var(--zen-ink)]">
              <img src={pathforgeLogo} alt="" className="h-7 w-7" draggable={false} />
              <span className="zen-display text-[16px] font-bold tracking-[-0.03em]">pathforge</span>
              <span className="rounded-full bg-[color:var(--zen-soft)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--zen-blue)]">
                Zen
              </span>
            </div>
            <span className="hidden min-w-0 lg:block">
              <span className="zen-chip max-w-full truncate">
              {station ? (
                <>
                  <span className="truncate">{zone}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate text-[color:var(--zen-ink)]">{station.title}</span>
                </>
              ) : mode === "blueprint" ? (
                "The blueprint"
              ) : view === "walk" ? (
                "Walking"
              ) : area === "loft" ? (
                "Upstairs"
              ) : area === "terrace" ? (
                "The terrace"
              ) : (
                "Your study"
              )}
              </span>
            </span>
          </div>
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2" style={hud(70)}>
            <span className="hidden lg:block">
              <span className="zen-chip zen-num !h-9">
                <Clock />
              </span>
            </span>
            <button
              type="button"
              className="zen-btn !h-9 max-sm:!hidden"
              onClick={() => {
                directoryIntent.focus = true;
                if (mode === "study") go("door");
              }}
              disabled={phase !== "live" || mode !== "study"}
            >
              <Search aria-hidden />
              Go anywhere
              <kbd>Ctrl K</kbd>
            </button>
            <button
              type="button"
              className="zen-btn zen-btn-icon !h-9 !w-9"
              onClick={toggleTime}
              aria-label={time === "day" ? "Switch to night" : "Switch to day"}
              title={time === "day" ? "Night (T)" : "Day (T)"}
            >
              {time === "day" ? <Moon aria-hidden /> : <Sun aria-hidden />}
            </button>
            <button
              type="button"
              className="zen-btn zen-btn-icon !h-9 !w-9"
              onClick={toggleSound}
              aria-pressed={snd.kind !== "off"}
              aria-label={snd.kind === "off" ? "Turn sound on" : `${SOUND_NAME[snd.kind]}, turn off`}
              title={`${SOUND_NAME[snd.kind]} (M)`}
            >
              {snd.kind === "off" ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
            </button>
            <button type="button" className="zen-btn !h-9" onClick={() => leaveTo()} aria-label="Leave Zen mode">
              <X aria-hidden />
              <span className="hidden sm:inline">Exit Zen</span>
            </button>
          </div>
        </header>

        {webgl && (
          <StationIndex
            active={station?.id ?? null}
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
            <div className="hidden max-w-[34vw] lg:block" style={hud(140)}>
              <span className="zen-chip">
                {view === "home"
                  ? mode === "study"
                    ? "Drag to look round, scroll to zoom. Hover anything, or press its key."
                    : "B to switch back to the study."
                  : view === "walk"
                    ? "W A S D to walk, drag to look, Shift to run. Esc to stop."
                    : "Esc steps back. Arrows for the next station."}
              </span>
            </div>
            <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6">
              <div style={hud(0)}>
                {view === "home" ? (
                  <div className="flex items-center gap-2">
                    <div className="zen-toolbar" role="group" aria-label="Places">
                      {AREAS.map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={area === id}
                          disabled={mode !== "study"}
                          onClick={() => goArea(id)}
                        >
                          {label}
                        </button>
                      ))}
                      {!touch && (
                        <button type="button" disabled={mode !== "study"} onClick={startWalk} aria-keyshortcuts="F">
                          <Footprints aria-hidden />
                          Walk
                        </button>
                      )}
                    </div>
                    <div className="max-sm:hidden">
                      <div className="zen-toolbar" role="group" aria-label="View">
                        {(["study", "blueprint"] as const).map((m) => (
                          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setModeAnimated(m)}>
                            {m === "study" ? "Lit" : "Blueprint"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : view === "walk" ? (
                  <div className="zen-toolbar">
                    <button type="button" onClick={goHome}>
                      Stop walking
                    </button>
                  </div>
                ) : (
                  <div className="zen-toolbar">
                    <button type="button" className="!px-2.5" onClick={() => step(-1)} aria-label="Previous station">
                      <ChevronLeft aria-hidden />
                    </button>
                    <button type="button" onClick={goHome}>
                      Back to the room
                    </button>
                    <button type="button" className="!px-2.5" onClick={() => step(1)} aria-label="Next station">
                      <ChevronRight aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="hidden lg:block" style={hud(210)}>
              <span className="zen-chip !gap-3">
                <span className="flex items-center gap-1.5"><kbd>F</kbd> walk</span>
                <span className="flex items-center gap-1.5"><kbd>M</kbd> sound</span>
                <span className="flex items-center gap-1.5"><kbd>T</kbd> {time === "day" ? "night" : "day"}</span>
                <span className="flex items-center gap-1.5"><kbd>B</kbd> blueprint</span>
              </span>
            </div>
          </footer>
        )}

        {/* No WebGL: the same stations, without the room. */}
        {!webgl && (
          <div className="absolute inset-0 overflow-y-auto p-4 pt-24">
            <div className="mx-auto grid max-w-[980px] items-start justify-items-center gap-4 md:grid-cols-2">
              {STATIONS.filter((s) => s.id !== "window").map((s) => (
                <StationPanel key={s.id} id={s.id} />
              ))}
            </div>
          </div>
        )}
      </div>
      </GoContext.Provider>
    </LeaveContext.Provider>
  );
}

function noop() {}

/** Rides over the reader's head (placed by her frame loop) while she has the floor. */
function OnAirTag() {
  const { talking, index } = useDesk();
  return (
    <div
      ref={(el) => {
        deskMotion.tag = el;
      }}
      className="zen-onair pointer-events-none absolute left-0 top-0 opacity-0"
      aria-hidden
    >
      <span className="zen-onair-inner">
        <i data-live={talking || undefined} />
        {talking ? "On air" : "The news desk"}
        <b>{index + 1}</b>
      </span>
    </div>
  );
}
