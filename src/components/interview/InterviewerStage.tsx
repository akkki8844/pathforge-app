/**
 * The person on the other side of the call.
 *
 * Three stills, crossfaded on the live amplitude of the speech audio, inside a
 * frame that behaves the way a video call behaves. That is the whole trick, and
 * it is worth being explicit about why it is not video:
 *
 *  - A pre-rendered clip cannot stay in sync with words generated a moment ago.
 *    Any loop long enough not to repeat visibly is long enough to drift.
 *  - Amplitude-driven frames *are* in sync by construction — the mouth opens
 *    because the waveform got louder, not because a timeline said so.
 *  - What you actually see on a domestic video call is a soft, slightly
 *    compressed head-and-shoulders that holds still while the other person
 *    listens and moves while they talk. Three frames reproduce that closely.
 *
 * The frame swap, the head drift and the breathing all run inside one rAF loop
 * writing straight to `style`. None of it goes through React: this updates at
 * 60Hz for the length of an interview, and a component that re-rendered on
 * every tick would spend the whole call in reconciliation.
 */
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { InterviewerPersona } from "@/lib/interview/types";
import { SETTING_BACKDROP } from "@/lib/interview/personas";
import type { InterviewBehavior, InterviewPhase } from "@/hooks/useInterviewSession";
import type { InterviewAvatar } from "@/hooks/useInterviewAvatar";

/**
 * Amplitude thresholds for the mouth, with hysteresis.
 *
 * Two numbers per boundary rather than one, because a single threshold sitting
 * exactly at conversational level makes the frames strobe on every syllable
 * edge. The gap is what turns a flicker into a mouth.
 */
const OPEN_ON = 0.16;
const OPEN_OFF = 0.10;
const WIDE_ON = 0.46;
const WIDE_OFF = 0.34;

type Frame = "rest" | "talkA" | "talkB";

/** Per-behaviour pose offsets: [x px, y px, scale, rotate deg]. */
const POSE: Record<InterviewBehavior, [number, number, number, number]> = {
  neutral: [0, 0, 1, 0],
  nod: [0, 6, 1.004, 0],
  "lean-in": [0, -4, 1.035, 0],
  smile: [0, -1, 1.008, 0],
  note: [-6, 10, 0.985, -1.4],
};

export function InterviewerStage({
  persona,
  levelRef,
  phase,
  behavior,
  avatar,
  className,
}: {
  persona: InterviewerPersona;
  levelRef: React.MutableRefObject<number>;
  phase: InterviewPhase;
  behavior: InterviewBehavior;
  /**
   * The live streaming face, when the project is configured for one. Its
   * elements are rendered unconditionally — the client needs them attached
   * before it can connect, so they cannot wait on `status`.
   */
  avatar?: InterviewAvatar;
  className?: string;
}) {
  const restRef = useRef<HTMLImageElement | null>(null);
  const talkARef = useRef<HTMLImageElement | null>(null);
  const talkBRef = useRef<HTMLImageElement | null>(null);
  const moverRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const failedRef = useRef(false);
  const fallbackRef = useRef<HTMLDivElement | null>(null);

  const frameRef = useRef<Frame>("rest");
  const behaviorRef = useRef<InterviewBehavior>("neutral");
  behaviorRef.current = behavior;

  useEffect(() => {
    let raf = 0;
    let t = 0;
    // Where the pose currently is, versus where the behaviour says it should
    // be. Interpolated rather than snapped, so a nod is a movement and not a
    // teleport.
    let cx = 0, cy = 0, cs = 1, cr = 0;

    const tick = () => {
      t += 1 / 60;
      const level = levelRef.current;

      /* ── mouth ─────────────────────────────────────────────────────────── */
      const current = frameRef.current;
      let next: Frame = current;
      if (current === "rest" && level > OPEN_ON) next = "talkA";
      else if (current === "talkA") {
        if (level < OPEN_OFF) next = "rest";
        else if (level > WIDE_ON) next = "talkB";
      } else if (current === "talkB" && level < WIDE_OFF) next = "talkA";

      if (next !== current) {
        frameRef.current = next;
        if (restRef.current) restRef.current.style.opacity = next === "rest" ? "1" : "0";
        if (talkARef.current) talkARef.current.style.opacity = next === "talkA" ? "1" : "0";
        if (talkBRef.current) talkBRef.current.style.opacity = next === "talkB" ? "1" : "0";
      }

      /* ── pose ──────────────────────────────────────────────────────────── */
      const [bx, by, bs, br] = POSE[behaviorRef.current] ?? POSE.neutral;

      // Breathing and idle drift, on two incommensurable periods so the loop
      // never visibly repeats. Amplitudes are deliberately tiny — anything you
      // can consciously see here reads as a bobbing avatar, not a person.
      const breath = Math.sin(t * 0.72) * 0.9;
      const driftX = Math.sin(t * 0.31) * 2.2 + Math.sin(t * 0.13) * 1.1;
      const driftY = Math.cos(t * 0.24) * 1.6;
      // Talking moves your head slightly more than listening does.
      const speechNudge = level * 2.4;

      const tx = bx + driftX;
      const ty = by + driftY + breath + speechNudge;
      const ts = bs + level * 0.006;

      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      cs += (ts - cs) * 0.08;
      cr += (br - cr) * 0.06;

      const node = moverRef.current;
      if (node) {
        node.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0) scale(${cs.toFixed(4)}) rotate(${cr.toFixed(2)}deg)`;
      }

      // The fallback tile has no frames to swap, so give it the level directly
      // as a glow — it still has to look alive.
      if (failedRef.current && fallbackRef.current) {
        fallbackRef.current.style.setProperty("--speak", String(level));
      }

      /* ── speaking ring ─────────────────────────────────────────────────── */
      const ring = ringRef.current;
      if (ring) {
        ring.style.opacity = String(Math.min(1, level * 2.2));
        ring.style.transform = `scale(${(1 + level * 0.035).toFixed(4)})`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [levelRef]);

  // A missing portrait must not leave a broken-image icon where a person should
  // be. One failure swaps the whole stack for the monogram tile.
  const onFrameError = () => {
    if (failedRef.current) return;
    failedRef.current = true;
    for (const ref of [restRef, talkARef, talkBRef]) {
      if (ref.current) ref.current.style.display = "none";
    }
    if (fallbackRef.current) fallbackRef.current.style.display = "flex";
  };

  const initials = persona.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const live = avatar?.status === "live";

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-stone-950", className)}>
      {/*
        Pillarbox fill.

        The frames are 4:5 and this stage is wide, so something has to give. An
        `object-cover` fill crops a portrait that hard down to a face close-up —
        you lose the shoulders, the room, and most of what makes it read as a
        call. So the feed keeps its own aspect ratio (below) and the leftover
        width is filled with a blurred copy of the same frame, which is exactly
        what Zoom and Meet do with a portrait-shaped participant. It reads as
        depth rather than as letterboxing.
      */}
      <img
        src={persona.frames.rest}
        alt=""
        aria-hidden
        draggable={false}
        // A missing portrait must not leave a blurred broken-image glyph behind
        // the person; the gradient below is a perfectly good room on its own.
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        className="absolute inset-0 h-full w-full scale-110 select-none object-cover opacity-45 blur-2xl"
      />
      <div className={cn("absolute inset-0 opacity-70 bg-gradient-to-b", SETTING_BACKDROP[persona.setting])} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_20%,rgba(0,0,0,0.55)_100%)]" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={moverRef}
          className="relative h-full max-h-full w-auto max-w-full overflow-hidden will-change-transform"
          style={{ aspectRatio: "4 / 5" }}
        >
          {/*
            The live face. Always mounted, because `simli-client` needs the
            elements attached before it will connect — mounting it on `live`
            would be a chicken-and-egg. Hidden until the stream is actually up.
          */}
          <video
            ref={avatar?.videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-320",
              live ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />

          {(["rest", "talkA", "talkB"] as const).map((key) => (
            <img
              key={key}
              ref={key === "rest" ? restRef : key === "talkA" ? talkARef : talkBRef}
              src={persona.frames[key]}
              alt={key === "rest" ? `${persona.name}, your interviewer` : ""}
              aria-hidden={key !== "rest"}
              draggable={false}
              onError={onFrameError}
              style={{ opacity: key === "rest" ? 1 : 0, transitionDuration: "70ms" }}
              className={cn(
                "absolute inset-0 h-full w-full select-none object-cover transition-opacity ease-linear",
                live && "invisible",
              )}
            />
          ))}

          <div
            ref={fallbackRef}
            style={{ display: "none" }}
            className="absolute inset-0 hidden items-center justify-center"
          >
            <div
              className="flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-accent to-highlight font-display text-5xl font-bold text-white sm:h-52 sm:w-52 sm:text-6xl"
              style={{ boxShadow: "0 0 calc(40px + var(--speak, 0) * 90px) hsl(var(--accent) / calc(0.25 + var(--speak, 0) * 0.5))" }}
            >
              {initials}
            </div>
          </div>
        </div>
      </div>

      {/* The stream's audio. Off-screen rather than unmounted, for the same
          reason as the video above, and never `muted` — when the avatar is
          live this element IS the interviewer's voice, and the voice hook has
          disconnected its own local output to avoid doubling it. */}
      <audio ref={avatar?.audioRef} autoPlay className="sr-only" />

      {/* Speaking ring — the halo a call app puts round the active speaker. */}
      <div
        ref={ringRef}
        aria-hidden
        style={{ opacity: 0 }}
        className="pointer-events-none absolute inset-3 rounded-[28px] ring-2 ring-white/50 transition-opacity duration-150 sm:inset-5"
      />

      {/*
        Sensor grain. Every real webcam has it and its absence is one of the
        things that makes a rendered face read as rendered — a perfectly clean
        image at this size looks like a photograph, not a video feed.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Listening state: they are on camera watching you, so say so quietly. */}
      {phase === "listening" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 to-transparent"
        />
      )}
    </div>
  );
}
