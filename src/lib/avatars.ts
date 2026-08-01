/**
 * Pathforge avatars.
 *
 * Users pick a character instead of uploading a photo. Reasons this is a
 * deliberate product choice and not just a shortcut:
 *   - Most users are minors. Not collecting or hosting their faces is the
 *     safer default, and it removes a moderation surface entirely.
 *   - Leaderboards and teacher dashboards look consistent when every row has
 *     art of the same weight, instead of a mix of selfies and grey initials.
 *
 * Each avatar is a rounded-hexagon "waypoint" silhouette with a cut-out
 * expression. Silhouette and expression are stored separately so the two
 * grids multiply out instead of needing one drawing per combination.
 *
 * IDs are persisted in `profiles.avatar_url` as `pf:<face>:<palette>`, which
 * keeps the existing column and lets an uploaded-photo URL still round-trip
 * for any account that already has one.
 */

export const AVATAR_PREFIX = "pf:";

/** Expression cut into the token face. */
export type AvatarFace =
  | "focus"    // ^ ^   — heads-down, the default
  | "calm"     // — —
  | "spark"    // ▲ ▲
  | "grind"    // >∧<
  | "wink"     // ● <
  | "visor"    // ■ ■
  | "scholar"  // ◠ ◠ with a tassel
  | "beam";    // ● ● wide

export const AVATAR_FACES: AvatarFace[] = [
  "focus", "calm", "spark", "grind", "wink", "visor", "scholar", "beam",
];

/** Fill colour for the token. Named for the brand token they echo. */
export type AvatarPalette = "editorial" | "deep" | "ember" | "sage" | "plum" | "slate";

export const AVATAR_PALETTES: Record<AvatarPalette, { fill: string; label: string }> = {
  editorial: { fill: "#4465d8", label: "Editorial blue" },
  deep:      { fill: "#29439c", label: "Deep blue" },
  ember:     { fill: "#e8933d", label: "Ember" },
  sage:      { fill: "#3f9d6d", label: "Sage" },
  plum:      { fill: "#8b5cc4", label: "Plum" },
  slate:     { fill: "#526079", label: "Slate" },
};

export const AVATAR_PALETTE_KEYS = Object.keys(AVATAR_PALETTES) as AvatarPalette[];

export interface AvatarId {
  face: AvatarFace;
  palette: AvatarPalette;
}

export function serializeAvatar({ face, palette }: AvatarId): string {
  return `${AVATAR_PREFIX}${face}:${palette}`;
}

/** True for our own avatar ids, false for a real uploaded-image URL. */
export function isPathforgeAvatar(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(AVATAR_PREFIX);
}

export function parseAvatar(value: string | null | undefined): AvatarId | null {
  if (!isPathforgeAvatar(value)) return null;
  const [, face, palette] = value!.split(":");
  if (!AVATAR_FACES.includes(face as AvatarFace)) return null;
  if (!AVATAR_PALETTE_KEYS.includes(palette as AvatarPalette)) return null;
  return { face: face as AvatarFace, palette: palette as AvatarPalette };
}

/**
 * Stable default for a user who has never chosen one.
 *
 * Derived from the user id rather than random so the same person sees the same
 * avatar on every device and after every reload, without us having to write a
 * row at signup. Uses FNV-1a — tiny, well-distributed, and deterministic
 * across JS engines (unlike anything built on hashCode-style overflow).
 */
export function defaultAvatarFor(seed: string): AvatarId {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return {
    face: AVATAR_FACES[h % AVATAR_FACES.length],
    // Shift the bits so face and palette don't move in lockstep.
    palette: AVATAR_PALETTE_KEYS[(h >>> 8) % AVATAR_PALETTE_KEYS.length],
  };
}

/** The avatar to render: the stored choice, else a stable default. */
export function resolveAvatar(stored: string | null | undefined, seed: string): AvatarId {
  return parseAvatar(stored) ?? defaultAvatarFor(seed);
}
