import { memo, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LOFT, ROOM, STAIR, TERRACE } from "./stage";
import { frameMat, glassMat, steel, worldBox } from "./Room";
import { makeCanvasTexture, rand } from "./canvases";
import type { Anim } from "./anim";

/*
 * The mezzanine, the stair that climbs to it, and the terrace outside the
 * glass wall: the parts of the building the study did not have.
 *
 *   The deck   oak, at the height of the first floor's ceiling, over the front
 *              bay. Underneath is a lounge with recessed lights in the boards.
 *   The stair  one straight flight up the slat wall: white steel stringers,
 *              oak treads, a sheet of glass on the open side and a warm strip
 *              of light under every nosing, as in a loft one would want.
 *   The rail   glass between steel posts, a blue handrail.
 *   Terrace    weathered boards, a glass rail, steps down to the lawn, and
 *              strings of lights that come on at night.
 *
 * All static, all merged into a handful of draws.
 */

const TEX = "/zen/tex/";
const box = (w: number, h: number, d: number, x: number, y: number, z: number) =>
  new THREE.BoxGeometry(w, h, d).translate(x, y, z);

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 10) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  const m = a.clone().add(b).multiplyScalar(0.5);
  return g.translate(m.x, m.y, m.z);
}

/** A sheet of glass as a quad given its four corners, both faces. */
function quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray()], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
}

/** Weathered decking, boards running along x with a seam and a grain to each. */
function paintDeck(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = rand(19);
  const boards = 8;
  const bh = h / boards;
  ctx.fillStyle = "#8e8578";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < boards; i++) {
    const tone = 0.86 + r() * 0.24;
    ctx.fillStyle = `rgb(${Math.round(150 * tone)},${Math.round(140 * tone)},${Math.round(124 * tone)})`;
    ctx.fillRect(0, i * bh + 2, w, bh - 4);
    for (let k = 0; k < 130; k++) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? "60,52,42" : "215,205,188"},${0.05 + r() * 0.08})`;
      ctx.fillRect(r() * w, i * bh + 3 + r() * (bh - 6), 20 + r() * 150, 1);
    }
    // A board's end joint somewhere along it.
    const x = r() * w;
    ctx.fillStyle = "rgba(30,26,22,0.6)";
    ctx.fillRect(x, i * bh + 2, 2, bh - 4);
  }
  for (let i = 0; i <= boards; i++) {
    ctx.fillStyle = "rgba(26,22,18,0.75)";
    ctx.fillRect(0, i * bh - 1.5, w, 3);
  }
}

type Mats = ReturnType<typeof buildMaterials>;
/** One set for the deck, the stair and the terrace, so one loop tones them all. */
const SHARED = new WeakMap<object, Mats>();

function useMaterials() {
  const maps = useTexture([`${TEX}floor_diff.webp`, `${TEX}floor_nor.webp`, `${TEX}floor_arm.webp`]);
  let m = SHARED.get(maps[0]);
  if (!m) {
    m = buildMaterials(maps);
    SHARED.set(maps[0], m);
  }
  return m;
}

function buildMaterials(maps: THREE.Texture[]) {
  {
    const clone = (repeat: number) =>
      maps.map((t, i) => {
        const c = t.clone();
        c.wrapS = c.wrapT = THREE.RepeatWrapping;
        c.repeat.set(repeat, repeat);
        c.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        c.anisotropy = 8;
        c.needsUpdate = true;
        return c;
      });
    const [d0, n0, a0] = clone(1);
    const deck = new THREE.MeshStandardMaterial({
      map: d0,
      normalMap: n0,
      aoMap: a0,
      roughnessMap: a0,
      roughness: 2.2,
      color: new THREE.Color("#8a7a6c"),
      envMapIntensity: 0.5,
    });
    const led = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb070"), toneMapped: false });
    const planks = makeCanvasTexture(1024, 512);
    paintDeck(planks.ctx, 1024, 512);
    planks.tex.wrapS = planks.tex.wrapT = THREE.RepeatWrapping;
    planks.tex.repeat.set(3, 3);
    planks.tex.needsUpdate = true;
    const terrace = new THREE.MeshStandardMaterial({ map: planks.tex, roughness: 0.92, envMapIntensity: 0.3 });
    const concrete = new THREE.MeshStandardMaterial({ color: "#d9d7d2", roughness: 0.92 });
    const wood = deck.clone();
    wood.color = new THREE.Color("#c8ab84");
    return { deck, led, terrace, concrete, wood, planks };
  }
}

const DECK_TONE = [new THREE.Color("#8a7a6c"), new THREE.Color("#d9c7ae")];
const WOOD_TONE = [new THREE.Color("#5b4630"), new THREE.Color("#d2b68e")];
const TERRACE_TONE = [new THREE.Color("#2e3346"), new THREE.Color("#ffffff")];
const CONCRETE_TONE = [new THREE.Color("#4b4f5c"), new THREE.Color("#dcdad5")];

export const Loft = memo(function Loft({ anim }: { anim: Anim }) {
  const mats = useMaterials();
  const { z0, z1, y, thick } = LOFT;
  const g = useMemo(() => {
    const d = (STAIR.z1 - STAIR.z0) / (STAIR.steps - 1);
    const r = STAIR.rise / STAIR.steps;
    const sx = (STAIR.x0 + STAIR.x1) / 2;
    const run = STAIR.z1 - STAIR.z0;
    const ang = Math.atan2(STAIR.rise, run);
    const slope = Math.hypot(run, STAIR.rise);

    // The deck, its steel fascia and the glass rail along its edge.
    const deck = worldBox(9, thick, z1 - z0, 0, y - thick / 2, (z0 + z1) / 2, 0.467);
    const fascia = box(9, 0.2, 0.05, 0, y - 0.1, z0 - 0.02);
    const steelParts: THREE.BufferGeometry[] = [fascia];
    const glass: THREE.BufferGeometry[] = [];
    const rail = STAIR.x1 + 0.03;
    const railTop = y + 1.0;
    const posts: number[] = [];
    const span = ROOM.halfW - rail;
    const bays = 6;
    for (let i = 0; i <= bays; i++) posts.push(rail + (span * i) / bays - (i === bays ? 0.03 : 0));
    for (const px of posts) steelParts.push(box(0.05, 1.0, 0.05, px, y + 0.5, z0 + 0.02));
    for (let i = 0; i < posts.length - 1; i++) {
      const a = posts[i] + 0.03;
      const b = posts[i + 1] - 0.03;
      glass.push(quad(new THREE.Vector3(a, y + 0.08, z0 + 0.02), new THREE.Vector3(b, y + 0.08, z0 + 0.02), new THREE.Vector3(b, railTop - 0.06, z0 + 0.02), new THREE.Vector3(a, railTop - 0.06, z0 + 0.02)));
    }
    const handrail = cylinderBetween(new THREE.Vector3(rail - 0.01, railTop, z0 + 0.02), new THREE.Vector3(ROOM.halfW - 0.02, railTop, z0 + 0.02), 0.026, 12);

    // The stair: stringers, oak treads, posts and a sloping sheet of glass.
    const stringers = [STAIR.x0 + 0.025, STAIR.x1 - 0.025].map((x) => {
      const p = box(0.05, 0.3, slope + 0.12, x, 0, 0);
      p.rotateX(-ang);
      return p.translate(0, STAIR.rise / 2 - 0.15, (STAIR.z0 + STAIR.z1) / 2);
    });
    const treads: THREE.BufferGeometry[] = [];
    const leds: THREE.BufferGeometry[] = [];
    for (let k = 1; k <= STAIR.steps - 1; k++) {
      const z = STAIR.z0 + (k - 0.5) * d;
      treads.push(worldBox(STAIR.x1 - STAIR.x0 - 0.08, 0.05, d + 0.03, sx, k * r - 0.025, z, 0.467));
      leds.push(box(STAIR.x1 - STAIR.x0 - 0.14, 0.012, 0.012, sx, k * r - 0.06, z - d / 2 + 0.03));
    }
    leds.push(box(9, 0.014, 0.014, 0, y - 0.215, z0 - 0.02));
    const px = STAIR.x1 - 0.03;
    const line = (z: number) => ((z - STAIR.z0) / run) * STAIR.rise;
    for (let k = 0; k <= STAIR.steps - 1; k += 2) {
      const z = STAIR.z0 + k * d;
      steelParts.push(box(0.045, 0.98, 0.045, px, line(z) + 0.49, z));
    }
    const a0 = new THREE.Vector3(px, line(STAIR.z0) + 0.95, STAIR.z0);
    const a1 = new THREE.Vector3(px, line(STAIR.z1) + 0.95, STAIR.z1);
    const stairHandrail = cylinderBetween(a0, a1, 0.026, 12);
    glass.push(
      quad(
        new THREE.Vector3(px, line(STAIR.z0) + 0.1, STAIR.z0),
        new THREE.Vector3(px, line(STAIR.z1) + 0.1, STAIR.z1),
        new THREE.Vector3(px, line(STAIR.z1) + 0.9, STAIR.z1),
        new THREE.Vector3(px, line(STAIR.z0) + 0.9, STAIR.z0),
      ),
    );

    // Recessed lights in the boards under the deck.
    const discs: THREE.BufferGeometry[] = [];
    for (const x of [-3.2, -1.6, 0, 1.6, 3.2])
      for (const z of [4.4, 5.6]) discs.push(new THREE.CircleGeometry(0.085, 20).rotateX(Math.PI / 2).translate(x, y - thick - 0.004, z));

    return {
      deck,
      steel: mergeGeometries([...steelParts, ...stringers]),
      handrails: mergeGeometries([handrail, stairHandrail]),
      treads: mergeGeometries(treads),
      glass: mergeGeometries(glass),
      leds: mergeGeometries(leds),
      discs: mergeGeometries(discs),
    };
  }, [z0, z1, y, thick]);

  const lightUnder = useRef<THREE.PointLight>(null);
  const lightUp = useRef<THREE.PointLight>(null);
  const toned = useRef(-1);
  useFrame(() => {
    const day = anim.day;
    const night = 1 - day;
    mats.led.color.set("#ffb070").multiplyScalar(0.25 + (anim.strip * 2.6 + 0.2) * night + anim.strip * 0.5 * day);
    if (Math.abs(toned.current - day) > 0.001) {
      toned.current = day;
      mats.deck.color.lerpColors(DECK_TONE[0], DECK_TONE[1], day);
      mats.wood.color.lerpColors(WOOD_TONE[0], WOOD_TONE[1], day);
      mats.terrace.color.lerpColors(TERRACE_TONE[0], TERRACE_TONE[1], day);
      mats.concrete.color.lerpColors(CONCRETE_TONE[0], CONCRETE_TONE[1], day);
    }
    // Two soft lights for the two floors of the front bay: warm and low under
    // the deck, brighter and whiter above it by day.
    if (lightUnder.current) lightUnder.current.intensity = anim.hang * (2.2 + night * 3.2);
    if (lightUp.current) {
      lightUp.current.intensity = anim.hang * (1.6 + night * 3.0);
      lightUp.current.color.lerpColors(new THREE.Color("#ffbf85"), new THREE.Color("#fff3e2"), day * 0.7);
    }
  });
  return (
    <group userData={{ pfEdges: true }}>
      <mesh geometry={g.deck} material={mats.deck} />
      <mesh geometry={g.treads} material={mats.wood} />
      <mesh geometry={g.steel} material={steel} />
      <mesh geometry={g.handrails} material={frameMat} />
      <mesh geometry={g.glass} material={glassMat} userData={{ pfNoCast: true, pfNoTwin: true }} />
      <mesh geometry={g.leds} material={mats.led} userData={{ pfNoCast: true, pfNoTwin: true }} />
      <mesh geometry={g.discs} material={mats.led} userData={{ pfNoCast: true, pfNoTwin: true }} />
      <pointLight ref={lightUnder} position={[0, y - 0.35, 5.15]} color="#ffb673" intensity={0} distance={7} decay={2} />
      <pointLight ref={lightUp} position={[0.4, y + 1.7, 5.0]} color="#ffe6c4" intensity={0} distance={8} decay={2} />
    </group>
  );
});

/* ------------------------------------------------------------- terrace -- */

const STRING = { z0: ROOM.front + 0.12, z1: TERRACE.z1 - 0.08 };

const BULB_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  varying float vSeed;
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vSeed = aSeed;
    vTw = 0.82 + 0.18 * sin(uTime * (1.4 + aSeed * 2.2) + aSeed * 40.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize / -mv.z, uSize * 0.5);
  }
`;
const BULB_FRAG = /* glsl */ `
  uniform float uAmount;
  varying float vSeed;
  varying float vTw;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float core = smoothstep(0.34, 0.0, d);
    float halo = smoothstep(1.0, 0.0, d);
    float a = (core + halo * halo * 0.55) * uAmount * vTw;
    if (a < 0.01) discard;
    gl_FragColor = vec4(mix(vec3(1.0, 0.72, 0.4), vec3(1.0, 0.95, 0.85), core), a);
  }
`;

/** Bulbs on wires, sagging between the wall and the rail. */
function StringLights({ anim }: { anim: Anim }) {
  const { points, wires, material } = useMemo(() => {
    const strands: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (const x of [-3.4, -1.2, 1.2, 3.4]) {
      strands.push([new THREE.Vector3(x, 3.55, STRING.z0), new THREE.Vector3(x + 0.4, 2.15, STRING.z1)]);
    }
    strands.push([new THREE.Vector3(-4.6, 2.15, STRING.z1), new THREE.Vector3(4.6, 2.15, STRING.z1)]);
    const pos: number[] = [];
    const seed: number[] = [];
    const wire: number[] = [];
    let s = 3;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (const [a, b] of strands) {
      const n = 14;
      const sag = a.distanceTo(b) * 0.09;
      let prev: THREE.Vector3 | null = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(t * Math.PI) * sag;
        if (prev) wire.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        prev = p;
        if (i % 2 === 1 || i === 0 || i === n) {
          pos.push(p.x, p.y - 0.04, p.z);
          seed.push(r());
        }
      }
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    pg.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
    const wg = new THREE.BufferGeometry();
    wg.setAttribute("position", new THREE.Float32BufferAttribute(wire, 3));
    const m = new THREE.ShaderMaterial({
      vertexShader: BULB_VERT,
      fragmentShader: BULB_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSize: { value: 60 }, uAmount: { value: 0 } },
    });
    return { points: pg, wires: wg, material: m };
  }, []);
  const wireMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#20222c" }), []);
  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uSize.value = 90 * state.gl.getPixelRatio();
    // They are lit at dusk and at night, a faint glint by day.
    u.uAmount.value = (0.08 + (1 - anim.day) * anim.strip * 1.1) * THREE.MathUtils.smoothstep(anim.scan, 0.5, 3);
  });
  return (
    <group>
      <lineSegments geometry={wires} material={wireMat} userData={{ pfSkip: true, pfTwin: true }} />
      <points geometry={points} material={material} frustumCulled={false} userData={{ pfSkip: true }} />
    </group>
  );
}

export const Terrace = memo(function Terrace({ anim }: { anim: Anim }) {
  const mats = useMaterials();
  const { z0, z1 } = TERRACE;
  const doorX = -3.7 + (7.4 / 6) * 4.5;
  const g = useMemo(() => {
    const len = z1 - z0;
    const zc = (z0 + z1) / 2;
    const deck = worldBox(9.7, 0.12, len, 0, -0.06, zc, 0.5);
    const plinth = box(9.6, 0.4, ROOM.front - ROOM.back + 0.2 + len + 0.1, 0, -0.32, (ROOM.back - 0.2 + z1 + 0.1) / 2);
    const steps = mergeGeometries([
      box(1.7, 0.1, 0.42, doorX, -0.05 - 0.1, z1 + 0.19),
      box(1.9, 0.1, 0.42, doorX, -0.05 - 0.2, z1 + 0.6),
    ]);
    // The glass rail, with a gap where the steps go down.
    const posts: THREE.BufferGeometry[] = [];
    const panes: THREE.BufferGeometry[] = [];
    const tops: THREE.BufferGeometry[] = [];
    const runs: Array<[number, number]> = [
      [-4.75, doorX - 1.0],
      [doorX + 1.0, 4.75],
    ];
    for (const [xa, xb] of runs) {
      const n = Math.max(1, Math.round((xb - xa) / 1.5));
      for (let i = 0; i <= n; i++) posts.push(box(0.05, 1.0, 0.05, xa + ((xb - xa) * i) / n, 0.5, z1 - 0.06));
      tops.push(cylinderBetween(new THREE.Vector3(xa, 1.0, z1 - 0.06), new THREE.Vector3(xb, 1.0, z1 - 0.06), 0.024));
      for (let i = 0; i < n; i++) {
        const a = xa + ((xb - xa) * i) / n + 0.03;
        const b = xa + ((xb - xa) * (i + 1)) / n - 0.03;
        panes.push(quad(new THREE.Vector3(a, 0.07, z1 - 0.06), new THREE.Vector3(b, 0.07, z1 - 0.06), new THREE.Vector3(b, 0.94, z1 - 0.06), new THREE.Vector3(a, 0.94, z1 - 0.06)));
      }
    }
    for (const x of [-4.75, 4.75]) {
      const n = 2;
      for (let i = 0; i <= n; i++) posts.push(box(0.05, 1.0, 0.05, x, 0.5, z0 + 0.1 + ((len - 0.16) * i) / n));
      tops.push(cylinderBetween(new THREE.Vector3(x, 1.0, z0 + 0.1), new THREE.Vector3(x, 1.0, z1 - 0.06), 0.024));
      for (let i = 0; i < n; i++) {
        const a = z0 + 0.1 + ((len - 0.16) * i) / n + 0.03;
        const b = z0 + 0.1 + ((len - 0.16) * (i + 1)) / n - 0.03;
        panes.push(quad(new THREE.Vector3(x, 0.07, a), new THREE.Vector3(x, 0.07, b), new THREE.Vector3(x, 0.94, b), new THREE.Vector3(x, 0.94, a)));
      }
    }
    return {
      deck,
      plinth,
      steps,
      posts: mergeGeometries(posts),
      tops: mergeGeometries(tops),
      panes: mergeGeometries(panes),
    };
  }, [z0, z1, doorX]);
  return (
    <group userData={{ pfEdges: true }}>
      <mesh geometry={g.deck} material={mats.terrace} />
      <mesh geometry={g.plinth} material={mats.concrete} />
      <mesh geometry={g.steps} material={mats.concrete} />
      <mesh geometry={g.posts} material={frameMat} />
      <mesh geometry={g.tops} material={frameMat} />
      <mesh geometry={g.panes} material={glassMat} userData={{ pfNoCast: true, pfNoTwin: true }} />
      <StringLights anim={anim} />
    </group>
  );
});

