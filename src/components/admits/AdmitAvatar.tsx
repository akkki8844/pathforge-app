/**
 * Illustrated avatars for the Past Admits page.
 *
 * These students are real and named, and we deliberately do NOT republish their
 * photographs (see the sourcing rules in src/data/pastAdmits.ts). What follows
 * is a flat cartoon character deterministically generated from the admit's id —
 * it is not a likeness, is not derived from any photo of them, and carries no
 * information about the actual person. It exists so the cards read as people
 * rather than as a column of initials.
 *
 * Deterministic means the same student always gets the same character, so the
 * page doesn't reshuffle between renders or between users.
 */

const BACKDROPS = ["#dfe7fb", "#fbe8d8", "#dcf0e4", "#f3e0f2", "#fdf0cf", "#dcedf5"];
const SKINS = ["#f6d7bd", "#eec3a0", "#d9a173", "#b57a4d", "#8d5a34", "#5f3a20"];
const HAIRS = ["#221a16", "#3f2b21", "#6b4423", "#a8672d", "#8c8c94", "#141414"];
const TOPS = ["#3f5bd0", "#28407f", "#2f8f66", "#c1663a", "#7a52b8", "#4b5563"];

const HAIR_STYLES = ["short", "curls", "bun", "long", "wave", "fade"] as const;
type HairStyle = (typeof HAIR_STYLES)[number];

/** FNV-1a. Same hash the profile avatars use, so behaviour is consistent. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Every cap is "top slice of an ellipse a shade larger than the head, closed
 * along a hairline". Building them that way rather than freehand keeps the
 * silhouette flush with the skull — earlier freehand paths left a sliver of
 * hair sitting on a visibly bald head.
 *
 * The `A` arc runs left→right with sweep=1, which is clockwise on screen and
 * therefore over the crown. The trailing `C` is the hairline: control points
 * above the endpoints bow it upward into a fringe.
 */
const CAP = "M28.5 41 A21.5 23.5 0 0 1 71.5 41 C67 34 33 34 28.5 41 Z";
/** Higher, tighter hairline. */
const CAP_HIGH = "M30.5 38 A20 22 0 0 1 69.5 38 C66 31 34 31 30.5 38 Z";

function Hair({ style, color }: { style: HairStyle; color: string }) {
  switch (style) {
    case "curls":
      return (
        <g fill={color}>
          <path d={CAP} />
          <circle cx="34" cy="30" r="9" />
          <circle cx="46" cy="25" r="10" />
          <circle cx="58" cy="27" r="9.5" />
          <circle cx="67" cy="35" r="8" />
          <circle cx="31" cy="39" r="7" />
        </g>
      );
    case "bun":
      return (
        <g fill={color}>
          <path d={CAP} />
          {/* Overlaps the crown so it reads as attached, not floating. */}
          <circle cx="50" cy="17" r="7.5" />
        </g>
      );
    case "long":
      return (
        <g fill={color}>
          <path d={CAP} />
          <path d="M26.5 38h6v33a10 10 0 0 1-10-9z" />
          <path d="M73.5 38h-6v33a10 10 0 0 0 10-9z" />
        </g>
      );
    case "wave":
      return (
        <g fill={color}>
          {/* Same crown, but the hairline undulates instead of arcing evenly. */}
          <path d="M28.5 42 A21.5 23.5 0 0 1 71.5 42 C67 33 61 40 55 36 C49 32 41 41 35 35 C32 32 30 37 28.5 42 Z" />
        </g>
      );
    case "fade":
      return <path d={CAP_HIGH} fill={color} />;
    case "short":
    default:
      return <path d={CAP} fill={color} />;
  }
}

interface Props {
  /** Stable identifier — use the admit's `id`, never their name. */
  seed: string;
  className?: string;
}

export function AdmitAvatar({ seed, className = "" }: Props) {
  const h = hash(seed);
  const backdrop = BACKDROPS[h % BACKDROPS.length];
  const skin = SKINS[(h >>> 4) % SKINS.length];
  const hair = HAIRS[(h >>> 9) % HAIRS.length];
  const top = TOPS[(h >>> 14) % TOPS.length];
  const style = HAIR_STYLES[(h >>> 19) % HAIR_STYLES.length];
  const glasses = ((h >>> 24) & 3) === 0; // roughly one in four
  const clipId = `admit-clip-${h.toString(36)}`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Shoulders are drawn oversized and clipped, so they meet the frame
            edge cleanly instead of floating inside it. */}
        <clipPath id={clipId}>
          <rect x="0" y="0" width="100" height="100" rx="22" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="100" height="100" fill={backdrop} />

        {/* Torso */}
        <path d="M50 66c-18 0-30 11-32 27v15h64V93c-2-16-14-27-32-27z" fill={top} />
        {/* Neck, tucked behind the head */}
        <rect x="43" y="54" width="14" height="16" rx="6" fill={skin} />

        {/* Ears sit behind the head so the outline stays clean */}
        <circle cx="28" cy="47" r="5" fill={skin} />
        <circle cx="72" cy="47" r="5" fill={skin} />

        <ellipse cx="50" cy="45" rx="21" ry="23" fill={skin} />

        <Hair style={style} color={hair} />

        {/* Brows */}
        <g stroke={hair} strokeWidth="2" strokeLinecap="round" opacity="0.85">
          <path d="M40 41.5h7" />
          <path d="M53 41.5h7" />
        </g>

        {/* Eyes */}
        <circle cx="43.5" cy="48" r="2.6" fill="#2b2b33" />
        <circle cx="56.5" cy="48" r="2.6" fill="#2b2b33" />

        {glasses && (
          <g stroke="#2b2b33" strokeWidth="1.6" fill="none" opacity="0.9">
            <circle cx="43.5" cy="48" r="6.5" />
            <circle cx="56.5" cy="48" r="6.5" />
            <path d="M50 48h0M37 47h-3M63 47h3" strokeLinecap="round" />
          </g>
        )}

        {/* Smile */}
        <path
          d="M44 57.5c1.8 2.4 4 3.6 6 3.6s4.2-1.2 6-3.6"
          stroke="#8a4a3c"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
