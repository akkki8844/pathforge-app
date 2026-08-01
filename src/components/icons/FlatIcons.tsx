/**
 * Flat illustration icons — the colourful "sticker" set.
 *
 * These replace the plain-text emoji that used to sit inline in copy. They are
 * hand-authored SVG (not a font, not a raster asset) so they stay crisp at any
 * size, inherit nothing from the text colour, and render identically on every
 * platform — the whole reason emoji were a problem: the same codepoint renders
 * as a different drawing on Windows, macOS, and Android.
 *
 * Style rules, so new icons stay in the same family:
 *   - 48×48 viewBox, shapes inset ~4px so nothing touches the edge.
 *   - Soft pastel base shape, white/cream surface on top, one warm accent.
 *   - Every icon carries 2–3 sparkle marks (diamond + dot) for the shared look.
 *   - Flat fills only. No gradients, no strokes thinner than 1.5.
 */

const BLUE = "#4465d8";
const BLUE_MID = "#7d97e8";
const BLUE_SOFT = "#c3d0f6";
const BLUE_PALE = "#e4eafc";
const GOLD = "#e8a33d";
const GOLD_DEEP = "#c47f1f";
const GREEN = "#3f9d6d";
const ROSE = "#d4574a";
const PAPER = "#ffffff";

export interface FlatIconProps {
  className?: string;
  /** Rendered pixel size. Defaults to inheriting via className. */
  size?: number;
}

function svgProps({ className, size }: FlatIconProps) {
  return {
    viewBox: "0 0 48 48",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    width: size,
    height: size,
    "aria-hidden": true as const,
    focusable: "false" as const,
  };
}

/** Shared sparkle cluster — a diamond, a dot, and a small second diamond. */
function Sparkles({
  d1 = [6, 10],
  dot = [40, 13],
  d2 = [39, 38],
}: {
  d1?: [number, number];
  dot?: [number, number];
  d2?: [number, number];
}) {
  return (
    <>
      <path
        d={`M${d1[0]} ${d1[1] - 3.2} L${d1[0] + 3.2} ${d1[1]} L${d1[0]} ${d1[1] + 3.2} L${d1[0] - 3.2} ${d1[1]} Z`}
        fill={BLUE_MID}
      />
      <circle cx={dot[0]} cy={dot[1]} r="2.3" fill={BLUE_SOFT} />
      <path
        d={`M${d2[0]} ${d2[1] - 2.4} L${d2[0] + 2.4} ${d2[1]} L${d2[0]} ${d2[1] + 2.4} L${d2[0] - 2.4} ${d2[1]} Z`}
        fill={GOLD}
      />
    </>
  );
}

/** Celebration / phase complete. */
export function TrophyIcon(props: FlatIconProps) {
  return (
    <svg {...svgProps(props)}>
      <Sparkles d1={[7, 12]} dot={[41, 15]} d2={[40, 36]} />
      {/* handles */}
      <path
        d="M13 12h-3.5a3.5 3.5 0 0 0 0 7H14v-3h-4a1 1 0 0 1 0-2h3z"
        fill={BLUE_SOFT}
      />
      <path
        d="M35 12h3.5a3.5 3.5 0 0 1 0 7H34v-3h4a1 1 0 0 0 0-2h-3z"
        fill={BLUE_SOFT}
      />
      {/* cup */}
      <path
        d="M13 9h22v10a11 11 0 0 1-22 0z"
        fill={GOLD}
      />
      <path d="M13 9h11v21a11 11 0 0 1-11-11z" fill={GOLD_DEEP} opacity="0.28" />
      {/* stem + base */}
      <rect x="21.5" y="29" width="5" height="6" rx="1.4" fill={BLUE} />
      <rect x="15" y="35" width="18" height="4.5" rx="2.2" fill={BLUE} />
      {/* star on the cup */}
      <path
        d="M24 14.2l1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z"
        fill={PAPER}
      />
    </svg>
  );
}

/** Nothing left to do / queue empty. */
export function AllClearIcon(props: FlatIconProps) {
  return (
    <svg {...svgProps(props)}>
      <Sparkles d1={[6, 11]} dot={[42, 12]} d2={[7, 39]} />
      {/* back card, tilted */}
      <rect
        x="10"
        y="11"
        width="27"
        height="21"
        rx="3"
        fill={BLUE_PALE}
        transform="rotate(-6 23.5 21.5)"
      />
      {/* front card */}
      <rect x="11" y="15" width="27" height="21" rx="3" fill={PAPER} />
      <rect x="11" y="15" width="27" height="21" rx="3" fill="none" stroke={BLUE_SOFT} strokeWidth="1.6" />
      {/* rows */}
      <circle cx="18.5" cy="22.5" r="3" fill={GOLD} />
      <rect x="24" y="21" width="11" height="2.6" rx="1.3" fill={BLUE_SOFT} />
      <rect x="14.5" y="28" width="20" height="2.6" rx="1.3" fill={BLUE_SOFT} />
      {/* approved badge */}
      <circle cx="35" cy="32" r="7.5" fill={PAPER} />
      <circle cx="35" cy="32" r="6.2" fill={GREEN} />
      <path
        d="M31.9 32.1l2.2 2.2 4.1-4.4"
        fill="none"
        stroke={PAPER}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Reopens / recurring dates. */
export function RefreshIcon(props: FlatIconProps) {
  return (
    <svg {...svgProps(props)}>
      <Sparkles d1={[6, 10]} dot={[42, 14]} d2={[41, 37]} />
      {/* two arcs with a real gap so it reads as rotation, not a ring */}
      <path
        d="M24 10a14 14 0 0 1 12.7 8.1"
        fill="none"
        stroke={BLUE}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M24 38a14 14 0 0 1-12.7-8.1"
        fill="none"
        stroke={BLUE_MID}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* arrowheads */}
      <path d="M39.5 21.5l-5.4-.6 3.4-4.2z" fill={BLUE} />
      <path d="M8.5 26.5l5.4.6-3.4 4.2z" fill={BLUE_MID} />
      <circle cx="24" cy="24" r="4.5" fill={GOLD} />
    </svg>
  );
}

/** Warning / weak area. */
export function AlertIcon(props: FlatIconProps) {
  return (
    <svg {...svgProps(props)}>
      <Sparkles d1={[7, 13]} dot={[41, 16]} d2={[40, 38]} />
      <path
        d="M21.4 9.6a3 3 0 0 1 5.2 0l13.1 23.1a3 3 0 0 1-2.6 4.5H10.9a3 3 0 0 1-2.6-4.5z"
        fill={GOLD}
      />
      <path
        d="M24 8.1a3 3 0 0 0-2.6 1.5L8.3 32.7a3 3 0 0 0 2.6 4.5H24z"
        fill={GOLD_DEEP}
        opacity="0.22"
      />
      <rect x="22.2" y="16.5" width="3.6" height="10.5" rx="1.8" fill={PAPER} />
      <circle cx="24" cy="31.4" r="2.2" fill={PAPER} />
    </svg>
  );
}

/** Gem — the Journey level reward. */
export function GemIcon(props: FlatIconProps) {
  return (
    <svg {...svgProps(props)}>
      <Sparkles d1={[7, 12]} dot={[41, 13]} d2={[40, 36]} />
      <path d="M14 12h20l6 9-16 17L8 21z" fill={BLUE_MID} />
      <path d="M14 12h10v26L8 21z" fill={BLUE} />
      <path d="M8 21h32l-16 17z" fill={BLUE} opacity="0.35" />
      <path d="M14 12l4 9h12l4-9z" fill={PAPER} opacity="0.55" />
      <path d="M18 21l6 17 6-17z" fill={BLUE_PALE} opacity="0.65" />
    </svg>
  );
}

/** Heart — the Journey weekly-pace budget. */
export function HeartIcon(props: FlatIconProps) {
  return (
    <svg {...svgProps(props)}>
      <Sparkles d1={[7, 13]} dot={[41, 14]} d2={[40, 37]} />
      <path
        d="M24 39S9 29.8 9 20.2A8.2 8.2 0 0 1 24 15.6a8.2 8.2 0 0 1 15 4.6C39 29.8 24 39 24 39z"
        fill={ROSE}
      />
      <path
        d="M24 39S9 29.8 9 20.2A8.2 8.2 0 0 1 24 15.6z"
        fill="#000"
        opacity="0.08"
      />
      {/* Specular highlight — reads as a glossy sticker rather than a flat fill. */}
      <path
        d="M14.6 20.4a5.2 5.2 0 0 1 4.8-4"
        fill="none"
        stroke={PAPER}
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/** Start early — clock. */
export function ClockIcon(props: FlatIconProps) {
  return (
    <svg {...svgProps(props)}>
      <Sparkles d1={[6, 12]} dot={[42, 14]} d2={[40, 38]} />
      <circle cx="24" cy="24" r="14" fill={BLUE_SOFT} />
      <circle cx="24" cy="24" r="11" fill={PAPER} />
      <path d="M24 16.5v8h6" fill="none" stroke={BLUE} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="2" fill={GOLD} />
    </svg>
  );
}

/** Tailor the application — pen on paper. */
export function PenIcon(props: FlatIconProps) {
  return (
    <svg {...svgProps(props)}>
      <Sparkles d1={[6, 11]} dot={[42, 13]} d2={[8, 39]} />
      <rect x="10" y="9" width="21" height="28" rx="3" fill={PAPER} />
      <rect x="10" y="9" width="21" height="28" rx="3" fill="none" stroke={BLUE_SOFT} strokeWidth="1.6" />
      <rect x="14" y="15" width="13" height="2.4" rx="1.2" fill={BLUE_SOFT} />
      <rect x="14" y="21" width="13" height="2.4" rx="1.2" fill={BLUE_SOFT} />
      <rect x="14" y="27" width="8" height="2.4" rx="1.2" fill={BLUE_SOFT} />
      {/* pen */}
      <path d="M38.6 12.1l3.3 3.3-14.1 14.1-4.4 1.1 1.1-4.4z" fill={BLUE} />
      <path d="M38.6 12.1l3.3 3.3 2.1-2.1-3.3-3.3z" fill={GOLD} />
    </svg>
  );
}

/** Track deadlines — calendar. */
export function CalendarIcon(props: FlatIconProps) {
  return (
    <svg {...svgProps(props)}>
      <Sparkles d1={[6, 12]} dot={[42, 13]} d2={[41, 38]} />
      <rect x="9" y="12" width="30" height="27" rx="3.5" fill={PAPER} />
      <rect x="9" y="12" width="30" height="27" rx="3.5" fill="none" stroke={BLUE_SOFT} strokeWidth="1.6" />
      <path d="M9 15.5A3.5 3.5 0 0 1 12.5 12h23a3.5 3.5 0 0 1 3.5 3.5V20H9z" fill={BLUE} />
      <rect x="14.5" y="7.5" width="3.4" height="7" rx="1.7" fill={BLUE_MID} />
      <rect x="30.1" y="7.5" width="3.4" height="7" rx="1.7" fill={BLUE_MID} />
      <rect x="14" y="24" width="5" height="5" rx="1.5" fill={BLUE_SOFT} />
      <rect x="21.5" y="24" width="5" height="5" rx="1.5" fill={BLUE_SOFT} />
      <rect x="29" y="24" width="5" height="5" rx="1.5" fill={GOLD} />
      <rect x="14" y="31" width="5" height="5" rx="1.5" fill={BLUE_SOFT} />
      <rect x="21.5" y="31" width="5" height="5" rx="1.5" fill={BLUE_SOFT} />
    </svg>
  );
}

/** Recommendations — speech bubbles. */
export function ChatIcon(props: FlatIconProps) {
  return (
    <svg {...svgProps(props)}>
      <Sparkles d1={[6, 11]} dot={[42, 14]} d2={[9, 40]} />
      <path d="M8 13a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H17l-6 5v-5a3 3 0 0 1-3-3z" fill={BLUE_SOFT} />
      <rect x="13" y="15" width="14" height="2.4" rx="1.2" fill={PAPER} />
      <rect x="13" y="20" width="9" height="2.4" rx="1.2" fill={PAPER} />
      <path d="M40 21a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3v4l-5-4H26a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z" fill={BLUE} />
      <rect x="27" y="26" width="11" height="2.4" rx="1.2" fill={PAPER} opacity="0.85" />
      <rect x="27" y="31" width="7" height="2.4" rx="1.2" fill={GOLD} />
    </svg>
  );
}

/** Apply broadly — target. */
export function TargetIcon(props: FlatIconProps) {
  return (
    <svg {...svgProps(props)}>
      <Sparkles d1={[6, 12]} dot={[42, 12]} d2={[8, 39]} />
      <circle cx="23" cy="25" r="14" fill={BLUE_SOFT} />
      <circle cx="23" cy="25" r="9.5" fill={PAPER} />
      <circle cx="23" cy="25" r="5.5" fill={BLUE} />
      <circle cx="23" cy="25" r="2.2" fill={PAPER} />
      {/* arrow — shaft plus a single flight, drawn as one corner wedge */}
      <path d="M23 25L40.5 8.5" stroke={GOLD_DEEP} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M35.6 6.2l7.8-1-1 7.8z" fill={GOLD} />
    </svg>
  );
}
