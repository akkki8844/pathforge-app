import { memo, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { edgeMaterial, prepareForReveal, renderGate, revealUniforms, wireMaterial } from "./reveal";
import { Room } from "./Room";
import { Props } from "./Props";
import { Student } from "./Student";
import { Atmosphere } from "./Atmosphere";
import { Effects } from "./Effects";
import { Pinboard } from "./Pinboard";
import { WallCalendar } from "./Calendar";
import { Ambient } from "./Ambient";
import { HOTSPOTS, INTRO_PATH, INTRO_TARGET, PORTRAIT_HOME, VIEWS, type HotspotId, type View } from "./stage";
import type { Anim } from "./anim";

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

function Lights({ anim }: { anim: Anim }) {
  const moon = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const shelf = useRef<THREE.PointLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    target.position.set(1.2, 0, -0.4);
    target.updateMatrixWorld();
    if (moon.current) moon.current.target = target;
  }, [target]);
  useFrame(() => {
    if (moon.current) moon.current.intensity = anim.moon * 1.7;
    if (hemi.current) hemi.current.intensity = 0.04 + anim.moon * 0.85;
    if (shelf.current) shelf.current.intensity = anim.strip * 2.2;
  });
  return (
    <>
      <primitive object={target} />
      <hemisphereLight ref={hemi} args={["#3a4a7a", "#20160e", 0]} />
      <directionalLight
        ref={moon}
        position={[-0.6, 6.4, -10.5]}
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
      <pointLight ref={shelf} position={[-3.3, 2.1, -1.2]} color="#ffb070" distance={3.5} decay={2} intensity={0} />
    </>
  );
}

/* ------------------------------------------------------------------ camera */

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();

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
  // The move in flight between two views: where it left from, how far along
  // it is (0..1) and how long it takes.
  const move = useRef({ t: 1, dur: 1, lift: 0, pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 48 });
  const from = useRef<View>(view);

  useFrame((state, dt) => {
    const portrait = size.width / size.height < 0.9;
    const v = portrait && view === "home" ? PORTRAIT_HOME : VIEWS[view];
    // Where this view wants the camera. On a tall phone screen a close-up
    // steps back and widens so the object still fits across.
    const goalPos = tmpA.set(...v.pos);
    const goalTgt = tmpB.set(...v.target);
    let goalFov = v.fov ?? 48;
    if (portrait && view !== "home") {
      // The window is a view, not an object; stepping back would only put
      // the desk in front of it.
      if (view !== "window") {
        const dir = tmpC.copy(goalPos).sub(goalTgt).normalize();
        goalPos.addScaledVector(dir, 0.9);
      }
      goalFov += 14;
    }

    const m = move.current;
    if (anim.cam < 1) {
      // The entrance: ride the arc in, easing the aim from the floor to home.
      const p = curve.getPointAt(Math.min(1, anim.cam));
      if (portrait) p.lerp(goalPos, anim.cam * anim.cam);
      pos.current.copy(p);
      tgt.current.set(...INTRO_TARGET).lerp(goalTgt, anim.cam);
      fov.current = 62 + (goalFov - 62) * anim.cam;
      from.current = view;
      m.t = 1;
    } else {
      if (view !== from.current) {
        // A new view: a timed move with an ease in and out, lifting over
        // whatever is between, instead of a chase that lurches off the mark.
        from.current = view;
        const dist = pos.current.distanceTo(goalPos);
        m.pos.copy(pos.current);
        m.tgt.copy(tgt.current);
        m.fov = fov.current;
        m.dur = reduced ? 0.001 : THREE.MathUtils.clamp(0.7 + dist * 0.11, 0.85, 1.6);
        m.lift = Math.min(0.45, dist * 0.07);
        m.t = 0;
      }
      if (m.t < 1) {
        m.t = Math.min(1, m.t + dt / m.dur);
        const e = m.t < 0.5 ? 4 * m.t * m.t * m.t : 1 - Math.pow(-2 * m.t + 2, 3) / 2;
        pos.current.lerpVectors(m.pos, goalPos, e);
        pos.current.y += Math.sin(Math.PI * e) * m.lift;
        tgt.current.lerpVectors(m.tgt, goalTgt, e);
        fov.current = m.fov + (goalFov - m.fov) * e;
      } else {
        // Settled: follow the goal closely (it only moves on a resize).
        const k = 1 - Math.exp(-dt * 10);
        pos.current.lerp(goalPos, k);
        tgt.current.lerp(goalTgt, k);
        fov.current += (goalFov - fov.current) * k;
      }
    }

    // Parallax: the room leans a few centimetres toward the cursor.
    const amt = view === "home" ? 0.22 : 0.05;
    sway.current.lerp(pointer.current, 1 - Math.exp(-dt * 2.5));
    camera.position.copy(pos.current);
    camera.position.x += sway.current.x * amt;
    camera.position.y += sway.current.y * amt * 0.5;
    camera.lookAt(tgt.current);
    if (Math.abs(camera.fov - fov.current) > 0.01) {
      camera.fov = fov.current;
      camera.updateProjectionMatrix();
    }
    void state;
  });
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
    if (!hover) {
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

function Sync({ anim }: { anim: Anim }) {
  useFrame(() => {
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
};

export const Scene = memo(function Scene(p: SceneProps) {
  return (
    <>
      <color attach="background" args={["#040509"]} />
      <Sync anim={p.anim} />
      <StaticShadows />
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={1.2} color="#9fb4ff" position={[0.8, 2.2, -6]} scale={[3, 2.4, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffb36b" position={[0.2, 1.4, -2.2]} scale={[0.8, 0.8, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#5f82ff" position={[3.2, 2.7, -3]} scale={[2, 0.5, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#ffa45c" position={[-4.2, 0.2, 0]} scale={[0.3, 7, 1]} />
      </Environment>
      <Lights anim={p.anim} />
      <RevealRoot onReady={p.onReady}>
        <Room anim={p.anim} />
        <Props anim={p.anim} />
        <Student pointer={p.pointer} />
        <Pinboard anim={p.anim} />
        <WallCalendar anim={p.anim} />
      </RevealRoot>
      <Atmosphere anim={p.anim} />
      <Ambient anim={p.anim} />
      <Hotspots enabled={p.interactive} onHover={p.onHover} onActivate={p.onActivate} />
      <HoverTracker hover={p.hover} frame={p.frame} />
      <CameraRig anim={p.anim} view={p.view} pointer={p.pointer} reduced={p.reduced} />
      <Effects bloom={p.lowPower ? 0.5 : 0.62} anim={p.anim} lowPower={p.lowPower} />
    </>
  );
});
