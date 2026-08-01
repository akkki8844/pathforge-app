import { useInView, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Realistic autumn leaves drifting over the campus hero.
 *
 * Restrained on purpose — a handful of properly-drawn leaf silhouettes
 * (maple, oak, birch) with gradient shading and veins, not a particle field.
 *
 * The motion is pure CSS (see .pf-leaf-* in index.css) specifically so every
 * leaf can carry a NEGATIVE animation-delay: that starts each leaf already
 * partway through its fall, so the whole hero is populated the instant it
 * paints instead of taking several seconds to drift into view. Only
 * transform/opacity animate, the layer unmounts once the hero scrolls away,
 * and it renders nothing under prefers-reduced-motion or on low-end hardware.
 */

type Species = "maple" | "oak" | "birch";

// Detailed silhouettes on a 0 0 64 64 canvas. These are hand-tuned to read as
// real species at a glance rather than generic blobs.
const LEAF_PATHS: Record<Species, { body: string; veins: string }> = {
  maple: {
    // Five lobes fanning upward — central + two upper-lateral + two lower-lateral
    // — tapering to a petiole at the base. A maple leaf, not a compass star.
    body:
      "M32 3 L37 19 L49 15 L42 27 L55 27 L42 36 L37 47 L33 51 L32 63 " +
      "L31 51 L27 47 L22 36 L9 27 L22 27 L15 15 L27 19 Z",
    veins:
      "M32 51 L32 6 M32 51 L32 63 M32 23 L48 16 M32 23 L16 16 M32 30 L53 28 M32 30 L11 28",
  },
  oak: {
    // Rounded, scalloped lobes down an elongated blade — reads as oak, not holly.
    body:
      "M32 6 C40 8 46 14 45 19 C44 23 37 24 36 26 C40 28 48 30 47 35 " +
      "C46 39 37 39 36 41 C41 43 46 46 43 51 C40 55 35 56 32 60 " +
      "C29 56 24 55 21 51 C18 46 23 43 28 41 C27 39 18 39 17 35 " +
      "C16 30 24 28 28 26 C27 24 20 23 19 19 C18 14 24 8 32 6 Z",
    veins: "M32 8 L32 60 M32 20 L44 17 M32 20 L20 17 M32 33 L46 32 M32 33 L18 32 M32 45 L43 47 M32 45 L21 47",
  },
  birch: {
    body:
      "M32 3 C44 13 49 27 46 41 C44 50 39 57 32 61 C25 57 20 50 18 41 " +
      "C15 27 20 13 32 3 Z",
    veins:
      "M32 5 V59 M32 18 L41 25 M32 18 L23 25 M32 30 L44 37 M32 30 L20 37 M32 43 L42 49 M32 43 L22 49",
  },
};

const SPECIES: Species[] = ["maple", "maple", "oak", "birch", "maple", "oak"];

// Warm, saturated autumn tones — chosen to hold up against the navy-graded
// hero rather than wash into it. Each entry drives a two-stop gradient.
const TINTS: { light: string; base: string; dark: string; vein: string }[] = [
  { light: "#e8a94b", base: "#c97f2a", dark: "#9a531b", vein: "#7a3d14" }, // amber
  { light: "#d9722f", base: "#b1481d", dark: "#822f13", vein: "#5f2410" }, // rust
  { light: "#c9a94a", base: "#9a8a34", dark: "#6f6222", vein: "#524818" }, // olive-gold
  { light: "#e2b657", base: "#c58a2c", dark: "#8f5c17", vein: "#6d4413" }, // honey
  { light: "#cf5f34", base: "#a23b1c", dark: "#742511", vein: "#551b0d" }, // burnt
];

interface Leaf {
  id: number;
  species: Species;
  tint: number;
  left: number;
  size: number;
  depth: number; // 0 far (small, faint, soft) → 1 near (big, opaque, sharp)
  drift: number;
  duration: number; // seconds for one full fall
  phase: number; // 0..1 — how far through the fall this leaf starts at load
  spin: number; // slow in-plane tumble (rotateZ) over the whole fall, deg
  flipDur: number; // seconds per "helicopter" rotateY flip
  turn: number; // signed total rotateY per flip, deg
  wobble: number; // rotateX tilt amplitude, deg
}

/** Fewer leaves on phones and weak hardware; zero on the weakest. */
function useLeafBudget() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const cores = nav.hardwareConcurrency ?? 4;
    const memory = nav.deviceMemory ?? 4;
    const narrow = window.innerWidth < 640;

    if (cores <= 2 || memory <= 2) return; // leave it off entirely
    if (cores <= 4 && memory <= 4) setCount(narrow ? 5 : 9);
    else setCount(narrow ? 7 : 14);
  }, []);

  return count;
}

function makeLeaves(count: number): Leaf[] {
  const leaves = Array.from({ length: count }, (_, id) => {
    const depth = Math.random();
    return {
      id,
      species: SPECIES[id % SPECIES.length],
      tint: id % TINTS.length,
      left: (id / count) * 100 + (Math.random() * 9 - 4.5),
      // Near leaves are larger — that size spread is what sells depth.
      size: 15 + depth * 24 + Math.random() * 5,
      depth,
      // Bigger (nearer) leaves catch more air, so they sway wider.
      drift: (Math.random() > 0.5 ? 1 : -1) * (34 + depth * 34 + Math.random() * 30),
      duration: 12 + depth * 4 + Math.random() * 6,
      // Spread starting phases across the whole descent so the field is full
      // at first paint (applied as a negative animation-delay).
      phase: Math.random(),
      spin: (Math.random() > 0.5 ? 1 : -1) * (140 + Math.random() * 180),
      flipDur: 3.8 + Math.random() * 3.6,
      turn: (Math.random() > 0.5 ? 1 : -1) * 360 * (Math.random() > 0.7 ? 2 : 1),
      wobble: 18 + Math.random() * 34,
    };
  });
  // Paint far leaves first so near ones overlap on top.
  return leaves.sort((a, b) => a.depth - b.depth);
}

function Leaf({ leaf, fallTo }: { leaf: Leaf; fallTo: number }) {
  const t = TINTS[leaf.tint];
  // Foreground leaves read crisp; background ones sit back with a touch of blur.
  const blur = leaf.depth < 0.35 ? 1.1 : leaf.depth < 0.6 ? 0.5 : 0;
  const opacity = 0.55 + leaf.depth * 0.4;
  // Negative delay = start already in progress → instant, distributed coverage.
  const fallDelay = `${(-leaf.phase * leaf.duration).toFixed(2)}s`;

  return (
    <div
      className="pf-leaf-fall"
      style={
        {
          left: `${leaf.left}%`,
          opacity,
          filter: `drop-shadow(0 3px 5px rgba(20,12,4,0.35))${blur ? ` blur(${blur}px)` : ""}`,
          // Perspective lets the child's rotateX/Y foreshorten — that 3D turn is
          // what makes a leaf read as tumbling rather than sliding.
          perspective: "520px",
          "--pf-fall-to": `${fallTo}px`,
          "--pf-fall-dur": `${leaf.duration}s`,
          "--pf-delay": fallDelay,
        } as React.CSSProperties
      }
    >
      <div
        className="pf-leaf-sway"
        style={
          {
            "--pf-sway-from": `${(-leaf.drift).toFixed(1)}px`,
            "--pf-sway-to": `${leaf.drift.toFixed(1)}px`,
            "--pf-sway-dur": `${(leaf.duration * 0.42).toFixed(2)}s`,
            "--pf-delay": fallDelay,
          } as React.CSSProperties
        }
      >
        <div
          className="pf-leaf-spin"
          style={
            {
              "--pf-spin": `${leaf.spin}deg`,
              "--pf-fall-dur": `${leaf.duration}s`,
              "--pf-delay": fallDelay,
            } as React.CSSProperties
          }
        >
          <svg
            className="pf-leaf-flip"
            width={leaf.size}
            height={leaf.size}
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true"
            style={
              {
                "--pf-turn": `${leaf.turn}deg`,
                "--pf-wob": `${leaf.wobble}deg`,
                "--pf-flip-dur": `${leaf.flipDur}s`,
                "--pf-delay": fallDelay,
              } as React.CSSProperties
            }
          >
            <defs>
              <linearGradient id={`lf-${leaf.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={t.light} />
                <stop offset="55%" stopColor={t.base} />
                <stop offset="100%" stopColor={t.dark} />
              </linearGradient>
            </defs>
            <path d={LEAF_PATHS[leaf.species].body} fill={`url(#lf-${leaf.id})`} />
            {/* Veins + midrib — the detail that stops it reading as a paper cutout. */}
            <path
              d={LEAF_PATHS[leaf.species].veins}
              stroke={t.vein}
              strokeWidth={1.1}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.55}
            />
            {/* Sheen down one edge so light reads as coming from a single direction. */}
            <path
              d={LEAF_PATHS[leaf.species].body}
              stroke="rgba(255,244,225,0.28)"
              strokeWidth={0.8}
              fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function FallingLeaves({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const count = useLeafBudget();
  const [height, setHeight] = useState(0);

  // Only run while the hero is anywhere near the viewport.
  const inView = useInView(ref, { margin: "240px 0px 240px 0px" });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(el);
    // Seed height synchronously so leaves can render on the very first frame.
    setHeight(el.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, []);

  const leaves = useMemo(() => makeLeaves(count), [count]);
  const active = !prefersReduced && count > 0 && height > 0 && inView;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex: 101 }}
    >
      {active && leaves.map((leaf) => <Leaf key={leaf.id} leaf={leaf} fallTo={height + 70} />)}
    </div>
  );
}
