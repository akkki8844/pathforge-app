/**
 * You, in the corner.
 *
 * Present because it changes behaviour, not because video calls have one. A
 * student who can see themselves sits up, notices they are looking at the
 * keyboard, and catches the thing they do with their hands. A mock interview
 * that hides the self-view removes the only feedback loop that operates while
 * you are still in the room.
 *
 * The level ring is driven from the microphone rather than from the speech
 * recogniser, so it responds instantly — recognition results arrive in bursts
 * and a ring that pulsed on them would lag the voice by a beat and read as
 * broken.
 */
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

export function SelfView({
  stream,
  cameraOn,
  micOn,
  levelRef,
  listening,
  className,
}: {
  stream: MediaStream | null;
  cameraOn: boolean;
  micOn: boolean;
  levelRef: React.MutableRefObject<number>;
  /** True while it is genuinely the candidate's turn. */
  listening: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const ring = ringRef.current;
      if (ring) {
        const level = listening ? levelRef.current : 0;
        ring.style.opacity = String(0.25 + level * 0.75);
        ring.style.boxShadow = `0 0 0 ${(1 + level * 4).toFixed(2)}px hsl(var(--accent) / ${(0.25 + level * 0.55).toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [levelRef, listening]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
      className={cn(
        "relative aspect-[4/3] w-32 overflow-hidden rounded-xl bg-stone-900 shadow-lg ring-1 ring-white/15 sm:w-44 lg:w-52",
        className,
      )}
    >
      <div ref={ringRef} aria-hidden className="pointer-events-none absolute inset-0 z-10 rounded-xl" />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        // Mirrored, because everyone expects their own preview to behave like a
        // mirror and an unmirrored self-view reads as subtly wrong.
        className={cn(
          "h-full w-full -scale-x-100 object-cover transition-opacity duration-250",
          cameraOn && stream ? "opacity-100" : "opacity-0",
        )}
      />

      {(!cameraOn || !stream) && (
        <div className="absolute inset-0 flex items-center justify-center text-white/55">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em]">
            Camera off
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white/85">
          You
        </span>
        {!micOn && <MicOff className="h-3.5 w-3.5 text-destructive" />}
      </div>
    </motion.div>
  );
}
