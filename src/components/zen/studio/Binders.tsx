import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeCanvasTexture, MONO, SANS } from "./canvases";
import { live, SHELF_LIMIT } from "./live";
import type { Vec3 } from "./stage";

/*
 * A row of binders on the library shelf, one per recent document, each spine
 * labelled with its title. With fewer than four documents the row is made up
 * with binders for the writing sections the Library panel links to, labelled
 * as sections, so the shelf is never empty and never pretends to hold a
 * document that does not exist.
 *
 * All eight are one mesh and one texture: the spines are slots in a single
 * canvas, and every other face samples its binder's plain colour.
 */

const N = SHELF_LIMIT;
const SLOT = [96, 640] as const;
const SIZE = { w: 0.066, d: 0.24 };
const HEIGHTS = [0.3, 0.29, 0.31, 0.3, 0.28, 0.3, 0.31, 0.29];
const COLORS = ["#23262e", "#35489a", "#4a5238", "#7c4630", "#2e3a4a", "#b3a78c", "#1b1c20", "#56606e"];
const SECTIONS = ["Essays", "Applications", "Resume", "Activities"];

function paintSpines(ctx: CanvasRenderingContext2D, titles: string[], sections: number) {
  const [sw, sh] = SLOT;
  ctx.clearRect(0, 0, sw * N, sh);
  titles.forEach((title, i) => {
    const x = i * sw;
    const light = COLORS[i] === "#b3a78c";
    ctx.fillStyle = COLORS[i];
    ctx.fillRect(x, 0, sw, sh);
    // Wear along the edges.
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(x, 0, 5, sh);
    ctx.fillRect(x + sw - 5, 0, 5, sh);
    // The finger hole near the foot, and the label holder above it.
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(x + sw / 2, sh - 70, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ece7dc";
    ctx.fillRect(x + 14, 34, sw - 28, sh - 150);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 14, 34, sw - 28, sh - 150);
    // The title, reading up the spine, as it would on a shelf.
    ctx.save();
    ctx.translate(x + sw / 2 + 11, sh - 128);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#1c1c20";
    ctx.font = `600 34px ${SANS}`;
    let t = title;
    const room = sh - 190;
    while (ctx.measureText(t).width > room && t.length > 2) t = t.slice(0, -1);
    if (t !== title) t = `${t.trimEnd()}...`;
    ctx.fillText(t, 0, 0);
    ctx.restore();
    ctx.fillStyle = light ? "rgba(28,28,32,0.7)" : "rgba(242,238,231,0.75)";
    ctx.font = `500 22px ${MONO}`;
    ctx.textAlign = "center";
    if (i < titles.length - sections) ctx.fillText(String(i + 1).padStart(2, "0"), x + sw / 2, sh - 16);
    ctx.textAlign = "left";
  });
}

/** One merged mesh of eight boxes; spine faces map to their slot, the rest to a plain corner of it. */
function binderGeometry(count: number) {
  const parts: THREE.BufferGeometry[] = [];
  let x = 0;
  for (let i = 0; i < count; i++) {
    const h = HEIGHTS[i % HEIGHTS.length];
    const g = new THREE.BoxGeometry(SIZE.w, h, SIZE.d).toNonIndexed();
    // A slight lean on the last one, the way a row ends.
    if (i === count - 1 && count < N) g.rotateZ(-0.12);
    g.translate(x, h / 2, 0);
    const uv = g.getAttribute("uv");
    const u0 = i / N;
    const u1 = (i + 1) / N;
    // BoxGeometry faces, six vertices each once de-indexed: +x, -x, +y, -y, +z, -z.
    for (let v = 0; v < uv.count; v++) {
      const face = Math.floor(v / 6);
      if (face === 4) uv.setXY(v, u0 + uv.getX(v) * (u1 - u0), uv.getY(v));
      else uv.setXY(v, u0 + (u1 - u0) * 0.02, 0.5);
    }
    parts.push(g);
    x += SIZE.w + 0.004;
  }
  return mergeGeometries(parts);
}

export const Binders = memo(function Binders({ pos }: { pos: Vec3 }) {
  const atlas = useMemo(() => makeCanvasTexture(SLOT[0] * N, SLOT[1]), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: atlas.tex, roughness: 0.7, envMapIntensity: 0.3 }),
    [atlas],
  );
  const mesh = useRef<THREE.Mesh>(null);
  const shown = useRef(-1);
  const geoms = useRef<THREE.BufferGeometry[]>([]);

  useFrame(() => {
    const data = live.get();
    if (data.rev === shown.current || !mesh.current) return;
    shown.current = data.rev;
    const docs = data.shelf.map((d) => d.title.trim() || "Untitled");
    const sections = docs.length >= 4 ? 0 : Math.min(SECTIONS.length, N - docs.length);
    const titles = [...docs, ...SECTIONS.slice(0, sections)].slice(0, N);
    paintSpines(atlas.ctx, titles, sections);
    atlas.tex.needsUpdate = true;
    const g = binderGeometry(titles.length);
    const old = mesh.current.geometry;
    mesh.current.geometry = g;
    geoms.current.push(old);
  });

  useLayoutEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) shown.current = -1;
    });
    return () => {
      alive = false;
      atlas.tex.dispose();
      mat.dispose();
      mesh.current?.geometry.dispose();
      geoms.current.forEach((g) => g.dispose());
    };
  }, [atlas, mat]);

  // Starts as a full row so the build-up and the shadows see it; the frame
  // loop swaps in the real count once the titles are known.
  const initial = useMemo(() => binderGeometry(N), []);
  return <mesh ref={mesh} geometry={initial} material={mat} position={pos} userData={{ pfNoTwin: true }} />;
});
