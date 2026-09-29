import * as THREE from "three";
import type { CollegeNewsItem } from "@/hooks/useCollegeNews";
import { makeCanvasTexture, MONO, rand } from "./canvases";

/*
 * The paper the reader holds: a broadsheet spread, printed from the same
 * admissions feed the News panel tells. The outside of the spread faces the
 * room, back page on the left and the front page on the right, so from the
 * doorway you can read tonight's lead over her hands. When she lowers it to
 * talk to you, it folds in half along the spine and lands front page up.
 *
 * A newspaper is the one place in the study set in a serif: it is a printed
 * paper, and the system serif keeps it free of font files.
 */

const SERIF = 'Georgia, "Times New Roman", Times, serif';
const INK = "#1c1c20";
const GREY = "rgba(28,28,32,0.24)";
const PAPER = "#e4dfd4";

/** One page, in metres. The spread is two of them side by side. */
export const PAGE = { w: 0.3, h: 0.4 };

/** Layout units: one page is 512 x 683 (3:4); the canvas is twice that for crisp type. */
const PX = { w: 1024, h: 683 };
const PW = PX.w / 2;
const DPR = 2;

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = w;
      if (lines.length === max) break;
    } else line = next;
  }
  if (lines.length < max && line) lines.push(line);
  if (lines.length === max && words.join(" ") !== lines.join(" ")) {
    let last = lines[max - 1];
    while (ctx.measureText(`${last}...`).width > width && last.length > 3) last = last.slice(0, -1);
    lines[max - 1] = `${last.trimEnd()}...`;
  }
  return lines;
}

/** Body copy too small to read at arm's length: ruled grey lines, ragged at paragraph ends. */
function body(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, lh = 8) {
  const r = rand(seed);
  ctx.fillStyle = GREY;
  for (let yy = y; yy < y + h - 4; yy += lh) {
    const end = r() < 0.12;
    ctx.fillRect(x, yy, end ? w * (0.3 + r() * 0.5) : w - r() * 6, lh * 0.36);
    if (end) yy += lh * 0.5;
  }
}

/**
 * The lead photograph, as newsprint holds one: a dot screen. The picture is a
 * college front at dusk (pediment, columns, steps, a tree either side), drawn
 * as a tone field so it reads as a photo from across the room.
 */
function tone(u: number, v: number): number {
  let t = 0.12 + v * 0.14;
  const cx = Math.abs(u - 0.5);
  for (const [tx, ty, tr] of [
    [0.07, 0.58, 0.16],
    [0.94, 0.6, 0.14],
  ])
    if (Math.hypot((u - tx) * 1.5, v - ty) < tr) t = 0.82;
  if (v > 0.28 && v <= 0.42 && cx < 0.36 * ((v - 0.28) / 0.14)) t = 0.62;
  if (v > 0.42 && v <= 0.47 && cx < 0.37) t = 0.72;
  if (v > 0.47 && v <= 0.84 && cx < 0.34) t = (u * 16) % 2 < 0.9 ? 0.3 : 0.78;
  if (v > 0.84 && v <= 0.93 && cx < 0.4 + (v - 0.84) * 1.2) t = 0.38 + Math.floor((v - 0.84) * 50) * 0.04;
  if (v > 0.93) t = 0.66;
  return t;
}

function halftone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#d6d0c4";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = INK;
  const step = 4;
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const t = tone((xx - x) / w, (yy - y) / h);
      const rad = (step / 2) * Math.sqrt(t) * 0.95;
      if (rad < 0.2) continue;
      ctx.beginPath();
      ctx.arc(xx, yy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.75;
  ctx.strokeRect(x, y, w, h);
}

function rule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, weight = 1) {
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, w, weight);
}

const DATE = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

function frontPage(ctx: CanvasRenderingContext2D, x0: number, news: CollegeNewsItem[], ready: boolean, now: Date) {
  const m = 22;
  const x = x0 + m;
  const w = PW - m * 2;
  const bottom = PX.h - 22;
  let y = 22;
  const start = new Date(now.getFullYear(), 0, 0);
  const issue = Math.floor((now.getTime() - start.getTime()) / 86_400_000);

  ctx.fillStyle = INK;
  ctx.font = `500 9px ${MONO}`;
  ctx.textAlign = "left";
  ctx.fillText(`NO. ${issue}`, x, y + 8);
  ctx.textAlign = "right";
  ctx.fillText("ADMISSIONS EDITION", x + w, y + 8);
  y += 15;
  rule(ctx, x, y, w, 1.5);

  ctx.textAlign = "center";
  ctx.font = `700 44px ${SERIF}`;
  ctx.fillText("The Evening Desk", x0 + PW / 2, y + 46);
  y += 58;
  rule(ctx, x, y, w, 2);
  rule(ctx, x, y + 4, w, 0.75);
  y += 6;
  ctx.font = `500 9px ${MONO}`;
  ctx.textAlign = "left";
  ctx.fillText(DATE.format(now).toUpperCase(), x, y + 13);
  ctx.textAlign = "right";
  ctx.fillText("PATHFORGE", x + w, y + 13);
  y += 19;
  rule(ctx, x, y, w, 0.75);
  y += 6;
  ctx.textAlign = "left";

  const lead = news[0];
  if (!lead) {
    ctx.font = `700 28px ${SERIF}`;
    const lines = wrap(ctx, ready ? "No news in today. The desk refreshes once a day." : "Tonight's edition is on the press.", w, 3);
    lines.forEach((l, i) => ctx.fillText(l, x, y + 28 + i * 31));
    y += 28 + lines.length * 31;
    body(ctx, x, y, w, bottom - y, 7);
    return;
  }

  ctx.font = `700 28px ${SERIF}`;
  const head = wrap(ctx, lead.title, w, 4);
  head.forEach((l, i) => ctx.fillText(l, x, y + 28 + i * 31));
  y += 28 + (head.length - 1) * 31 + 14;
  ctx.font = `500 8.5px ${MONO}`;
  ctx.fillStyle = "rgba(28,28,32,0.7)";
  ctx.fillText(`FROM ${lead.source.toUpperCase()}`, x, y + 6);
  ctx.fillStyle = INK;
  y += 14;

  // Photo across the top, then two columns.
  const ph = 150;
  halftone(ctx, x, y, w, ph);
  y += ph + 12;
  const gap = 12;
  const col = (w - gap) / 2;
  const colTop = y;
  if (lead.summary) {
    ctx.font = `400 12.5px ${SERIF}`;
    const lines = wrap(ctx, lead.summary, col, 8);
    lines.forEach((l, i) => ctx.fillText(l, x, y + 11 + i * 16));
    y += 11 + lines.length * 16;
  }
  const second = news[1];
  const secondH = second ? 118 : 0;
  body(ctx, x, y, col, bottom - y, 3);
  body(ctx, x + col + gap, colTop, col, bottom - colTop - secondH, 5);
  if (second) {
    let sy = bottom - secondH + 6;
    rule(ctx, x + col + gap, sy, col, 1.5);
    sy += 6;
    ctx.font = `700 16px ${SERIF}`;
    const lines = wrap(ctx, second.title, col, 3);
    lines.forEach((l, i) => ctx.fillText(l, x + col + gap, sy + 16 + i * 19));
    sy += 16 + lines.length * 19;
    body(ctx, x + col + gap, sy, col, bottom - sy, 9);
  }
  // Column rule.
  ctx.fillStyle = "rgba(28,28,32,0.28)";
  ctx.fillRect(x + col + gap / 2 - 0.25, colTop, 0.5, bottom - colTop);
}

function backPage(ctx: CanvasRenderingContext2D, x0: number, news: CollegeNewsItem[]) {
  const m = 22;
  const x = x0 + m;
  const w = PW - m * 2;
  const bottom = PX.h - 22;
  let y = 22;
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.font = `500 9px ${MONO}`;
  ctx.fillText("IN BRIEF", x, y + 8);
  ctx.textAlign = "right";
  ctx.fillText("B2", x + w, y + 8);
  ctx.textAlign = "left";
  y += 15;
  rule(ctx, x, y, w, 1.5);
  y += 10;

  const rest = news.slice(2, 6);
  const crossword = 136;
  const room = bottom - crossword - 12 - y;
  const each = rest.length ? room / rest.length : room;
  rest.forEach((n, i) => {
    const top = y + i * each;
    ctx.font = `500 8px ${MONO}`;
    ctx.fillStyle = "rgba(28,28,32,0.7)";
    ctx.fillText(n.source.toUpperCase(), x, top + 8);
    ctx.fillStyle = INK;
    ctx.font = `700 18px ${SERIF}`;
    const lines = wrap(ctx, n.title, w, 3);
    lines.forEach((l, j) => ctx.fillText(l, x, top + 29 + j * 21));
    const after = top + 29 + (lines.length - 1) * 21 + 9;
    body(ctx, x, after, w, Math.max(0, top + each - after - 12), 20 + i);
    rule(ctx, x, top + each - 6, w, 0.75);
  });
  if (!rest.length) body(ctx, x, y, w, room, 31);

  // The crossword, half done.
  const cy = bottom - crossword;
  ctx.font = `500 8px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText("CROSSWORD", x, cy + 8);
  const n = 9;
  const cell = Math.floor((crossword - 16) / n);
  const gy = cy + 16;
  ctx.lineWidth = 0.5;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const black = GRID[j][i] === "#";
      ctx.fillStyle = black ? INK : "#efebe3";
      ctx.fillRect(x + i * cell, gy + j * cell, cell, cell);
      ctx.strokeStyle = "rgba(28,28,32,0.6)";
      ctx.strokeRect(x + i * cell, gy + j * cell, cell, cell);
    }
  body(ctx, x + n * cell + 12, gy, w - n * cell - 12, n * cell, 44, 7);
}

/** A symmetric 9 x 9 grid, as a real puzzle is laid out. */
const GRID = ["...#.....", ".#.#.#.#.", ".....#...", "#.#...#.#", "....#....", "#.#...#.#", "...#.....", ".#.#.#.#.", ".....#..."];

/** The inside of the spread, the side facing her: columns only. */
function paintInside(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PX.w, PX.h);
  for (const x0 of [0, PW]) {
    const x = x0 + 22;
    const w = PW - 44;
    rule(ctx, x, 30, w, 1.5);
    ctx.fillStyle = "rgba(28,28,32,0.6)";
    ctx.fillRect(x, 44, w * 0.8, 15);
    ctx.fillRect(x, 64, w * 0.55, 15);
    const col = (w - 12) / 3;
    for (let c = 0; c < 3; c++) body(ctx, x + c * (col + 6), 92, col, PX.h - 116, 60 + c + x0);
  }
}

export function paintOutside(ctx: CanvasRenderingContext2D, news: CollegeNewsItem[], ready: boolean, now: Date) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PX.w, PX.h);
  backPage(ctx, 0, news);
  frontPage(ctx, PW, news, ready, now);
  // The fold down the middle, a shade darker where the paper creases.
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(PW - 1.5, 0, 3, PX.h);
}

/**
 * One page of the spread: slightly cupped toward the reader, the way paper
 * held at its edges sags, pivoting on the spine at x = 0.
 */
function pageGeometry(side: -1 | 1, u0: number) {
  const g = new THREE.PlaneGeometry(PAGE.w, PAGE.h, 10, 1);
  g.translate((side * PAGE.w) / 2, 0, 0);
  const pos = g.getAttribute("position");
  const uv = g.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) {
    const t = Math.abs(pos.getX(i)) / PAGE.w;
    pos.setZ(i, -0.018 * t * t);
    uv.setX(i, u0 + uv.getX(i) * 0.5);
  }
  g.computeVertexNormals();
  return g;
}

export type Paper = {
  group: THREE.Group;
  /** 0 = open spread, 1 = folded in half with the front page outside. */
  fold: (t: number) => void;
  repaint: (news: CollegeNewsItem[], ready: boolean) => void;
  setGlow: (k: number) => void;
  dispose: () => void;
};

/** How far the pages sit off flat when the paper is open: a shallow V toward her. */
const OPEN = 0.13;

export function makePaper(): Paper {
  const outside = makeCanvasTexture(PX.w * DPR, PX.h * DPR);
  const inside = makeCanvasTexture(PX.w / 2, PX.h / 2);
  const front = new THREE.MeshStandardMaterial({
    map: outside.tex,
    roughness: 0.95,
    emissive: new THREE.Color("#ffffff"),
    emissiveMap: outside.tex,
    emissiveIntensity: 0,
    envMapIntensity: 0.25,
    side: THREE.FrontSide,
  });
  const back = new THREE.MeshStandardMaterial({ map: inside.tex, roughness: 0.95, envMapIntensity: 0.25, side: THREE.BackSide });
  // The inside at half size: its lines are never read.
  inside.ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
  paintInside(inside.ctx);
  inside.tex.needsUpdate = true;

  const group = new THREE.Group();
  const pivots: THREE.Group[] = [];
  const geoms: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1] as const) {
    const pivot = new THREE.Group();
    const g = pageGeometry(side, side < 0 ? 0 : 0.5);
    geoms.push(g);
    const a = new THREE.Mesh(g, front);
    const b = new THREE.Mesh(g, back);
    for (const m of [a, b]) {
      m.userData.pfNoCast = true;
      m.userData.pfNoTwin = true;
      m.frustumCulled = false;
    }
    pivot.add(a, b);
    group.add(pivot);
    pivots.push(pivot);
  }

  const fold = (t: number) => {
    // The left page swings over behind the right one; the right one flattens.
    pivots[0].rotation.y = -OPEN + t * -(Math.PI - OPEN - 0.04);
    pivots[1].rotation.y = OPEN * (1 - t);
    // Folded, it is half as wide: keep the stack a hair apart so they never z-fight.
    pivots[0].position.z = -0.002 * t;
    // Folded flat: the cup a held page has would make the halves cross.
    pivots[0].scale.z = pivots[1].scale.z = 1 - t * 0.95;
  };
  fold(0);

  return {
    group,
    fold,
    repaint(news, ready) {
      paintOutside(outside.ctx, news, ready, new Date());
      outside.tex.needsUpdate = true;
    },
    setGlow(k) {
      front.emissiveIntensity = k;
    },
    dispose() {
      outside.tex.dispose();
      inside.tex.dispose();
      front.dispose();
      back.dispose();
      geoms.forEach((g) => g.dispose());
    },
  };
}
