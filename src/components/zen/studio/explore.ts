import * as THREE from "three";
import { LOFT, PORTRAIT_HOME, ROOM, STAIR, TERRACE, VIEWS, type Vec3 } from "./stage";

/*
 * Free exploration: turning the building, walking through it, and the three
 * places the camera can be sent (the study, upstairs, the terrace).
 *
 * The camera rig reads this every frame. Orbit and walking never touch React:
 * pointer and key handlers write here, the rig eases toward it, so dragging
 * costs no render. An orbit is a yaw and pitch about a pivot at a distance;
 * an area is a preset of the four, plus an optional path to fly along (up the
 * stair, rather than through the floor).
 */

export type Area = "study" | "loft" | "terrace";

type Preset = { yaw: number; pitch: number; dist: number; pivot: Vec3; fov: number; via?: Vec3[]; viaTarget?: Vec3[] };

/** Eye height above whatever floor is underfoot. */
export const EYE = 1.62;

/** Spherical parameters of a camera and its aim. */
function fromShot(pos: Vec3, target: Vec3) {
  const d = new THREE.Vector3(pos[0] - target[0], pos[1] - target[1], pos[2] - target[2]);
  const dist = d.length();
  return { yaw: Math.atan2(d.x, d.z), pitch: Math.asin(d.y / dist), dist };
}

const home = fromShot(VIEWS.home.pos, VIEWS.home.target);
const homePortrait = fromShot(PORTRAIT_HOME.pos, PORTRAIT_HOME.target);

const stairMid = (t: number): Vec3 => [
  (STAIR.x0 + STAIR.x1) / 2,
  1.55 + STAIR.rise * t,
  STAIR.z0 + (STAIR.z1 - STAIR.z0) * t,
];

export const PRESETS: Record<Area, Preset> = {
  study: { ...home, pivot: [...VIEWS.home.target] as Vec3, fov: VIEWS.home.fov ?? 57 },
  // Upstairs: on the deck by the stair head, looking across the loft.
  loft: {
    yaw: 2.35,
    pitch: 0.02,
    dist: 4.6,
    pivot: [0.6, 3.55, 4.6],
    fov: 62,
    via: [stairMid(0.0), stairMid(0.3), stairMid(0.62), stairMid(0.92)],
    viaTarget: [
      [-3.9, 1.9, 2.0],
      [-3.9, 2.6, 3.6],
      [-3.4, 3.4, 4.6],
      [-2.4, 3.5, 4.8],
    ],
  },
  // The terrace: at the rail, the whole sky ahead.
  terrace: { yaw: 0.55, pitch: 0.06, dist: 5.2, pivot: [0.4, 1.5, TERRACE.z0 + 0.4], fov: 58 },
};

export const explore = {
  area: "study" as Area,
  /** Bumped on each area change, so the rig knows to start a flight. */
  areaSerial: 0,
  yaw: home.yaw,
  pitch: home.pitch,
  dist: home.dist,
  pivot: new THREE.Vector3(...VIEWS.home.target),
  fov: VIEWS.home.fov ?? 57,
  // Fling: angular velocity after a release, radians per second.
  yawV: 0,
  pitchV: 0,
  dragging: false,
  /** True from a drag until the next press: a drag's release is not a click. */
  moved: false,
  keys: new Set<string>(),
  walk: { x: 0.9, z: 5.3, y: 0, yaw: Math.PI, pitch: 0, layer: 0, vx: 0, vz: 0 },
};

export function setPortrait(portrait: boolean) {
  const s = portrait ? homePortrait : home;
  PRESETS.study.yaw = s.yaw;
  PRESETS.study.pitch = s.pitch;
  PRESETS.study.dist = s.dist;
  PRESETS.study.pivot = [...(portrait ? PORTRAIT_HOME.target : VIEWS.home.target)] as Vec3;
  PRESETS.study.fov = portrait ? PORTRAIT_HOME.fov : (VIEWS.home.fov ?? 57);
  if (explore.area === "study") applyPreset("study", false);
}

export function applyPreset(area: Area, fly = true) {
  const p = PRESETS[area];
  explore.area = area;
  explore.yaw = p.yaw;
  explore.pitch = p.pitch;
  explore.dist = p.dist;
  explore.pivot.set(...p.pivot);
  explore.fov = p.fov;
  explore.yawV = explore.pitchV = 0;
  if (fly) explore.areaSerial++;
}

/** The point the orbit camera wants to be at, and what it looks at. */
export function orbitGoal(pos: THREE.Vector3, tgt: THREE.Vector3) {
  const cp = Math.cos(explore.pitch);
  tgt.copy(explore.pivot);
  pos.set(
    explore.pivot.x + Math.sin(explore.yaw) * cp * explore.dist,
    explore.pivot.y + Math.sin(explore.pitch) * explore.dist,
    explore.pivot.z + Math.cos(explore.yaw) * cp * explore.dist,
  );
}

/* ------------------------------------------------------------------- walking */

const R = 0.26;
const DOOR = { x0: -3.7 + (7.4 / 6) * 4, x1: -3.7 + (7.4 / 6) * 5 };

/** Round and boxy things a walker cannot pass through: [x, z, half-x, half-z]. */
const SOLIDS: Array<[number, number, number, number]> = [
  [0.86, -2.85, 0.75, 0.42], // the desk
  [0.72, -1.72, 0.36, 0.36], // its chair
  [-4.2, -1.8, 0.28, 1.65], // the library wall and its ladder
  [3.35, -1.45, 0.42, 0.42], // the chalkboard
  [2.62, -3.02, 0.3, 0.3], // the floor plant
  [-2.58, 0.28, 0.52, 0.52], // the reader and her chair
  [-1.55, 1.25, 0.2, 0.2], // the cat
];

/** How high the floor is at a point, given which floor the walker is on. */
export function floorAt(x: number, z: number, layer: number) {
  const inStair = x > STAIR.x0 - 0.05 && x < STAIR.x1 + 0.05 && z > STAIR.z0 && z < STAIR.z1;
  if (inStair) return ((z - STAIR.z0) / (STAIR.z1 - STAIR.z0)) * STAIR.rise;
  return layer ? LOFT.y : 0;
}

function blocked(x: number, z: number, layer: number) {
  const hx = ROOM.halfW - R;
  if (x < -hx || x > hx || z < ROOM.back + R) return true;
  const outside = z > ROOM.front;
  if (outside) {
    // Through the door only, then the terrace.
    if (z < ROOM.front + 0.3 && (x < DOOR.x0 + R || x > DOOR.x1 - R)) return true;
    if (layer) return true;
    return z > TERRACE.z1 - R;
  }
  if (z > ROOM.front - R && !(layer === 0 && x > DOOR.x0 + R && x < DOOR.x1 - R)) return true;
  const onStair = x < STAIR.x1 + 0.05 && z > STAIR.z0 && z < STAIR.z1;
  if (layer) {
    // Upstairs: the edge is railed except at the stair head.
    if (z < LOFT.z0 + R && x > STAIR.x1 + 0.05) return true;
    if (z < LOFT.z0 - 0.02 && x < STAIR.x0 - 0.05) return true;
    return false;
  }
  if (onStair && x < STAIR.x0 - 0.02) return true;
  for (const [sx, sz, hx2, hz2] of SOLIDS) if (Math.abs(x - sx) < hx2 + R && Math.abs(z - sz) < hz2 + R) return true;
  return false;
}

/** Puts the walker on the floor where the orbit camera stands, facing the room. */
export function enterWalk() {
  const w = explore.walk;
  const outside = explore.area === "terrace";
  w.layer = explore.area === "loft" ? 1 : 0;
  w.x = outside ? 0.4 : explore.area === "loft" ? -2.6 : 0.9;
  w.z = outside ? TERRACE.z0 + 1.0 : explore.area === "loft" ? 4.9 : 5.3;
  w.yaw = outside ? 0 : Math.PI;
  w.pitch = 0;
  w.vx = w.vz = 0;
  w.y = floorAt(w.x, w.z, w.layer);
}

export function stepWalk(dt: number) {
  const w = explore.walk;
  const k = explore.keys;
  const fwd = (k.has("w") || k.has("arrowup") ? 1 : 0) - (k.has("s") || k.has("arrowdown") ? 1 : 0);
  const side = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0);
  const turn = (k.has("arrowleft") ? 1 : 0) - (k.has("arrowright") ? 1 : 0);
  w.yaw += turn * dt * 1.6;
  const speed = k.has("shift") ? 3.2 : 1.7;
  const sy = Math.sin(w.yaw);
  const cy = Math.cos(w.yaw);
  // Forward is (sin yaw, cos yaw); right is its quarter turn.
  const wantX = (sy * fwd - cy * side) * speed;
  const wantZ = (cy * fwd + sy * side) * speed;
  const ease = 1 - Math.exp(-dt * 9);
  w.vx += (wantX - w.vx) * ease;
  w.vz += (wantZ - w.vz) * ease;
  let nx = w.x + w.vx * dt;
  let nz = w.z + w.vz * dt;
  if (blocked(nx, nz, w.layer)) {
    // Slide along whichever axis is free.
    if (!blocked(nx, w.z, w.layer)) nz = w.z;
    else if (!blocked(w.x, nz, w.layer)) nx = w.x;
    else {
      nx = w.x;
      nz = w.z;
      w.vx = w.vz = 0;
    }
  }
  w.x = nx;
  w.z = nz;
  // The stair's head lands on the deck; its foot on the floor.
  if (nx > STAIR.x0 - 0.05 && nx < STAIR.x1 + 0.05) {
    if (nz >= STAIR.z1 - 0.05) w.layer = 1;
    else if (nz <= STAIR.z0 + 0.05) w.layer = 0;
  }
  const floor = floorAt(w.x, w.z, w.layer);
  w.y += (floor - w.y) * (1 - Math.exp(-dt * 14));
}

/** The walker's eye and what it looks at. */
export function walkGoal(pos: THREE.Vector3, tgt: THREE.Vector3) {
  const w = explore.walk;
  pos.set(w.x, w.y + EYE, w.z);
  const cp = Math.cos(w.pitch);
  tgt.set(w.x + Math.sin(w.yaw) * cp * 2, w.y + EYE + Math.sin(w.pitch) * 2, w.z + Math.cos(w.yaw) * cp * 2);
}
