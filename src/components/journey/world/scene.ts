import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LEVELS, STAGES, type LevelId } from "@/lib/journeyLevels";
import { LEVEL_CLAY } from "@/components/journey/LevelPath";

/**
 * The journey as a place.
 *
 * Fifteen floating islands, one per level, climb away from the camera. A clay
 * road winds across each island carrying that level's twenty stage coins, and
 * a rope bridge climbs to the next island. Every level has its own gate and
 * its own landmark, and the road ends at a campus on the last island.
 *
 * Everything is built once from STAGES; progress only recolours instances, so
 * a claimed stage never rebuilds geometry. The camera rides the road: `focus`
 * is a float stage index and the rig sits behind and above it.
 */

export type NodeState = "done" | "current" | "locked";

export interface WorldCallbacks {
  /** Pointer entered / left a stage coin. */
  onHover: (index: number | null) => void;
  /** A stage coin was clicked (a press that did not turn into a drag). */
  onSelect: (index: number) => void;
  /** The rounded stage index under the camera changed. */
  onFocusChange: (index: number) => void;
  /** First user-driven movement, so the UI can retire its hint. */
  onInteract: () => void;
}

export interface WorldAnchors {
  /** Floats over the current stage's marker. */
  here: HTMLElement | null;
  /** Follows the hovered coin. */
  tip: HTMLElement | null;
}

export interface WorldHandle {
  setStates: (states: NodeState[]) => void;
  flyTo: (index: number) => void;
  nudge: (delta: number) => void;
  setDark: (dark: boolean) => void;
  getFocus: () => number;
  dispose: () => void;
}

// ── Layout ────────────────────────────────────────────────────────────────

const N = STAGES.length;
const SPACING = 2.35; // road distance between coins
const LEVEL_GAP = 7.2; // extra distance a bridge spans between islands
const LEVEL_RISE = 2.3; // each island sits this much above the last
const STAGE_RISE = 0.045; // gentle climb across an island
const ROAD_HALF = 0.95;
const ROAD_TOP = 0.04;
const ROAD_DEPTH = 0.3;
const SEG = 12; // road samples per stage-to-stage segment

function stageXZY(i: number): THREE.Vector3 {
  const s = STAGES[i];
  const L = s.level - 1;
  const z = -(i * SPACING + L * LEVEL_GAP);
  const x = Math.sin(i * 0.41) * 3.3 + Math.sin(i * 0.137 + 1.3) * 1.5;
  const y = L * LEVEL_RISE + i * STAGE_RISE;
  return new THREE.Vector3(x, y, z);
}

const STAGE_POS: THREE.Vector3[] = STAGES.map((_, i) => stageXZY(i));
const LEAD_POS = new THREE.Vector3(STAGE_POS[0].x * 0.4, STAGE_POS[0].y, 5.5);
const LAST = STAGE_POS[N - 1];
const END_POS = new THREE.Vector3(LAST.x * 0.25, LAST.y + 2.2, LAST.z - 13);
/** Curve control points: lead-in, every stage, then the campus plaza. */
const CURVE_PTS = [LEAD_POS, ...STAGE_POS, END_POS];

/** Level id -> [first, last] global stage index. */
const LEVEL_RANGE = new Map<LevelId, [number, number]>();
STAGES.forEach((s, i) => {
  const r = LEVEL_RANGE.get(s.level);
  if (!r) LEVEL_RANGE.set(s.level, [i, i]);
  else r[1] = i;
});

// ── Colour helpers ────────────────────────────────────────────────────────

const col = (hex: string) => new THREE.Color(hex);
function mix(a: string | THREE.Color, b: string | THREE.Color, t: number) {
  const ca = typeof a === "string" ? col(a) : a.clone();
  const cb = typeof b === "string" ? col(b) : b;
  return ca.lerp(cb, t);
}

const CREAM = "#f3eee2";
const ROAD_PENDING = { light: "#ebe3d3", dark: "#2b3550" };
const WOOD_A = "#b88a5c";
const WOOD_B = "#a37649";

function levelTop(level: LevelId) {
  return (LEVEL_CLAY[level] ?? LEVEL_CLAY[1]).top;
}
function levelLip(level: LevelId) {
  return (LEVEL_CLAY[level] ?? LEVEL_CLAY[1]).lip;
}

/** Deterministic noise so the world is identical on every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Canvas textures ───────────────────────────────────────────────────────

type Tex = { tex: THREE.CanvasTexture; redraw: () => void };

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Tex {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return {
    tex,
    redraw: () => {
      ctx.clearRect(0, 0, w, h);
      draw(ctx);
      tex.needsUpdate = true;
    },
  };
}

function iconTex(kind: "check" | "star" | "lock"): Tex {
  return canvasTex(128, 128, (ctx) => {
    ctx.save();
    ctx.translate(64, 64);
    ctx.scale(3.4, 3.4);
    ctx.translate(-12, -12);
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (kind === "check") {
      ctx.lineWidth = 3.6;
      ctx.stroke(new Path2D("M20 6 9 17l-5-5"));
    } else if (kind === "star") {
      ctx.lineWidth = 1.2;
      const p = new Path2D(
        "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      );
      ctx.fill(p);
      ctx.stroke(p);
    } else {
      ctx.lineWidth = 2.6;
      ctx.stroke(new Path2D("M7 11V7a5 5 0 0 1 10 0v4"));
      ctx.beginPath();
      ctx.roundRect(4, 11, 16, 11, 2.5);
      ctx.fill();
    }
    ctx.restore();
  });
}

function bannerTex(eyebrow: string, title: string, bg: string, fg = "#ffffff"): Tex {
  return canvasTex(1024, 256, (ctx) => {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(8, 8, 1008, 240, 44);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(22, 22, 980, 212, 34);
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.82;
    ctx.font = "700 44px Sora, 'Plus Jakarta Sans', system-ui, sans-serif";
    // Letter-spaced eyebrow, drawn glyph by glyph since canvas letterSpacing
    // is not everywhere yet.
    const spaced = eyebrow.toUpperCase().split("").join(String.fromCharCode(8202));
    ctx.fillText(spaced, 512, 82);
    ctx.globalAlpha = 1;
    let size = 88;
    ctx.font = `700 ${size}px Sora, 'Plus Jakarta Sans', system-ui, sans-serif`;
    while (ctx.measureText(title).width > 900 && size > 40) {
      size -= 4;
      ctx.font = `700 ${size}px Sora, 'Plus Jakarta Sans', system-ui, sans-serif`;
    }
    ctx.fillText(title, 512, 162);
  });
}

function dotTex(): THREE.CanvasTexture {
  return canvasTex(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }).tex;
}

// ── Geometry helpers ──────────────────────────────────────────────────────

/** A coin with a rounded rim; vertex colours darken the wall under the cap. */
function coinGeometry() {
  const R = 0.74;
  const H = 0.38;
  const prof = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(R - 0.06, 0),
    new THREE.Vector2(R, 0.05),
    new THREE.Vector2(R + 0.015, H * 0.5),
    new THREE.Vector2(R, H - 0.05),
    new THREE.Vector2(R - 0.07, H),
    new THREE.Vector2(0, H),
  ];
  const g = new THREE.LatheGeometry(prof, 36);
  const p = g.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    // Cap stays full colour; the wall falls off toward the base like the
    // clay coins on the 2D path.
    const k = y >= H - 0.001 ? 1 : 0.5 + 0.3 * (y / H);
    c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k;
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return g;
}

function cloudGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const r = rng(7);
  for (let i = 0; i < 6; i++) {
    const s = 0.8 + r() * 0.9;
    const g = new THREE.IcosahedronGeometry(s, 1);
    g.translate((i - 2.5) * 0.95 + r() * 0.4, r() * 0.5 + (i % 2) * 0.3, (r() - 0.5) * 1.1);
    parts.push(g);
  }
  const merged = mergeGeometries(parts)!;
  merged.scale(1, 0.62, 0.8);
  parts.forEach((g) => g.dispose());
  return merged;
}

// ── Scene ─────────────────────────────────────────────────────────────────

export function createJourneyWorld(
  mount: HTMLElement,
  cb: WorldCallbacks,
  getAnchors: () => WorldAnchors,
  opts: { dark: boolean; reducedMotion: boolean; initialFocus: number },
): WorldHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const small = Math.min(mount.clientWidth, window.innerWidth) < 640;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  canvas.style.outline = "none";
  mount.appendChild(canvas);

  const scene = new THREE.Scene();
  const fog = new THREE.Fog(0xeef0f2, 34, 108);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  const clay = (hex: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    const key = hex + JSON.stringify(extra);
    let m = matCache.get(key);
    if (!m) {
      m = keep(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.78, metalness: 0, flatShading: true, ...extra }));
      matCache.set(key, m);
    }
    return m;
  };

  // ── Lights ──────────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xfff6e6, 0xb8b09d, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -26;
  sc.right = 26;
  sc.top = 26;
  sc.bottom = -26;
  sc.near = 1;
  sc.far = 90;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const glow = new THREE.PointLight(0xffe2a8, 0, 9, 1.6);
  scene.add(glow);

  // ── Road ────────────────────────────────────────────────────────────────
  const curve = new THREE.CatmullRomCurve3(CURVE_PTS, false, "catmullrom", 0.5);
  const tOf = (f: number) => THREE.MathUtils.clamp((f + 1) / (CURVE_PTS.length - 1), 0, 1);

  const M = (CURVE_PTS.length - 1) * SEG + 1;
  const roadPos = new Float32Array(M * 6 * 3);
  const roadCol = new Float32Array(M * 6 * 3);
  const samples: THREE.Vector3[] = [];
  const sideAt: THREE.Vector3[] = [];
  {
    for (let k = 0; k < M; k++) {
      const t = k / (M - 1);
      const p = curve.getPoint(t);
      const tan = curve.getTangent(t);
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      samples.push(p);
      sideAt.push(side);
      const L = p.clone().addScaledVector(side, -ROAD_HALF);
      const R = p.clone().addScaledVector(side, ROAD_HALF);
      const v = [
        [L.x, p.y + ROAD_TOP, L.z],
        [R.x, p.y + ROAD_TOP, R.z],
        [L.x, p.y + ROAD_TOP, L.z],
        [L.x, p.y - ROAD_DEPTH, L.z],
        [R.x, p.y + ROAD_TOP, R.z],
        [R.x, p.y - ROAD_DEPTH, R.z],
      ];
      v.forEach((xyz, j) => roadPos.set(xyz, (k * 6 + j) * 3));
    }
  }
  const roadIdx: number[] = [];
  for (let k = 0; k < M - 1; k++) {
    const a = k * 6;
    const b = (k + 1) * 6;
    roadIdx.push(a, a + 1, b, a + 1, b + 1, b);
    roadIdx.push(a + 2, b + 2, a + 3, b + 2, b + 3, a + 3);
    roadIdx.push(a + 4, a + 5, b + 4, b + 4, a + 5, b + 5);
  }
  const roadGeo = keep(new THREE.BufferGeometry());
  roadGeo.setAttribute("position", new THREE.BufferAttribute(roadPos, 3));
  roadGeo.setAttribute("color", new THREE.BufferAttribute(roadCol, 3));
  roadGeo.setIndex(roadIdx);
  roadGeo.computeVertexNormals();
  const roadMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }));
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.receiveShadow = true;
  road.castShadow = true;
  scene.add(road);

  /** Segment k spans curve points seg and seg+1, i.e. stages seg-1 -> seg. */
  const segStages = (k: number) => {
    const seg = Math.min(Math.floor(k / SEG), CURVE_PTS.length - 2);
    return [seg - 1, seg] as const; // -1 = lead-in, N = campus
  };
  const isBridge = (a: number, b: number) =>
    a >= 0 && b < N && STAGES[a].level !== STAGES[b].level;

  // ── Islands ─────────────────────────────────────────────────────────────
  const slabGeo = keep(new THREE.CylinderGeometry(1, 1, 1, 9, 2));
  {
    // Bright turf on top, a darker band of soil down the wall.
    const p = slabGeo.attributes.position;
    const n = slabGeo.attributes.normal;
    const c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const top = n.getY(i) > 0.5;
      const k = top ? 1 : p.getY(i) > 0.2 ? 0.86 : 0.62;
      c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k;
    }
    slabGeo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  }
  const rockGeo = keep(new THREE.ConeGeometry(1, 1, 9, 3));
  rockGeo.rotateX(Math.PI);
  {
    const p = rockGeo.attributes.position;
    const r = rng(11);
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y > -0.49 && y < 0.49) {
        p.setX(i, p.getX(i) * (0.85 + r() * 0.3));
        p.setZ(i, p.getZ(i) * (0.85 + r() * 0.3));
      }
    }
    rockGeo.computeVertexNormals();
  }
  type Piece = { x: number; y: number; z: number; r: number; depth: number; level: LevelId | 0 };
  const pieces: Piece[] = [];
  const rand = rng(42);
  for (const L of LEVELS) {
    const [a, b] = LEVEL_RANGE.get(L.id)!;
    for (let i = a; i <= b; i += 2) {
      const p = STAGE_POS[i];
      const s = sideAt[(i + 1) * SEG];
      const off = (rand() - 0.5) * 1.6;
      const edge = i === a || i >= b - 1;
      pieces.push({
        x: p.x + s.x * off,
        y: p.y - 0.12,
        z: p.z + s.z * off,
        r: edge ? 2.6 + rand() * 0.4 : 3 + rand() * 1.1,
        depth: 2.4 + rand() * 3.2,
        level: L.id,
      });
    }
  }
  pieces.push({ x: LEAD_POS.x, y: LEAD_POS.y - 0.12, z: LEAD_POS.z - 1, r: 3.6, depth: 3, level: 1 });

  // ── Gates, landmarks, props (collected, then instanced where repeated) ──
  const group = new THREE.Group();
  scene.add(group);

  const shadowy = (m: THREE.Mesh) => {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const mesh = (geo: THREE.BufferGeometry, hex: string | THREE.Color, extra?: Partial<THREE.MeshStandardMaterialParameters>) =>
    shadowy(new THREE.Mesh(keep(geo), clay(typeof hex === "string" ? hex : "#" + hex.getHexString(), extra)));

  const bannerTexes: Tex[] = [];

  /** Point on the road for a float stage index. */
  const roadAt = (f: number) => curve.getPoint(tOf(f));
  const tanAt = (f: number) => curve.getTangent(tOf(f));

  const landmarkSpots: THREE.Vector3[] = [];
  const gateSpots: THREE.Vector3[] = [];

  for (const L of LEVELS) {
    const [a] = LEVEL_RANGE.get(L.id)!;
    const top = levelTop(L.id);
    const lip = levelLip(L.id);

    // Gate: two pillars, a lintel, and the level's name on a banner.
    const gp = roadAt(a - 0.12);
    const gt = tanAt(a - 0.12);
    const gate = new THREE.Group();
    gate.position.copy(gp);
    gate.lookAt(gp.clone().sub(gt));
    const pillarGeo = new THREE.BoxGeometry(0.34, 2.9, 0.34);
    for (const sx of [-1.45, 1.45]) {
      const pl = mesh(pillarGeo, lip);
      pl.position.set(sx, 1.45, 0);
      gate.add(pl);
      const cap = mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), top);
      cap.position.set(sx, 2.95, 0);
      gate.add(cap);
      const foot = mesh(new THREE.BoxGeometry(0.52, 0.22, 0.52), top);
      foot.position.set(sx, 0.08, 0);
      gate.add(foot);
    }
    const lintel = mesh(new THREE.BoxGeometry(4.1, 0.3, 0.46), top);
    lintel.position.set(0, 3.12, 0);
    gate.add(lintel);
    const lintel2 = mesh(new THREE.BoxGeometry(3.4, 0.16, 0.3), lip);
    lintel2.position.set(0, 2.72, 0);
    gate.add(lintel2);
    const bt = bannerTex(`Level ${L.id}`, L.name, lip);
    bannerTexes.push(bt);
    keep(bt.tex);
    const banner = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(2.6, 0.65)),
      keep(new THREE.MeshBasicMaterial({ map: bt.tex, transparent: true, side: THREE.DoubleSide })),
    );
    banner.position.set(0, 2.28, 0.02);
    gate.add(banner);
    group.add(gate);
    gateSpots.push(gp);

    // Landmark: on its own outcrop beside the road, on the side nearer the
    // middle of the world so it stays in frame.
    const li = Math.min(a + 7, N - 1);
    const lp = STAGE_POS[li];
    const ls = sideAt[(li + 1) * SEG];
    const A = lp.clone().addScaledVector(ls, 4.6);
    const B = lp.clone().addScaledVector(ls, -4.6);
    const spot = Math.abs(A.x) < Math.abs(B.x) ? A : B;
    spot.y = lp.y - 0.12;
    pieces.push({ x: spot.x, y: spot.y, z: spot.z, r: 2.3, depth: 2.2 + rand() * 1.5, level: L.id });
    const lm = buildLandmark(L.id, top, lip);
    lm.position.set(spot.x, spot.y, spot.z);
    lm.rotation.y = rand() * 0.6 - 0.3;
    group.add(lm);
    landmarkSpots.push(spot);
  }

  // Campus at the end of the road.
  pieces.push({ x: END_POS.x, y: END_POS.y - 0.12, z: END_POS.z - 2.5, r: 8.2, depth: 7, level: 0 });
  const campus = buildCampus();
  campus.position.set(END_POS.x, END_POS.y - 0.12, END_POS.z - 1.2);
  group.add(campus);

  // Props that move: stars on podiums spin, flags wave.
  const spinners: THREE.Object3D[] = [];
  const wavers: THREE.Object3D[] = [];
  group.traverse((o) => {
    if (o.userData.spin) spinners.push(o);
    if (o.userData.wave) wavers.push(o);
  });

  // Start sign.
  {
    const sp = LEAD_POS.clone();
    const s = sideAt[0];
    const post = new THREE.Group();
    post.position.copy(sp).addScaledVector(s, -1.7);
    post.position.y -= 0.1;
    const pole = mesh(new THREE.CylinderGeometry(0.07, 0.08, 2, 8), "#8a6a48");
    pole.position.y = 1;
    post.add(pole);
    const t = bannerTex("Pathforge", "Start here", "#4465d8");
    bannerTexes.push(t);
    keep(t.tex);
    const board = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(1.8, 0.45)),
      keep(new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, side: THREE.DoubleSide })),
    );
    board.position.set(0, 1.75, 0.08);
    post.add(board);
    group.add(post);
  }

  // Island meshes, instanced: grassy slab + rocky underside.
  const slabs = new THREE.InstancedMesh(slabGeo, clay("#ffffff", { vertexColors: true }), pieces.length);
  const rocks = new THREE.InstancedMesh(rockGeo, clay("#ffffff"), pieces.length);
  slabs.receiveShadow = true;
  slabs.castShadow = true;
  rocks.castShadow = false;
  rocks.receiveShadow = true;
  {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    pieces.forEach((p, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7);
      m.compose(new THREE.Vector3(p.x, p.y - 0.35, p.z), q, new THREE.Vector3(p.r, 0.7, p.r));
      slabs.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(p.x, p.y - 0.7 - p.depth / 2, p.z), q, new THREE.Vector3(p.r * 0.94, p.depth, p.r * 0.94));
      rocks.setMatrixAt(i, m);
      const grass = p.level ? mix(mix("#b7d99c", levelTop(p.level), 0.42), CREAM, 0.18) : col("#cfe3b8");
      const under = p.level ? mix(levelLip(p.level), "#7a6552", 0.5) : col("#8b7f6e");
      slabs.setColorAt(i, grass);
      rocks.setColorAt(i, under);
    });
  }
  scene.add(slabs, rocks);

  // ── Decor: trees, pines, rocks, lanterns, bridge posts ──────────────────
  const nearRoad = (x: number, z: number, pad: number) => {
    // Only check samples within reach; the road is monotone in z.
    for (let k = 0; k < M; k += 2) {
      const s = samples[k];
      if (Math.abs(s.z - z) > pad + 1) continue;
      const dx = s.x - x;
      const dz = s.z - z;
      if (dx * dx + dz * dz < pad * pad) return true;
    }
    return false;
  };
  const nearAny = (x: number, z: number, list: THREE.Vector3[], pad: number) =>
    list.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < pad * pad);

  type Deco = { x: number; y: number; z: number; s: number; kind: "tree" | "pine" | "rock" | "bush" | "flower"; tint: THREE.Color };
  const decos: Deco[] = [];
  const greens = ["#7fb58b", "#62a27a", "#9cc591", "#6fae9b", "#86b27a"];
  pieces.forEach((p, pi) => {
    if (!p.level || p.r < 2.5) return;
    const count = 6 + Math.floor(rand() * 5);
    for (let j = 0; j < count; j++) {
      const ang = rand() * Math.PI * 2;
      const rad = p.r * (0.45 + rand() * 0.45);
      const x = p.x + Math.cos(ang) * rad;
      const z = p.z + Math.sin(ang) * rad;
      if (nearRoad(x, z, 1.75)) continue;
      if (nearAny(x, z, gateSpots, 2.2) || nearAny(x, z, landmarkSpots, 2)) continue;
      const roll = rand();
      const kind: Deco["kind"] = roll < 0.3 ? "tree" : roll < 0.52 ? "pine" : roll < 0.68 ? "bush" : roll < 0.8 ? "rock" : "flower";
      const g = greens[(pi + j) % greens.length];
      const blossoms = ["#f7c6d0", "#fff1b8", "#ffffff", levelTop(p.level)];
      const tint =
        kind === "rock" ? mix("#bdb4a3", levelTop(p.level), 0.12)
        : kind === "flower" ? col(blossoms[(pi + j) % blossoms.length])
        : mix(g, levelTop(p.level), 0.18);
      decos.push({ x, y: p.y, z, s: 0.75 + rand() * 0.6, kind, tint });
    }
  });

  const trunkGeo = keep(new THREE.CylinderGeometry(0.09, 0.13, 0.7, 6));
  trunkGeo.translate(0, 0.35, 0);
  const crownGeo = keep(new THREE.IcosahedronGeometry(0.62, 0));
  crownGeo.translate(0, 1.15, 0);
  const pineGeo = keep(mergeGeometries([
    new THREE.ConeGeometry(0.62, 0.95, 7).translate(0, 0.95, 0),
    new THREE.ConeGeometry(0.48, 0.8, 7).translate(0, 1.4, 0),
    new THREE.ConeGeometry(0.32, 0.6, 7).translate(0, 1.8, 0),
  ])!);
  const bushGeo = keep(new THREE.IcosahedronGeometry(0.42, 0));
  bushGeo.scale(1.2, 0.8, 1.1);
  bushGeo.translate(0, 0.28, 0);
  const stoneGeo = keep(new THREE.DodecahedronGeometry(0.42, 0));
  stoneGeo.scale(1.2, 0.75, 1);
  stoneGeo.translate(0, 0.22, 0);

  const byKind = (k: Deco["kind"]) => decos.filter((d) => d.kind === k);
  const instanced = (geo: THREE.BufferGeometry, list: Deco[], colorOf: (d: Deco) => THREE.Color, yaw = true) => {
    const im = new THREE.InstancedMesh(geo, clay("#ffffff"), Math.max(list.length, 1));
    im.count = list.length;
    im.castShadow = true;
    im.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    list.forEach((d, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw ? (d.x * 7.1 + d.z * 3.3) % (Math.PI * 2) : 0);
      m.compose(new THREE.Vector3(d.x, d.y, d.z), q, new THREE.Vector3(d.s, d.s, d.s));
      im.setMatrixAt(i, m);
      im.setColorAt(i, colorOf(d));
    });
    scene.add(im);
    return im;
  };
  const trees = byKind("tree");
  const pines = byKind("pine");
  instanced(trunkGeo, [...trees, ...pines], () => col("#8a6a4a"));
  instanced(crownGeo, trees, (d) => d.tint);
  instanced(pineGeo, pines, (d) => d.tint.clone().multiplyScalar(0.88));
  instanced(bushGeo, byKind("bush"), (d) => d.tint);
  instanced(stoneGeo, byKind("rock"), (d) => d.tint);
  const flowerGeo = keep(mergeGeometries([
    new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4).translate(0, 0.15, 0),
    new THREE.IcosahedronGeometry(0.09, 0).translate(0, 0.32, 0),
    new THREE.CylinderGeometry(0.02, 0.02, 0.22, 4).translate(0.14, 0.11, 0.05),
    new THREE.IcosahedronGeometry(0.075, 0).translate(0.14, 0.24, 0.05),
    new THREE.CylinderGeometry(0.02, 0.02, 0.26, 4).translate(-0.1, 0.13, -0.1),
    new THREE.IcosahedronGeometry(0.08, 0).translate(-0.1, 0.28, -0.1),
  ].map((g) => (g.index ? g.toNonIndexed() : g)))!);
  instanced(flowerGeo, byKind("flower"), (d) => d.tint);

  // Lanterns every five stages, alternating sides. Their bulbs glow at night.
  const lanternSpots: THREE.Vector3[] = [];
  for (let i = 4; i < N; i += 5) {
    const s = sideAt[(i + 1) * SEG];
    const sign = i % 10 === 4 ? 1 : -1;
    lanternSpots.push(STAGE_POS[i].clone().addScaledVector(s, sign * 1.45));
  }
  const postGeo = keep(new THREE.CylinderGeometry(0.05, 0.07, 1.25, 6));
  postGeo.translate(0, 0.62, 0);
  const bulbGeo = keep(new THREE.IcosahedronGeometry(0.16, 1));
  bulbGeo.translate(0, 1.36, 0);
  const posts = new THREE.InstancedMesh(postGeo, clay("#4a4f63"), lanternSpots.length);
  const bulbMat = keep(new THREE.MeshStandardMaterial({ color: "#fff4d6", emissive: "#ffc766", emissiveIntensity: 0.35, roughness: 0.4 }));
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lanternSpots.length);
  posts.castShadow = true;
  {
    const m = new THREE.Matrix4();
    lanternSpots.forEach((p, i) => {
      m.makeTranslation(p.x, p.y, p.z);
      posts.setMatrixAt(i, m);
      bulbs.setMatrixAt(i, m);
    });
  }
  scene.add(posts, bulbs);

  // Rope bridges: posts at both rails, ropes between them.
  {
    const bpost: THREE.Matrix4[] = [];
    const ropes: THREE.Matrix4[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < N - 1; i++) {
      if (STAGES[i].level === STAGES[i + 1].level) continue;
      const steps = 6;
      const tops: THREE.Vector3[][] = [[], []];
      for (let j = 0; j <= steps; j++) {
        const f = i + 0.15 + (j / steps) * 0.55;
        const p = roadAt(f);
        const t = tanAt(f);
        const s = new THREE.Vector3(-t.z, 0, t.x).normalize();
        [-1, 1].forEach((sg, si) => {
          const base = p.clone().addScaledVector(s, sg * (ROAD_HALF + 0.05));
          bpost.push(new THREE.Matrix4().makeTranslation(base.x, base.y - 0.25, base.z));
          tops[si].push(base.clone().setY(base.y + 0.72));
        });
      }
      tops.forEach((line) => {
        for (let j = 0; j < line.length - 1; j++) {
          const a = line[j];
          const b = line[j + 1];
          const mid = a.clone().add(b).multiplyScalar(0.5);
          mid.y -= 0.06;
          const dir = b.clone().sub(a);
          const len = dir.length();
          const q = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize());
          ropes.push(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, len, 1)));
        }
      });
    }
    const bpGeo = keep(new THREE.CylinderGeometry(0.06, 0.07, 1.05, 6));
    bpGeo.translate(0, 0.5, 0);
    const ropeGeo = keep(new THREE.CylinderGeometry(0.028, 0.028, 1, 5));
    const bp = new THREE.InstancedMesh(bpGeo, clay("#7a5a3c"), bpost.length);
    const rp = new THREE.InstancedMesh(ropeGeo, clay("#d8c7a4"), ropes.length);
    bpost.forEach((m, i) => bp.setMatrixAt(i, m));
    ropes.forEach((m, i) => rp.setMatrixAt(i, m));
    bp.castShadow = true;
    scene.add(bp, rp);
  }

  // ── Clouds and stars ────────────────────────────────────────────────────
  const cloudGeo = keep(cloudGeometry());
  const cloudMat = keep(new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.45, roughness: 1, flatShading: true, transparent: true, opacity: 0.94 }));
  const CLOUDS = 46;
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, CLOUDS);
  const cloudBase: { x: number; y: number; z: number; s: number; sp: number; ph: number }[] = [];
  {
    const r = rng(99);
    const zMin = END_POS.z - 20;
    for (let i = 0; i < CLOUDS; i++) {
      const z = 8 + (zMin - 8) * (i / CLOUDS) + (r() - 0.5) * 10;
      const f = THREE.MathUtils.clamp(Math.round((-z) / (SPACING + LEVEL_GAP / 20)), 0, N - 1);
      const baseY = STAGE_POS[f].y;
      const side = i % 2 ? 1 : -1;
      cloudBase.push({
        x: side * (11 + r() * 16),
        y: baseY - 5 + r() * 9,
        z,
        s: 1 + r() * 1.4,
        sp: 0.15 + r() * 0.25,
        ph: r() * Math.PI * 2,
      });
    }
  }
  scene.add(clouds);

  const starGeo = keep(new THREE.BufferGeometry());
  {
    const r = rng(5);
    const arr = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(r() * 0.9 + 0.08);
      arr.set([Math.sin(ph) * Math.cos(th) * 160, Math.cos(ph) * 160, Math.sin(ph) * Math.sin(th) * 160], i * 3);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const dot = keep(dotTex());
  const stars = new THREE.Points(
    starGeo,
    keep(new THREE.PointsMaterial({ size: 1.1, map: dot, transparent: true, depthWrite: false, fog: false, color: "#dfe6ff" })),
  );
  scene.add(stars);

  // ── Stage coins ─────────────────────────────────────────────────────────
  const coinGeo = keep(coinGeometry());
  const coinMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.02 }));
  const coins = new THREE.InstancedMesh(coinGeo, coinMat, N);
  coins.castShadow = true;
  coins.receiveShadow = true;
  scene.add(coins);

  const iconPlane = keep(new THREE.PlaneGeometry(0.82, 0.82));
  iconPlane.rotateX(-Math.PI / 2);
  const icons = (["check", "star", "lock"] as const).map((k) => {
    const t = iconTex(k);
    keep(t.tex);
    const im = new THREE.InstancedMesh(
      iconPlane,
      keep(new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false })),
      N,
    );
    im.renderOrder = 2;
    scene.add(im);
    return im;
  });
  const [iconDone, iconCurrent, iconLocked] = icons;

  // Marker over the current stage: a map pin with a ring, plus a pulse on the road.
  const pin = new THREE.Group();
  const pinMat = keep(new THREE.MeshStandardMaterial({ color: "#4465d8", roughness: 0.3, metalness: 0.06 }));
  {
    const head = new THREE.Mesh(keep(new THREE.SphereGeometry(0.42, 28, 20)), pinMat);
    head.position.y = 0.85;
    const tip = new THREE.Mesh(keep(new THREE.ConeGeometry(0.34, 0.75, 24)), pinMat);
    tip.rotation.x = Math.PI;
    tip.position.y = 0.36;
    const ring = new THREE.Mesh(
      keep(new THREE.TorusGeometry(0.2, 0.075, 12, 28)),
      keep(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4 })),
    );
    ring.position.set(0, 0.85, 0);
    [head, tip, ring].forEach((m) => {
      m.castShadow = true;
      pin.add(m);
    });
  }
  scene.add(pin);
  const pulseMat = keep(new THREE.MeshBasicMaterial({ color: "#4465d8", transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  const pulse = new THREE.Mesh(keep(new THREE.RingGeometry(0.82, 0.98, 48)), pulseMat);
  pulse.rotation.x = -Math.PI / 2;
  scene.add(pulse);
  const pulse2 = new THREE.Mesh(pulse.geometry, pulseMat.clone());
  keep(pulse2.material as THREE.Material);
  pulse2.rotation.x = -Math.PI / 2;
  scene.add(pulse2);

  // Sparkles drifting up around the current stage.
  const SPARKS = 48;
  const sparkGeo = keep(new THREE.BufferGeometry());
  const sparkArr = new Float32Array(SPARKS * 3);
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkArr, 3));
  const sparkSeed = Array.from({ length: SPARKS }, (_, i) => {
    const r = rng(300 + i);
    return { a: r() * Math.PI * 2, r: 0.6 + r() * 1.3, sp: 0.25 + r() * 0.5, ph: r() };
  });
  const sparkMat = keep(new THREE.PointsMaterial({ size: 0.16, map: dot, transparent: true, depthWrite: false, color: "#ffd98a" }));
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  scene.add(sparks);

  // ── State ───────────────────────────────────────────────────────────────
  let states: NodeState[] = STAGES.map((_, i) => (i === 0 ? "current" : "locked"));
  let currentIdx = 0;
  let dark = opts.dark;
  let hovered: number | null = null;

  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpV = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  const ZERO = new THREE.Vector3(0, 0, 0);

  const coinScale = (i: number) => (states[i] === "current" ? 1.22 : hovered === i ? 1.12 : 1);
  const placeCoin = (i: number, lift = 0) => {
    const p = STAGE_POS[i];
    const k = coinScale(i);
    tmpV.set(p.x, p.y + ROAD_TOP + lift, p.z);
    tmpS.set(k, k, k);
    tmpQ.identity();
    tmpM.compose(tmpV, tmpQ, tmpS);
    coins.setMatrixAt(i, tmpM);
    const st = states[i];
    const iconFor = st === "done" ? iconDone : st === "current" ? iconCurrent : iconLocked;
    for (const im of icons) {
      if (im === iconFor) {
        tmpV.set(p.x, p.y + ROAD_TOP + lift + 0.385 * k, p.z);
        tmpM.compose(tmpV, tmpQ, tmpS);
      } else {
        tmpM.compose(ZERO, tmpQ, ZERO);
      }
      im.setMatrixAt(i, tmpM);
    }
  };

  const paint = () => {
    for (let i = 0; i < N; i++) {
      const lvl = STAGES[i].level;
      const st = states[i];
      let c: THREE.Color;
      if (st === "locked") c = mix(levelTop(lvl), dark ? "#2a3350" : "#efe9dc", dark ? 0.55 : 0.62);
      else c = col(levelTop(lvl));
      coins.setColorAt(i, c);
      iconLocked.setColorAt(i, dark ? col("#aab3cc") : mix(levelLip(lvl), "#9d968a", 0.55));
      iconDone.setColorAt(i, col("#ffffff"));
      iconCurrent.setColorAt(i, col("#ffffff"));
      placeCoin(i);
    }
    coins.instanceColor!.needsUpdate = true;
    icons.forEach((im) => {
      im.instanceColor!.needsUpdate = true;
      im.instanceMatrix.needsUpdate = true;
    });
    coins.instanceMatrix.needsUpdate = true;

    // Road: the trail is lit in each level's colour up to where you stand.
    const pending = col(dark ? ROAD_PENDING.dark : ROAD_PENDING.light);
    const pendingWall = pending.clone().multiplyScalar(0.8);
    for (let k = 0; k < M; k++) {
      const [a, b] = segStages(k);
      let top: THREE.Color;
      let wall: THREE.Color;
      if (isBridge(a, b)) {
        const plank = Math.floor(k / 2) % 2 ? WOOD_A : WOOD_B;
        const lit = states[a] === "done";
        top = lit ? mix(plank, levelTop(STAGES[b].level), 0.1) : col(plank);
        wall = col("#6f5236");
      } else {
        const lit = a < 0 || (a < N && states[a] === "done");
        const lvl = b < N ? STAGES[Math.max(b, 0)].level : 15;
        if (lit) {
          top = mix(levelTop(lvl), dark ? "#1b2238" : "#ffffff", dark ? 0.2 : 0.42);
          wall = col(levelLip(lvl));
        } else {
          top = pending;
          wall = pendingWall;
        }
      }
      for (let j = 0; j < 6; j++) {
        const cc = j < 2 ? top : j === 3 || j === 5 ? wall.clone().multiplyScalar(0.8) : wall;
        roadCol.set([cc.r, cc.g, cc.b], (k * 6 + j) * 3);
      }
    }
    (roadGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    const cur = col(levelTop(STAGES[currentIdx].level));
    pinMat.color.copy(cur);
    pulseMat.color.copy(cur);
    (pulse2.material as THREE.MeshBasicMaterial).color.copy(cur);
    sparkMat.color.copy(mix(cur, "#ffe7a8", 0.5));
  };

  const applyTheme = () => {
    if (dark) {
      fog.color.set("#0f172b");
      hemi.color.set("#93a6e6");
      hemi.groundColor.set("#1a2238");
      hemi.intensity = 1.25;
      sun.color.set("#c3cfff");
      sun.intensity = 1.55;
      renderer.toneMappingExposure = 1.2;
      cloudMat.color.set("#2c3654");
      cloudMat.emissive.set("#0e1528");
      cloudMat.opacity = 0.72;
      bulbMat.emissiveIntensity = 2.4;
      stars.visible = true;
      glow.color.set("#ffd48a");
    } else {
      fog.color.set("#eef0f2");
      hemi.color.set("#fff6e6");
      hemi.groundColor.set("#b8b09d");
      hemi.intensity = 1.15;
      sun.color.set("#fff1dc");
      sun.intensity = 2.1;
      renderer.toneMappingExposure = 1.05;
      cloudMat.color.set("#ffffff");
      cloudMat.emissive.set("#ffffff");
      cloudMat.opacity = 0.94;
      bulbMat.emissiveIntensity = 0.35;
      stars.visible = false;
      glow.color.set("#ffe2a8");
    }
    paint();
  };

  // Fonts: banners were drawn with whatever was available; redraw once the
  // display face is in so the gate names match the rest of the page.
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load("700 88px Sora"), document.fonts.load("700 44px Sora")])
      .then(() => bannerTexes.forEach((b) => b.redraw()))
      .catch(() => {});
  }

  // ── Camera rig and input ────────────────────────────────────────────────
  const maxF = N; // N == campus
  const minF = -1.2;
  let focus = THREE.MathUtils.clamp(opts.initialFocus - (opts.reducedMotion ? 0 : 14), minF, maxF);
  let targetF = THREE.MathUtils.clamp(opts.initialFocus, minF, maxF);
  let yaw = 0;
  let yawTarget = 0;
  let zoom = small ? 1.12 : 1;
  let zoomTarget = zoom;
  let intro = opts.reducedMotion ? 1 : 0;
  const dirSm = new THREE.Vector3(0, 0, -1);
  const lookSm = new THREE.Vector3();
  const camSm = new THREE.Vector3();
  let first = true;
  let lastFocusEmit = -999;
  let parX = 0;
  let parY = 0;

  const interact = () => cb.onInteract();

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    if (e.ctrlKey) {
      zoomTarget = THREE.MathUtils.clamp(zoomTarget * (1 + e.deltaY * unit * 0.004), 0.6, 1.7);
    } else {
      targetF = THREE.MathUtils.clamp(targetF - (e.deltaY * unit) * 0.011 - (e.deltaX * unit) * 0.002, minF, maxF);
    }
    interact();
  };

  let dragging = false;
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let lastY = 0;
  let moved = 0;
  let vel = 0;
  let lastMoveT = 0;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;

  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();

  const pick = (cx: number, cy: number): number | null => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(coins, false)[0];
    return hit && hit.instanceId !== undefined ? hit.instanceId : null;
  };

  const setHover = (i: number | null) => {
    if (i === hovered) return;
    const prev = hovered;
    hovered = i;
    if (prev !== null) placeCoin(prev);
    if (i !== null) placeCoin(i);
    coins.instanceMatrix.needsUpdate = true;
    icons.forEach((im) => (im.instanceMatrix.needsUpdate = true));
    canvas.style.cursor = i !== null ? (states[i] === "locked" ? "not-allowed" : "pointer") : dragging ? "grabbing" : "grab";
    cb.onHover(i);
  };

  const onDown = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
    dragging = true;
    downX = lastX = e.clientX;
    downY = lastY = e.clientY;
    moved = 0;
    vel = 0;
    lastMoveT = performance.now();
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    parX = ((e.clientX - r.left) / r.width - 0.5) * 2;
    parY = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!dragging) {
      if (e.pointerType === "mouse") setHover(pick(e.clientX, e.clientY));
      return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) zoomTarget = THREE.MathUtils.clamp(zoomTarget * (pinchDist / d), 0.6, 1.7);
      pinchDist = d;
      moved += 10;
      return;
    }
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    const h = r.height || 600;
    // Drag the world toward you: pulling down walks forward.
    const df = (dy / h) * 16;
    targetF = THREE.MathUtils.clamp(targetF + df, minF, maxF);
    yawTarget = THREE.MathUtils.clamp(yawTarget - (dx / (r.width || 800)) * 1.6, -0.75, 0.75);
    const now = performance.now();
    const dt = Math.max(now - lastMoveT, 1);
    vel = THREE.MathUtils.lerp(vel, (df / dt) * 16, 0.5);
    lastMoveT = now;
    if (moved > 6) {
      setHover(null);
      interact();
    }
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size > 0) return;
    pinchDist = 0;
    dragging = false;
    canvas.style.cursor = hovered !== null ? "pointer" : "grab";
    if (moved <= 6 && Math.hypot(e.clientX - downX, e.clientY - downY) <= 6) {
      const i = pick(e.clientX, e.clientY);
      if (i !== null) cb.onSelect(i);
    } else if (performance.now() - lastMoveT < 80) {
      targetF = THREE.MathUtils.clamp(targetF + vel * 6, minF, maxF);
    }
  };
  const onLeave = () => {
    if (!dragging) setHover(null);
    parX = parY = 0;
  };

  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.style.cursor = "grab";

  // ── Size, visibility, loop ──────────────────────────────────────────────
  const resize = () => {
    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Portrait screens need a wider lens or the road leaves the frame on
    // every bend.
    camera.fov = w / h < 0.8 ? 54 : w / h < 1.2 ? 46 : 40;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  ro?.observe(mount);
  window.addEventListener("resize", resize);

  let visible = true;
  const io =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((ents) => {
          visible = ents.some((e) => e.isIntersecting);
        })
      : null;
  io?.observe(mount);

  const clock = new THREE.Clock();
  let raf = 0;
  let elapsed = 0;
  const proj = new THREE.Vector3();

  const place = (el: HTMLElement | null, world: THREE.Vector3, w: number, h: number) => {
    if (!el) return;
    proj.copy(world).project(camera);
    const on = proj.z < 1 && Math.abs(proj.x) < 1.15 && Math.abs(proj.y) < 1.15;
    const x = (proj.x * 0.5 + 0.5) * w;
    const y = (-proj.y * 0.5 + 0.5) * h;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    el.style.opacity = on ? "1" : "0";
  };

  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    elapsed += dt;
    const rm = opts.reducedMotion;

    // Rig.
    const k = 1 - Math.exp(-dt * (rm ? 12 : 4.2));
    if (!dragging && !rm) yawTarget *= 1 - Math.min(dt * 0.35, 1);
    focus += (targetF - focus) * k;
    yaw += (yawTarget - yaw) * k;
    zoom += (zoomTarget - zoom) * k;
    if (intro < 1) intro = Math.min(1, intro + dt / 2.4);
    const ease = 1 - Math.pow(1 - intro, 3);

    const tgt = roadAt(focus);
    const ahead = roadAt(Math.min(focus + 7, maxF));
    const behind = roadAt(Math.max(focus - 4, minF));
    const d = ahead.sub(behind);
    d.y = 0;
    if (d.lengthSq() < 1e-4) d.set(0, 0, -1);
    d.normalize();
    dirSm.lerp(d, 1 - Math.exp(-dt * 2.2)).normalize();

    const back = dirSm.clone().multiplyScalar(-1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw + parX * 0.04);
    const dist = (10.5 + (1 - ease) * 14) * zoom;
    const lift = (5.4 + (1 - ease) * 20) * zoom + parY * 0.25;
    const camPos = tgt.clone().addScaledVector(back, dist);
    camPos.y += lift;
    const look = tgt.clone().addScaledVector(dirSm, 6.5 * zoom);
    look.y += 0.9;
    if (first) {
      camSm.copy(camPos);
      lookSm.copy(look);
      first = false;
    } else {
      const kc = 1 - Math.exp(-dt * 7);
      camSm.lerp(camPos, kc);
      lookSm.lerp(look, kc);
    }
    camera.position.copy(camSm);
    camera.lookAt(lookSm);

    // Light follows the camera target so the shadow map covers what's seen.
    sun.position.set(tgt.x - 9, tgt.y + 22, tgt.z + 10);
    sun.target.position.set(tgt.x, tgt.y, tgt.z - 6);
    stars.position.copy(camera.position);

    const rounded = Math.round(THREE.MathUtils.clamp(focus, 0, N - 1));
    if (rounded !== lastFocusEmit) {
      lastFocusEmit = rounded;
      cb.onFocusChange(rounded);
    }

    // Current stage: bob the coin, float the pin, pulse the ring.
    const cp = STAGE_POS[currentIdx];
    const bob = rm ? 0 : Math.sin(elapsed * 2.4) * 0.05 + 0.05;
    placeCoin(currentIdx, bob);
    coins.instanceMatrix.needsUpdate = true;
    icons.forEach((im) => (im.instanceMatrix.needsUpdate = true));
    pin.position.set(cp.x, cp.y + 1.05 + (rm ? 0.1 : Math.sin(elapsed * 2) * 0.14 + 0.14), cp.z);
    pin.rotation.y = rm ? 0 : elapsed * 1.1;
    const ph1 = (elapsed * 0.6) % 1;
    const ph2 = (elapsed * 0.6 + 0.5) % 1;
    pulse.position.set(cp.x, cp.y + ROAD_TOP + 0.02, cp.z);
    pulse2.position.copy(pulse.position);
    pulse.scale.setScalar(1 + ph1 * 1.6);
    pulse2.scale.setScalar(1 + ph2 * 1.6);
    pulseMat.opacity = rm ? 0.35 : 0.55 * (1 - ph1);
    (pulse2.material as THREE.MeshBasicMaterial).opacity = rm ? 0 : 0.55 * (1 - ph2);
    glow.position.set(cp.x, cp.y + 1.6, cp.z + 0.4);
    glow.intensity = dark ? 7 : 2.5;

    for (let i = 0; i < SPARKS; i++) {
      const s = sparkSeed[i];
      const tt = (s.ph + elapsed * s.sp * (rm ? 0 : 1)) % 1;
      const a = s.a + elapsed * 0.3;
      sparkArr[i * 3] = cp.x + Math.cos(a) * s.r;
      sparkArr[i * 3 + 1] = cp.y + 0.2 + tt * 2.4;
      sparkArr[i * 3 + 2] = cp.z + Math.sin(a) * s.r;
    }
    (sparkGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    sparkMat.opacity = 0.9;

    if (!rm) {
      spinners.forEach((o) => (o.rotation.y = elapsed * 1.2));
      wavers.forEach((o, i) => (o.rotation.y = Math.sin(elapsed * 3 + i) * 0.25));
    }

    // Clouds drift.
    for (let i = 0; i < CLOUDS; i++) {
      const c = cloudBase[i];
      const x = c.x + (rm ? 0 : Math.sin(elapsed * c.sp * 0.25 + c.ph) * 2.2);
      tmpM.compose(tmpV.set(x, c.y, c.z), tmpQ.identity(), tmpS.set(c.s, c.s, c.s));
      clouds.setMatrixAt(i, tmpM);
    }
    clouds.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);

    const w = mount.clientWidth;
    const h = mount.clientHeight;
    const anchors = getAnchors();
    place(anchors.here, tmpV.set(cp.x, pin.position.y + 1.45, cp.z), w, h);
    if (hovered !== null) {
      const hp = STAGE_POS[hovered];
      place(anchors.tip, tmpV.set(hp.x, hp.y + 0.9, hp.z), w, h);
    }
  };

  applyTheme();
  raf = requestAnimationFrame(frame);

  return {
    setStates(next) {
      states = next.slice(0, N);
      while (states.length < N) states.push("locked");
      const c = states.indexOf("current");
      currentIdx = c >= 0 ? c : Math.max(0, states.lastIndexOf("done"));
      paint();
    },
    flyTo(i) {
      targetF = THREE.MathUtils.clamp(i, minF, maxF);
      yawTarget = 0;
    },
    nudge(delta) {
      targetF = THREE.MathUtils.clamp(Math.round(targetF) + delta, minF, maxF);
      interact();
    },
    setDark(v) {
      if (v === dark) return;
      dark = v;
      applyTheme();
    },
    getFocus: () => focus,
    dispose() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
      ro?.disconnect();
      io?.disconnect();
      disposables.forEach((d) => {
        try {
          d.dispose();
        } catch {
          /* already gone */
        }
      });
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };

  // ── Builders (hoisted) ──────────────────────────────────────────────────

  function buildLandmark(level: LevelId, top: string, lip: string): THREE.Group {
    const g = new THREE.Group();
    const add = (geo: THREE.BufferGeometry, hex: string | THREE.Color, x: number, y: number, z: number, extra?: Partial<THREE.MeshStandardMaterialParameters>) => {
      const m = mesh(geo, hex, extra);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    add(new THREE.CylinderGeometry(1.05, 1.2, 0.3, 10), "#" + mix(lip, "#e8e1d2", 0.55).getHexString(), 0, 0.15, 0);
    const cream = "#f4efe4";
    const gold = "#e0b64a";
    switch (level) {
      case 1: {
        // Stack of books.
        const cols = [top, "#e8a15a", lip, "#f0d58c"];
        cols.forEach((c, i) => {
          const b = add(new THREE.BoxGeometry(1.25 - i * 0.08, 0.26, 0.85 - i * 0.04), c, 0, 0.43 + i * 0.27, 0);
          b.rotation.y = (i % 2 ? 0.22 : -0.14) * (i + 1) * 0.6;
          const pages = add(new THREE.BoxGeometry(1.17 - i * 0.08, 0.2, 0.06), cream, 0, 0.43 + i * 0.27, 0.42 - i * 0.02);
          pages.rotation.y = b.rotation.y;
        });
        const apple = add(new THREE.IcosahedronGeometry(0.2, 1), "#e0574a", 0.15, 1.62, 0);
        void apple;
        break;
      }
      case 2: {
        // Telescope on a tripod.
        for (let i = 0; i < 3; i++) {
          const leg = add(new THREE.CylinderGeometry(0.04, 0.05, 1.5, 6), "#6b4f37", 0, 0.95, 0);
          const a = (i / 3) * Math.PI * 2;
          leg.position.set(Math.cos(a) * 0.3, 0.95, Math.sin(a) * 0.3);
          leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
        }
        const tube = add(new THREE.CylinderGeometry(0.14, 0.22, 1.5, 14), top, 0, 1.85, 0, { flatShading: false, roughness: 0.4, metalness: 0.2 });
        tube.rotation.set(-0.7, 0, 0.35);
        const lens = add(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 14), gold, 0, 0, 0, { flatShading: false, metalness: 0.4, roughness: 0.3 });
        lens.position.set(0.25, 2.35, -0.5);
        lens.rotation.copy(tube.rotation);
        break;
      }
      case 3: {
        // Stacked building blocks.
        const blocks: [number, number, number, string][] = [
          [-0.4, 0.55, 0, top], [0.4, 0.55, 0, "#e8a15a"], [0, 0.55, 0.45, lip],
          [-0.2, 1.05, 0.1, "#f0d58c"], [0.25, 1.05, 0.15, top], [0, 1.55, 0.1, "#e0574a"],
        ];
        blocks.forEach(([x, y, z, c], i) => {
          const b = add(new THREE.BoxGeometry(0.5, 0.5, 0.5), c, x, y, z, { flatShading: true });
          b.rotation.y = i * 0.3;
        });
        break;
      }
      case 4: {
        // A crystal spike: the thing you are known for.
        const main = add(new THREE.OctahedronGeometry(0.55, 0), top, 0, 1.55, 0, { roughness: 0.25, metalness: 0.1 });
        main.scale.set(0.75, 2.2, 0.75);
        const s1 = add(new THREE.OctahedronGeometry(0.3, 0), lip, 0.55, 0.75, 0.1, { roughness: 0.3 });
        s1.scale.set(0.7, 1.7, 0.7);
        s1.rotation.z = -0.35;
        const s2 = add(new THREE.OctahedronGeometry(0.26, 0), mix(top, "#ffffff", 0.35), -0.5, 0.65, -0.1, { roughness: 0.3 });
        s2.scale.set(0.7, 1.5, 0.7);
        s2.rotation.z = 0.4;
        break;
      }
      case 5: {
        // Podium with a star.
        add(new THREE.BoxGeometry(0.7, 1.0, 0.7), top, 0, 0.8, 0);
        add(new THREE.BoxGeometry(0.62, 0.7, 0.66), lip, -0.66, 0.65, 0);
        add(new THREE.BoxGeometry(0.62, 0.5, 0.66), mix(top, cream, 0.4), 0.66, 0.55, 0);
        const star = add(starGeometry(0.42, 0.18, 0.16), gold, 0, 1.75, 0, { metalness: 0.35, roughness: 0.35 });
        star.userData.spin = true;
        break;
      }
      case 6: {
        // Lighthouse: the local expert people steer by.
        add(new THREE.CylinderGeometry(0.32, 0.46, 1.8, 12), cream, 0, 1.2, 0);
        add(new THREE.CylinderGeometry(0.33, 0.4, 0.3, 12), top, 0, 0.75, 0);
        add(new THREE.CylinderGeometry(0.3, 0.33, 0.3, 12), top, 0, 1.55, 0);
        add(new THREE.CylinderGeometry(0.28, 0.28, 0.35, 12), "#fff4c8", 0, 2.28, 0, { emissive: "#ffcf5a", emissiveIntensity: 0.6 });
        add(new THREE.ConeGeometry(0.38, 0.45, 12), lip, 0, 2.68, 0);
        break;
      }
      case 7: {
        // Rocket.
        add(new THREE.CylinderGeometry(0.3, 0.34, 1.3, 14), cream, 0, 1.15, 0, { flatShading: false, roughness: 0.5 });
        add(new THREE.ConeGeometry(0.3, 0.6, 14), top, 0, 2.1, 0, { flatShading: false });
        add(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 14), "#9fd3ff", 0, 1.45, 0.29, { emissive: "#5fb7ff", emissiveIntensity: 0.3 }).rotation.x = Math.PI / 2;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const fin = add(new THREE.BoxGeometry(0.06, 0.5, 0.36), lip, Math.cos(a) * 0.34, 0.7, Math.sin(a) * 0.34);
          fin.rotation.y = -a;
        }
        add(new THREE.ConeGeometry(0.2, 0.35, 10), "#ffb347", 0, 0.38, 0, { emissive: "#ff8a1f", emissiveIntensity: 0.5 }).rotation.x = Math.PI;
        break;
      }
      case 8: {
        // Lectern with a microphone.
        add(new THREE.BoxGeometry(0.8, 1.1, 0.55), lip, 0, 0.85, 0);
        const slope = add(new THREE.BoxGeometry(0.95, 0.08, 0.7), top, 0, 1.45, 0.05);
        slope.rotation.x = 0.3;
        add(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), "#3d3f4f", 0.25, 1.7, -0.1);
        add(new THREE.SphereGeometry(0.08, 10, 8), "#3d3f4f", 0.25, 1.98, -0.1);
        add(new THREE.BoxGeometry(0.6, 0.02, 0.42), cream, -0.05, 1.5, 0.08).rotation.x = 0.3;
        break;
      }
      case 9: {
        // Obelisk.
        add(new THREE.BoxGeometry(0.9, 0.3, 0.9), mix(top, cream, 0.5), 0, 0.45, 0);
        const ob = add(new THREE.CylinderGeometry(0.2, 0.34, 2.2, 4), top, 0, 1.7, 0);
        ob.rotation.y = Math.PI / 4;
        const tip = add(new THREE.ConeGeometry(0.22, 0.35, 4), gold, 0, 2.97, 0, { metalness: 0.4 });
        tip.rotation.y = Math.PI / 4;
        break;
      }
      case 10: {
        // Summit with a flag.
        add(new THREE.ConeGeometry(1.0, 1.9, 7), mix(top, "#8b7f6e", 0.4), 0, 1.25, 0);
        add(new THREE.ConeGeometry(0.42, 0.62, 7), "#ffffff", 0, 1.95, 0);
        add(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), "#5b5b66", 0, 2.55, 0);
        const flag = add(new THREE.BoxGeometry(0.42, 0.26, 0.02), top, 0.21, 2.8, 0);
        flag.userData.wave = true;
        break;
      }
      case 11: {
        // Two speech bubbles: the interview.
        const b1 = add(new THREE.SphereGeometry(0.5, 16, 12), cream, -0.25, 1.35, 0, { flatShading: false });
        b1.scale.set(1.2, 0.8, 0.45);
        add(new THREE.ConeGeometry(0.14, 0.35, 8), cream, -0.55, 0.9, 0).rotation.z = 0.6;
        const b2 = add(new THREE.SphereGeometry(0.38, 16, 12), top, 0.45, 0.85, 0.1, { flatShading: false });
        b2.scale.set(1.2, 0.8, 0.45);
        [-0.18, 0, 0.18].forEach((x) => add(new THREE.SphereGeometry(0.06, 8, 6), lip, -0.25 + x * 1.5, 1.35, 0.24));
        break;
      }
      case 12: {
        // The acceptance letter.
        const env = add(new THREE.BoxGeometry(1.3, 0.85, 0.08), cream, 0, 1.05, 0);
        env.rotation.x = -0.15;
        const flap = add(new THREE.ConeGeometry(0.75, 0.5, 4), mix(cream, lip, 0.12), 0, 1.3, 0.06);
        flap.rotation.set(Math.PI, Math.PI / 4, 0);
        flap.scale.set(1.2, 0.8, 0.12);
        add(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16), "#d0473f", 0, 1.08, 0.08, { flatShading: false }).rotation.x = Math.PI / 2 - 0.15;
        break;
      }
      case 13: {
        // Diploma scroll with a ribbon.
        const sc = add(new THREE.CylinderGeometry(0.2, 0.2, 1.4, 16), cream, 0, 0.95, 0, { flatShading: false });
        sc.rotation.z = Math.PI / 2;
        const rb = add(new THREE.TorusGeometry(0.22, 0.05, 8, 20), top, 0, 0.95, 0);
        rb.rotation.y = Math.PI / 2;
        add(new THREE.BoxGeometry(0.08, 0.35, 0.03), top, 0.05, 0.68, 0.2).rotation.z = 0.3;
        break;
      }
      case 14: {
        // Suitcase.
        add(new THREE.BoxGeometry(1.1, 0.8, 0.42), top, 0, 0.72, 0);
        add(new THREE.BoxGeometry(1.12, 0.1, 0.44), lip, 0, 0.72, 0);
        const handle = add(new THREE.TorusGeometry(0.18, 0.04, 8, 16, Math.PI), "#3d3f4f", 0, 1.12, 0);
        void handle;
        add(new THREE.BoxGeometry(0.2, 0.2, 0.02), "#f0d58c", 0.3, 0.9, 0.22);
        break;
      }
      case 15: {
        // Graduation cap.
        add(new THREE.CylinderGeometry(0.4, 0.44, 0.35, 16), "#2e3140", 0, 0.8, 0, { flatShading: false });
        const board = add(new THREE.BoxGeometry(1.2, 0.07, 1.2), "#2e3140", 0, 1.0, 0);
        board.rotation.y = Math.PI / 4;
        add(new THREE.SphereGeometry(0.06, 8, 6), gold, 0, 1.06, 0);
        add(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), gold, 0.42, 0.8, 0.0);
        add(new THREE.ConeGeometry(0.05, 0.14, 6), gold, 0.42, 0.52, 0).rotation.x = Math.PI;
        break;
      }
    }
    return g;
  }

  function starGeometry(outer: number, inner: number, depth: number) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? inner : outer;
      const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
    g.center();
    return g;
  }

  function buildCampus(): THREE.Group {
    const g = new THREE.Group();
    const stone = "#f1ebdf";
    const roof = "#4465d8";
    const add = (geo: THREE.BufferGeometry, hex: string | THREE.Color, x: number, y: number, z: number, extra?: Partial<THREE.MeshStandardMaterialParameters>) => {
      const m = mesh(geo, hex, extra);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    // Steps.
    for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(6 - i * 0.4, 0.2, 1.1 - i * 0.2), "#e2dac9", 0, 0.1 + i * 0.2, -0.3 - i * 0.35);
    // Main hall.
    add(new THREE.BoxGeometry(6.2, 2.9, 3.4), stone, 0, 2.05, -3.2);
    // Wings.
    add(new THREE.BoxGeometry(2.6, 2.2, 2.8), "#ebe4d6", -4.1, 1.7, -3.5);
    add(new THREE.BoxGeometry(2.6, 2.2, 2.8), "#ebe4d6", 4.1, 1.7, -3.5);
    add(new THREE.BoxGeometry(2.8, 0.25, 3.0), roof, -4.1, 2.9, -3.5);
    add(new THREE.BoxGeometry(2.8, 0.25, 3.0), roof, 4.1, 2.9, -3.5);
    // Windows on the wings.
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        add(new THREE.BoxGeometry(0.42, 0.7, 0.05), "#9db4e8", sx * (3.3 + i * 0.8), 1.8, -2.08, { emissive: "#ffd98a", emissiveIntensity: 0.08 });
      }
    }
    // Portico: columns, entablature, pediment.
    for (let i = 0; i < 6; i++) {
      add(new THREE.CylinderGeometry(0.17, 0.2, 2.5, 12), "#fbf8f1", -2.5 + i, 1.85, -1.25, { flatShading: false });
    }
    add(new THREE.BoxGeometry(6.2, 0.35, 0.9), "#e9e2d3", 0, 3.25, -1.35);
    const ped = add(new THREE.CylinderGeometry(1, 1, 1, 3), "#f6f1e6", 0, 3.95, -1.5);
    ped.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    ped.scale.set(1.1, 0.8, 3.6);
    // Drum and dome.
    add(new THREE.CylinderGeometry(1.25, 1.35, 0.9, 20), stone, 0, 3.95, -3.4, { flatShading: false });
    add(new THREE.SphereGeometry(1.3, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), roof, 0, 4.4, -3.4, { flatShading: false, roughness: 0.45, metalness: 0.1 });
    add(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), "#5b5b66", 0, 6.3, -3.4);
    const flag = add(new THREE.BoxGeometry(0.8, 0.46, 0.03), "#e0b64a", 0.4, 6.75, -3.4);
    flag.userData.wave = true;
    // Banner over the door.
    const t = bannerTex("The destination", "Your dream college", "#29439c");
    bannerTexes.push(t);
    keep(t.tex);
    const b = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(3.4, 0.85)),
      keep(new THREE.MeshBasicMaterial({ map: t.tex, transparent: true })),
    );
    b.position.set(0, 2.55, -0.72);
    g.add(b);
    // Trees along the lawn.
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const trunk = add(new THREE.CylinderGeometry(0.1, 0.13, 0.7, 6), "#8a6a4a", sx * (3.6 + i * 1.1), 0.35, 1.2 + (i % 2) * 0.9);
        void trunk;
        add(new THREE.IcosahedronGeometry(0.6, 0), "#6fae7e", sx * (3.6 + i * 1.1), 1.15, 1.2 + (i % 2) * 0.9);
      }
    }
    return g;
  }
}
