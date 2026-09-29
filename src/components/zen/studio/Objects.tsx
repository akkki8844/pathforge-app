import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { TEST_PREP_TESTS } from "@/lib/testprep/nav";
import { makeCanvasTexture, SANS } from "./canvases";
import { live } from "./live";
import { BLUE, PLACE } from "./stage";
import type { Anim } from "./anim";

/*
 * The three stations the room gained when it became the whole app rather
 * than the dashboard: a phone on the desk (Messages), a stack of prep books on
 * a shelf (Test prep) and a cup on another (Activities). All three are built
 * here from primitives and painted canvases, so they add no downloads; they
 * are modelled the way the real things are made (a bevelled phone with a
 * glass face, cloth-bound books with a recessed page block, a cup turned on a
 * lathe with wire handles) so that close up they are objects, not shapes.
 */

/* ----------------------------------------------------------------- phone -- */

const PHONE = { w: 0.074, h: 0.0084, d: 0.156 };
const SCREEN_PX = [420, 886] as const;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function paintPhone(ctx: CanvasRenderingContext2D, now: Date) {
  const [w, h] = SCREEN_PX;
  const { comms, d } = live.get();
  ctx.clearRect(0, 0, w, h);
  // The glass: black to the edge, with the display inside it.
  ctx.fillStyle = "#050608";
  roundRect(ctx, 0, 0, w, h, 60);
  ctx.fill();
  ctx.save();
  roundRect(ctx, 9, 9, w - 18, h - 18, 52);
  ctx.clip();
  ctx.fillStyle = "#0c1330";
  ctx.fillRect(0, 0, w, h);
  // A soft wash of the brand blue rising from the foot, the way a lock screen has one.
  const wash = ctx.createRadialGradient(w * 0.5, h * 1.02, 10, w * 0.5, h * 1.02, h * 0.7);
  wash.addColorStop(0, "rgba(68,101,216,0.55)");
  wash.addColorStop(1, "rgba(68,101,216,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  // The island at the top.
  ctx.fillStyle = "#020304";
  roundRect(ctx, w / 2 - 44, 24, 88, 26, 13);
  ctx.fill();
  // The lock screen: the time, large, then what is waiting.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 27px ${SANS}`;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }), w / 2, 142);
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 136px ${SANS}`;
  ctx.fillText(now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, ""), w / 2, 268);

  const rows: Array<[string, string]> = [];
  if (comms.chats) rows.push(["Chats", `${comms.chats} unread`]);
  if (comms.teams) rows.push(["Teams", `${comms.teams} ${comms.teams === 1 ? "invite" : "invites"}`]);
  if (comms.objectives) rows.push(["Objectives", `${comms.objectives} need you`]);
  if (d?.unreadNotifications) rows.push(["Pathforge", `${d.unreadNotifications} new`]);
  if (!rows.length) rows.push(["Pathforge", "All caught up"]);

  ctx.textAlign = "left";
  rows.slice(0, 4).forEach(([title, note], i) => {
    const y = 350 + i * 118;
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    roundRect(ctx, 26, y, w - 52, 100, 26);
    ctx.fill();
    ctx.fillStyle = BLUE;
    roundRect(ctx, 46, y + 22, 56, 56, 15);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 30px ${SANS}`;
    ctx.textAlign = "center";
    ctx.fillText(title[0], 74, y + 60);
    ctx.textAlign = "left";
    ctx.font = `600 28px ${SANS}`;
    ctx.fillText(title, 122, y + 46);
    ctx.fillStyle = "rgba(255,255,255,0.74)";
    ctx.font = `500 24px ${SANS}`;
    ctx.fillText(note, 122, y + 78);
  });
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  roundRect(ctx, w / 2 - 70, h - 34, 140, 7, 4);
  ctx.fill();
  ctx.restore();
}

/** A slab with a rounded outline and a bevelled edge, the profile of a metal phone frame. */
function phoneBody() {
  const { w, d, h } = PHONE;
  const r = 0.0125;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -d / 2);
  s.lineTo(w / 2 - r, -d / 2);
  s.absarc(w / 2 - r, -d / 2 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(w / 2, d / 2 - r);
  s.absarc(w / 2 - r, d / 2 - r, r, 0, Math.PI / 2, false);
  s.lineTo(-w / 2 + r, d / 2);
  s.absarc(-w / 2 + r, d / 2 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-w / 2, -d / 2 + r);
  s.absarc(-w / 2 + r, -d / 2 + r, r, Math.PI, Math.PI * 1.5, false);
  const bevel = 0.0018;
  const g = new THREE.ExtrudeGeometry(s, {
    depth: h - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 14,
  });
  g.rotateX(Math.PI / 2);
  g.translate(0, h - bevel, 0);
  // The two side keys.
  const key = (z: number, len: number) => new RoundedBoxGeometry(0.0016, 0.0042, len, 2, 0.0007).translate(w / 2 + 0.0004, h / 2, z);
  return mergeGeometries([g.toNonIndexed(), key(-0.02, 0.014).toNonIndexed(), key(0.006, 0.02).toNonIndexed()]);
}

export const Phone = memo(function Phone({ anim }: { anim: Anim }) {
  const screen = useMemo(() => makeCanvasTexture(SCREEN_PX[0], SCREEN_PX[1]), []);
  const screenMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: screen.tex, toneMapped: false, transparent: true, alphaTest: 0.5 }),
    [screen],
  );
  const body = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8a8f9c", metalness: 0.92, roughness: 0.3, envMapIntensity: 1.2 }),
    [],
  );
  const shell = useMemo(phoneBody, []);
  const shown = useRef("");
  useFrame(() => {
    const now = new Date();
    const { rev } = live.get();
    const key = `${rev}|${now.getHours()}:${now.getMinutes()}`;
    if (key !== shown.current) {
      shown.current = key;
      paintPhone(screen.ctx, now);
      screen.tex.needsUpdate = true;
    }
    screenMat.color.setScalar(0.05 + anim.screen * 0.85);
  });
  useLayoutEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) shown.current = "";
    });
    return () => {
      alive = false;
      screen.tex.dispose();
      screenMat.dispose();
      body.dispose();
      shell.dispose();
    };
  }, [screen, screenMat, body, shell]);
  return (
    <group position={PLACE.phone.pos} rotation-y={PLACE.phone.rot} userData={{ pfEdges: true }}>
      <mesh geometry={shell} material={body} />
      <mesh
        material={screenMat}
        rotation-x={-Math.PI / 2}
        position-y={PHONE.h + 0.0004}
        userData={{ pfNoCast: true, pfNoTwin: true }}
      >
        <planeGeometry args={[PHONE.w - 0.0016, PHONE.d - 0.0016]} />
      </mesh>
    </group>
  );
});

/* ------------------------------------------------------------ prep books -- */

// Covers in each test's own colours: the College Board's yellow and blue for
// the SAT family, the ACT's red, the CLT's blue and teal.
const COVERS: Record<string, [string, string]> = {
  sat: ["#324ec7", "#fddb00"],
  psat: ["#fddb00", "#1d2233"],
  act: ["#c8102e", "#ffffff"],
  preact: ["#1d2233", "#ff6b5b"],
  clt: ["#1b3a6b", "#2ec4b6"],
};
const BOOK = { w: 0.3, d: 0.215 };
const THICK = [0.046, 0.038, 0.05, 0.034, 0.042];
const SPINE_PX = [512, 64] as const;
const COVER_PX = 384;

/** Spines in rows, then, below them, the cover of the book on top of the stack. */
function paintSpines(ctx: CanvasRenderingContext2D) {
  const [sw, sh] = SPINE_PX;
  const tests = TEST_PREP_TESTS.slice(0, THICK.length);
  tests.forEach((t, i) => {
    const [bg, fg] = COVERS[t.testId] ?? [BLUE, "#ffffff"];
    const y = i * sh;
    ctx.fillStyle = bg;
    ctx.fillRect(0, y, sw, sh);
    // Cloth: a fine weave, and a little wear where the spine meets the boards.
    for (let k = 0; k < 900; k++) {
      ctx.fillStyle = `rgba(${k % 2 ? "255,255,255" : "0,0,0"},${0.03 + (k % 7) * 0.006})`;
      ctx.fillRect((k * 53) % sw, y + ((k * 29) % sh), 1 + (k % 5), 1);
    }
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, y, 10, sh);
    ctx.fillRect(sw - 10, y, 10, sh);
    ctx.fillStyle = fg;
    ctx.fillRect(18, y + 7, sw - 36, 2);
    ctx.fillRect(18, y + sh - 9, sw - 36, 2);
    ctx.font = `700 30px ${SANS}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(t.label.toUpperCase(), 34, y + sh / 2 + 1);
    ctx.font = `600 19px ${SANS}`;
    ctx.textAlign = "right";
    ctx.fillText("PRACTICE", sw - 34, y + sh / 2 + 1);
  });
  // The cover of the top book, in the space under the spines.
  const top = tests[tests.length - 1];
  const oy = sh * THICK.length;
  const [bg, fg] = COVERS[top?.testId ?? ""] ?? [BLUE, "#ffffff"];
  ctx.fillStyle = bg;
  ctx.fillRect(0, oy, sw, COVER_PX);
  ctx.fillStyle = fg;
  ctx.fillRect(34, oy + 34, sw - 68, 3);
  ctx.fillRect(34, oy + COVER_PX - 40, sw - 68, 3);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 84px ${SANS}`;
  ctx.fillText((top?.label ?? "Test").toUpperCase(), 40, oy + 150);
  ctx.font = `600 30px ${SANS}`;
  ctx.fillText("OFFICIAL-STYLE PRACTICE", 42, oy + 200);
  ctx.font = `600 22px ${SANS}`;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("Question bank and full exams", 42, oy + 240);
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(sw - 90, oy + COVER_PX - 100, 22, 0, Math.PI * 2);
  ctx.fill();
}

export const PrepBooks = memo(function PrepBooks() {
  const atlasH = SPINE_PX[1] * THICK.length + COVER_PX;
  const atlas = useMemo(() => makeCanvasTexture(SPINE_PX[0], atlasH), [atlasH]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: atlas.tex, roughness: 0.66, envMapIntensity: 0.5 }), [atlas]);
  const pagesMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#efe6d2", roughness: 0.9 }), []);
  const geometry = useMemo(() => {
    const n = THICK.length;
    const board = 0.0042;
    const cover: THREE.BufferGeometry[] = [];
    const pages: THREE.BufferGeometry[] = [];
    let y = 0;
    for (let i = 0; i < n; i++) {
      const t = THICK[i];
      const v0 = 1 - (i + 1) / (atlasH / SPINE_PX[1]);
      const v1 = 1 - i / (atlasH / SPINE_PX[1]);
      const flatUV = (g: THREE.BufferGeometry) => {
        const uv = g.getAttribute("uv");
        for (let k = 0; k < uv.count; k++) uv.setXY(k, 0.02, (v0 + v1) / 2);
        return g;
      };
      const parts: THREE.BufferGeometry[] = [];
      // Boards top and bottom, a spine across the +z edge, all with soft edges.
      const top = new RoundedBoxGeometry(BOOK.w, board, BOOK.d, 2, 0.0018).translate(0, t - board / 2, 0);
      const bottom = new RoundedBoxGeometry(BOOK.w, board, BOOK.d, 2, 0.0018).translate(0, board / 2, 0);
      const spine = new RoundedBoxGeometry(BOOK.w, t, 0.008, 3, 0.0032).translate(0, t / 2, BOOK.d / 2 - 0.004);
      const suv = spine.getAttribute("uv");
      const spn = spine.getAttribute("normal");
      for (let k = 0; k < suv.count; k++) {
        if (spn.getZ(k) > 0.7) suv.setXY(k, suv.getX(k), v0 + suv.getY(k) * (v1 - v0));
        else suv.setXY(k, 0.02, (v0 + v1) / 2);
      }
      // The top book carries its cover art on the upper board.
      if (i === n - 1) {
        const tuv = top.getAttribute("uv");
        const tn = top.getAttribute("normal");
        const cv0 = 0;
        const cv1 = COVER_PX / atlasH;
        for (let k = 0; k < tuv.count; k++) {
          if (tn.getY(k) > 0.7) tuv.setXY(k, tuv.getX(k), cv0 + tuv.getY(k) * (cv1 - cv0));
          else tuv.setXY(k, 0.02, (v0 + v1) / 2);
        }
        parts.push(top, flatUV(bottom), spine);
      } else parts.push(flatUV(top), flatUV(bottom), spine);
      const pg = new THREE.BoxGeometry(BOOK.w - 0.012, t - board * 2 + 0.001, BOOK.d - 0.012).translate(-0.001, t / 2, -0.004);
      pages.push(pg);
      const m = mergeGeometries(parts.map((p) => p.toNonIndexed()));
      // A little out of square, the way a stack is.
      const rot = (i % 2 ? 1 : -1) * (0.03 + i * 0.012);
      const off = (i % 3) * 0.008 - 0.008;
      m.rotateY(rot);
      m.translate(off, y, 0);
      pg.rotateY(rot);
      pg.translate(off, y, 0);
      cover.push(m);
      y += t;
    }
    return { cover: mergeGeometries(cover), pages: mergeGeometries(pages) };
  }, [atlasH]);
  const painted = useRef(false);
  useFrame(() => {
    if (painted.current) return;
    painted.current = true;
    paintSpines(atlas.ctx);
    atlas.tex.needsUpdate = true;
  });
  useLayoutEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) painted.current = false;
    });
    return () => {
      alive = false;
      atlas.tex.dispose();
      mat.dispose();
      pagesMat.dispose();
      geometry.cover.dispose();
      geometry.pages.dispose();
    };
  }, [atlas, mat, pagesMat, geometry]);
  const [x, y] = PLACE.books.local;
  return (
    <group position={[x, y, -0.13]} rotation-y={0.05} userData={{ pfNoTwin: true }}>
      <mesh geometry={geometry.cover} material={mat} />
      <mesh geometry={geometry.pages} material={pagesMat} />
    </group>
  );
});

/* ---------------------------------------------------------------- trophy -- */

const gold = new THREE.MeshStandardMaterial({ color: "#f0c96a", metalness: 1, roughness: 0.26, envMapIntensity: 1.9 });
const plinth = new THREE.MeshStandardMaterial({ color: "#1b2030", roughness: 0.22, metalness: 0.15, envMapIntensity: 1.1 });
const plate = new THREE.MeshStandardMaterial({ color: "#d9b25a", metalness: 1, roughness: 0.34, envMapIntensity: 1.4 });

export const Trophy = memo(function Trophy() {
  const { cup, base, tier, plateGeo } = useMemo(() => {
    // Turned on a lathe: a spread foot, a stem with a knop, a flared bowl, a rolled lip.
    const p: Array<[number, number]> = [
      [0, 0],
      [0.036, 0],
      [0.038, 0.003],
      [0.037, 0.007],
      [0.026, 0.011],
      [0.014, 0.017],
      [0.0105, 0.03],
      [0.0135, 0.036],
      [0.023, 0.042],
      [0.024, 0.048],
      [0.017, 0.054],
      [0.0115, 0.062],
      [0.0115, 0.074],
      [0.02, 0.082],
      [0.042, 0.094],
      [0.058, 0.118],
      [0.064, 0.15],
      [0.064, 0.184],
      [0.0665, 0.19],
      [0.064, 0.195],
      [0.0615, 0.191],
      [0.0605, 0.16],
      [0.05, 0.124],
      [0.03, 0.106],
      [0, 0.1],
    ];
    const profile = p.map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.LatheGeometry(profile, 56);
    // Wire handles: a loop out from the bowl and back to it.
    const loop = (side: 1 | -1) => {
      const c = new THREE.CubicBezierCurve3(
        new THREE.Vector3(side * 0.056, 0.13, 0),
        new THREE.Vector3(side * 0.115, 0.13, 0),
        new THREE.Vector3(side * 0.112, 0.19, 0),
        new THREE.Vector3(side * 0.064, 0.178, 0),
      );
      return new THREE.TubeGeometry(c, 26, 0.0042, 10, false);
    };
    const c = mergeGeometries([body.toNonIndexed(), loop(1).toNonIndexed(), loop(-1).toNonIndexed()]).translate(0, 0.048, 0);
    // A two-tier plinth with rounded edges, and a plate on its front.
    const b = new RoundedBoxGeometry(0.118, 0.032, 0.118, 3, 0.004).translate(0, 0.016, 0);
    const t = new RoundedBoxGeometry(0.086, 0.016, 0.086, 3, 0.003).translate(0, 0.04, 0);
    const pl = new THREE.BoxGeometry(0.058, 0.014, 0.0016).translate(0, 0.017, 0.0598);
    return { cup: c, base: b, tier: t, plateGeo: pl };
  }, []);
  useLayoutEffect(
    () => () => {
      cup.dispose();
      base.dispose();
      tier.dispose();
      plateGeo.dispose();
    },
    [cup, base, tier, plateGeo],
  );
  const [x, y] = PLACE.trophy.local;
  return (
    <group position={[x, y, -0.14]} rotation-y={0.35} userData={{ pfEdges: true }}>
      <mesh geometry={base} material={plinth} />
      <mesh geometry={tier} material={plinth} />
      <mesh geometry={plateGeo} material={plate} />
      <mesh geometry={cup} material={gold} />
    </group>
  );
});
