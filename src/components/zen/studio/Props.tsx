import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DESK_TOP, PLACE, type Vec3 } from "./stage";
import { makeCanvasTexture, paintBoard, paintScreen } from "./canvases";
import { snapshot } from "./focus";
import { plan } from "./plan";
import type { Anim } from "./anim";

import { MODEL_DIR as M } from "./models";
import { Library } from "./Library";
import { patchWind } from "./wind";
import { Phone } from "./Objects";

export function useModel(name: string) {
  return useGLTF(`${M}${name}.glb`, false, true).scene;
}

/** Sits a model on its footprint: y is where its lowest point lands. */
export function Placed({
  object,
  pos,
  rot = 0,
  scale = 1,
}: {
  object: THREE.Object3D;
  pos: Vec3;
  rot?: number;
  scale?: number;
}) {
  const lift = useMemo(() => -new THREE.Box3().setFromObject(object).min.y, [object]);
  return (
    <group position={pos} rotation-y={rot} scale={scale}>
      <primitive object={object} position-y={lift} />
    </group>
  );
}

export function findByMaterial(root: THREE.Object3D, name: string) {
  let hit: THREE.Mesh | null = null;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (hit || !m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (mats.some((x) => x.name === name)) hit = m;
  });
  return hit as THREE.Mesh | null;
}

/**
 * Give a flat panel UVs by projecting it onto its two widest axes, top-left
 * at (0, 0) to match a canvas uploaded with flipY off. The laptop's display
 * was untextured in the source model, so the optimiser pruned its UVs.
 */
function planarUVs(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox as THREE.Box3;
  const size = box.getSize(new THREE.Vector3());
  const axes = [0, 1, 2].sort((i, j) => size.getComponent(j) - size.getComponent(i));
  const [ua, va] = axes[0] === 1 ? [axes[1], axes[0]] : [axes[0], axes[1]];
  const pos = geometry.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    uv[i * 2] = (p.getComponent(ua) - box.min.getComponent(ua)) / (size.getComponent(ua) || 1);
    uv[i * 2 + 1] = 1 - (p.getComponent(va) - box.min.getComponent(va)) / (size.getComponent(va) || 1);
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

export function noCast(root: THREE.Object3D) {
  root.traverse((o) => {
    o.userData.pfNoCast = true;
  });
}

/* ---------------------------------------------------------------- laptop -- */

function Laptop({ anim }: { anim: Anim }) {
  const scene = useModel("classic_laptop");
  const screen = useMemo(() => makeCanvasTexture(1024, 768), []);
  const mat = useMemo(() => {
    screen.tex.flipY = false;
    return new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false });
  }, [screen]);
  const last = useRef("");

  useLayoutEffect(() => {
    const mesh = findByMaterial(scene, "classic_laptop_screen");
    if (!mesh) return;
    if (!mesh.geometry.getAttribute("uv")) planarUVs(mesh.geometry);
    const prev = mesh.material;
    mesh.material = mat;
    return () => {
      mesh.material = prev;
      screen.tex.dispose();
    };
  }, [scene, mat, screen]);

  useFrame(() => {
    const t = snapshot();
    const key = `${t.state}|${Math.ceil(t.remaining / 1000)}|${t.minutes}|${t.sessionsToday}`;
    if (key !== last.current) {
      last.current = key;
      paintScreen(screen.ctx, 1024, 768, t);
      screen.tex.needsUpdate = true;
    }
    mat.color.setScalar(0.04 + anim.screen * 0.9);
  });

  // The screen used to cast a faint point light of its own; under the desk
  // lamp it was invisible, and every pixel in the room paid for it.
  return <Placed object={scene} pos={PLACE.laptop.pos} rot={PLACE.laptop.rot} />;
}

/* ------------------------------------------------------------ chalkboard -- */

// The writing face of the A-frame, in the model's own space: centre, size and
// lean, measured from its board primitive (front face leans back 12 degrees).
const BOARD_FACE = { center: [0.0135, 0.881, -0.18] as Vec3, size: [0.769, 1.135] as [number, number], lean: 0.2095 };
const BOARD_PX = [700, 1032] as const;

function Chalkboard() {
  const scene = useModel("standing_chalkboard_01");
  const board = useMemo(() => makeCanvasTexture(BOARD_PX[0], BOARD_PX[1]), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: board.tex,
        roughness: 0.95,
        // A little self-light so chalk stays legible in a dark corner.
        emissive: new THREE.Color("#ffffff"),
        emissiveMap: board.tex,
        emissiveIntensity: 0.16,
        envMapIntensity: 0.15,
      }),
    [board],
  );
  const last = useRef<unknown>(null);

  useFrame(() => {
    const items = plan.get();
    if (items === last.current) return;
    last.current = items;
    paintBoard(board.ctx, BOARD_PX[0], BOARD_PX[1], items);
    board.tex.needsUpdate = true;
  });

  useLayoutEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) last.current = null;
    });
    return () => {
      live = false;
      mat.dispose();
      board.tex.dispose();
    };
  }, [mat, board]);

  const lift = useMemo(() => -new THREE.Box3().setFromObject(scene).min.y, [scene]);
  const { center, size, lean } = BOARD_FACE;
  return (
    <group position={PLACE.board.pos} rotation-y={PLACE.board.rot}>
      <group position-y={lift}>
        <primitive object={scene} />
        <mesh
          material={mat}
          position={[center[0], center[1] + Math.sin(lean) * 0.004, center[2] - Math.cos(lean) * 0.004]}
          rotation={[lean, Math.PI, 0]}
          userData={{ pfNoCast: true }}
        >
          <planeGeometry args={size} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------ desk lamp -- */

function DeskLamp({ anim }: { anim: Anim }) {
  const scene = useModel("desk_lamp_arm_01");
  const spot = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  // Turn the lamp so its head reaches out over the laptop, wherever the
  // model's author pointed the arm.
  const { rot, bulb, bulbMat } = useMemo(() => {
    const mesh = findByMaterial(scene, "desk_lamp_arm_01_light");
    const box = new THREE.Box3().setFromObject(mesh ?? scene);
    const c = box.getCenter(new THREE.Vector3());
    const want = new THREE.Vector2(0.62 - PLACE.lamp.pos[0], -2.62 - PLACE.lamp.pos[2]);
    const r = Math.atan2(want.x, want.y) - Math.atan2(c.x, c.z);
    let m: THREE.MeshStandardMaterial | null = null;
    if (mesh) {
      const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      m = src.clone();
      m.emissive = new THREE.Color("#ffe4c2");
      m.emissiveMap = null;
      m.emissiveIntensity = 0;
      mesh.material = m;
    }
    return { rot: r, bulb: c, bulbMat: m };
  }, [scene]);

  const lift = useMemo(() => -new THREE.Box3().setFromObject(scene).min.y, [scene]);
  // The bulb sits inside the shade; if the shade cast shadows it would
  // swallow its own light.
  useMemo(() => noCast(scene), [scene]);
  const world = useMemo(() => {
    const v = bulb.clone();
    v.y += lift;
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    return v.add(new THREE.Vector3(...PLACE.lamp.pos));
  }, [bulb, lift, rot]);

  useLayoutEffect(() => {
    target.position.set(0.66, DESK_TOP, -2.5);
    target.updateMatrixWorld();
    if (spot.current) spot.current.target = target;
  }, [target]);

  useFrame(() => {
    if (spot.current) spot.current.intensity = anim.lamp * 11;
    if (bulbMat) bulbMat.emissiveIntensity = anim.lamp * 1.1;
  });

  return (
    <group>
      <group position={PLACE.lamp.pos} rotation-y={rot}>
        <primitive object={scene} position-y={lift} />
      </group>
      <primitive object={target} />
      <spotLight
        ref={spot}
        position={[world.x, world.y - 0.03, world.z]}
        color="#ffb36b"
        angle={0.78}
        penumbra={0.75}
        distance={5}
        decay={2}
        intensity={0}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </group>
  );
}

/* --------------------------------------------------------- hanging lamp -- */

function HangingLamp({ anim }: { anim: Anim }) {
  const scene = useModel("hanging_industrial_lamp");
  const group = useRef<THREE.Group>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const { glassMat, bulbY } = useMemo(() => {
    noCast(scene);
    const mesh = findByMaterial(scene, "hanging_industrial_lamp_glass");
    let m: THREE.MeshStandardMaterial | null = null;
    let y = -1.2;
    if (mesh) {
      const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      m = src.clone();
      m.emissive = new THREE.Color("#ffc58a");
      m.emissiveIntensity = 0;
      mesh.material = m;
      y = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).y;
    }
    return { glassMat: m, bulbY: y };
  }, [scene]);

  useLayoutEffect(() => {
    const [x, , z] = PLACE.hangingLamp.pos;
    target.position.set(x + 0.1, 0, z + 0.2);
    target.updateMatrixWorld();
    if (spot.current) spot.current.target = target;
  }, [target]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // The cord sways a few degrees, the ambient layer of the corner.
    if (group.current) {
      group.current.rotation.z = Math.sin(t * 0.6) * 0.012;
      group.current.rotation.x = Math.sin(t * 0.43 + 1) * 0.009;
    }
    if (spot.current) spot.current.intensity = anim.hang * 16;
    if (glassMat) glassMat.emissiveIntensity = anim.hang * 0.45;
  });

  const [x, y, z] = PLACE.hangingLamp.pos;
  return (
    <group>
      <group ref={group} position={[x, y, z]} userData={{ pfDynamic: true }}>
        <primitive object={scene} />
      </group>
      <primitive object={target} />
      <spotLight
        ref={spot}
        position={[x, y + bulbY - 0.1, z]}
        color="#ffbf80"
        angle={0.62}
        penumbra={0.85}
        distance={5}
        decay={2}
        intensity={0}
      />
    </group>
  );
}

/* ----------------------------------------------------------------- clock -- */

function WallClock({ anim }: { anim: Anim }) {
  const scene = useModel("wall_clock");
  // The clock hangs where no lamp reaches, so its face carries a little
  // light of its own, the way a white dial catches whatever is in a room.
  const lit = useMemo(() => {
    const mats: THREE.MeshStandardMaterial[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || Array.isArray(m.material)) return;
      const src = m.material as THREE.MeshStandardMaterial;
      if (!src.map) return;
      const c = src.clone();
      c.emissive = new THREE.Color("#ffffff");
      c.emissiveMap = src.map;
      c.emissiveIntensity = 0;
      m.material = c;
      mats.push(c);
    });
    return mats;
  }, [scene]);
  const hands = useMemo(
    () => ({
      h: scene.getObjectByName("wall_clock_hours_hand"),
      m: scene.getObjectByName("wall_clock_minute_hand"),
      s: scene.getObjectByName("wall_clock_second_hand"),
    }),
    [scene],
  );
  // The model is authored at 10:10:30. Hands turn clockwise, which is -z
  // seen from the front, so each one turns by the gap from its rest angle.
  useFrame(() => {
    const d = new Date();
    const sec = d.getSeconds() + d.getMilliseconds() / 1000;
    const min = d.getMinutes() + sec / 60;
    const hr = (d.getHours() % 12) + min / 60;
    const deg = Math.PI / 180;
    if (hands.s) hands.s.rotation.z = -(sec * 6 - 180) * deg;
    if (hands.m) hands.m.rotation.z = -(min * 6 - 60) * deg;
    if (hands.h) hands.h.rotation.z = -(hr * 30 - 305) * deg;
    for (const m of lit) m.emissiveIntensity = anim.strip * 0.13;
  });
  return <primitive object={scene} position={PLACE.clock.pos} userData={{ pfDynamic: true }} />;
}

/* ------------------------------------------------------------------- cat -- */

function Cat({ anim }: { anim: Anim }) {
  const scene = useModel("concrete_cat_statue");
  const inner = useRef<THREE.Group>(null);
  useFrame(() => {
    const p = anim.pet;
    if (!inner.current) return;
    // Squash on the pat, stretch on the way back up.
    inner.current.scale.set(1 + p * 0.06, 1 - p * 0.08, 1 + p * 0.06);
  });
  return (
    <group position={PLACE.cat.pos} rotation-y={PLACE.cat.rot} scale={1.35}>
      <group ref={inner} userData={{ pfDynamic: true }}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------- mug -- */

const ceramic = new THREE.MeshStandardMaterial({ color: "#e6e0d4", roughness: 0.32 });
const coffee = new THREE.MeshStandardMaterial({ color: "#1c120b", roughness: 0.12 });

/** A plain mug of coffee on the desk, turned on a lathe, steaming (see Ambient). */
function Mug() {
  const geometry = useMemo(() => {
    const profile = [
      [0, 0],
      [0.036, 0],
      [0.04, 0.004],
      [0.042, 0.092],
      [0.038, 0.092],
      [0.036, 0.01],
      [0, 0.01],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const cup = new THREE.LatheGeometry(profile, 32);
    const handle = new THREE.TorusGeometry(0.024, 0.0065, 10, 20, Math.PI)
      .rotateZ(-Math.PI / 2)
      .translate(0.041, 0.048, 0);
    return mergeGeometries([cup.toNonIndexed(), handle.toNonIndexed()]);
  }, []);
  return (
    <group position={PLACE.mug.pos} rotation-y={-0.9}>
      <mesh geometry={geometry} material={ceramic} />
      <mesh material={coffee} rotation-x={-Math.PI / 2} position-y={0.078} userData={{ pfNoTwin: true, pfNoCast: true }}>
        <circleGeometry args={[0.037, 32]} />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------------- props -- */

export const Props = memo(function Props({ anim }: { anim: Anim }) {
  const desk = useModel("metal_office_desk");
  const chair = useModel("mid_century_lounge_chair");
  const notebook = useModel("binder_notebook");
  const stationery = useModel("stationery_supplies");
  const compass = useModel("seadogs_compass");
  const cassette = useModel("portable_cassette_player");
  const deskPlant = useModel("potted_plant_04");
  const floorPlant = useModel("potted_plant_02");
  const armchair = useModel("modern_arm_chair_01");
  // The big plant's leaves sway. Its clones (upstairs, on the terrace) share
  // the material, so they all do; this runs before the reveal patch is applied.
  useMemo(() => {
    floorPlant.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      for (const x of Array.isArray(m.material) ? m.material : [m.material]) if (/leaves/.test(x.name)) patchWind(x, 0.3, 0.7, 0.04);
    });
  }, [floorPlant]);

  return (
    <group>
      <Placed object={desk} pos={PLACE.desk.pos} rot={PLACE.desk.rot} />
      <Placed object={chair} pos={PLACE.chair.pos} rot={PLACE.chair.rot} scale={0.92} />
      <Laptop anim={anim} />
      <DeskLamp anim={anim} />
      <Placed object={notebook} pos={PLACE.notebook.pos} rot={PLACE.notebook.rot} />
      <Placed object={stationery} pos={PLACE.stationery.pos} rot={PLACE.stationery.rot} />
      <Placed object={compass} pos={PLACE.compass.pos} rot={PLACE.compass.rot} scale={1.3} />
      <Placed object={cassette} pos={PLACE.cassette.pos} rot={PLACE.cassette.rot} scale={1.25} />
      <Placed object={deskPlant} pos={PLACE.deskPlant.pos} rot={PLACE.deskPlant.rot} />
      <Placed object={floorPlant} pos={PLACE.floorPlant.pos} rot={PLACE.floorPlant.rot} scale={1.3} />
      <Placed object={armchair} pos={PLACE.armchair.pos} rot={PLACE.armchair.rot} />
      <Library anim={anim} />
      <HangingLamp anim={anim} />
      <Cat anim={anim} />
      <Chalkboard />
      <WallClock anim={anim} />
      <Mug />
      <Phone anim={anim} />
    </group>
  );
});
