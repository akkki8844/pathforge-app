import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * The campus at the end of the road: a Georgian college hall in red brick
 * and limestone. A giant-order portico carries a pediment, a clock tower
 * rises through the slate roof to a copper dome, and the quad in front has a
 * fountain, lamps, benches and a wrought-iron gate that carries the banner.
 *
 * Parts are merged per material, so the whole campus costs about twenty draw
 * calls. Brick, stone, slate and paving are canvas textures mapped in campus
 * space, so courses line up across every wall.
 *
 * Local space: y = 0 is the island's turf, +z faces the arriving road.
 */

export interface CampusKit {
  keep: <T extends { dispose: () => void }>(x: T) => T;
  renderer: THREE.WebGLRenderer;
  /** Texture for the banner over the gate. */
  banner: THREE.Texture;
}

export interface Campus {
  group: THREE.Group;
  /** Local box around the grounds, for picking. */
  bounds: THREE.Box3;
  /** Local point the camera frames: the middle of the facade. */
  focus: THREE.Vector3;
  setNight: (dark: boolean) => void;
  update: (elapsed: number, reducedMotion: boolean) => void;
}

// -- Textures -------------------------------------------------------------

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

function paint(size: number, draw: (ctx: CanvasRenderingContext2D, r: () => number) => void, seed: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, rng(seed));
  return c;
}

function speckle(ctx: CanvasRenderingContext2D, r: () => number, x: number, y: number, w: number, h: number, n: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const v = r() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    ctx.fillRect(x + r() * w, y + r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

/** Running-bond brick: `map` in colour, `bump` with sunken mortar. */
function brickCanvases() {
  const S = 512;
  const rows = 16;
  const perRow = 6;
  const bh = S / rows;
  const bw = S / perRow;
  const m = 3;
  const bricks: { x: number; y: number; l: number; h: number; s: number }[] = [];
  const r0 = rng(21);
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let k = -1; k < perRow; k++) {
      const burnt = r0() < 0.08;
      bricks.push({
        x: k * bw + off,
        y: row * bh,
        l: burnt ? 22 + r0() * 6 : 32 + r0() * 12,
        h: 10 + r0() * 8,
        s: 44 + r0() * 14,
      });
    }
  }
  const map = paint(S, (ctx, r) => {
    ctx.fillStyle = "#c2b7a6";
    ctx.fillRect(0, 0, S, S);
    speckle(ctx, r, 0, 0, S, S, 3000, 0.25);
    for (const b of bricks) {
      ctx.fillStyle = `hsl(${b.h}, ${b.s}%, ${b.l}%)`;
      ctx.fillRect(b.x + m / 2, b.y + m / 2, bw - m, bh - m);
      // A lighter top edge and a darker bottom one give each brick some body.
      ctx.fillStyle = "rgba(255,230,210,0.12)";
      ctx.fillRect(b.x + m / 2, b.y + m / 2, bw - m, 2);
      ctx.fillStyle = "rgba(40,10,0,0.18)";
      ctx.fillRect(b.x + m / 2, b.y + bh - m / 2 - 2, bw - m, 2);
      speckle(ctx, r, b.x + m / 2, b.y + m / 2, bw - m, bh - m, 60, 0.22);
    }
  }, 22);
  const bump = paint(S, (ctx, r) => {
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, S, S);
    for (const b of bricks) {
      ctx.fillStyle = "#d8d8d8";
      ctx.fillRect(b.x + m / 2, b.y + m / 2, bw - m, bh - m);
      speckle(ctx, r, b.x + m / 2, b.y + m / 2, bw - m, bh - m, 50, 0.35);
    }
  }, 23);
  return { map, bump };
}

/** Limestone ashlar: big pale blocks with fine joints. */
function stoneCanvases() {
  const S = 512;
  const rows = 4;
  const perRow = 2;
  const bh = S / rows;
  const bw = S / perRow;
  const blocks: { x: number; y: number; l: number }[] = [];
  const r0 = rng(31);
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let k = -1; k < perRow; k++) blocks.push({ x: k * bw + off, y: row * bh, l: 86 + r0() * 5 });
  }
  const map = paint(S, (ctx, r) => {
    ctx.fillStyle = "#b9b1a2";
    ctx.fillRect(0, 0, S, S);
    for (const b of blocks) {
      ctx.fillStyle = `hsl(40, 22%, ${b.l}%)`;
      ctx.fillRect(b.x + 1.5, b.y + 1.5, bw - 3, bh - 3);
      speckle(ctx, r, b.x, b.y, bw, bh, 700, 0.12);
    }
  }, 32);
  const bump = paint(S, (ctx, r) => {
    ctx.fillStyle = "#555";
    ctx.fillRect(0, 0, S, S);
    for (const b of blocks) {
      ctx.fillStyle = "#cfcfcf";
      ctx.fillRect(b.x + 1.5, b.y + 1.5, bw - 3, bh - 3);
      speckle(ctx, r, b.x, b.y, bw, bh, 500, 0.3);
    }
  }, 33);
  return { map, bump };
}

/** Slate: staggered rows of shingles with a shadowed lower edge. */
function slateCanvases() {
  const S = 256;
  const rows = 8;
  const per = 8;
  const rh = S / rows;
  const sw = S / per;
  const r0 = rng(41);
  const tiles: { x: number; y: number; l: number }[] = [];
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? sw / 2 : 0;
    for (let k = -1; k < per; k++) tiles.push({ x: k * sw + off, y: row * rh, l: 27 + r0() * 9 });
  }
  const map = paint(S, (ctx, r) => {
    for (const t of tiles) {
      ctx.fillStyle = `hsl(215, 14%, ${t.l}%)`;
      ctx.fillRect(t.x, t.y, sw, rh);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(t.x, t.y + rh - 3, sw, 3);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(t.x, t.y, 1.5, rh);
      speckle(ctx, r, t.x, t.y, sw, rh, 30, 0.15);
    }
  }, 42);
  const bump = paint(S, (ctx) => {
    for (const t of tiles) {
      const g = ctx.createLinearGradient(0, t.y, 0, t.y + rh);
      g.addColorStop(0, "#555");
      g.addColorStop(0.9, "#ddd");
      g.addColorStop(1, "#222");
      ctx.fillStyle = g;
      ctx.fillRect(t.x, t.y, sw, rh);
      ctx.fillStyle = "#222";
      ctx.fillRect(t.x, t.y, 1.5, rh);
    }
  }, 43);
  return { map, bump };
}

function pavingCanvas() {
  return paint(256, (ctx, r) => {
    ctx.fillStyle = "#a9a293";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.fillStyle = `hsl(38, 14%, ${76 + r() * 8}%)`;
        ctx.fillRect(x * 64 + 1.5, y * 64 + 1.5, 61, 61);
      }
    }
    speckle(ctx, r, 0, 0, 256, 256, 1500, 0.12);
  }, 51);
}

function lawnCanvas() {
  return paint(256, (ctx, r) => {
    ctx.fillStyle = "#7aa85c";
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = "#8ab86a";
    ctx.fillRect(128, 0, 128, 256);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = r() < 0.5 ? "rgba(40,80,20,0.25)" : "rgba(200,230,150,0.2)";
      ctx.fillRect(r() * 256, r() * 256, 1, 2 + r() * 3);
    }
  }, 61);
}

function clockCanvas() {
  return paint(256, (ctx) => {
    const c = 128;
    ctx.fillStyle = "#1f2a44";
    ctx.beginPath();
    ctx.arc(c, c, 126, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f6f0e0";
    ctx.beginPath();
    ctx.arc(c, c, 112, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1f2a44";
    ctx.lineCap = "round";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      ctx.lineWidth = major ? 7 : 2.5;
      const r1 = major ? 84 : 96;
      ctx.beginPath();
      ctx.moveTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1);
      ctx.lineTo(c + Math.sin(a) * 104, c - Math.cos(a) * 104);
      ctx.stroke();
    }
    // Ten past ten, the way clock makers photograph them.
    const hand = (a: number, len: number, w: number) => {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(c - Math.sin(a) * 14, c + Math.cos(a) * 14);
      ctx.lineTo(c + Math.sin(a) * len, c - Math.cos(a) * len);
      ctx.stroke();
    };
    hand(((10 + 10 / 60) / 12) * Math.PI * 2, 56, 10);
    hand((10 / 60) * Math.PI * 2, 84, 6);
    ctx.fillStyle = "#b8923a";
    ctx.beginPath();
    ctx.arc(c, c, 9, 0, Math.PI * 2);
    ctx.fill();
  }, 71);
}

// -- Geometry helpers -----------------------------------------------------

/**
 * Planar UVs in campus space from each face's dominant axis. `roof` keeps
 * shingle rows horizontal on every slope.
 */
function mapUV(geo: THREE.BufferGeometry, scale: number, mode: "box" | "roof" = "box") {
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    const az = Math.abs(n.getZ(i));
    let u: number;
    let v: number;
    if (mode === "roof") {
      u = ax > az ? z : x;
      v = y * 1.7;
    } else if (ay >= ax && ay >= az) {
      u = x;
      v = z;
    } else if (ax >= az) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u / scale;
    uv[i * 2 + 1] = v / scale;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/** A hipped roof over a w x d footprint, ridge along x, base at y = 0. */
function hipRoof(w: number, d: number, h: number) {
  const hw = w / 2;
  const hd = d / 2;
  const rx = Math.max(hw - hd, 0);
  const A = [-hw, 0, hd];
  const B = [hw, 0, hd];
  const C = [hw, 0, -hd];
  const D = [-hw, 0, -hd];
  const R1 = [-rx, h, 0];
  const R2 = [rx, h, 0];
  const tris = [A, B, R2, A, R2, R1, C, D, R1, C, R1, R2, D, A, R1, B, C, R2];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tris.flat()), 3));
  g.computeVertexNormals();
  return g;
}

/** A triangular prism: base w, height h, extruded d along z, centred on z. */
function gable(w: number, h: number, d: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return g;
}

function lathe(points: [number, number][], segs = 20) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

// -- Build ----------------------------------------------------------------

export function buildCampus(kit: CampusKit): Campus {
  const { keep, renderer } = kit;
  const group = new THREE.Group();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = keep(pmrem.fromScene(room, 0.04).texture);
  room.dispose();
  pmrem.dispose();

  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = (c: HTMLCanvasElement, srgb = true) => {
    const t = keep(new THREE.CanvasTexture(c));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const brickC = brickCanvases();
  const stoneC = stoneCanvases();
  const slateC = slateCanvases();

  const std = (p: THREE.MeshStandardMaterialParameters) => keep(new THREE.MeshStandardMaterial(p));
  const M = {
    brick: std({ map: tex(brickC.map), bumpMap: tex(brickC.bump, false), bumpScale: 1.4, roughness: 0.9 }),
    stone: std({ map: tex(stoneC.map), bumpMap: tex(stoneC.bump, false), bumpScale: 0.6, roughness: 0.82 }),
    marble: std({ color: "#eee8dc", roughness: 0.48, envMap: env, envMapIntensity: 0.35 }),
    trim: std({ color: "#f5f2ea", roughness: 0.5 }),
    slate: std({ map: tex(slateC.map), bumpMap: tex(slateC.bump, false), bumpScale: 1, roughness: 0.62, metalness: 0.1, envMap: env, envMapIntensity: 0.35 }),
    copper: std({ color: "#6ea593", roughness: 0.42, metalness: 0.55, envMap: env, envMapIntensity: 0.9 }),
    gold: std({ color: "#d9b24c", roughness: 0.26, metalness: 1, envMap: env, envMapIntensity: 1.2 }),
    iron: std({ color: "#23262c", roughness: 0.4, metalness: 0.75, envMap: env, envMapIntensity: 0.6 }),
    glass: std({ color: "#1b2838", roughness: 0.05, metalness: 0.9, envMap: env, envMapIntensity: 1.1, emissive: "#ffc56e", emissiveIntensity: 0.05 }),
    wood: std({ color: "#5a3524", roughness: 0.55 }),
    paving: std({ map: tex(pavingCanvas()), roughness: 0.92 }),
    lawn: std({ map: tex(lawnCanvas()), roughness: 1 }),
    hedge: std({ color: "#3d6e3f", roughness: 0.95 }),
    bark: std({ color: "#5e4535", roughness: 0.95 }),
    leafA: std({ color: "#4f8a4a", roughness: 0.9 }),
    leafB: std({ color: "#62a057", roughness: 0.9 }),
    leafC: std({ color: "#3f7443", roughness: 0.9 }),
    terracotta: std({ color: "#a4583c", roughness: 0.8 }),
    lamp: std({ color: "#fff4d6", emissive: "#ffcf7a", emissiveIntensity: 0.3, roughness: 0.3 }),
    water: std({ color: "#4f9cc0", roughness: 0.04, metalness: 0.3, envMap: env, envMapIntensity: 1, transparent: true, opacity: 0.86 }),
    sheet: std({ color: "#cfe9f5", roughness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
  };
  const clockTex = tex(clockCanvas());
  const clockMat = std({ map: clockTex, emissiveMap: clockTex, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.45 });

  // Parts are gathered per material and merged at the end.
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const uvScale = new Map<THREE.Material, [number, "box" | "roof"]>([
    [M.brick, [1.45, "box"]],
    [M.stone, [2.2, "box"]],
    [M.slate, [1.1, "roof"]],
    [M.paving, [1.3, "box"]],
    [M.lawn, [1.7, "box"]],
  ]);
  const put = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    ry = 0,
  ) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    const uvs = uvScale.get(mat);
    if (uvs) mapUV(g, uvs[0], uvs[1]);
    for (const k of Object.keys(g.attributes)) {
      if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
    }
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    const list = buckets.get(mat) ?? [];
    list.push(g);
    buckets.set(mat, list);
  };
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

  // -- Dimensions ---------------------------------------------------------
  const PL = 0.5; // plinth top
  const CX = 2.9; // central block half-width
  const CZF = -4.6; // central block front face
  const CZB = -8.7;
  const CTOP = 5.1;
  const WX0 = 2.9; // wings span |x| in [WX0, WX1]
  const WX1 = 6.1;
  const WZF = -5.0;
  const WZB = -8.5;
  const WTOP = 3.9;
  const WXC = (WX0 + WX1) / 2;
  const WZC = (WZF + WZB) / 2;
  const CZC = (CZF + CZB) / 2;

  // -- Plinth, walls, bands -----------------------------------------------
  put(box(2 * CX + 0.2, PL, CZF - CZB + 0.2), M.stone, 0, PL / 2, CZC);
  put(box(2 * CX, CTOP - PL, CZF - CZB), M.brick, 0, (CTOP + PL) / 2, CZC);
  for (const s of [-1, 1]) {
    put(box(WX1 - WX0 + 0.2, PL, WZF - WZB + 0.2), M.stone, s * WXC, PL / 2, WZC);
    put(box(WX1 - WX0, WTOP - PL, WZF - WZB), M.brick, s * WXC, (WTOP + PL) / 2, WZC);
    // String course and two-step cornice.
    put(box(WX1 - WX0 + 0.1, 0.12, WZF - WZB + 0.1), M.stone, s * WXC, 2.45, WZC);
    put(box(WX1 - WX0 + 0.14, 0.14, WZF - WZB + 0.14), M.stone, s * WXC, WTOP - 0.07, WZC);
    put(box(WX1 - WX0 + 0.34, 0.1, WZF - WZB + 0.34), M.stone, s * WXC, WTOP + 0.05, WZC);
  }
  put(box(2 * CX + 0.1, 0.12, CZF - CZB + 0.1), M.stone, 0, 2.85, CZC);
  put(box(2 * CX + 0.14, 0.14, CZF - CZB + 0.14), M.stone, 0, CTOP - 0.07, CZC);
  put(box(2 * CX + 0.36, 0.1, CZF - CZB + 0.36), M.stone, 0, CTOP + 0.05, CZC);

  // Dentils under the cornices.
  for (let x = -CX + 0.08; x <= CX - 0.05; x += 0.17) put(box(0.08, 0.09, 0.07), M.stone, x, CTOP - 0.19, CZF + 0.05);
  for (const s of [-1, 1]) {
    for (let x = WX0 + 0.1; x <= WX1 - 0.05; x += 0.17) put(box(0.08, 0.09, 0.07), M.stone, s * x, WTOP - 0.19, WZF + 0.05);
    for (let z = WZF - 0.1; z >= WZB + 0.05; z -= 0.17) put(box(0.07, 0.09, 0.08), M.stone, s * (WX1 + 0.05), WTOP - 0.19, z);
  }

  // Quoins: alternating long and short blocks up each outer corner.
  const quoins = (cx: number, cz: number, sx: number, top: number) => {
    let k = 0;
    for (let y = PL + 0.12; y < top - 0.2; y += 0.25, k++) {
      const long = k % 2 === 0;
      const w = long ? 0.46 : 0.28;
      const d = long ? 0.28 : 0.46;
      put(box(w, 0.21, d), M.stone, cx - sx * (w / 2 - 0.03), y, cz + d / 2 - 0.03);
    }
  };
  for (const s of [-1, 1]) {
    quoins(s * CX, CZF, s, CTOP);
    quoins(s * WX1, WZF, s, WTOP);
  }

  // -- Windows ------------------------------------------------------------
  /**
   * One window facing +z at the origin, then turned by `ry` and moved onto a
   * wall. Arched windows get a round head, keystone and fanlight bar.
   */
  const windowAt = (x: number, y: number, z: number, ry: number, w: number, h: number, arched: boolean) => {
    const parts: [THREE.BufferGeometry, THREE.Material][] = [];
    const add = (g: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number) => {
      g.translate(px, py, pz);
      parts.push([g, m]);
    };
    // Glass.
    add(new THREE.PlaneGeometry(w, h), M.glass, 0, 0, 0.006);
    if (arched) add(new THREE.CircleGeometry(w / 2, 20, 0, Math.PI), M.glass, 0, h / 2, 0.006);
    // Sash frame and glazing bars.
    add(box(0.045, h, 0.04), M.trim, -w / 2 + 0.022, 0, 0.02);
    add(box(0.045, h, 0.04), M.trim, w / 2 - 0.022, 0, 0.02);
    add(box(w, 0.045, 0.04), M.trim, 0, -h / 2 + 0.022, 0.02);
    add(box(w, 0.04, 0.05), M.trim, 0, 0, 0.025);
    add(box(0.018, h, 0.03), M.trim, 0, 0, 0.022);
    add(box(w, 0.018, 0.03), M.trim, 0, h / 4, 0.022);
    add(box(w, 0.018, 0.03), M.trim, 0, -h / 4, 0.022);
    if (arched) {
      add(new THREE.TorusGeometry(w / 2 - 0.02, 0.022, 5, 20, Math.PI), M.trim, 0, h / 2, 0.02);
      add(box(w, 0.035, 0.04), M.trim, 0, h / 2, 0.022);
      add(new THREE.TorusGeometry(w / 2 + 0.05, 0.05, 5, 20, Math.PI), M.stone, 0, h / 2, 0.03);
      add(box(0.12, 0.17, 0.09), M.stone, 0, h / 2 + w / 2 + 0.05, 0.045);
    } else {
      add(box(w + 0.045, 0.045, 0.04), M.trim, 0, h / 2 - 0.022, 0.02);
      add(box(w + 0.2, 0.13, 0.07), M.stone, 0, h / 2 + 0.065, 0.035);
      add(box(0.13, 0.19, 0.09), M.stone, 0, h / 2 + 0.08, 0.05);
    }
    // Stone surround and sill.
    add(box(0.07, h, 0.06), M.stone, -w / 2 - 0.035, 0, 0.03);
    add(box(0.07, h, 0.06), M.stone, w / 2 + 0.035, 0, 0.03);
    add(box(w + 0.24, 0.07, 0.15), M.stone, 0, -h / 2 - 0.035, 0.07);
    for (const [g, m] of parts) {
      put(g, m, x, y, z, ry);
    }
  };

  // Central block, behind the portico.
  for (const x of [-1.65, 1.65]) windowAt(x, 1.6, CZF, 0, 0.62, 1.15, true);
  for (const x of [-1.65, 0, 1.65]) windowAt(x, 3.72, CZF, 0, 0.62, 0.95, false);
  // Wings: fronts and outer sides.
  for (const s of [-1, 1]) {
    for (const x of [3.6, 4.5, 5.4]) {
      windowAt(s * x, 1.45, WZF, 0, 0.58, 1.08, true);
      windowAt(s * x, 3.08, WZF, 0, 0.54, 0.8, false);
    }
    for (const z of [-5.95, -7.55]) {
      windowAt(s * WX1, 1.45, z, (s * Math.PI) / 2, 0.58, 1.08, true);
      windowAt(s * WX1, 3.08, z, (s * Math.PI) / 2, 0.54, 0.8, false);
    }
  }

  // Front door: panelled double leaves under a fanlight.
  {
    const z = CZF;
    put(box(1.0, 1.72, 0.06), M.wood, 0, PL + 0.86, z + 0.03);
    for (const x of [-0.25, 0.25]) {
      for (const y of [0.95, 1.7]) put(box(0.36, 0.55, 0.03), M.wood, x, y, z + 0.07);
    }
    put(box(0.02, 1.72, 0.08), M.iron, 0, PL + 0.86, z + 0.05);
    put(new THREE.CircleGeometry(0.5, 24, 0, Math.PI), M.glass, 0, PL + 1.72, z + 0.006);
    put(new THREE.TorusGeometry(0.5, 0.025, 5, 24, Math.PI), M.trim, 0, PL + 1.72, z + 0.02);
    put(new THREE.TorusGeometry(0.58, 0.07, 5, 24, Math.PI), M.stone, 0, PL + 1.72, z + 0.04);
    put(box(0.14, 1.72, 0.08), M.stone, -0.58, PL + 0.86, z + 0.04);
    put(box(0.14, 1.72, 0.08), M.stone, 0.58, PL + 0.86, z + 0.04);
    put(box(0.14, 0.2, 0.1), M.stone, 0, PL + 2.33, z + 0.05);
  }

  // -- Portico ------------------------------------------------------------
  const PZF = -3.3; // front of the portico floor
  put(box(5.7, PL, PZF - CZF + 0.1), M.stone, 0, PL / 2, (PZF + CZF) / 2);
  for (let k = 0; k < 5; k++) {
    const h = 0.1 * (k + 1);
    const front = PZF + 1.25 - 0.25 * k;
    const depth = front - PZF + 0.02;
    put(box(5.3, h, depth), M.stone, 0, h / 2, front - depth / 2);
  }
  for (const s of [-1, 1]) put(box(0.36, 0.64, 1.3), M.stone, s * 2.83, 0.32, PZF + 0.63);

  const colH = 3.95;
  const column = lathe([
    [0, 0], [0.26, 0], [0.26, 0.07], [0.235, 0.1], [0.245, 0.14], [0.205, 0.2], [0.2, 0.24],
    [0.206, 1.3], [0.19, 3.5], [0.176, 3.66], [0.19, 3.7], [0.24, 3.78], [0.25, 3.8], [0, 3.8],
  ]);
  for (let i = 0; i < 6; i++) {
    const x = -2.25 + i * 0.9;
    put(column.clone(), M.marble, x, PL + 0.1, -3.62);
    put(box(0.56, 0.1, 0.56), M.marble, x, PL + 0.05, -3.62);
    put(box(0.58, 0.12, 0.58), M.marble, x, PL + 0.1 + 3.8 + 0.06, -3.62);
  }
  column.dispose();
  const ET = PL + 0.1 + colH; // entablature base
  const PD = PZF - CZF + 0.1; // portico depth
  const PC = (PZF + CZF) / 2 - 0.05;
  put(box(5.75, 0.24, PD), M.stone, 0, ET + 0.12, PC);
  put(box(5.7, 0.26, PD - 0.06), M.stone, 0, ET + 0.37, PC);
  put(box(6.0, 0.14, PD + 0.16), M.stone, 0, ET + 0.57, PC + 0.02);
  for (let x = -2.9; x <= 2.91; x += 0.17) put(box(0.08, 0.09, 0.07), M.stone, x, ET + 0.46, PZF - 0.02);
  const PB = ET + 0.64; // pediment base
  const PH = 1.05;
  put(gable(5.7, PH, PD - 0.1), M.stone, 0, PB, PC);
  {
    const run = 3.0;
    const ang = Math.atan2(PH, 2.85);
    const len = Math.hypot(2.85, PH) + 0.2;
    for (const s of [-1, 1]) {
      const g = box(len, 0.14, PD + 0.2);
      g.rotateZ(-s * ang);
      put(g, M.stone, (s * run) / 2 - s * 0.05, PB + PH / 2 + 0.08, PC + 0.02);
    }
  }
  // Seal in the tympanum.
  {
    const seal = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 36);
    seal.rotateX(Math.PI / 2);
    put(seal, M.gold, 0, PB + 0.42, PZF - 0.03);
    put(new THREE.TorusGeometry(0.34, 0.03, 6, 36), M.gold, 0, PB + 0.42, PZF - 0.03);
    // Laurel sprigs either side.
    for (const s of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        const leaf = new THREE.SphereGeometry(0.06, 8, 6);
        leaf.scale(1.6, 0.7, 0.4);
        leaf.rotateZ(s * (0.5 + k * 0.18));
        put(leaf, M.gold, s * (0.48 + k * 0.13), PB + 0.28 + k * 0.05, PZF - 0.03);
      }
    }
  }

  // -- Roofs --------------------------------------------------------------
  put(hipRoof(2 * CX + 0.5, CZF - CZB + 0.5, 1.3), M.slate, 0, CTOP + 0.1, CZC);
  // The portico roof runs back from the pediment into the hall roof.
  {
    const g = gable(5.9, PH + 0.08, 1.4);
    put(g, M.slate, 0, PB + 0.02, CZF - 0.4);
  }
  for (const s of [-1, 1]) {
    const g = hipRoof(WZF - WZB + 0.44, WX1 - WX0 + 0.44, 1.05);
    g.rotateY(Math.PI / 2);
    put(g, M.slate, s * WXC, WTOP + 0.1, WZC);
    // Dormer on the front hip.
    const dz = WZF - 0.45;
    put(box(0.56, 0.52, 0.8), M.stone, s * WXC, WTOP + 0.62, dz - 0.4);
    put(gable(0.74, 0.32, 0.92), M.slate, s * WXC, WTOP + 0.87, dz - 0.42);
    put(new THREE.PlaneGeometry(0.32, 0.34), M.glass, s * WXC, WTOP + 0.63, dz + 0.006);
    put(box(0.02, 0.34, 0.03), M.trim, s * WXC, WTOP + 0.63, dz + 0.02);
    put(box(0.42, 0.05, 0.08), M.trim, s * WXC, WTOP + 0.44, dz + 0.03);
    // Chimney with pots.
    put(box(0.42, 1.45, 0.6), M.brick, s * 5.45, WTOP + 0.72, -7.8);
    put(box(0.52, 0.1, 0.7), M.stone, s * 5.45, WTOP + 1.48, -7.8);
    for (const dzp of [-0.14, 0.14]) put(new THREE.CylinderGeometry(0.06, 0.075, 0.2, 10), M.terracotta, s * 5.45, WTOP + 1.63, -7.8 + dzp);
  }

  // -- Clock tower --------------------------------------------------------
  const faces: THREE.BufferGeometry[] = [];
  const TZ = -6.7;
  put(box(1.6, 2.1, 1.6), M.brick, 0, CTOP + 1.05, TZ);
  put(box(1.74, 0.14, 1.74), M.stone, 0, CTOP + 2.13, TZ);
  put(box(1.66, 1.32, 1.66), M.stone, 0, CTOP + 2.86, TZ);
  put(box(1.86, 0.12, 1.86), M.stone, 0, CTOP + 3.58, TZ);
  put(box(1.96, 0.08, 1.96), M.stone, 0, CTOP + 3.68, TZ);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const face = new THREE.CircleGeometry(0.5, 40);
    face.translate(0, 0, 0.836);
    face.rotateY(a);
    face.translate(0, CTOP + 2.86, TZ);
    const ring = new THREE.TorusGeometry(0.52, 0.035, 6, 40);
    ring.translate(0, 0, 0.84);
    ring.rotateY(a);
    put(ring, M.gold, 0, CTOP + 2.86, TZ);
    // The face keeps its own UVs and material.
    faces.push(face);
  }
  // Belfry: an octagon of columns under a copper dome.
  const BB = CTOP + 3.72;
  put(new THREE.CylinderGeometry(0.86, 0.92, 0.14, 8), M.stone, 0, BB + 0.07, TZ);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    put(new THREE.CylinderGeometry(0.05, 0.06, 0.86, 10), M.marble, Math.cos(a) * 0.7, BB + 0.57, TZ + Math.sin(a) * 0.7);
  }
  put(lathe([[0, 0.42], [0.1, 0.42], [0.14, 0.34], [0.2, 0.12], [0.27, 0], [0, 0]], 18), M.gold, 0, BB + 0.3, TZ);
  put(new THREE.CylinderGeometry(0.92, 0.86, 0.14, 8), M.stone, 0, BB + 1.07, TZ);
  {
    const dome = new THREE.SphereGeometry(0.84, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.scale(1, 1.28, 1);
    put(dome, M.copper, 0, BB + 1.14, TZ);
    for (let k = 0; k < 8; k++) {
      const rib = new THREE.TorusGeometry(0.845, 0.018, 4, 20, Math.PI / 2);
      rib.scale(1, 1.28, 1);
      rib.rotateY((k / 8) * Math.PI * 2);
      put(rib, M.copper, 0, BB + 1.14, TZ);
    }
  }
  const LB = BB + 1.14 + 0.84 * 1.28 - 0.04; // lantern base
  put(new THREE.CylinderGeometry(0.2, 0.22, 0.42, 8), M.marble, 0, LB + 0.21, TZ);
  put(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 8), M.stone, 0, LB + 0.44, TZ);
  {
    const cap = new THREE.SphereGeometry(0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.scale(1, 1.2, 1);
    put(cap, M.copper, 0, LB + 0.46, TZ);
  }
  put(new THREE.ConeGeometry(0.045, 0.75, 8), M.gold, 0, LB + 1.0, TZ);
  put(new THREE.SphereGeometry(0.07, 12, 8), M.gold, 0, LB + 0.78, TZ);

  // -- Grounds ------------------------------------------------------------
  const GZ = 1.8; // gate line
  const flat = (w: number, d: number) => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
  put(flat(1.9, GZ + 0.6 + 2.05), M.paving, 0, 0.04, (GZ + 0.6 - 2.05) / 2);
  put(new THREE.CircleGeometry(1.75, 48).rotateX(-Math.PI / 2), M.paving, 0, 0.042, -0.15);
  put(flat(13.1, 2.95), M.paving, 0, 0.038, -3.47);
  for (const s of [-1, 1]) {
    put(flat(5.2, 3.6), M.lawn, s * 3.85, 0.02, -0.05);
    put(new RoundedBoxGeometry(4.4, 0.5, 0.5, 2, 0.14), M.hedge, s * 3.95, 0.27, -2.2);
    put(new RoundedBoxGeometry(2.9, 0.7, 0.4, 2, 0.14), M.hedge, s * WXC, 0.35, WZF + 0.34);
  }

  // Fountain.
  {
    const z = -0.15;
    put(lathe([[0, 0], [0.98, 0], [1.02, 0.05], [1.02, 0.34], [0.95, 0.4], [0.88, 0.36], [0.88, 0.12], [0, 0.12]], 40), M.marble, 0, 0, z);
    put(new THREE.CircleGeometry(0.88, 40).rotateX(-Math.PI / 2), M.water, 0, 0.3, z);
    put(lathe([[0, 0.3], [0.17, 0.3], [0.12, 0.4], [0.09, 0.82], [0.14, 0.86], [0.42, 0.92], [0.45, 0.98], [0.39, 1.0], [0, 0.94]], 28), M.marble, 0, 0, z);
    put(new THREE.CircleGeometry(0.39, 28).rotateX(-Math.PI / 2), M.water, 0, 0.975, z);
    put(new THREE.SphereGeometry(0.07, 12, 8), M.marble, 0, 1.02, z);
  }
  const sheet = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.44, 0.6, 0.64, 32, 1, true)), M.sheet);
  sheet.position.set(0, 0.64, -0.15);
  group.add(sheet);
  const jet = new THREE.Mesh(keep(new THREE.ConeGeometry(0.06, 0.55, 12, 1, true)), M.sheet);
  jet.rotation.x = Math.PI;
  jet.position.set(0, 1.27, -0.15);
  group.add(jet);

  // Lamp posts.
  const lampSpots: [number, number][] = [[-1.3, 1.2], [1.3, 1.2], [-1.35, -1.75], [1.35, -1.75]];
  for (const [x, z] of lampSpots) {
    put(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 10), M.iron, x, 0.1, z);
    put(new THREE.CylinderGeometry(0.03, 0.045, 1.65, 8), M.iron, x, 1.0, z);
    put(new THREE.SphereGeometry(0.13, 16, 12), M.lamp, x, 1.95, z);
    put(new THREE.ConeGeometry(0.15, 0.13, 8), M.iron, x, 2.12, z);
    put(new THREE.CylinderGeometry(0.06, 0.05, 0.06, 8), M.iron, x, 1.82, z);
  }

  // Benches facing the fountain.
  for (const s of [-1, 1]) {
    const ry = (-s * Math.PI) / 2;
    const bx = s * 2.4;
    const parts: [THREE.BufferGeometry, THREE.Material, number, number, number][] = [
      [box(1.15, 0.06, 0.38), M.wood, 0, 0.42, 0],
      [box(1.15, 0.26, 0.05), M.wood, 0, 0.68, -0.18],
      [box(0.05, 0.42, 0.4), M.iron, -0.5, 0.21, 0],
      [box(0.05, 0.42, 0.4), M.iron, 0.5, 0.21, 0],
    ];
    for (const [g, m, x, y, z] of parts) {
      g.translate(x, y, z);
      put(g, m, bx, 0, -0.15, ry);
    }
  }

  // Gate: brick piers, open iron leaves, and an arch that carries the banner.
  for (const s of [-1, 1]) {
    const x = s * 1.38;
    put(box(0.72, 0.26, 0.72), M.stone, x, 0.13, GZ);
    put(box(0.62, 1.9, 0.62), M.brick, x, 1.2, GZ);
    put(box(0.76, 0.16, 0.76), M.stone, x, 2.23, GZ);
    const cap = new THREE.ConeGeometry(0.44, 0.3, 4);
    cap.rotateY(Math.PI / 4);
    put(cap, M.stone, x, 2.46, GZ);
    put(new THREE.SphereGeometry(0.12, 16, 12), M.lamp, x, 2.72, GZ);
    // An open leaf, hinged at the pier and swung in toward the quad.
    const leaf: THREE.BufferGeometry[] = [];
    const L = 0.98;
    for (const y of [0.12, 0.95, 1.85]) leaf.push(box(L, 0.04, 0.04).translate(L / 2, y, 0));
    for (let bx = 0.06; bx < L; bx += 0.1) {
      leaf.push(new THREE.CylinderGeometry(0.012, 0.012, 1.85, 5).translate(bx, 1.0, 0));
      leaf.push(new THREE.ConeGeometry(0.026, 0.08, 5).translate(bx, 1.96, 0));
    }
    for (const g of leaf) {
      if (s < 0) g.rotateY(1.2);
      else g.rotateY(Math.PI - 1.2);
      put(g, M.iron, x - s * 0.33, 0, GZ);
    }
  }
  put(new THREE.TorusGeometry(1.07, 0.045, 8, 40, Math.PI), M.iron, 0, 2.3, GZ);
  put(new THREE.TorusGeometry(0.9, 0.02, 6, 36, Math.PI), M.iron, 0, 2.3, GZ);
  for (let k = 1; k < 8; k++) {
    const a = (k / 8) * Math.PI;
    const g = box(0.018, 0.17, 0.018);
    g.rotateZ(a - Math.PI / 2);
    put(g, M.iron, Math.cos(a) * 0.985, 2.3 + Math.sin(a) * 0.985, GZ);
  }
  const BW = 3.0;
  const BH = 0.75;
  const BY = 2.3 + 1.07 + BH / 2 + 0.04;
  put(box(BW + 0.1, 0.05, 0.05), M.iron, 0, BY - BH / 2 - 0.02, GZ);
  put(box(BW + 0.1, 0.05, 0.05), M.iron, 0, BY + BH / 2 + 0.02, GZ);
  put(box(0.05, BH + 0.1, 0.05), M.iron, -BW / 2 - 0.03, BY, GZ);
  put(box(0.05, BH + 0.1, 0.05), M.iron, BW / 2 + 0.03, BY, GZ);
  const banner = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(BW, BH)),
    keep(new THREE.MeshBasicMaterial({ map: kit.banner, transparent: true, side: THREE.DoubleSide })),
  );
  banner.position.set(0, BY, GZ + 0.01);
  group.add(banner);

  // Low wall with railings either side of the gate.
  for (const s of [-1, 1]) {
    const x0 = 1.7;
    const x1 = 6.75;
    const len = x1 - x0;
    const xc = s * (x0 + x1) / 2;
    put(box(len, 0.46, 0.32), M.brick, xc, 0.23, GZ);
    put(box(len + 0.04, 0.07, 0.4), M.stone, xc, 0.495, GZ);
    for (const px of [3.4, 5.1, 6.75]) {
      put(box(0.36, 0.86, 0.36), M.brick, s * px, 0.43, GZ);
      put(box(0.44, 0.08, 0.44), M.stone, s * px, 0.9, GZ);
    }
    put(box(len, 0.03, 0.03), M.iron, xc, 1.08, GZ);
    for (let px = x0 + 0.1; px < x1; px += 0.14) {
      if ([3.4, 5.1, 6.75].some((p) => Math.abs(p - px) < 0.2)) continue;
      put(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 5), M.iron, s * px, 0.8, GZ);
      put(new THREE.ConeGeometry(0.022, 0.06, 5), M.iron, s * px, 1.13, GZ);
    }
  }

  // Trees: a tapered trunk and a clustered crown in three greens.
  const tree = (x: number, z: number, sc: number, seed: number) => {
    const r = rng(seed);
    put(new THREE.CylinderGeometry(0.07 * sc, 0.14 * sc, 1.5 * sc, 8), M.bark, x, 0.75 * sc, z);
    for (let b = 0; b < 2; b++) {
      const br = new THREE.CylinderGeometry(0.03 * sc, 0.05 * sc, 0.7 * sc, 6);
      br.rotateZ((b ? 1 : -1) * 0.7);
      put(br, M.bark, x + (b ? -0.2 : 0.2) * sc, 1.35 * sc, z);
    }
    const leaves = [M.leafA, M.leafB, M.leafC];
    const n = 7;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r();
      const rad = k === 0 ? 0 : 0.42 * sc * (0.7 + r() * 0.5);
      const s = (0.48 + r() * 0.26) * sc;
      const g = new THREE.IcosahedronGeometry(s, 2);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const j = 0.9 + ((Math.sin(pos.getX(i) * 13 + seed) + Math.cos(pos.getZ(i) * 11 + k)) * 0.5 + 1) * 0.09;
        pos.setXYZ(i, pos.getX(i) * j, pos.getY(i) * j * 0.9, pos.getZ(i) * j);
      }
      g.computeVertexNormals();
      put(g, leaves[(k + seed) % 3], x + Math.cos(a) * rad, (1.85 + (k === 0 ? 0.35 : r() * 0.4)) * sc, z + Math.sin(a) * rad);
    }
  };
  const trees: [number, number, number][] = [[-4.4, 1.0, 1.05], [4.4, 0.9, 1.0], [-6.5, -1.0, 1.15], [6.4, -0.8, 1.1], [-4.9, 3.7, 1.0], [5.0, 3.5, 0.95]];
  trees.forEach(([x, z, sc], i) => tree(x, z, sc, 100 + i * 7));

  // Flagpoles on the forecourt; the flags themselves are animated meshes.
  const flags: { mesh: THREE.Mesh; base: Float32Array }[] = [];
  for (const [s, hex] of [[-1, "#29439c"], [1, "#e0b64a"]] as const) {
    const x = s * 7.0;
    const z = -3.5;
    put(new THREE.CylinderGeometry(0.1, 0.12, 0.16, 10), M.stone, x, 0.12, z);
    put(new THREE.CylinderGeometry(0.03, 0.045, 4.2, 10), M.trim, x, 2.2, z);
    put(new THREE.SphereGeometry(0.07, 12, 8), M.gold, x, 4.33, z);
    const fg = keep(new THREE.PlaneGeometry(1.0, 0.6, 14, 4));
    fg.translate(0.5, 0, 0);
    const fm = new THREE.Mesh(fg, keep(new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7, side: THREE.DoubleSide })));
    fm.position.set(x + 0.03, 3.9, z);
    fm.castShadow = true;
    group.add(fm);
    flags.push({ mesh: fm, base: (fg.attributes.position.array as Float32Array).slice() });
  }

  // Weathervane on the spire, turned by the wind.
  const vane = new THREE.Group();
  {
    const arrow = new THREE.Mesh(keep(new THREE.BoxGeometry(0.55, 0.025, 0.025)), M.gold);
    const tail = new THREE.Mesh(keep(new THREE.BoxGeometry(0.14, 0.14, 0.012)), M.gold);
    tail.position.x = -0.24;
    const head = new THREE.Mesh(keep(new THREE.ConeGeometry(0.05, 0.12, 4)), M.gold);
    head.rotation.z = -Math.PI / 2;
    head.position.x = 0.3;
    vane.add(arrow, tail, head);
    vane.position.set(0, LB + 1.22, TZ);
  }
  group.add(vane);

  // -- Merge --------------------------------------------------------------
  const clock = new THREE.Mesh(keep(mergeGeometries(faces)!), clockMat);
  faces.forEach((f) => f.dispose());
  group.add(clock);
  const noShadow = new Set<THREE.Material>([M.glass, M.lamp, M.water, M.paving, M.lawn]);
  for (const [mat, list] of buckets) {
    const merged = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = !noShadow.has(mat);
    m.receiveShadow = true;
    group.add(m);
  }

  // Warm light spilling onto the quad at night.
  const night = new THREE.PointLight(0xffc98a, 0, 16, 1.6);
  night.position.set(0, 3.2, -1.2);
  group.add(night);

  return {
    group,
    bounds: new THREE.Box3(new THREE.Vector3(-7, 0, -9), new THREE.Vector3(7, 12.5, GZ + 0.6)),
    focus: new THREE.Vector3(0, 3.6, -4.2),
    setNight(dark) {
      M.glass.emissiveIntensity = dark ? 1.35 : 0.05;
      M.lamp.emissiveIntensity = dark ? 2.6 : 0.3;
      clockMat.emissiveIntensity = dark ? 0.55 : 0;
      night.intensity = dark ? 9 : 0;
      for (const m of [M.slate, M.copper, M.gold, M.iron, M.glass, M.water, M.marble]) {
        m.envMapIntensity = (m.userData.env ??= m.envMapIntensity) * (dark ? 0.35 : 1);
      }
    },
    update(t, rm) {
      vane.rotation.y = rm ? 0.6 : Math.sin(t * 0.21) * 0.9 + Math.sin(t * 0.07) * 0.6;
      jet.scale.y = rm ? 1 : 1 + Math.sin(t * 9) * 0.06;
      M.sheet.opacity = rm ? 0.32 : 0.28 + Math.sin(t * 6) * 0.05;
      for (const f of flags) {
        const pos = f.mesh.geometry.attributes.position as THREE.BufferAttribute;
        const arr = pos.array as Float32Array;
        for (let i = 0; i < pos.count; i++) {
          const x = f.base[i * 3];
          const y = f.base[i * 3 + 1];
          const k = x / 1.0;
          arr[i * 3 + 2] = rm ? 0 : Math.sin(x * 5.5 - t * 4.2 + y * 1.5) * 0.09 * k;
          arr[i * 3 + 1] = y - (rm ? 0 : k * k * 0.05);
        }
        pos.needsUpdate = true;
        f.mesh.geometry.computeVertexNormals();
      }
    },
  };
}
