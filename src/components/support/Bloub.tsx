import { motion, useReducedMotion, type Transition } from "framer-motion";
import { useId } from "react";

/**
 * Bloub — the support mascot.
 *
 * Drawn as inline SVG rather than playing the source `bloub-default-cycle.mp4`.
 * That clip is 7.6MB for 31 seconds — more than the JS of most routes here —
 * and a video can't sit crisply at 18px, take the surface's color, or change
 * expression the moment a reply starts. The geometry below is the designer's
 * own: the squircle path and the capsule eyes are lifted from
 * `src/assets/bloub/bloub-squircle-excite-bleu.svg`, and the poses match the
 * clip. Only the playback is ours.
 *
 * The eyes are punched out of the body through a mask, exactly as the source
 * file does it, so they read as holes in the blob rather than pale shapes
 * sitting on top of it. That is what keeps it looking like one piece of
 * material while it breathes and blinks.
 */

/** The designer's superellipse, spanning roughly ±96 in a 250-unit viewBox. */
const SQUIRCLE =
  "M95.9 0.2C95.9 3.4 95.9 6.5 95.9 9.7C95.9 12.8 95.9 16 95.9 19.2C95.9 22.5 95.9 25.8 95.8 29.2C95.7 32.6 95.6 36 95.4 39.6C95.1 43.1 94.9 46.8 94.4 50.4C93.8 54.1 93.2 57.9 92.2 61.5C91.1 65.1 89.8 68.9 88 72.1C86.2 75.4 84 78.6 81.3 81.2C78.7 83.8 75.5 86 72.2 87.8C68.9 89.6 65.2 90.9 61.6 92C58 93 54.1 93.6 50.4 94.2C46.8 94.7 43.1 94.9 39.5 95.2C36 95.4 32.5 95.5 29.1 95.6C25.7 95.7 22.4 95.7 19.1 95.7C15.8 95.7 12.6 95.7 9.5 95.7C6.3 95.7 3.2 95.7 0 95.7C-3.1 95.7 -6.2 95.7 -9.4 95.7C-12.6 95.7 -15.8 95.7 -19 95.7C-22.3 95.7 -25.6 95.7 -29 95.6C-32.4 95.5 -35.9 95.4 -39.5 95.2C-43 94.9 -46.7 94.7 -50.4 94.2C-54.1 93.6 -57.9 93 -61.5 92C-65.2 90.9 -68.9 89.6 -72.2 87.8C-75.5 86 -78.7 83.8 -81.3 81.2C-83.9 78.6 -86.2 75.4 -88 72.1C-89.8 68.9 -91 65.1 -92.1 61.5C-93.2 57.9 -93.8 54.1 -94.3 50.4C-94.8 46.8 -95.1 43.1 -95.3 39.6C-95.6 36 -95.6 32.6 -95.7 29.2C-95.8 25.8 -95.8 22.5 -95.9 19.2C-95.9 16 -95.9 12.8 -95.9 9.7C-95.9 6.5 -95.9 3.4 -95.9 0.2C-95.9 -2.9 -95.9 -6 -95.9 -9.2C-95.9 -12.3 -95.9 -15.5 -95.9 -18.7C-95.8 -22 -95.8 -25.3 -95.7 -28.7C-95.6 -32.1 -95.6 -35.5 -95.3 -39.1C-95.1 -42.6 -94.8 -46.3 -94.3 -49.9C-93.8 -53.6 -93.2 -57.4 -92.1 -61C-91 -64.6 -89.8 -68.4 -88 -71.6C-86.2 -74.9 -83.9 -78.1 -81.3 -80.7C-78.7 -83.3 -75.5 -85.6 -72.2 -87.3C-68.9 -89.1 -65.2 -90.4 -61.5 -91.5C-57.9 -92.5 -54.1 -93.1 -50.4 -93.7C-46.7 -94.2 -43 -94.4 -39.5 -94.7C-35.9 -94.9 -32.4 -95 -29 -95.1C-25.6 -95.2 -22.3 -95.2 -19 -95.2C-15.8 -95.2 -12.6 -95.2 -9.4 -95.2C-6.2 -95.2 -3.1 -95.2 0 -95.2C3.2 -95.2 6.3 -95.2 9.5 -95.2C12.6 -95.2 15.8 -95.2 19.1 -95.2C22.4 -95.2 25.7 -95.2 29.1 -95.1C32.5 -95 36 -94.9 39.5 -94.7C43.1 -94.4 46.8 -94.2 50.4 -93.7C54.1 -93.1 58 -92.5 61.6 -91.5C65.2 -90.4 68.9 -89.1 72.2 -87.3C75.5 -85.6 78.7 -83.3 81.3 -80.7C84 -78.1 86.2 -74.9 88 -71.6C89.8 -68.4 91.1 -64.6 92.2 -61C93.2 -57.4 93.8 -53.6 94.4 -49.9C94.9 -46.3 95.1 -42.6 95.4 -39.1C95.6 -35.5 95.7 -32.1 95.8 -28.7C95.9 -25.3 95.9 -22 95.9 -18.7C95.9 -15.5 95.9 -12.3 95.9 -9.2C95.9 -6 95.9 -2.9 95.9 0.2Z";

export type BloubState =
  /** Resting. Breathes, leans, and blinks on its own. */
  | "idle"
  /** Working on a reply — collapses into the clip's three-dot cycle. */
  | "thinking"
  /** Pleased. Eyes stretch tall: the clip's "excite" pose. */
  | "happy"
  /** One eye flattens to a dash. Used as a greeting when the panel opens. */
  | "wink";

/** The mascot's blue, straight off the source SVG. */
export const BLOUB_BLUE = "#3b93f0";

/**
 * Eye poses, as scale factors on one shared capsule. These are transforms
 * rather than new geometry on purpose: framer-motion maps `x`/`y` on an SVG
 * node to a CSS translate rather than the x/y attributes, so animating a
 * rect's attributes here is a quiet trap. Scaling the same rect is both
 * correct and smoother.
 */
const EYE_POSE: Record<Exclude<BloubState, "thinking">, { scaleX: number; scaleY: number }[]> = {
  //     left                            right
  idle: [{ scaleX: 1, scaleY: 1 }, { scaleX: 1, scaleY: 1 }],
  happy: [{ scaleX: 0.86, scaleY: 1.2 }, { scaleX: 0.86, scaleY: 1.2 }],
  wink: [{ scaleX: 0.9, scaleY: 1.04 }, { scaleX: 1.05, scaleY: 0.14 }],
};

/**
 * Base capsule: 40 x 56 with fully round caps. This is the source file's eye
 * path exactly — its arcs have r=20, half the width, so a rect with rx=W/2
 * reproduces it — and every pose below is a scale of it.
 */
const EYE_W = 40;
const EYE_H = 56;

/**
 * Eyes sit low and wide; that placement is what makes it read as babyish.
 * Measured off the source clip: 70 units apart, 22 below centre. (The clip's
 * own frames carry a rightward lean, which is a pose, not the rest position —
 * so these are symmetric and the lean is animated instead.)
 */
const EYE_X = 35;
const EYE_Y = 22;

const SPRING: Transition = { type: "spring", stiffness: 260, damping: 20 };

/**
 * Every scale below has to happen about the element's own centre — an eye
 * should squash where it sits, not drift toward the middle of the face. The
 * spec's default reference box for an SVG transform is the viewBox rather than
 * the element, and browsers have not always agreed on how that resolves under
 * a parent transform, so each animated node pins its own box instead of
 * relying on the default landing in the right place.
 */
const OWN_CENTRE = { transformBox: "fill-box", transformOrigin: "center" } as const;

interface BloubProps {
  state?: BloubState;
  className?: string;
  /**
   * Body color. Defaults to the mascot's own blue so it stays recognisable on
   * surfaces that have already taken the app's accent.
   */
  color?: string;
  /** Accessible name. Set to null for instances that sit beside a real label. */
  title?: string | null;
  /**
   * Hold still: no breathing, no blinking. Message avatars set this so a long
   * thread does not run one animation loop per bubble.
   */
  still?: boolean;
}

export function Bloub({
  state = "idle",
  className,
  color = BLOUB_BLUE,
  title = "Pathforge support",
  still = false,
}: BloubProps) {
  // One id per instance — two Bloubs on screen must not share a mask.
  const maskId = `bloub-${useId().replace(/:/g, "")}`;
  const reduceMotion = useReducedMotion();
  /** Ambient motion is off when the caller asks, or when the OS does. */
  const calm = reduceMotion || still;

  const isThinking = state === "thinking";
  const poses = EYE_POSE[isThinking ? "idle" : state];

  return (
    <svg
      viewBox="-125 -125 250 250"
      className={className}
      focusable="false"
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-125" y="-125" width="250" height="250">
          {/* White keeps, black cuts. */}
          <path d={SQUIRCLE} fill="#fff" />
          <g transform={`translate(0 ${EYE_Y})`}>
            {/*
             * Blink lives on this wrapper so it composes with whatever pose the
             * eyes are holding. Both capsules straddle y=0, so the group's
             * bounding-box centre — which is what framer-motion scales about by
             * default — is exactly the eye line.
             */}
            <motion.g
              style={OWN_CENTRE}
              animate={calm || isThinking ? { scaleY: 1 } : { scaleY: [1, 1, 0.08, 1] }}
              transition={
                calm || isThinking
                  ? { duration: 0.2 }
                  : { duration: 4.2, times: [0, 0.93, 0.965, 1], repeat: Infinity, ease: "easeInOut" }
              }
            >
              {poses.map((pose, i) => (
                <motion.rect
                  key={i}
                  x={(i === 0 ? -EYE_X : EYE_X) - EYE_W / 2}
                  y={-EYE_H / 2}
                  width={EYE_W}
                  height={EYE_H}
                  rx={EYE_W / 2}
                  fill="#000"
                  style={OWN_CENTRE}
                  initial={false}
                  animate={pose}
                  transition={SPRING}
                />
              ))}
            </motion.g>
          </g>
        </mask>
      </defs>

      {/* Body. Shrinks away while the dots take over. */}
      <motion.g
        style={OWN_CENTRE}
        initial={false}
        animate={isThinking ? { opacity: 0, scale: 0.55 } : { opacity: 1, scale: 1 }}
        transition={SPRING}
      >
        <motion.g
          style={OWN_CENTRE}
          animate={
            calm
              ? undefined
              : {
                  // Breathing, plus a slow lean so it never sits perfectly still.
                  scaleX: [1, 1.03, 0.985, 1],
                  scaleY: [1, 0.97, 1.02, 1],
                  rotate: [0, 1.5, -1.2, 0],
                }
          }
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <g mask={`url(#${maskId})`}>
            <rect x="-125" y="-125" width="250" height="250" fill={color} />
          </g>
        </motion.g>
      </motion.g>

      {/* Thinking: the clip's three-dot cycle, standing in for the face. */}
      <motion.g
        initial={false}
        animate={isThinking ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.55 }}
        transition={SPRING}
        style={{ ...OWN_CENTRE, pointerEvents: "none" }}
      >
        {[-46, 0, 46].map((cx, i) => (
          <motion.circle
            key={cx}
            cx={cx}
            cy={0}
            r={17}
            fill={color}
            // The circle carries no opacity of its own, so without this framer
            // has no value to animate *from* and warns that it is going from
            // "undefined" to 0.85. `initial={false}` adopts the target on mount
            // and animates only on later changes — the same thing the parent
            // group does.
            initial={false}
            animate={
              isThinking && !calm
                ? { translateY: [0, -18, 0], opacity: [0.4, 1, 0.4] }
                : { translateY: 0, opacity: 0.85 }
            }
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.16 }}
          />
        ))}
      </motion.g>
    </svg>
  );
}

export default Bloub;
