/**
 * The view out of the window.
 *
 * Procedural, not photographic. Stock aerial photography would be the obvious
 * route and it is the wrong one: it carries licensing obligations, it is
 * hundreds of kilobytes per cabin, and — worst — a photograph is *static*, so
 * a ninety-minute flight would spend ninety minutes looking at one unchanging
 * picture of some clouds. What is here instead is layered CSS gradients that
 * drift, plus a starfield seeded once, so the view slowly changes across the
 * flight the way a real one does.
 *
 * The sky itself is a function of `progress`: a day flight warms toward the
 * horizon as it descends, and a night flight passes over city lights. Nothing
 * loads, nothing decodes, and under reduced-motion everything simply holds
 * still while keeping its colour.
 */
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Cabin } from "@/lib/focus-flight/flight";

/** Deterministic star and light placement — reseeding would make them twitch. */
function scatter(count: number, seed: number) {
  let h = seed;
  const next = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: next() * 100,
    y: next() * 100,
    r: 0.6 + next() * 1.5,
    o: 0.25 + next() * 0.6,
  }));
}

export function WindowView({ cabin, progress }: { cabin: Cabin; progress: number }) {
  const reduceMotion = useReducedMotion();
  const night = cabin === "night";
  const stars = useMemo(() => scatter(90, 1337), []);
  const lights = useMemo(() => scatter(60, 24601), []);

  // Descent warms the horizon on a day flight and brings the ground up on a
  // night one, so the window tells you roughly where you are without numbers.
  const descending = Math.max(0, (progress - 0.8) / 0.2);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Sky */}
      <div
        className="absolute inset-0 transition-[background] duration-1000"
        style={{
          background: night
            ? `linear-gradient(180deg, #04070f 0%, #070c1c 45%, #0b1330 78%, ${
                descending > 0 ? "#1b2350" : "#0b1330"
              } 100%)`
            : `linear-gradient(180deg, #061027 0%, #0d2145 38%, #1b3f6b 70%, ${
                descending > 0 ? "#7a4a3c" : "#2d5c86"
              } 100%)`,
        }}
      />

      {/* Stars, night only. Fade out as the ground comes up. */}
      {night && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {stars.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y * 0.62}
              r={s.r * 0.12}
              fill="white"
              opacity={s.o * (1 - descending * 0.6)}
            />
          ))}
        </svg>
      )}

      {/* City lights below, appearing on descent. */}
      {night && descending > 0.15 && (
        <svg
          className="absolute inset-x-0 bottom-0 h-1/3 w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {lights.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={40 + s.y * 0.6}
              r={s.r * 0.2}
              fill={i % 5 === 0 ? "#ffd7a1" : "#fff2d4"}
              opacity={s.o * descending * 0.9}
            />
          ))}
        </svg>
      )}

      {/* Cloud decks. Two layers at different speeds gives parallax without
          a single image being loaded. */}
      {[0, 1].map((layer) => (
        <motion.div
          key={layer}
          className="absolute inset-x-[-50%] w-[200%]"
          style={{
            top: layer === 0 ? "52%" : "68%",
            height: layer === 0 ? "26%" : "34%",
            background: night
              ? `radial-gradient(60% 120% at 20% 100%, rgba(120,150,220,${layer === 0 ? 0.16 : 0.1}), transparent 70%),
                 radial-gradient(50% 120% at 62% 100%, rgba(120,150,220,${layer === 0 ? 0.13 : 0.08}), transparent 70%)`
              : `radial-gradient(60% 120% at 20% 100%, rgba(255,255,255,${layer === 0 ? 0.2 : 0.13}), transparent 70%),
                 radial-gradient(50% 120% at 62% 100%, rgba(255,255,255,${layer === 0 ? 0.16 : 0.1}), transparent 70%)`,
            filter: "blur(10px)",
          }}
          animate={reduceMotion ? undefined : { x: layer === 0 ? ["0%", "-25%"] : ["0%", "-14%"] }}
          transition={{
            duration: layer === 0 ? 90 : 160,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Wing light — the slow blink that says you are on an aircraft. */}
      {!reduceMotion && (
        <motion.span
          className="absolute right-[12%] top-[38%] h-1.5 w-1.5 rounded-full bg-rose-400"
          animate={{ opacity: [0, 1, 0], boxShadow: ["0 0 0 rgba(251,113,133,0)", "0 0 12px rgba(251,113,133,0.9)", "0 0 0 rgba(251,113,133,0)"] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.12, 0.3] }}
        />
      )}

      {/* Vignette, so the UI above always keeps its contrast. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 30%, rgba(2,6,18,0.55) 78%, rgba(2,6,18,0.88) 100%)",
        }}
      />
    </div>
  );
}
