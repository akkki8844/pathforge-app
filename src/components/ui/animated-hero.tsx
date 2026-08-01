import { useEffect, useState, type ReactNode } from "react";

interface AnimatedHeroProps {
  children: ReactNode;
  className?: string;
}

/**
 * Cinematic hero backdrop tuned to the Pathforge palette:
 * deep navy → blue → black radial gradient with a subtle grid overlay
 * and a low pillar silhouette that animates up on mount.
 */
export function AnimatedHero({ children, className = "" }: AnimatedHeroProps) {
  const pillars = [92, 84, 78, 70, 62, 54, 46, 34, 18, 34, 46, 54, 62, 70, 78, 84, 92];
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes pf-subtlePulse {
          0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
          50%      { opacity: 0.85; transform: translateX(-50%) scale(1.05); }
        }
      `}</style>

      <section className={`relative isolate overflow-hidden ${className}`}>
        {/* Black ↔ blue radial gradient field */}
        <div
          aria-hidden
          className="absolute inset-0 -z-30"
          style={{
            backgroundImage: [
              // Soft blue dome rising from bottom-center
              "radial-gradient(75% 55% at 50% 75%, rgba(59,130,246,0.42) 0%, rgba(29,78,216,0.30) 28%, rgba(15,23,42,0.55) 55%, rgba(2,6,15,0.95) 78%, #000 92%)",
              // Cool top-left wash
              "radial-gradient(70% 55% at 12% 0%, rgba(56,189,248,0.22) 0%, rgba(2,6,15,0) 60%)",
              // Indigo top-right wash
              "radial-gradient(65% 50% at 88% 8%, rgba(99,102,241,0.25) 0%, rgba(2,6,15,0) 60%)",
              "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0) 35%)",
            ].join(","),
            backgroundColor: "#000",
          }}
        />

        {/* Corner vignette for contrast */}
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-[radial-gradient(140%_120%_at_50%_0%,transparent_60%,rgba(0,0,0,0.85))]"
        />

        {/* Subtle grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 mix-blend-screen opacity-20"
          style={{
            backgroundImage: [
              "repeating-linear-gradient(90deg, rgba(148,163,255,0.10) 0 1px, transparent 1px 96px)",
              "repeating-linear-gradient(90deg, rgba(148,163,255,0.05) 0 1px, transparent 1px 24px)",
              "repeating-radial-gradient(80% 55% at 50% 75%, rgba(148,163,255,0.08) 0 1px, transparent 1px 120px)",
            ].join(","),
            backgroundBlendMode: "screen",
          }}
        />

        {/* Caller content */}
        <div className="relative z-10">{children}</div>

        {/* Pulsing center glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[96px] left-1/2 z-0 h-28 w-24 -translate-x-1/2 rounded-md bg-gradient-to-b from-sky-300/40 via-blue-400/25 to-transparent blur-sm"
          style={{ animation: "pf-subtlePulse 6s ease-in-out infinite" }}
        />

        {/* Stepped pillars silhouette */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[38vh]">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-px px-[2px]">
            {pillars.map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-black transition-[height] duration-1000 ease-in-out"
                style={{
                  height: isMounted ? `${h}%` : "0%",
                  transitionDelay: `${Math.abs(i - Math.floor(pillars.length / 2)) * 60}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
