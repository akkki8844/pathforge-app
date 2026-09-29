import { memo, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { edgeMaterial, prepareForReveal, renderGate, revealUniforms, stepCutaway, wireMaterial } from "./reveal";
import { Room } from "./Room";
import { Props } from "./Props";
import { Student } from "./Student";
import { Atmosphere } from "./Atmosphere";
import { Effects } from "./Effects";
import { Pinboard } from "./Pinboard";
import { WallCalendar } from "./Calendar";
import { DirectorySign } from "./DirectorySign";
import { Ambient } from "./Ambient";
import { World } from "./World";
import { Loft, Terrace } from "./Loft";
import { TerraceProps, Upstairs } from "./Upstairs";
import { explore, orbitGoal, PRESETS, setPortrait, stepWalk, walkGoal } from "./explore";
import { HOTSPOTS, INTRO_PATH, INTRO_TARGET, PORTRAIT_HOME, ROOM, SUN, VIEWS, type HotspotId, type View } from "./stage";
import { cloudShade, type Anim } from "./anim";
import { wind } from "./wind";

/* ------------------------------------------------------------- reveal root */

/**
 * Stops recomputing the matrices of everything that never moves. three
 * rebuilds every object's local and world matrix each frame by default; the
 * room has four hundred objects and only a handful move (flagged
 * `pfDynamic`: the clock, the cat, the hanging lamp, the student).
 */
function freezeStatic(o: THREE.Object3D) {
  if (o.userData.pfDynamic) return;
  o.updateMatrix();
  o.matrixAutoUpdate = false;
  for (const c of o.children) freezeStatic(c);
}

/**
 * Patches everything below it for the build-up, once, before first paint,
 * then compiles every shader off the main thread (KHR_parallel_shader_compile
 * where the driver has it) so the entrance never starts on a frozen frame.
 */
function RevealRoot({ children, onReady }: { children: ReactNode; onReady: () => void }) {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  // -1 idle, 0.. counting warm-up frames.
  const warm = useRef(-1);
  useLayoutEffect(() => {
    renderGate.open = false;
    if (group.current) prepareForReveal(group.current);
  }, []);
  useEffect(() => {
    let live = true;
    const go = () => {
      if (!live) return;
      renderGate.open = true;
      warm.current = 0;
    };
    // Compile the variants that will actually be used. The scene is drawn
    // into the composer's HDR target, where three builds shaders without tone
    // mapping and with linear output; compiling for the screen would build a
    // different set and leave the real ones to link synchronously later.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(target);
    const compiling = gl.compileAsync(scene, camera);
    gl.setRenderTarget(prev);
    compiling.then(go, go).finally(() => target.dispose());
    return () => {
      live = false;
    };
  }, [gl, scene, camera]);
  // Warm-up: a few frames with the whole room revealed, behind the loader,
  // so every texture is uploaded and every shadow shader built before the
  // entrance starts its clock. Otherwise the first second of the build-up
  // would play out inside one long frozen frame.
  useFrame(() => {
    if (warm.current < 0) return;
    revealUniforms.uPfScan.value = 99;
    revealUniforms.uPfDraw.value = 99;
    gl.shadowMap.needsUpdate = true;
    if (++warm.current > 3) {
      warm.current = -1;
      if (group.current) freezeStatic(group.current);
      // The scene itself too: while it recomposes its own matrix each frame
      // it forces every descendant to, frozen or not.
      scene.matrixAutoUpdate = false;
      scene.updateMatrix();
      onReady();
    }
  });
  return <group ref={group}>{children}</group>;
}

/**
 * The room's shadows are drawn once, after the warm-up, and never again.
 * Nothing that casts one moves more than a few millimetres (the lamp's sway,
 * a breath), and redrawing the shadow maps even ten times a second put a
 * long frame into every sixth one on an integrated GPU: a steady stutter.
 */
function StaticShadows() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);
  return null;
}

/* ------------------------------------------------------------------ lights */

const SKY = [new THREE.Color("#3a4a7a"), new THREE.Color("#dde6fb")];
const GROUND = [new THREE.Color("#20160e"), new THREE.Color("#e9dfcf")];
const MOON = [new THREE.Color("#a9bcff"), new THREE.Color("#fff1dc")];
const BG = [new THREE.Color("#040509"), new THREE.Color("#f3f1ec")];

/**
 * One key light through the window: the moon at night, the afternoon sun by
 * day, the same light retinted so its shadows (drawn once) hold for both.
 */
function Lights({ anim }: { anim: Anim }) {
  const moon = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const shelf = useRef<THREE.PointLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    target.position.set(...SUN.target);
    target.updateMatrixWorld();
    if (moon.current) moon.current.target = target;
  }, [target]);
  const scene = useThree((s) => s.scene);
  useFrame((state) => {
    const day = anim.day;
    if (moon.current) {
      moon.current.intensity = anim.moon * (1.7 + day * 2.6) * cloudShade(state.clock.elapsedTime, day);
      moon.current.color.lerpColors(MOON[0], MOON[1], day);
    }
    if (hemi.current) {
      hemi.current.intensity = 0.04 + anim.moon * (0.85 + day * 1.05);
      hemi.current.color.lerpColors(SKY[0], SKY[1], day);
      hemi.current.groundColor.lerpColors(GROUND[0], GROUND[1], day);
    }
    if (shelf.current) shelf.current.intensity = anim.strip * 2.2 * (1 - day);
    scene.environmentIntensity = 0.55 + day * 0.35;
    if (scene.background instanceof THREE.Color) scene.background.lerpColors(BG[0], BG[1], day);
  });
  return (
    <>
      <primitive object={target} />
      <hemisphereLight ref={hemi} args={["#3a4a7a", "#20160e", 0]} />
      <directionalLight
        ref={moon}
        position={SUN.pos}
        color="#a9bcff"
        intensity={0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={2}
        shadow-camera-far={22}
      />
      <pointLight ref={shelf} position={[-3.5, 2.6, -1.8]} color="#ffb070" distance={5} decay={2} intensity={0} />
    </>
  );
}

/* ------------------------------------------------------------------ camera */

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpD = new THREE.Vector3();

/*
 * Quintic Hermite basis: leaves p0 at velocity v0 (in curve units), arrives
 * at p1 at rest, with no jolt of acceleration at either end. A move that
 * interrupts another picks up at the speed the camera already has, so a
 * second click mid-flight bends the path instead of stopping it dead.
 */
const h0 = (t: number) => 1 - t * t * t * (10 - 15 * t + 6 * t * t);
const h1 = (t: number) => t - t * t * t * (6 - 8 * t + 3 * t * t);
const h2 = (t: number) => t * t * t * (10 - 15 * t + 6 * t * t);
const hermite = (out: THREE.Vector3, p0: THREE.Vector3, v0: THREE.Vector3, p1: THREE.Vector3, t: number) =>
  out.copy(p0).multiplyScalar(h0(t)).addScaledVector(v0, h1(t)).addScaledVector(p1, h2(t));

/** The eyes lead the body: the aim finishes this much sooner than the move. */
const LEAD = 1.22;

/**
 * Frame pacing. The loop's delta is read when its callback runs, which
 * wanders by several milliseconds with whatever ran first in the frame, but
 * frames reach the screen on the display's beat. Advancing the camera by the
 * raw delta makes a smooth move judder (8 ms, 24 ms, 8 ms...), so it is
 * snapped to whole refresh intervals, learnt as it goes.
 */
function pacer() {
  // The refresh interval is the median of the last half-second of deltas:
  // jitter and the odd hitch do not move it, a 120 Hz screen soon does.
  const recent: number[] = [];
  const sorted: number[] = [];
  return (raw: number) => {
    if (raw > 0 && raw < 0.1) {
      recent.push(raw);
      if (recent.length > 31) recent.shift();
    }
    if (recent.length < 5) return Math.min(raw, 1 / 20);
    sorted.length = 0;
    sorted.push(...recent);
    sorted.sort((x, y) => x - y);
    const interval = sorted[sorted.length >> 1];
    return Math.min(Math.max(1, Math.round(raw / interval)) * interval, 1 / 20);
  };
}

const PITCH = [-0.12, 1.4] as const;
const DIST = [2.2, 17] as const;

function CameraRig({
  anim,
  view,
  pointer,
  reduced,
}: {
  anim: Anim;
  view: View;
  pointer: React.MutableRefObject<THREE.Vector2>;
  reduced: boolean;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        INTRO_PATH.map((p) => new THREE.Vector3(...p)),
        false,
        "centripetal",
      ),
    [],
  );
  const pos = useRef(new THREE.Vector3(...INTRO_PATH[0]));
  const tgt = useRef(new THREE.Vector3(...INTRO_TARGET));
  const fov = useRef(48);
  const sway = useRef(new THREE.Vector2());
  // Velocities of the unswayed camera, measured frame to frame, so a new
  // move can start from them. Plus the yaw and roll the bank is worked from.
  const vel = useRef({
    pos: new THREE.Vector3(),
    tgt: new THREE.Vector3(),
    fov: 0,
    lastPos: new THREE.Vector3(...INTRO_PATH[0]),
    lastTgt: new THREE.Vector3(...INTRO_TARGET),
    lastFov: 48,
    yaw: NaN,
    roll: 0,
  });
  // The move in flight: where it left from and how fast, how far along it
  // is (0..1), how long it takes, and how far it floats over the room.
  const move = useRef({
    t: 1,
    dur: 1,
    lift: 0,
    breath: 0,
    pos: new THREE.Vector3(),
    tgt: new THREE.Vector3(),
    fov: 48,
    vPos: new THREE.Vector3(),
    vTgt: new THREE.Vector3(),
    vFov: 0,
    away: new THREE.Vector3(),
    // A flight that follows a path (up the stair) instead of a plain curve.
    path: null as null | { pos: THREE.CatmullRomCurve3; tgt: THREE.CatmullRomCurve3 },
  });
  const from = useRef<View>(view);
  const serial = useRef(explore.areaSerial);
  const wasPortrait = useRef<boolean | null>(null);
  // Parallax and handheld drift strength; eased, so a new view never snaps them.
  const amt = useRef({ sway: 0.22, drift: 1 });
  const pace = useMemo(pacer, []);
  const clock = useRef(0);

  useFrame((_, rawDt) => {
    const dt = pace(rawDt);
    clock.current += dt;
    const portrait = size.width / size.height < 0.9;
    if (wasPortrait.current !== portrait) {
      wasPortrait.current = portrait;
      setPortrait(portrait);
    }
    const walking = view === "walk";
    const orbiting = view === "home";
    // Where this view wants the camera. The study and the walk are live
    // (they follow the pointer and keys); a close-up is fixed, and on a tall
    // phone screen it steps back and widens so the object still fits across.
    const goalPos = tmpA;
    const goalTgt = tmpB;
    let goalFov: number;
    if (walking) {
      stepWalk(dt);
      walkGoal(goalPos, goalTgt);
      goalFov = 70;
    } else if (orbiting) {
      if (!explore.dragging && (explore.yawV !== 0 || explore.pitchV !== 0)) {
        explore.yaw += explore.yawV * dt;
        explore.pitch = THREE.MathUtils.clamp(explore.pitch + explore.pitchV * dt, PITCH[0], PITCH[1]);
        const decay = Math.exp(-dt * 3.2);
        explore.yawV *= decay;
        explore.pitchV *= decay;
        if (Math.abs(explore.yawV) < 0.004) explore.yawV = 0;
        if (Math.abs(explore.pitchV) < 0.004) explore.pitchV = 0;
      }
      orbitGoal(goalPos, goalTgt);
      goalPos.y = Math.max(goalPos.y, 0.45);
      goalFov = explore.fov;
    } else {
      const v = VIEWS[view];
      goalPos.set(...v.pos);
      goalTgt.set(...v.target);
      goalFov = v.fov ?? 48;
      if (portrait) {
        // The window is a view, not an object; stepping back would only put
        // the desk in front of it.
        if (view !== "window") {
          const dir = tmpC.copy(goalPos).sub(goalTgt).normalize();
          goalPos.addScaledVector(dir, 0.9);
        }
        goalFov += 14;
      }
    }

    const m = move.current;
    const vl = vel.current;
    if (anim.cam < 1) {
      // The entrance: ride the arc in, easing the aim from the floor to home.
      const p = curve.getPointAt(Math.min(1, anim.cam));
      if (portrait) p.lerp(goalPos, anim.cam * anim.cam);
      pos.current.copy(p);
      tgt.current.set(...INTRO_TARGET).lerp(goalTgt, anim.cam);
      fov.current = 62 + (goalFov - 62) * anim.cam;
      from.current = view;
      serial.current = explore.areaSerial;
      m.t = 1;
    } else {
      const areaChanged = serial.current !== explore.areaSerial;
      if (view !== from.current || areaChanged) {
        const routed = areaChanged && orbiting ? PRESETS[explore.area] : null;
        from.current = view;
        serial.current = explore.areaSerial;
        const dist = pos.current.distanceTo(goalPos);
        m.dur = reduced ? 0.001 : THREE.MathUtils.clamp(0.75 + dist * 0.12, 0.9, routed?.via ? 3.4 : 1.9);
        m.pos.copy(pos.current);
        m.tgt.copy(tgt.current);
        m.fov = fov.current;
        m.path = null;
        if (routed?.via && !reduced) {
          const pp = [m.pos.clone(), ...routed.via.map((q) => new THREE.Vector3(...q)), goalPos.clone()];
          const tt = [m.tgt.clone(), ...(routed.viaTarget ?? []).map((q) => new THREE.Vector3(...q)), goalTgt.clone()];
          m.path = {
            pos: new THREE.CatmullRomCurve3(pp, false, "centripetal"),
            tgt: new THREE.CatmullRomCurve3(tt, false, "centripetal"),
          };
        }
        // Carry the current motion into the new curve (tangents are in
        // curve units: per whole move, not per second).
        m.vPos.copy(vl.pos).multiplyScalar(reduced ? 0 : m.dur);
        m.vTgt.copy(vl.tgt).multiplyScalar(reduced ? 0 : m.dur / LEAD);
        m.vFov = reduced ? 0 : vl.fov * m.dur;
        // A long move floats up and back, away from what it looks at, like
        // a crane, and the lens opens a touch on the way.
        m.lift = reduced || m.path ? 0 : Math.min(0.5, dist * 0.075);
        m.breath = reduced ? 0 : Math.min(4, dist * 0.55);
        const mid = tmpC.copy(m.pos).add(goalPos).multiplyScalar(0.5);
        const aim = tmpD.copy(m.tgt).add(goalTgt).multiplyScalar(0.5);
        m.away.copy(mid).sub(aim).setY(0);
        if (m.away.lengthSq() > 1e-6) m.away.normalize();
        m.t = 0;
      }
      if (m.t < 1) {
        m.t = Math.min(1, m.t + dt / m.dur);
        const t = m.t;
        const e = h2(t);
        if (m.path) {
          m.path.pos.getPointAt(Math.min(1, e), pos.current);
          m.path.tgt.getPointAt(Math.min(1, h2(Math.min(1, t * 1.08))), tgt.current);
          fov.current = m.fov + (goalFov - m.fov) * e;
        } else {
          hermite(pos.current, m.pos, m.vPos, goalPos, t);
          // The float follows the eased progress, so it too starts and lands
          // without a kick.
          const arc = 4 * e * (1 - e);
          pos.current.y += arc * m.lift;
          pos.current.addScaledVector(m.away, arc * m.lift * 0.45);
          hermite(tgt.current, m.tgt, m.vTgt, goalTgt, Math.min(1, t * LEAD));
          fov.current = m.fov * h0(t) + m.vFov * h1(t) + goalFov * h2(t) + arc * m.breath;
        }
      } else {
        // Settled: follow the goal closely. A live goal (a drag, a step)
        // is followed a little faster so the camera never feels tethered.
        const k = 1 - Math.exp(-dt * (walking ? 30 : orbiting ? 13 : 10));
        pos.current.lerp(goalPos, k);
        tgt.current.lerp(goalTgt, k);
        fov.current += (goalFov - fov.current) * k;
      }
    }

    // Measured velocities, lightly smoothed against frame-time jitter.
    if (dt > 0) {
      const s = 1 - Math.exp(-dt * 30);
      vl.pos.lerp(tmpC.copy(pos.current).sub(vl.lastPos).divideScalar(dt), s);
      vl.tgt.lerp(tmpC.copy(tgt.current).sub(vl.lastTgt).divideScalar(dt), s);
      vl.fov += ((fov.current - vl.lastFov) / dt - vl.fov) * s;
    }
    vl.lastPos.copy(pos.current);
    vl.lastTgt.copy(tgt.current);
    vl.lastFov = fov.current;

    // Parallax: the room leans a few centimetres toward the cursor. On top,
    // a slow handheld drift, so a still frame still breathes. Walking is
    // steady: the pointer is looking, not leaning.
    const ka = 1 - Math.exp(-dt * 3);
    amt.current.sway += ((orbiting ? 0.16 : walking ? 0 : 0.05) - amt.current.sway) * ka;
    amt.current.drift += ((reduced || walking ? 0 : orbiting ? 1 : 0.22) - amt.current.drift) * ka;
    sway.current.lerp(pointer.current, 1 - Math.exp(-dt * 2.5));
    const time = clock.current;
    const d = amt.current.drift * 0.03;
    camera.position.copy(pos.current);
    camera.position.x +=
      sway.current.x * amt.current.sway + (Math.sin(time * 0.31) * 0.6 + Math.sin(time * 0.53 + 1.3) * 0.4) * d;
    camera.position.y +=
      sway.current.y * amt.current.sway * 0.5 +
      (Math.sin(time * 0.23 + 0.7) * 0.5 + Math.sin(time * 0.47 + 2.1) * 0.5) * d * 0.6;
    if (walking) {
      // A footfall: the eye rises and falls a couple of centimetres as she walks.
      const speed = Math.hypot(explore.walk.vx, explore.walk.vz);
      camera.position.y += Math.sin(time * 7.5) * 0.012 * Math.min(1, speed);
    }
    camera.lookAt(tgt.current);

    // Bank into turns: a small roll against the rate the aim swings
    // sideways, the way a camera on a crane leans through a move.
    const yaw = Math.atan2(tgt.current.x - pos.current.x, tgt.current.z - pos.current.z);
    let dy = Number.isNaN(vl.yaw) ? 0 : yaw - vl.yaw;
    if (dy > Math.PI) dy -= Math.PI * 2;
    if (dy < -Math.PI) dy += Math.PI * 2;
    vl.yaw = yaw;
    const want = reduced || walking || dt <= 0 ? 0 : THREE.MathUtils.clamp((dy / dt) * 0.035, -0.04, 0.04);
    vl.roll += (want - vl.roll) * (1 - Math.exp(-dt * 5));
    if (Math.abs(vl.roll) > 1e-4) camera.rotateZ(vl.roll);

    if (Math.abs(camera.fov - fov.current) > 0.01) {
      camera.fov = fov.current;
      camera.updateProjectionMatrix();
    }

    // The lens: in a close-up the background falls out of focus as the
    // camera lands, and the focus pulls in from a little too far, the way
    // a real lens finds its mark.
    const free = orbiting || walking;
    const dofGoal = free || anim.cam < 1 ? 0 : m.t < 1 ? Math.pow(Math.max(0, (m.t - 0.5) / 0.5), 2) : 1;
    anim.dof += (dofGoal - anim.dof) * (1 - Math.exp(-dt * (dofGoal > anim.dof ? 4 : 9)));
    anim.focus = camera.position.distanceTo(tgt.current) * (1 + 0.35 * (1 - anim.dof));
    const steady = !explore.dragging && explore.yawV === 0 && explore.keys.size === 0;
    anim.settled = anim.cam >= 1 && m.t >= 1 && steady ? 1 : 0;
  });
  return null;
}

/* ------------------------------------------------------------------- input */

/**
 * Turning the building and looking round: a drag orbits (or, walking, looks),
 * the wheel and a pinch zoom, a right-drag or shift-drag pans, and a release
 * flings. Written to `explore`, never to React state.
 */
function ExploreInput({ view }: { view: View }) {
  const gl = useThree((s) => s.gl);
  const on = view === "home" || view === "walk";
  useEffect(() => {
    if (!on) return;
    const el = gl.domElement;
    const pts = new Map<number, { x: number; y: number }>();
    let start = { x: 0, y: 0 };
    let pan = false;
    let pinch = 0;
    let lastT = 0;
    const walking = view === "walk";

    const down = (e: PointerEvent) => {
      if (e.button > 2) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        explore.moved = false;
        start = { x: e.clientX, y: e.clientY };
        pan = e.button === 2 || e.shiftKey;
        lastT = performance.now();
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
        explore.dragging = true;
        explore.moved = true;
      }
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && !walking) explore.dist = THREE.MathUtils.clamp((explore.dist * pinch) / d, DIST[0], DIST[1]);
        pinch = d;
        return;
      }
      if (!explore.dragging) {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 5) return;
        explore.dragging = true;
        explore.moved = true;
        explore.yawV = explore.pitchV = 0;
      }
      const now = performance.now();
      const dt = Math.max(0.004, (now - lastT) / 1000);
      lastT = now;
      if (walking) {
        const w = explore.walk;
        w.yaw += dx * 0.0046;
        w.pitch = THREE.MathUtils.clamp(w.pitch + dy * 0.0036, -1.1, 1.1);
      } else if (pan) {
        const s = explore.dist * 0.0014;
        const c = Math.cos(explore.yaw);
        const sn = Math.sin(explore.yaw);
        explore.pivot.x = THREE.MathUtils.clamp(explore.pivot.x - c * dx * s, -9, 9);
        explore.pivot.z = THREE.MathUtils.clamp(explore.pivot.z + sn * dx * s, -6, 12);
        explore.pivot.y = THREE.MathUtils.clamp(explore.pivot.y + dy * s, 0.3, 5.2);
      } else {
        const dyaw = -dx * 0.0052;
        const dpitch = dy * 0.0042;
        explore.yaw += dyaw;
        explore.pitch = THREE.MathUtils.clamp(explore.pitch + dpitch, PITCH[0], PITCH[1]);
        // The fling to carry on with when the finger lifts.
        explore.yawV += (dyaw / dt - explore.yawV) * 0.5;
        explore.pitchV += (dpitch / dt - explore.pitchV) * 0.5;
      }
    };
    const up = (e: PointerEvent) => {
      if (!pts.delete(e.pointerId)) return;
      if (pts.size === 0) {
        explore.dragging = false;
        // A drag that stopped before it was let go does not fling.
        if (performance.now() - lastT > 90) explore.yawV = explore.pitchV = 0;
        explore.yawV = THREE.MathUtils.clamp(explore.yawV, -3.5, 3.5);
        explore.pitchV = THREE.MathUtils.clamp(explore.pitchV, -2, 2);
      }
    };
    const wheel = (e: WheelEvent) => {
      if (walking) return;
      e.preventDefault();
      explore.dist = THREE.MathUtils.clamp(explore.dist * Math.exp(e.deltaY * 0.0011), DIST[0], DIST[1]);
    };
    const menu = (e: Event) => e.preventDefault();
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("contextmenu", menu);

    const typing = (t: EventTarget | null) => {
      const n = t as HTMLElement | null;
      return !!n && (n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.isContentEditable);
    };
    const key = (e: KeyboardEvent, isDown: boolean) => {
      if (!walking || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (!["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) return;
      if (isDown) explore.keys.add(k);
      else explore.keys.delete(k);
    };
    const kd = (e: KeyboardEvent) => key(e, true);
    const ku = (e: KeyboardEvent) => key(e, false);
    const clear = () => explore.keys.clear();
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", clear);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("contextmenu", menu);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", clear);
      explore.keys.clear();
      explore.dragging = false;
    };
  }, [gl, on, view]);
  return null;
}

/* ---------------------------------------------------------------- hotspots */

function Hotspots({
  enabled,
  onHover,
  onActivate,
}: {
  enabled: boolean;
  onHover: (id: HotspotId | null) => void;
  onActivate: (id: HotspotId) => void;
}) {
  const hovered = useRef<HotspotId | null>(null);
  useEffect(() => {
    if (!enabled && hovered.current) {
      hovered.current = null;
      onHover(null);
    }
  }, [enabled, onHover]);
  if (!enabled) return null;
  return (
    <group>
      {(Object.keys(HOTSPOTS) as HotspotId[]).map((id) => {
        const h = HOTSPOTS[id];
        return (
          <mesh
            key={id}
            position={h.center}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              if (explore.dragging) return;
              hovered.current = id;
              onHover(id);
            }}
            onPointerOut={() => {
              if (hovered.current === id) {
                hovered.current = null;
                onHover(null);
              }
            }}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              // The release of a drag is not a click.
              if (explore.moved) return;
              onActivate(id);
            }}
          >
            <boxGeometry args={h.size} />
            <meshBasicMaterial visible={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ---------------------------------------------------------- hover tracker */

const corners = Array.from({ length: 8 }, () => new THREE.Vector3());

/**
 * Projects the hovered hotspot's box to screen and writes it to the frame.
 * Moving from one object to the next, the frame glides across rather than
 * jumping, which is most of what makes the hover feel like one cursor.
 */
function HoverTracker({ hover, frame }: { hover: HotspotId | null; frame: React.RefObject<HTMLDivElement> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const rect = useRef({ x: 0, y: 0, w: 0, h: 0, on: false });
  const written = useRef("");
  useFrame((_, dt) => {
    const el = frame.current;
    if (!el) return;
    const r = rect.current;
    if (!hover || explore.dragging) {
      if (r.on) {
        r.on = false;
        el.style.opacity = "0";
      }
      return;
    }
    const { center, size: sz } = HOTSPOTS[hover];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let i = 0;
    for (const sx of [-0.5, 0.5])
      for (const sy of [-0.5, 0.5])
        for (const sz2 of [-0.5, 0.5]) {
          const c = corners[i++].set(center[0] + sx * sz[0], center[1] + sy * sz[1], center[2] + sz2 * sz[2]);
          c.project(camera);
          const x = (c.x * 0.5 + 0.5) * size.width;
          const y = (-c.y * 0.5 + 0.5) * size.height;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
    const pad = 6;
    const tx = minX - pad;
    const ty = minY - pad;
    const tw = maxX - minX + pad * 2;
    const th = maxY - minY + pad * 2;
    if (!r.on) {
      Object.assign(r, { x: tx, y: ty, w: tw, h: th, on: true });
      el.style.opacity = "1";
    } else {
      const k = 1 - Math.exp(-dt * 22);
      r.x += (tx - r.x) * k;
      r.y += (ty - r.y) * k;
      r.w += (tw - r.w) * k;
      r.h += (th - r.h) * k;
    }
    const key = `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)},${Math.round(r.h)}`;
    if (key === written.current) return;
    written.current = key;
    el.style.transform = `translate3d(${Math.round(r.x)}px, ${Math.round(r.y)}px, 0)`;
    el.style.width = `${Math.round(r.w)}px`;
    el.style.height = `${Math.round(r.h)}px`;
  });
  return null;
}

/* ------------------------------------------------------------------ uniforms */

const LINE = [new THREE.Color("#c9d5ff"), new THREE.Color("#3552c4")];

function Sync({ anim }: { anim: Anim }) {
  useFrame((state, dt) => {
    // Whichever wall the camera is outside of dissolves; the room can be
    // turned all the way round.
    wind.uWindTime.value = state.clock.elapsedTime;
    wind.uWindAmp.value = 1 + anim.rain * 0.9;
    const c = state.camera.position;
    const m = 0.06;
    stepCutaway(
      {
        back: c.z < ROOM.back - m,
        left: c.x < -ROOM.halfW - m,
        right: c.x > ROOM.halfW + m,
        front: c.z > ROOM.front + m,
        top: c.y > ROOM.height - m,
      },
      Math.min(dt, 0.1),
    );
    // Light lines on the night; by day, blue drafting lines on paper.
    edgeMaterial.color.lerpColors(LINE[0], LINE[1], anim.day);
    wireMaterial.color.copy(edgeMaterial.color);
    edgeMaterial.opacity = 0.5 + anim.day * 0.2;
    revealUniforms.uPfScan.value = anim.scan;
    revealUniforms.uPfDraw.value = anim.draw;
    // Lines only exist between the scan and the drafting line. In the lit
    // room that band is empty, so skip their few hundred draws outright
    // rather than run them only to discard every fragment.
    const lines = anim.draw > anim.scan + 0.001;
    edgeMaterial.visible = lines;
    wireMaterial.visible = lines;
  }, -1);
  return null;
}

/* ------------------------------------------------------------------- scene */

export type SceneProps = {
  anim: Anim;
  view: View;
  hover: HotspotId | null;
  interactive: boolean;
  reduced: boolean;
  lowPower: boolean;
  pointer: React.MutableRefObject<THREE.Vector2>;
  frame: React.RefObject<HTMLDivElement>;
  onHover: (id: HotspotId | null) => void;
  onActivate: (id: HotspotId) => void;
  onReady: () => void;
  /** Which lighting the reflections are baked for; flips at the end of a dusk or dawn. */
  daylight: boolean;
};

export const Scene = memo(function Scene(p: SceneProps) {
  return (
    <>
      <color attach="background" args={["#040509"]} />
      <Sync anim={p.anim} />
      <StaticShadows />
      {p.daylight ? (
        <Environment key="day" resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.4} color="#eef3ff" position={[0.8, 2.2, -6]} scale={[4, 3, 1]} />
          <Lightformer form="rect" intensity={1.1} color="#fff4e4" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[9, 8, 1]} />
          <Lightformer form="rect" intensity={0.6} color="#f4ede2" position={[-4.2, 1.6, 0]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
          <Lightformer form="rect" intensity={0.5} color="#4465d8" position={[4.2, 1.2, 1]} rotation-y={-Math.PI / 2} scale={[1, 2, 1]} />
        </Environment>
      ) : (
        <Environment key="night" resolution={128} frames={1}>
          <Lightformer form="rect" intensity={1.2} color="#9fb4ff" position={[0.8, 2.2, -6]} scale={[3, 2.4, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#ffb36b" position={[0.2, 1.4, -2.2]} scale={[0.8, 0.8, 1]} />
          <Lightformer form="rect" intensity={0.8} color="#5f82ff" position={[3.2, 2.7, -3]} scale={[2, 0.5, 1]} />
          <Lightformer form="rect" intensity={0.5} color="#ffa45c" position={[-4.2, 0.2, 0]} scale={[0.3, 7, 1]} />
        </Environment>
      )}
      <Lights anim={p.anim} />
      <RevealRoot onReady={p.onReady}>
        <Room anim={p.anim} />
        <Loft anim={p.anim} />
        <Terrace anim={p.anim} />
        <Upstairs anim={p.anim} />
        <TerraceProps />
        <Props anim={p.anim} />
        <Student pointer={p.pointer} anim={p.anim} />
        <Pinboard anim={p.anim} />
        <WallCalendar anim={p.anim} />
        <DirectorySign anim={p.anim} />
      </RevealRoot>
      <World anim={p.anim} />
      <Atmosphere anim={p.anim} />
      <Ambient anim={p.anim} />
      <Hotspots enabled={p.interactive} onHover={p.onHover} onActivate={p.onActivate} />
      <HoverTracker hover={p.hover} frame={p.frame} />
      <CameraRig anim={p.anim} view={p.view} pointer={p.pointer} reduced={p.reduced} />
      <ExploreInput view={p.view} />
      <Effects bloom={p.lowPower ? 0.5 : 0.62} anim={p.anim} lowPower={p.lowPower} />
    </>
  );
});
