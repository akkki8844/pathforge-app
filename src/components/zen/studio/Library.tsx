import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeCanvasTexture, rand } from "./canvases";
import { SHELF_AT, type Vec3 } from "./stage";
import { useModel } from "./Props";
import { Binders } from "./Binders";
import { PrepBooks, Trophy } from "./Objects";
import type { Anim } from "./anim";

/*
 * The library wall.
 *
 * A built-in bookcase of walnut, floor to nearly ceiling: a cabinet below,
 * open bays above, a strip of warm light under every shelf, and a few hundred
 * books, each one placed: series that share a height and a cloth, runs that
 * end in a book leaning on the next, stacks lying flat, gaps kept for the
 * things that are not books. The station objects (the binders, the prep books,
 * the trophy) stand on its shelves.
 *
 * The frame is one mesh and the books another (vertex colours and a single
 * atlas of spines), so a wall of six hundred objects is two draws.
 *
 * Local frame: x along the unit (centred), y up, z out from the wall, the
 * front of the shelves at z = 0.
 */

export type CaseSpec = {
  length: number;
  bays: number;
  rows: number;
  rowH: number;
  /** Height of the closed cabinet below the first shelf (0 for none). */
  base: number;
  depth: number;
  seed: number;
  /** [row, bay] pairs left empty for something that is not a book. */
  gaps?: Array<[number, number]>;
};

/** Cloth colours: real bindings, muted, with the brand blue now and then. */
const CLOTH = [
  "#1d2a4a",
  "#7a2530",
  "#22503d",
  "#e6dfcd",
  "#c79a3a",
  "#3b4658",
  "#a67c52",
  "#1a1a1c",
  "#8c3a2e",
  "#4465d8",
  "#d9d3c4",
  "#2f6f73",
  "#6d4b74",
  "#b9b2a0",
].map((c) => new THREE.Color(c));
const PAGES = new THREE.Color("#efe6d2");

const COLS = 16;
const ATLAS = [1024, 1024] as const;
const CELL = 62;

/**
 * Spines on one sheet, sixteen designs side by side, painted mid-grey with
 * bright foil and dark type: the cloth colour of each book multiplies it, so
 * one sheet dresses every colour. The right edge is plain, for every other face.
 */
function paintSpines(ctx: CanvasRenderingContext2D) {
  const r = rand(5);
  const [w, h] = ATLAS;
  ctx.fillStyle = "rgb(184,184,184)";
  ctx.fillRect(0, 0, w, h);
  for (let c = 0; c < COLS; c++) {
    const x = c * CELL;
    // Cloth weave and wear.
    for (let i = 0; i < 380; i++) {
      ctx.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${0.02 + r() * 0.05})`;
      ctx.fillRect(x + r() * CELL, r() * h, 1 + r() * 8, 1);
    }
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(x, 0, 3, h);
    ctx.fillRect(x + CELL - 3, 0, 3, h);
    const foil = "rgb(255,246,214)";
    const ink = "rgb(52,52,56)";
    const style = c % 4;
    // Bands at head and tail.
    ctx.fillStyle = foil;
    const bands = [70, 88, h - 96, h - 78];
    for (const y of bands) ctx.fillRect(x + 7, y, CELL - 14, 3 + (style === 1 ? 3 : 0));
    if (style === 2) for (const y of [150, 166, h - 176]) ctx.fillRect(x + 12, y, CELL - 24, 2);
    // A title block, and lines of type as dashes, reading down the spine.
    if (style !== 3) {
      ctx.fillStyle = style === 0 ? "rgb(236,228,206)" : "rgb(150,150,150)";
      ctx.fillRect(x + 9, 200, CELL - 18, 300 + (c % 3) * 60);
    }
    ctx.fillStyle = style === 0 ? ink : foil;
    for (let line = 0; line < 3; line++) {
      const cx = x + CELL / 2 + (line - 1) * 10;
      let y = 224 + line * 6;
      while (y < 440 + (c % 3) * 60) {
        const seg = 8 + r() * 30;
        ctx.fillRect(cx - 1.5, y, 3, seg);
        y += seg + 5 + r() * 8;
      }
    }
    // The publisher's mark at the foot.
    ctx.fillStyle = foil;
    ctx.beginPath();
    ctx.arc(x + CELL / 2, h - 130, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // The plain strip every non-spine face samples.
  ctx.fillStyle = "rgb(184,184,184)";
  ctx.fillRect(COLS * CELL, 0, w - COLS * CELL, h);
}

const spineUV = (col: number) => [(col * CELL) / ATLAS[0], ((col + 1) * CELL) / ATLAS[0]] as const;
const PLAIN_U = (COLS * CELL + 14) / ATLAS[0];

/** One book, spine toward +z: covers on the sides, page edges above, below and behind. */
function book(t: number, h: number, d: number, cloth: THREE.Color, col: number) {
  const g = new THREE.BoxGeometry(t, h, d).toNonIndexed();
  const uv = g.getAttribute("uv");
  const [u0, u1] = spineUV(col);
  const color = new Float32Array(g.getAttribute("position").count * 3);
  for (let i = 0; i < uv.count; i++) {
    const face = Math.floor(i / 6);
    // BoxGeometry faces once de-indexed: +x, -x, +y, -y, +z, -z.
    const isSpine = face === 4;
    if (isSpine) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), uv.getY(i));
    else uv.setXY(i, PLAIN_U, 0.5);
    const pages = face === 2 || face === 3 || face === 5;
    const c = pages ? PAGES : cloth;
    // The map is mid-grey, so the colours are lifted to compensate.
    const k = 1 / 0.72;
    color[i * 3] = c.r * k;
    color[i * 3 + 1] = c.g * k;
    color[i * 3 + 2] = c.b * k;
  }
  g.setAttribute("color", new THREE.BufferAttribute(color, 3));
  return g;
}

const M4 = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const S1 = new THREE.Vector3(1, 1, 1);

function place(g: THREE.BufferGeometry, x: number, y: number, z: number, rz = 0, ry = 0) {
  E.set(0, ry, rz);
  Q.setFromEuler(E);
  M4.compose(new THREE.Vector3(x, y, z), Q, S1);
  return g.applyMatrix4(M4);
}

function buildBooks(spec: CaseSpec) {
  const r = rand(spec.seed);
  const bayW = spec.length / spec.bays;
  const parts: THREE.BufferGeometry[] = [];
  const gap = new Set((spec.gaps ?? []).map(([a, b]) => `${a},${b}`));
  let prev = 0;
  for (let row = 0; row < spec.rows; row++) {
    const top = spec.base + row * spec.rowH + 0.015;
    const clear = spec.rowH - 0.05;
    for (let bay = 0; bay < spec.bays; bay++) {
      if (gap.has(`${row},${bay}`)) continue;
      const xL = -spec.length / 2 + bay * bayW + 0.03;
      const xR = -spec.length / 2 + (bay + 1) * bayW - 0.03;
      const mood = r();
      // A bay is mostly books; some are half, some end in a stack lying flat.
      const fill = mood < 0.55 ? 1 : mood < 0.8 ? 0.62 : 0.4;
      const limit = xL + (xR - xL) * fill;
      let x = xL + r() * 0.012;
      let cloth = CLOTH[Math.floor(r() * CLOTH.length)];
      let hBase = 0.25 + r() * 0.17;
      let left = 0;
      while (x < limit - 0.02) {
        if (left <= 0) {
          // A new series: its own cloth and height, three to seven volumes.
          left = 3 + Math.floor(r() * 5);
          prev = (prev + 1 + Math.floor(r() * 6)) % CLOTH.length;
          cloth = CLOTH[r() < 0.4 ? prev : Math.floor(r() * CLOTH.length)];
          hBase = 0.2 + r() * 0.2;
        }
        left--;
        const t = 0.018 + r() * 0.03;
        const h = Math.min(clear, hBase + (r() - 0.5) * 0.045);
        const d = 0.21 + r() * 0.08;
        if (x + t > xR) break;
        const tone = 0.82 + r() * 0.3;
        const c = cloth.clone().multiplyScalar(tone);
        const g = book(t, h, d, c, Math.floor(r() * COLS));
        place(g, x + t / 2, top + h / 2, -0.03 - r() * 0.035 - d / 2);
        parts.push(g);
        x += t + 0.001;
      }
      const room = xR - x;
      if (fill === 1 && room > 0.05) {
        // The run ends in a book leaning on its neighbour.
        const t = 0.03 + r() * 0.02;
        const h = Math.min(clear, 0.26 + r() * 0.12);
        const lean = 0.16 + r() * 0.24;
        const g = book(t, h, 0.24, CLOTH[Math.floor(r() * CLOTH.length)], Math.floor(r() * COLS));
        // Rotated about its foot on the right, leaning left onto the run.
        g.translate(-t / 2, h / 2, 0);
        place(g, Math.min(xR, x + t + h * Math.sin(lean)) - 0.005, top, -0.06 - 0.12, lean);
        parts.push(g);
      } else if (fill < 1) {
        // Lying flat, the top of the stack at the free end.
        const n = 2 + Math.floor(r() * 4);
        let y = top;
        const cx = xR - 0.15 - r() * 0.04;
        for (let i = 0; i < n; i++) {
          const t = 0.026 + r() * 0.03;
          const len = 0.22 + r() * 0.07;
          const g = book(t, len, 0.19 + r() * 0.07, CLOTH[Math.floor(r() * CLOTH.length)], Math.floor(r() * COLS));
          place(g, cx + (r() - 0.5) * 0.03, y + t / 2, -0.03 - 0.12, Math.PI / 2, (r() - 0.5) * 0.18);
          parts.push(g);
          y += t;
        }
        // A few upright at the near end to hold it.
        if (r() < 0.6) {
          const t = 0.03;
          const h = 0.24 + r() * 0.08;
          const g = book(t, h, 0.22, CLOTH[Math.floor(r() * CLOTH.length)], Math.floor(r() * COLS));
          place(g, cx - 0.17, top + h / 2, -0.03 - 0.11);
          parts.push(g);
        }
      }
    }
  }
  return mergeGeometries(parts);
}

/** UVs from local position, so the grain keeps one scale across every board. */
function boxGrain(w: number, h: number, d: number, x: number, y: number, z: number, tile = 1.6) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    if (nx > 0.5) uv.setXY(i, pos.getZ(i) * tile, pos.getY(i) * tile);
    else if (ny > 0.5) uv.setXY(i, pos.getX(i) * tile, pos.getZ(i) * tile);
    else uv.setXY(i, pos.getX(i) * tile, pos.getY(i) * tile);
  }
  return g;
}

/** A vertical sheet hanging from y down to y - h, brightest at the top edge (v = 1). */
function quad(w: number, h: number, y: number, z: number) {
  const g = new THREE.PlaneGeometry(w, h);
  g.translate(0, y - h / 2, z);
  return g;
}

function buildFrame(spec: CaseSpec) {
  const { length, bays, rows, rowH, base, depth } = spec;
  const H = base + rows * rowH + 0.06;
  const bayW = length / bays;
  const wood: THREE.BufferGeometry[] = [];
  const brass: THREE.BufferGeometry[] = [];
  const leds: THREE.BufferGeometry[] = [];
  const spill: THREE.BufferGeometry[] = [];
  // Uprights, the top board with its overhang, and the back panel.
  for (let i = 0; i <= bays; i++) {
    const x = -length / 2 + i * bayW;
    wood.push(boxGrain(0.04, H, depth, x, H / 2, -depth / 2));
  }
  wood.push(boxGrain(length + 0.08, 0.05, depth + 0.03, 0, H + 0.005, -depth / 2 + 0.012));
  wood.push(boxGrain(length, H - base, 0.02, 0, base + (H - base) / 2, -depth + 0.01, 1.2));
  // Boards, with a lip on the front of each, and a light under each.
  for (let k = 0; k <= rows; k++) {
    const y = base + k * rowH;
    wood.push(boxGrain(length, 0.03, depth - 0.02, 0, y, -depth / 2 - 0.01));
    if (k > 0) {
      leds.push(new THREE.BoxGeometry(length - 0.1, 0.012, 0.014).translate(0, y - 0.022, -0.055));
      // The light it throws down the spines beneath: a fading sheet, drawn additively.
      spill.push(quad(length - 0.1, 0.16, y - 0.03, -0.026));
    }
  }
  // The cabinet: a carcass, a door to each bay with a brass pull, a plinth.
  if (base > 0) {
    wood.push(boxGrain(length, base - 0.07, depth - 0.02, 0, 0.07 + (base - 0.07) / 2, -depth / 2 - 0.01));
    wood.push(boxGrain(length - 0.06, 0.06, depth - 0.1, 0, 0.03, -depth / 2 - 0.04));
    for (let b = 0; b < bays; b++) {
      const cx = -length / 2 + (b + 0.5) * bayW;
      wood.push(boxGrain(bayW - 0.03, base - 0.11, 0.022, cx, 0.09 + (base - 0.11) / 2, 0.008, 1.1));
      brass.push(new THREE.BoxGeometry(0.012, 0.16, 0.014).translate(cx + (bayW / 2 - 0.05) * (b % 2 ? -1 : 1), base * 0.55, 0.027));
    }
  }
  return {
    wood: mergeGeometries(wood),
    brass: mergeGeometries(brass.length ? brass : [new THREE.BoxGeometry(0.001, 0.001, 0.001)]),
    leds: mergeGeometries(leds),
    spill: mergeGeometries(spill),
    height: H,
  };
}

const WOOD_TONE = [new THREE.Color("#4e3626"), new THREE.Color("#c7a577")];

function useCaseMaterials() {
  const maps = useTexture(["/zen/tex/walnut_diff.webp", "/zen/tex/walnut_nor.webp", "/zen/tex/walnut_arm.webp"]);
  return useMemo(() => {
    const t = maps.map((m, i) => {
      const c = m.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      c.anisotropy = 8;
      c.needsUpdate = true;
      return c;
    });
    const wood = new THREE.MeshStandardMaterial({
      map: t[0],
      normalMap: t[1],
      roughnessMap: t[2],
      roughness: 0.9,
      color: new THREE.Color("#c7a577"),
      envMapIntensity: 0.4,
    });
    const atlas = makeCanvasTexture(ATLAS[0], ATLAS[1]);
    paintSpines(atlas.ctx);
    atlas.tex.needsUpdate = true;
    const books = new THREE.MeshStandardMaterial({ map: atlas.tex, vertexColors: true, roughness: 0.78, envMapIntensity: 0.35 });
    const brass = new THREE.MeshStandardMaterial({ color: "#b89a64", metalness: 1, roughness: 0.32 });
    const led = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb46a"), toneMapped: false });
    // The spill is a warm gradient that dies away downward and toward its ends.
    const glow = makeCanvasTexture(8, 64);
    const gr = glow.ctx.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.35, "rgba(255,255,255,0.32)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    glow.ctx.fillStyle = gr;
    glow.ctx.fillRect(0, 0, 8, 64);
    glow.tex.needsUpdate = true;
    const spill = new THREE.MeshBasicMaterial({
      map: glow.tex,
      color: new THREE.Color("#ffab5e"),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    return { wood, books, brass, led, atlas, spill };
  }, [maps]);
}

/** The bookcase itself: frame, books, lights. Children stand on its shelves. */
export const Bookcase = memo(function Bookcase({
  spec,
  anim,
  children,
}: {
  spec: CaseSpec;
  anim: Anim;
  children?: React.ReactNode;
}) {
  const mats = useCaseMaterials();
  const built = useMemo(() => ({ ...buildFrame(spec), books: buildBooks(spec) }), [spec]);
  const toned = useRef(-1);
  useFrame(() => {
    const day = anim.day;
    const night = 1 - day;
    // The lights are always on a little; they come up as the room does.
    mats.led.color.set("#ffb46a").multiplyScalar(0.35 + anim.strip * (0.7 + night * 2.6));
    mats.spill.color.set("#ffab5e").multiplyScalar(0.05 + anim.strip * (0.05 + night * 0.34));
    if (Math.abs(toned.current - day) > 0.001) {
      toned.current = day;
      mats.wood.color.lerpColors(WOOD_TONE[0], WOOD_TONE[1], day);
    }
  });
  useLayoutEffect(
    () => () => {
      built.wood.dispose();
      built.brass.dispose();
      built.leds.dispose();
      built.spill.dispose();
      built.books.dispose();
    },
    [built],
  );
  return (
    <group>
      <mesh geometry={built.wood} material={mats.wood} userData={{ pfEdges: true }} />
      <mesh geometry={built.brass} material={mats.brass} userData={{ pfNoTwin: true }} />
      <mesh geometry={built.leds} material={mats.led} userData={{ pfNoCast: true, pfNoTwin: true }} />
      <mesh geometry={built.books} material={mats.books} userData={{ pfNoTwin: true }} />
      <mesh geometry={built.spill} material={mats.spill} renderOrder={3} userData={{ pfNoCast: true, pfNoTwin: true }} />
      {children}
    </group>
  );
});

/** Rows and bays of the downstairs library, and where the station objects stand. */
export const LIBRARY: CaseSpec = {
  length: 3.2,
  bays: 4,
  rows: 6,
  rowH: 0.5,
  base: 0.8,
  depth: 0.38,
  seed: 11,
  // Kept clear: the binders (row 2, bay 0), the prep books (row 1, bay 2), the trophy
  // (row 5, bay 1), and a bay on the top row for the bust.
  gaps: [
    [2, 0],
    [1, 2],
    [5, 1],
    [3, 2],
    [4, 3],
  ],
};

/** A rolling ladder on its brass rail: two rails, rungs, and small wheels at the top. */
function RollingLadder({ x }: { x: number }) {
  const geo = useMemo(() => {
    const top = 3.9;
    const out = 0.72;
    const len = Math.hypot(top, out);
    const ang = Math.atan2(out, top);
    const wood: THREE.BufferGeometry[] = [];
    for (const s of [-0.21, 0.21]) {
      const g = new THREE.BoxGeometry(0.04, len, 0.03);
      g.rotateX(-ang);
      g.translate(x + s, top / 2, 0.03 + out / 2 - 0.02);
      wood.push(g);
    }
    // Rungs along the rails' line: height from the floor, out from the shelves.
    for (let i = 1; i <= 11; i++) {
      const t = i / 12;
      const g = new THREE.CylinderGeometry(0.014, 0.014, 0.44, 10).rotateZ(Math.PI / 2);
      g.translate(x, top * t, 0.01 + out * (1 - t));
      wood.push(g);
    }
    const brass = [
      new THREE.CylinderGeometry(0.02, 0.02, 3.3, 12).rotateZ(Math.PI / 2).translate(0, top + 0.06, 0.04),
      new THREE.CylinderGeometry(0.035, 0.035, 0.025, 16).rotateZ(Math.PI / 2).translate(x - 0.235, top + 0.02, 0.04),
      new THREE.CylinderGeometry(0.035, 0.035, 0.025, 16).rotateZ(Math.PI / 2).translate(x + 0.235, top + 0.02, 0.04),
      ...[-1.4, 0, 1.4].map((bx) => new THREE.BoxGeometry(0.03, 0.05, 0.05).translate(bx, top + 0.045, 0.02)),
    ];
    return { wood: mergeGeometries(wood), brass: mergeGeometries(brass) };
  }, [x]);
  const mats = useMemo(
    () => ({
      wood: new THREE.MeshStandardMaterial({ color: "#a98356", roughness: 0.7 }),
      brass: new THREE.MeshStandardMaterial({ color: "#b89a64", metalness: 1, roughness: 0.32 }),
    }),
    [],
  );
  return (
    <group>
      <mesh geometry={geo.wood} material={mats.wood} />
      <mesh geometry={geo.brass} material={mats.brass} />
    </group>
  );
}

/**
 * The downstairs library, in the shelf frame the stations use: its origin is
 * the middle of the front of the unit, x along the wall.
 */
export const Library = memo(function Library({ anim }: { anim: Anim }) {
  const bust = useModel("marble_bust_01");
  const plant = useModel("potted_plant_04");
  const vase = useModel("ceramic_vase_02");
  const bustCopy = useMemo(() => bust, [bust]);
  const plantCopy = useMemo(() => plant.clone(true), [plant]);
  const vaseCopy = useMemo(() => vase.clone(true), [vase]);
  return (
    <group position={SHELF_AT} rotation-y={Math.PI / 2}>
      <Bookcase spec={LIBRARY} anim={anim}>
        <Binders pos={[-1.5, 1.815, -0.15]} />
        <PrepBooks />
        <primitive object={bustCopy} position={[-1.2, 3.89, -0.16]} rotation-y={0.35} scale={0.9} />
        <primitive object={plantCopy} position={[0.4, 2.315, -0.18]} scale={0.7} />
        <primitive object={vaseCopy} position={[1.2, 2.815, -0.17]} scale={0.55} />
        <Trophy />
      </Bookcase>
      <RollingLadder x={0.8} />
    </group>
  );
});

export type { Vec3 };
