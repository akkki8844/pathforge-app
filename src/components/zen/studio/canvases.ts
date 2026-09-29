import * as THREE from "three";
import type { PlanItem } from "./plan";
import type { TimerSnapshot } from "./focus";

/*
 * Everything in the room that shows words is a canvas painted in 2D and
 * uploaded as a texture: the neon sign, the laptop screen, the chalkboard and
 * the night outside. That keeps type crisp at any distance, uses the fonts the
 * page already has, and costs no font files inside the 3D pipeline.
 */

export const SANS = '"Sora", "Plus Jakarta Sans", system-ui, sans-serif';
/** Body text on painted things: the app's own text face. */
export const TEXT = '"Plus Jakarta Sans", system-ui, sans-serif';
export const MONO = '"Geist Mono Variable", ui-monospace, "SFMono-Regular", Consolas, monospace';

export function makeCanvasTexture(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  return { canvas, ctx, tex };
}

/* ------------------------------------------------------------------ neon -- */

export function paintNeon(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(h * 0.56)}px ${SANS}`;
  const x = w / 2;
  const y = h * 0.5;
  // Glass tube: a wide soft halo, a coloured tube, then a hot white core.
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(95,130,255,0.9)";
  ctx.shadowBlur = h * 0.12;
  ctx.strokeStyle = "rgba(95,130,255,0.55)";
  ctx.lineWidth = h * 0.05;
  ctx.strokeText("pathforge.", x, y);
  ctx.shadowBlur = h * 0.04;
  ctx.strokeStyle = "rgba(150,175,255,1)";
  ctx.lineWidth = h * 0.024;
  ctx.strokeText("pathforge.", x, y);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(235,241,255,1)";
  ctx.lineWidth = h * 0.009;
  ctx.strokeText("pathforge.", x, y);
}

/**
 * The wordmark painted on the back wall by day, the way a studio signs its
 * own wall: the brand's blue mark and the name in ink.
 */
export function paintWordmark(ctx: CanvasRenderingContext2D, w: number, h: number, logo?: HTMLImageElement) {
  ctx.clearRect(0, 0, w, h);
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(h * 0.5)}px ${SANS}`;
  const text = "pathforge";
  const tw = ctx.measureText(text).width;
  const mark = logo ? h * 0.78 : 0;
  const gap = logo ? h * 0.08 : 0;
  const x0 = (w - (mark + gap + tw)) / 2;
  const y = h / 2;
  // The app's own mark, as it sits in the navigation bar.
  if (logo) ctx.drawImage(logo, x0, y - mark / 2, mark, mark);
  ctx.fillStyle = "#1a2238";
  ctx.textAlign = "left";
  ctx.fillText(text, x0 + mark + gap, y + h * 0.02);
  ctx.fillStyle = "#4465d8";
  ctx.fillText(".", x0 + mark + gap + tw, y + h * 0.02);
}

/* ------------------------------------------------------------------- sky -- */

export function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function paintSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = rand(7);
  ctx.fillStyle = "#060a16";
  ctx.fillRect(0, 0, w, h);
  // Haze near the horizon, where a city lights its own sky.
  const haze = ctx.createLinearGradient(0, h * 0.35, 0, h);
  haze.addColorStop(0, "rgba(40,55,105,0)");
  haze.addColorStop(1, "rgba(40,55,105,0.55)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, w, h);
  // Stars.
  for (let i = 0; i < 420; i++) {
    const a = r() * 0.8 + 0.1;
    ctx.fillStyle = `rgba(220,228,255,${a * 0.8})`;
    const s = r() < 0.94 ? 1 : 2;
    ctx.fillRect(r() * w, r() * h * 0.62, s, s);
  }
  // Moon with a soft halo.
  const mx = w * 0.66;
  const my = h * 0.2;
  const mr = h * 0.045;
  const halo = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 6);
  halo.addColorStop(0, "rgba(190,205,255,0.35)");
  halo.addColorStop(1, "rgba(190,205,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
  ctx.fillStyle = "#e9edf8";
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(170,178,200,0.35)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(mx + (r() - 0.5) * mr, my + (r() - 0.5) * mr, mr * (0.12 + r() * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }
  // Two rows of skyline, the far one lighter, each with a few lit windows.
  const rows: Array<{ base: number; min: number; max: number; color: string; lit: number }> = [
    { base: h * 0.74, min: h * 0.06, max: h * 0.22, color: "#0c1226", lit: 0.05 },
    { base: h * 0.86, min: h * 0.08, max: h * 0.34, color: "#070a15", lit: 0.09 },
  ];
  for (const row of rows) {
    let x = -10;
    while (x < w) {
      const bw = 40 + r() * 110;
      const bh = row.min + r() * (row.max - row.min);
      const top = row.base - bh;
      ctx.fillStyle = row.color;
      ctx.fillRect(x, top, bw, h - top);
      for (let wy = top + 10; wy < h - 8; wy += 14) {
        for (let wx = x + 8; wx < x + bw - 8; wx += 12) {
          if (r() < row.lit) {
            ctx.fillStyle = r() < 0.7 ? "rgba(255,196,120,0.85)" : "rgba(170,195,255,0.8)";
            ctx.fillRect(wx, wy, 5, 7);
          }
        }
      }
      x += bw + r() * 6;
    }
  }
}

/**
 * A clear afternoon over a college town: pale sky, a few slow clouds, and
 * the campus on the skyline (a clock tower, a dome, trees), so the window
 * looks out on where all this is heading.
 */
export function paintDaySky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const r = rand(19);
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.8);
  sky.addColorStop(0, "#8fb4ec");
  sky.addColorStop(0.55, "#c4d8f4");
  sky.addColorStop(1, "#eef3fa");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Clouds: clusters of soft white ellipses, flattened underneath.
  for (let c = 0; c < 9; c++) {
    const cx = r() * w;
    const cy = h * (0.08 + r() * 0.36);
    const s = w * (0.03 + r() * 0.05);
    for (let k = 0; k < 9; k++) {
      const ex = cx + (r() - 0.5) * s * 3.2;
      const ey = cy + (r() - 0.6) * s * 0.7;
      const rad = s * (0.45 + r() * 0.6);
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, rad);
      g.addColorStop(0, "rgba(255,255,255,0.75)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(ex - rad, ey - rad, rad * 2, rad * 2);
    }
  }
  // Far hills, hazy.
  ctx.fillStyle = "#b9c9dc";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.74);
  for (let x = 0; x <= w; x += 32) ctx.lineTo(x, h * (0.7 - Math.sin(x / w * 5.1 + 1) * 0.025 - r() * 0.006));
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  // The campus: low halls, a clock tower and a dome, in soft blue-grey.
  const base = h * 0.8;
  ctx.fillStyle = "#9fb0c6";
  let x = -20;
  while (x < w) {
    const bw = 70 + r() * 160;
    const bh = h * (0.05 + r() * 0.07);
    ctx.fillRect(x, base - bh, bw, h - base + bh);
    // Pitched roofs on some.
    if (r() < 0.45) {
      ctx.beginPath();
      ctx.moveTo(x, base - bh);
      ctx.lineTo(x + bw / 2, base - bh - h * 0.03);
      ctx.lineTo(x + bw, base - bh);
      ctx.fill();
    }
    x += bw + 8 + r() * 40;
  }
  const tx = w * 0.62;
  ctx.fillRect(tx, base - h * 0.27, w * 0.028, h * 0.27);
  ctx.beginPath();
  ctx.moveTo(tx - 6, base - h * 0.27);
  ctx.lineTo(tx + w * 0.014, base - h * 0.34);
  ctx.lineTo(tx + w * 0.028 + 6, base - h * 0.27);
  ctx.fill();
  ctx.fillStyle = "#eef3fa";
  ctx.beginPath();
  ctx.arc(tx + w * 0.014, base - h * 0.23, w * 0.008, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9fb0c6";
  const dx = w * 0.3;
  ctx.fillRect(dx - w * 0.05, base - h * 0.1, w * 0.1, h * 0.1);
  ctx.beginPath();
  ctx.arc(dx, base - h * 0.1, w * 0.035, Math.PI, 0);
  ctx.fill();
  // Trees in front: rounded crowns in muted green.
  for (let i = 0; i < 70; i++) {
    const cx = r() * w;
    const cr = h * (0.025 + r() * 0.035);
    ctx.fillStyle = r() < 0.5 ? "#7f9c86" : "#8fab93";
    ctx.beginPath();
    ctx.arc(cx, base + h * 0.02 - r() * h * 0.02, cr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#86a28c";
  ctx.fillRect(0, base + h * 0.03, w, h);
}

/* ---------------------------------------------------------------- laptop -- */

function mmss(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function paintScreen(ctx: CanvasRenderingContext2D, w: number, h: number, t: TimerSnapshot) {
  ctx.fillStyle = "#070b18";
  ctx.fillRect(0, 0, w, h);
  // Faint scanlines, the only texture the old panel gets.
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

  const pad = w * 0.07;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "#7f97ff";
  ctx.font = `500 ${Math.round(h * 0.055)}px ${MONO}`;
  ctx.fillText("PATHFORGE / FOCUS", pad, pad + h * 0.05);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(210,220,255,0.55)";
  ctx.fillText(`${t.minutes} MIN`, w - pad, pad + h * 0.05);

  ctx.textAlign = "center";
  ctx.fillStyle = t.state === "done" ? "#9fb4ff" : "#eef2ff";
  ctx.font = `500 ${Math.round(h * 0.3)}px ${MONO}`;
  ctx.fillText(t.state === "done" ? "DONE" : mmss(t.remaining), w / 2, h * 0.6);

  // Progress: square cells, filled as the session runs.
  const cells = 24;
  const gap = w * 0.006;
  const barW = w - pad * 2;
  const cw = (barW - gap * (cells - 1)) / cells;
  const filled = Math.round(t.progress * cells);
  for (let i = 0; i < cells; i++) {
    ctx.fillStyle = i < filled ? "#5f82ff" : "rgba(95,130,255,0.18)";
    ctx.fillRect(pad + i * (cw + gap), h * 0.7, cw, h * 0.045);
  }

  ctx.textAlign = "left";
  ctx.font = `500 ${Math.round(h * 0.048)}px ${MONO}`;
  ctx.fillStyle = "rgba(210,220,255,0.7)";
  const status =
    t.state === "running"
      ? "IN SESSION"
      : t.state === "paused"
        ? "PAUSED"
        : t.state === "done"
          ? "SESSION COMPLETE"
          : "READY";
  ctx.fillText(status, pad, h - pad);
  ctx.textAlign = "right";
  ctx.fillText(`${t.sessionsToday} DONE TODAY`, w - pad, h - pad);
}

/* ------------------------------------------------------------ chalkboard -- */

function chalkText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, alpha: number) {
  // Chalk is never a clean fill: stamp the glyphs a few times with small
  // offsets and uneven alpha so the strokes read dusty.
  const passes = [
    [0, 0, 0.75],
    [0.8, -0.6, 0.25],
    [-0.7, 0.5, 0.2],
  ];
  for (const [dx, dy, a] of passes) {
    ctx.fillStyle = `rgba(236,236,228,${a * alpha})`;
    ctx.fillText(text, x + dx, y + dy);
  }
}

export function paintBoard(ctx: CanvasRenderingContext2D, w: number, h: number, items: PlanItem[]) {
  ctx.fillStyle = "#1b2320";
  ctx.fillRect(0, 0, w, h);
  // Old erased chalk: large faint smears.
  const r = rand(3);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(220,225,215,${0.015 + r() * 0.03})`;
    const rw = 60 + r() * 220;
    ctx.fillRect(r() * w - rw / 2, r() * h, rw, 6 + r() * 26);
  }

  const pad = w * 0.1;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `600 ${Math.round(w * 0.1)}px ${SANS}`;
  chalkText(ctx, "Today", pad, h * 0.14, 1);
  ctx.fillStyle = "rgba(236,236,228,0.6)";
  ctx.fillRect(pad, h * 0.165, w * 0.34, 3);

  const rows = items.filter((i) => i.text.trim()).slice(0, 5);
  ctx.font = `500 ${Math.round(w * 0.058)}px ${SANS}`;
  if (rows.length === 0) {
    chalkText(ctx, "Nothing planned yet.", pad, h * 0.3, 0.55);
    chalkText(ctx, "Click the board", pad, h * 0.38, 0.55);
    chalkText(ctx, "to write today's list.", pad, h * 0.44, 0.55);
    return;
  }
  const lineH = h * 0.13;
  rows.forEach((item, i) => {
    const y = h * 0.3 + i * lineH;
    const box = w * 0.055;
    ctx.strokeStyle = "rgba(236,236,228,0.8)";
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, y - box * 0.9, box, box);
    if (item.done) {
      ctx.beginPath();
      ctx.moveTo(pad + box * 0.18, y - box * 0.45);
      ctx.lineTo(pad + box * 0.42, y - box * 0.15);
      ctx.lineTo(pad + box * 0.9, y - box * 1.0);
      ctx.stroke();
    }
    const tx = pad + box * 1.6;
    let text = item.text.trim();
    const maxW = w - tx - pad * 0.6;
    while (ctx.measureText(text).width > maxW && text.length > 3) text = text.slice(0, -2);
    if (text !== item.text.trim()) text = text.trimEnd() + "...";
    chalkText(ctx, text, tx, y, item.done ? 0.45 : 1);
    if (item.done) {
      ctx.fillStyle = "rgba(236,236,228,0.55)";
      ctx.fillRect(tx, y - box * 0.38, ctx.measureText(text).width, 3);
    }
  });
}
