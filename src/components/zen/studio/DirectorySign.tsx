import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NAVBAR_MAIN_LINKS, NAVBAR_OTHER_GROUPS } from "@/components/layout/Navbar";
import { ROUTINE_DESTINATIONS } from "@/lib/routine/nav";
import { makeCanvasTexture, MONO, SANS } from "./canvases";
import { PLACE, STATIONS } from "./stage";
import type { Anim } from "./anim";

/*
 * The building directory beside the door: a lit steel plate listing where
 * everything is, floor by floor, the way the board by a lift does. Floor 01
 * is this room; the rest are the app's departments, straight from the
 * navigation bar, so the sign never lists a page that is not there.
 */

const PX = [920, 1240] as const;

function floors(): Array<[string, string]> {
  return [
    ["This study", STATIONS.filter((s) => s.id !== "door").map((s) => s.title).join(", ")],
    ["Main", NAVBAR_MAIN_LINKS.map((l) => l.label).join(", ")],
    ...NAVBAR_OTHER_GROUPS.map((g): [string, string] => [
      g.title,
      g.links
        .filter((l) => !l.disabled)
        .map((l) => l.label.replace(/ Builder$/, ""))
        .join(", "),
    ]),
    ["Routine", ROUTINE_DESTINATIONS.map((d) => d.label).join(", ")],
  ];
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(" ")) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > width && line) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

function paintSign(ctx: CanvasRenderingContext2D) {
  const [w, h] = PX;
  ctx.fillStyle = "#121317";
  ctx.fillRect(0, 0, w, h);
  // Four screw heads.
  ctx.fillStyle = "#3a3c44";
  for (const [x, y] of [
    [34, 34],
    [w - 34, 34],
    [34, h - 34],
    [w - 34, h - 34],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  const m = 76;
  ctx.fillStyle = "#f2eee7";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 64px ${SANS}`;
  ctx.fillText("Directory", m, 150);
  ctx.font = `500 22px ${MONO}`;
  ctx.fillStyle = "rgba(242,238,231,0.55)";
  ctx.textAlign = "right";
  ctx.fillText("PRESS D", w - m, 148);
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(242,238,231,0.22)";
  ctx.fillRect(m, 184, w - m * 2, 2);

  let y = 250;
  floors().forEach(([name, list], i) => {
    ctx.fillStyle = "#7090ff";
    ctx.font = `400 58px ${MONO}`;
    ctx.fillText(String(i + 1).padStart(2, "0"), m, y + 30);
    ctx.fillStyle = "#f2eee7";
    ctx.font = `600 30px ${SANS}`;
    ctx.fillText(name, m + 118, y);
    ctx.fillStyle = "rgba(242,238,231,0.6)";
    ctx.font = `400 22px ${SANS}`;
    const lines = wrap(ctx, list, w - m * 2 - 118).slice(0, 3);
    lines.forEach((l, j) => ctx.fillText(l, m + 118, y + 38 + j * 30));
    y += 38 + lines.length * 30 + 50;
  });

  ctx.fillStyle = "rgba(242,238,231,0.22)";
  ctx.fillRect(m, h - 128, w - m * 2, 2);
  ctx.fillStyle = "rgba(242,238,231,0.55)";
  ctx.font = `500 22px ${MONO}`;
  ctx.fillText("CTRL K FROM ANYWHERE", m, h - 78);
  ctx.textAlign = "right";
  ctx.fillText("EXIT \u2192", w - m, h - 78);
  ctx.textAlign = "left";
}

export const DirectorySign = memo(function DirectorySign({ anim }: { anim: Anim }) {
  const { pos, size } = PLACE.directory;
  const face = useMemo(() => makeCanvasTexture(PX[0], PX[1]), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: face.tex,
        roughness: 0.55,
        metalness: 0.2,
        emissive: new THREE.Color("#ffffff"),
        emissiveMap: face.tex,
        emissiveIntensity: 0,
        envMapIntensity: 0.4,
      }),
    [face],
  );
  const plate = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b1c21", roughness: 0.5, metalness: 0.6 }), []);
  const painted = useRef(false);
  useFrame(() => {
    // Lit from within, like the board in a lobby.
    mat.emissiveIntensity = 0.06 + anim.strip * 0.5;
    if (painted.current) return;
    painted.current = true;
    paintSign(face.ctx);
    face.tex.needsUpdate = true;
  });
  useLayoutEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) painted.current = false;
    });
    return () => {
      alive = false;
      face.tex.dispose();
      mat.dispose();
      plate.dispose();
    };
  }, [face, mat, plate]);
  return (
    <group position={pos} rotation-y={-Math.PI / 2} userData={{ pfEdges: true }}>
      <mesh material={plate} position-z={-0.004}>
        <boxGeometry args={[size[0] + 0.02, size[1] + 0.02, 0.012]} />
      </mesh>
      <mesh material={mat} position-z={0.0035} userData={{ pfNoTwin: true }}>
        <planeGeometry args={size} />
      </mesh>
    </group>
  );
});
