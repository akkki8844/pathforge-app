import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { makeCanvasTexture, MONO, SANS } from "./canvases";
import { live, type Live } from "./live";
import { PLACE } from "./stage";
import type { Anim } from "./anim";

/*
 * The wall calendar under the clock: this month, the days already gone
 * crossed off in pencil, today boxed in cobalt, and the student's own
 * deadlines circled in red. Painted from the same data as the Today panel;
 * repainted when that data changes or the date does.
 */

const PX = [600, 780] as const;

function paintCalendar(ctx: CanvasRenderingContext2D, data: Live, now: Date) {
  const [w, h] = PX;
  ctx.fillStyle = "#ebe7de";
  ctx.fillRect(0, 0, w, h);
  // Binding strip and rings.
  ctx.fillStyle = "#1d1f26";
  ctx.fillRect(0, 0, w, 44);
  ctx.fillStyle = "#8d8f96";
  for (const x of [w * 0.3, w * 0.7]) {
    ctx.beginPath();
    ctx.arc(x, 22, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  const year = now.getFullYear();
  const month = now.getMonth();
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#1d1f26";
  ctx.font = `600 50px ${SANS}`;
  ctx.fillText(now.toLocaleDateString(undefined, { month: "long" }), 36, 112);
  ctx.textAlign = "right";
  ctx.font = `500 22px ${MONO}`;
  ctx.fillStyle = "#6a6d77";
  ctx.fillText(String(year), w - 36, 110);
  ctx.textAlign = "left";

  // Monday-first grid.
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const gx = 30;
  const gy = 176;
  const cw = (w - gx * 2) / 7;
  const ch = 76;
  ctx.font = `600 16px ${MONO}`;
  ctx.fillStyle = "#6a6d77";
  ["M", "T", "W", "T", "F", "S", "S"].forEach((d, i) => ctx.fillText(d, gx + i * cw + 10, gy - 22));
  ctx.fillStyle = "rgba(29,31,38,0.18)";
  ctx.fillRect(gx, gy - 12, w - gx * 2, 2);

  const marked = new Map<number, string>();
  for (const d of data.deadlines) {
    if (d.date.getFullYear() === year && d.date.getMonth() === month) marked.set(d.date.getDate(), d.label);
  }
  const today = now.getDate();
  for (let day = 1; day <= days; day++) {
    const i = lead + day - 1;
    const x = gx + (i % 7) * cw;
    const y = gy + Math.floor(i / 7) * ch;
    if (day === today) {
      ctx.fillStyle = "#2f4fb0";
      ctx.fillRect(x + 2, y, cw - 4, ch - 6);
    }
    ctx.font = `500 26px ${SANS}`;
    ctx.fillStyle = day === today ? "#ffffff" : day < today ? "rgba(29,31,38,0.45)" : "#1d1f26";
    ctx.fillText(String(day), x + 10, y + 32);
    if (day < today) {
      // Crossed off, the way a wall calendar is kept.
      ctx.strokeStyle = "rgba(60,60,70,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + cw - 10, y + ch - 14);
      ctx.moveTo(x + cw - 10, y + 8);
      ctx.lineTo(x + 8, y + ch - 14);
      ctx.stroke();
    }
    if (marked.has(day)) {
      ctx.strokeStyle = "#c8372d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x + cw / 2, y + ch / 2 - 4, cw / 2 - 3, ch / 2 - 6, -0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Footer: the next date, wherever it falls.
  const next = data.deadlines[0];
  ctx.fillStyle = "rgba(29,31,38,0.18)";
  ctx.fillRect(gx, h - 92, w - gx * 2, 2);
  ctx.font = `600 16px ${MONO}`;
  ctx.fillStyle = "#6a6d77";
  ctx.fillText("NEXT", gx, h - 56);
  ctx.font = `600 22px ${SANS}`;
  ctx.fillStyle = next ? "#c8372d" : "#6a6d77";
  const label = next
    ? `${next.label}, ${next.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : data.ready
      ? "No dates on file"
      : "";
  let text = label;
  while (ctx.measureText(text).width > w - gx * 2 - 80 && text.length > 4) text = text.slice(0, -2);
  if (text !== label) text = `${text.trimEnd()}...`;
  ctx.fillText(text, gx + 72, h - 56);
}

export const WallCalendar = memo(function WallCalendar({ anim }: { anim: Anim }) {
  const { pos, size } = PLACE.calendar;
  const page = useMemo(() => makeCanvasTexture(PX[0], PX[1]), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: page.tex,
        roughness: 0.9,
        emissive: new THREE.Color("#ffffff"),
        emissiveMap: page.tex,
        emissiveIntensity: 0,
        envMapIntensity: 0.2,
      }),
    [page],
  );
  const last = useRef("");
  useFrame(() => {
    const data = live.get();
    const now = new Date();
    const key = `${data.rev}|${now.toDateString()}`;
    mat.emissiveIntensity = anim.strip * 0.12;
    if (key === last.current) return;
    last.current = key;
    paintCalendar(page.ctx, data, now);
    page.tex.needsUpdate = true;
  });
  useLayoutEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) last.current = "";
    });
    return () => {
      alive = false;
      page.tex.dispose();
      mat.dispose();
    };
  }, [page, mat]);
  return (
    <group position={pos} userData={{ pfEdges: true }}>
      <mesh material={mat} position-z={0.006}>
        <planeGeometry args={size} />
      </mesh>
    </group>
  );
});
