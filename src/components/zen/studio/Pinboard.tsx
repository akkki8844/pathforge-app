import { memo, useLayoutEffect, useMemo, useRef } from "react";
import type { Anim } from "./anim";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TIER_LABELS } from "@/lib/collegeCalibration";
import { makeCanvasTexture, MONO, rand, SANS } from "./canvases";
import { daysUntil, live, type Live } from "./live";
import { PLACE } from "./stage";

/*
 * The pinboard: the student's own college list, as index cards pinned to cork
 * on the back wall, with the next deadline on a sticky note. It is what makes
 * the room theirs rather than a showroom, and it is painted from the same
 * data as the Colleges panel, repainted only when that data changes.
 */

const PX = [1200, 800] as const;
const CARD = { w: 250, h: 158 };
const COLS = 4;
const MAX_CARDS = 8;

type Slot = { x: number; y: number; rot: number };

/** Where each card sits on the board, in canvas pixels, slightly askew. */
function slots(): Slot[] {
  const r = rand(19);
  const out: Slot[] = [];
  const gapX = (PX[0] - 90 * 2 - CARD.w * COLS) / (COLS - 1);
  for (let i = 0; i < MAX_CARDS; i++) {
    const c = i % COLS;
    const row = Math.floor(i / COLS);
    out.push({
      x: 90 + c * (CARD.w + gapX) + (r() - 0.5) * 18,
      y: 150 + row * (CARD.h + 70) + (r() - 0.5) * 22,
      rot: (r() - 0.5) * 0.07,
    });
  }
  return out;
}

const SLOTS = slots();

function paintCork(ctx: CanvasRenderingContext2D) {
  const [w, h] = PX;
  ctx.fillStyle = "#8a6848";
  ctx.fillRect(0, 0, w, h);
  const r = rand(4);
  // Cork is a crumb of light and dark granules, not a flat colour.
  for (let i = 0; i < 9000; i++) {
    const t = r();
    ctx.fillStyle = t < 0.5 ? `rgba(60,38,20,${0.18 + r() * 0.25})` : `rgba(214,176,128,${0.1 + r() * 0.18})`;
    const s = 1 + r() * 3;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
  // Old pin holes.
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = "rgba(30,18,8,0.55)";
    ctx.beginPath();
    ctx.arc(r() * w, r() * h, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, lines: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxW) line = next;
    else {
      if (line) out.push(line);
      line = word;
      if (out.length === lines) break;
    }
  }
  if (out.length < lines && line) out.push(line);
  if (out.length === lines && words.join(" ") !== out.join(" ")) {
    let last = out[lines - 1];
    while (ctx.measureText(`${last}...`).width > maxW && last.length > 2) last = last.slice(0, -1);
    out[lines - 1] = `${last.trimEnd()}...`;
  }
  return out.slice(0, lines);
}

function card(ctx: CanvasRenderingContext2D, s: Slot, draw: (ctx: CanvasRenderingContext2D) => void, paper = "#ebe7de") {
  ctx.save();
  ctx.translate(s.x + CARD.w / 2, s.y + CARD.h / 2);
  ctx.rotate(s.rot);
  ctx.translate(-CARD.w / 2, -CARD.h / 2);
  // A soft contact shadow, offset down-right, the lamp being up-left.
  ctx.fillStyle = "rgba(20,10,4,0.35)";
  ctx.fillRect(5, 7, CARD.w, CARD.h);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, CARD.w, CARD.h);
  draw(ctx);
  ctx.restore();
}

const FIT_COLOR: Record<string, string> = {
  Safety: "#2f6b4a",
  Match: "#2f4fb0",
  Reach: "#8a4a1c",
  "Far reach": "#8a2a2a",
};

function paintPinboard(ctx: CanvasRenderingContext2D, data: Live) {
  paintCork(ctx);
  const [w] = PX;
  // Header, hand-lettered on a strip of paper tape.
  ctx.fillStyle = "#e4dccb";
  ctx.save();
  ctx.translate(80, 58);
  ctx.rotate(-0.02);
  ctx.fillRect(0, 0, 330, 54);
  ctx.fillStyle = "#1d1f26";
  ctx.font = `600 30px ${SANS}`;
  ctx.textBaseline = "middle";
  ctx.fillText("The list", 20, 28);
  ctx.font = `500 16px ${MONO}`;
  ctx.fillStyle = "#5b5e68";
  const colleges = data.d?.colleges ?? [];
  ctx.fillText(data.ready ? `${colleges.length} SCHOOLS` : "", 180, 29);
  ctx.restore();

  const pins: Array<[number, number, number]> = [];

  if (!data.ready) return pins;

  if (!colleges.length) {
    card(ctx, { x: 90, y: 150, rot: -0.03 }, (c) => {
      c.fillStyle = "#1d1f26";
      c.font = `600 24px ${SANS}`;
      c.fillText("Nothing here yet.", 18, 44);
      c.font = `400 18px ${SANS}`;
      c.fillStyle = "#4a4d57";
      c.fillText("Add schools from the", 18, 84);
      c.fillText("dashboard to pin them.", 18, 108);
    });
    pins.push([90 + CARD.w / 2, 150 + 10, 0]);
  }

  const shown = colleges.length > MAX_CARDS ? colleges.slice(0, MAX_CARDS - 1) : colleges;
  shown.forEach((col, i) => {
    const s = SLOTS[i];
    card(ctx, s, (c) => {
      c.textBaseline = "alphabetic";
      c.fillStyle = "#1d1f26";
      c.font = `600 23px ${SANS}`;
      const lines = fitText(c, col.name, CARD.w - 32, 2);
      lines.forEach((l, k) => c.fillText(l, 16, 44 + k * 27));
      c.font = `500 13px ${MONO}`;
      c.fillStyle = "#6a6d77";
      c.fillText(TIER_LABELS[col.tier].toUpperCase(), 16, CARD.h - 44);
      // Readiness against this school: a ruled line, filled in ink.
      c.fillStyle = "rgba(29,31,38,0.14)";
      c.fillRect(16, CARD.h - 28, CARD.w - 32, 4);
      c.fillStyle = "#2f4fb0";
      c.fillRect(16, CARD.h - 28, (CARD.w - 32) * Math.max(0.02, Math.min(1, col.readinessIndex / 100)), 4);
      c.textAlign = "right";
      c.font = `600 13px ${MONO}`;
      c.fillStyle = FIT_COLOR[col.fit] ?? "#1d1f26";
      c.fillText(col.fit.toUpperCase(), CARD.w - 16, CARD.h - 44);
      c.textAlign = "left";
    });
    pins.push([s.x + CARD.w / 2, s.y + 10, i % 3]);
  });
  if (colleges.length > MAX_CARDS) {
    const s = SLOTS[MAX_CARDS - 1];
    card(ctx, s, (c) => {
      c.fillStyle = "#1d1f26";
      c.font = `600 40px ${SANS}`;
      c.fillText(`+${colleges.length - shown.length}`, 18, 70);
      c.font = `400 18px ${SANS}`;
      c.fillStyle = "#4a4d57";
      c.fillText("more on your list", 18, 104);
    });
    pins.push([s.x + CARD.w / 2, s.y + 10, 2]);
  }

  // The next deadline, on a sticky note in the top right corner.
  const next = data.deadlines[0];
  if (next) {
    const s = { x: w - 90 - 210, y: 36, rot: 0.04 };
    ctx.save();
    ctx.translate(s.x + 105, s.y + 50);
    ctx.rotate(s.rot);
    ctx.translate(-105, -50);
    ctx.fillStyle = "rgba(20,10,4,0.3)";
    ctx.fillRect(4, 6, 210, 100);
    ctx.fillStyle = "#e6d67c";
    ctx.fillRect(0, 0, 210, 100);
    ctx.fillStyle = "#2a2618";
    ctx.font = `600 13px ${MONO}`;
    ctx.fillText("NEXT DEADLINE", 14, 26);
    ctx.font = `600 22px ${SANS}`;
    const label = fitText(ctx, next.label, 182, 1)[0] ?? "";
    ctx.fillText(label, 14, 56);
    ctx.font = `500 16px ${MONO}`;
    const days = daysUntil(next.date);
    ctx.fillText(days === 0 ? "TODAY" : `${days} DAY${days === 1 ? "" : "S"}`, 14, 84);
    ctx.restore();
  }
  return pins;
}

const pinColors = [new THREE.Color("#c8372d"), new THREE.Color("#3a5bd9"), new THREE.Color("#e9e4d8")];

const brass = new THREE.MeshStandardMaterial({ color: "#a88a57", metalness: 1, roughness: 0.35 });
const shadeMat = new THREE.MeshStandardMaterial({ color: "#15161a", metalness: 0.6, roughness: 0.4 });

/**
 * A brass picture light over the board. The back wall's left half had no
 * light of its own and read as a black void; this puts a warm pool on the
 * cards and the wall around them, and gives the clock something to sit in.
 */
function PictureLight({ anim, width }: { anim: Anim; width: number }) {
  const spot = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const bulbMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1b1712", emissive: new THREE.Color("#ffcf96"), emissiveIntensity: 0 }),
    [],
  );
  const top = PLACE.pinboard.size[1] / 2;
  useLayoutEffect(() => {
    target.position.set(0, -0.8, 0);
    if (spot.current) spot.current.target = target;
  }, [target]);
  useFrame(() => {
    if (spot.current) spot.current.intensity = anim.strip * 1.5;
    bulbMat.emissiveIntensity = anim.strip * 0.9;
  });
  return (
    <group position={[0, top + 0.16, 0]}>
      {/* Wall plate and the arm that holds the shade out from the wall. */}
      <mesh material={brass} position={[0, -0.06, 0.012]}>
        <boxGeometry args={[0.07, 0.1, 0.02]} />
      </mesh>
      <mesh material={brass} position={[0, -0.02, 0.09]} rotation-x={Math.PI / 2 - 0.35}>
        <cylinderGeometry args={[0.008, 0.008, 0.17, 10]} />
      </mesh>
      <mesh material={shadeMat} position={[0, 0.02, 0.17]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.035, width * 0.42, 20, 1, false, 0, Math.PI]} />
      </mesh>
      <mesh material={bulbMat} position={[0, 0.012, 0.17]} rotation-z={Math.PI / 2} userData={{ pfNoCast: true, pfNoTwin: true }}>
        <cylinderGeometry args={[0.012, 0.012, width * 0.38, 10]} />
      </mesh>
      <primitive object={target} />
      <spotLight
        ref={spot}
        position={[0, 0, 0.2]}
        color="#ffc98f"
        angle={1.05}
        penumbra={0.9}
        distance={3.2}
        decay={2}
        intensity={0}
      />
    </group>
  );
}

export const Pinboard = memo(function Pinboard({ anim }: { anim: Anim }) {
  const { pos, size } = PLACE.pinboard;
  const board = useMemo(() => makeCanvasTexture(PX[0], PX[1]), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: board.tex,
        roughness: 0.92,
        // A little self-light so the cards stay legible on a dark wall.
        emissive: new THREE.Color("#ffffff"),
        emissiveMap: board.tex,
        emissiveIntensity: 0.14,
        envMapIntensity: 0.2,
      }),
    [board],
  );
  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b2019", roughness: 0.7 }), []);
  const frameGeo = useMemo(() => {
    const [w, h] = size;
    const t = 0.035;
    const d = 0.04;
    const g = [
      new THREE.BoxGeometry(w + t * 2, t, d).translate(0, h / 2 + t / 2, 0),
      new THREE.BoxGeometry(w + t * 2, t, d).translate(0, -h / 2 - t / 2, 0),
      new THREE.BoxGeometry(t, h, d).translate(-w / 2 - t / 2, 0, 0),
      new THREE.BoxGeometry(t, h, d).translate(w / 2 + t / 2, 0, 0),
    ];
    return mergeGeometries(g);
  }, [size]);

  const pinMesh = useRef<THREE.InstancedMesh>(null);
  const pinGeo = useMemo(() => new THREE.SphereGeometry(0.011, 12, 8), []);
  const pinMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 }), []);
  const last = useRef(-1);
  const m4 = useMemo(() => new THREE.Matrix4(), []);

  useFrame(() => {
    const data = live.get();
    if (data.rev === last.current) return;
    last.current = data.rev;
    const pins = paintPinboard(board.ctx, data);
    board.tex.needsUpdate = true;
    const mesh = pinMesh.current;
    if (!mesh) return;
    mesh.count = pins.length;
    pins.forEach(([px, py, c], i) => {
      m4.makeTranslation((px / PX[0] - 0.5) * size[0], (0.5 - py / PX[1]) * size[1], 0.012);
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, pinColors[c]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  useLayoutEffect(() => {
    // Give the pins their colour attribute now, before the scene's shaders
    // are compiled, or the first paint would build a new variant mid-frame.
    pinMesh.current?.setColorAt(0, pinColors[0]);
    let alive = true;
    // Fonts may still be arriving on the first paint; repaint once they are in.
    void document.fonts?.ready.then(() => {
      if (alive) last.current = -1;
    });
    return () => {
      alive = false;
      board.tex.dispose();
      mat.dispose();
    };
  }, [board, mat]);

  return (
    <group position={pos} userData={{ pfEdges: true }}>
      <mesh material={mat} position-z={0.004} userData={{ pfNoCast: true }}>
        <planeGeometry args={size} />
      </mesh>
      <mesh geometry={frameGeo} material={frameMat} />
      <instancedMesh ref={pinMesh} args={[pinGeo, pinMat, MAX_CARDS + 1]} count={0} userData={{ pfNoTwin: true }} />
      <PictureLight anim={anim} width={size[0]} />
    </group>
  );
});
