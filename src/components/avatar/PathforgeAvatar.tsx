import { cn } from "@/lib/utils";
import {
  AVATAR_PALETTES, resolveAvatar, type AvatarFace, type AvatarId, type AvatarPalette,
} from "@/lib/avatars";

/**
 * Renders a Pathforge avatar as inline SVG.
 *
 * The silhouette is a rounded hexagon — a waypoint marker, in keeping with a
 * "forge your path" brand, and deliberately not another rounded-square app
 * icon. The expression is punched out of it with the background colour, which
 * is why every face path is drawn in `cutout` rather than being a separate
 * filled shape — a real hole survives any backdrop.
 */

/**
 * A regular pointy-top hexagon (100×100 viewBox, center 50,50, radius 42) with
 * each corner rounded by cutting 10px along both adjacent edges and joining
 * the cut points with a quadratic curve through the original vertex.
 * Precomputed rather than generated at runtime since the polygon is fixed.
 */
const HEX_PATH =
  "M58.66 13 L77.74 24 Q86.4 29 86.4 39 L86.4 61 Q86.4 71 77.74 76 " +
  "L58.66 87 Q50 92 41.34 87 L22.26 76 Q13.6 71 13.6 61 L13.6 39 " +
  "Q13.6 29 22.26 24 L41.34 13 Q50 8 58.66 13 Z";

/** Expression geometry. Everything here is a hole in the token. */
function Face({ face, cutout }: { face: AvatarFace; cutout: string }) {
  const eye = { fill: cutout };
  switch (face) {
    case "focus": // ^ ^ — content, eyes closed in concentration
      return (
        <>
          <path d="M28 56a10 10 0 0 1 18 0" fill="none" stroke={cutout} strokeWidth="6" strokeLinecap="round" />
          <path d="M56 56a10 10 0 0 1 18 0" fill="none" stroke={cutout} strokeWidth="6" strokeLinecap="round" />
        </>
      );
    case "calm": // — —
      return (
        <>
          <rect x="26" y="52" width="22" height="6" rx="3" {...eye} />
          <rect x="55" y="52" width="22" height="6" rx="3" {...eye} />
        </>
      );
    case "spark": // ▲ ▲
      return (
        <>
          <path d="M37 46l11 16H26z" {...eye} />
          <path d="M66 46l11 16H55z" {...eye} />
        </>
      );
    case "grind": // >∧<  — determined
      return (
        <>
          <path d="M24 44l14 10-14 10" fill="none" stroke={cutout} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M43 62l8-12 8 12" fill="none" stroke={cutout} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M78 44L64 54l14 10" fill="none" stroke={cutout} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "wink": // ● <
      return (
        <>
          <circle cx="37" cy="54" r="9" {...eye} />
          <path d="M74 44L60 54l14 10" fill="none" stroke={cutout} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "visor": // ■ ■
      return (
        <>
          <rect x="25" y="45" width="21" height="18" rx="3" {...eye} />
          <rect x="55" y="45" width="21" height="18" rx="3" {...eye} />
        </>
      );
    case "scholar": // ◠ ◠ under a tassel notch
      return (
        <>
          <rect x="44" y="18" width="6" height="13" rx="3" {...eye} />
          <circle cx="47" cy="34" r="5" {...eye} />
          <path d="M28 62a10 10 0 0 1 18 0" fill="none" stroke={cutout} strokeWidth="6" strokeLinecap="round" />
          <path d="M56 62a10 10 0 0 1 18 0" fill="none" stroke={cutout} strokeWidth="6" strokeLinecap="round" />
        </>
      );
    case "beam": // ● ● wide open
      return (
        <>
          <circle cx="36" cy="52" r="10" {...eye} />
          <circle cx="67" cy="52" r="10" {...eye} />
          <path d="M40 74a14 14 0 0 0 24 0" fill="none" stroke={cutout} strokeWidth="6" strokeLinecap="round" />
        </>
      );
  }
}

interface Props {
  /** Explicit avatar, or omit and pass `stored` + `seed` to resolve one. */
  avatar?: AvatarId;
  stored?: string | null;
  /** Stable per-user string (the user id) used to pick a default. */
  seed?: string;
  className?: string;
  size?: number;
  /** Colour punched through the face. Match the surface behind the avatar. */
  cutout?: string;
  /** Draw the selected-state ring and glow. */
  selected?: boolean;
}

export function PathforgeAvatar({
  avatar, stored, seed = "", className, size, cutout = "hsl(var(--card))", selected,
}: Props) {
  const id: AvatarId = avatar ?? resolveAvatar(stored, seed);
  const fill = AVATAR_PALETTES[id.palette as AvatarPalette].fill;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
      focusable="false"
      style={selected ? { filter: `drop-shadow(0 0 6px ${fill}aa)` } : undefined}
    >
      <path d={HEX_PATH} fill={fill} />
      <Face face={id.face} cutout={cutout} />
    </svg>
  );
}
