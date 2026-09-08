/**
 * Time and text formatting for chat surfaces.
 *
 * Chat has a different clock convention from the rest of the product: a
 * conversation list wants "the shortest thing that is still unambiguous", not a
 * full date, because the reader is scanning twenty rows and only needs to know
 * how recent each one is relative to the others.
 */
import { format, isSameDay, isSameYear, isToday, isYesterday } from "date-fns";

/** Timestamp for a conversation-list row: `14:32`, `Yesterday`, `Mon`, `12 Mar`. */
export function listTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  const now = new Date();
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days < 7) return format(d, "EEE");
  return isSameYear(d, now) ? format(d, "d MMM") : format(d, "d MMM yyyy");
}

/** Time under a message bubble. */
export function messageTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : format(d, "HH:mm");
}

/** Heading for a day divider in the thread. */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return isSameYear(d, new Date()) ? format(d, "EEEE d MMMM") : format(d, "d MMMM yyyy");
}

/** Whether two messages fall on different days, i.e. a divider goes between. */
export function crossesDay(a: string | undefined, b: string): boolean {
  if (!a) return true;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return true;
  return !isSameDay(da, db);
}

/**
 * Whether a message should be visually attached to the one before it.
 *
 * Same author, same day, within five minutes — the window in which consecutive
 * messages read as one continued thought rather than two separate arrivals, so
 * the avatar and name are drawn once instead of on every line.
 */
export function continuesFrom(
  prev: { sender_id: string; created_at: string } | undefined,
  current: { sender_id: string; created_at: string },
): boolean {
  if (!prev) return false;
  if (prev.sender_id !== current.sender_id) return false;
  if (crossesDay(prev.created_at, current.created_at)) return false;
  const gap = new Date(current.created_at).getTime() - new Date(prev.created_at).getTime();
  return gap >= 0 && gap < 5 * 60 * 1000;
}

/** Human file size for an attachment chip. */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** One line of preview text, collapsed and clipped. */
export function preview(body: string | null, limit = 90): string {
  if (!body) return "";
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}

/**
 * A single emoji, including the multi-code-point ones.
 *
 * An emoji can be a base glyph plus a variation selector (U+FE0F), plus a skin
 * tone modifier, plus further glyphs joined by ZWJ (U+200D) — 👨‍👩‍👧 is four
 * code points and one emoji. Counting code units instead would call that four.
 */
const EMOJI_GLYPH =
  /\p{Extended_Pictographic}️?\p{Emoji_Modifier}?(?:‍\p{Extended_Pictographic}️?\p{Emoji_Modifier}?)*/gu;

/**
 * How many emoji a body consists of, or 0 if it is not emoji-only.
 *
 * Every messenger renders a bare "👍" or "🎉🎉" larger and without a bubble,
 * because at body-text size a lone emoji reads as a typo rather than a reply.
 * The cap is three: past that it is a string of emoji, which is a message.
 */
export function emojiOnlyCount(body: string | null | undefined): number {
  if (!body) return 0;
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 24) return 0;

  // `lastIndex` is shared state on a /g regex, so it is reset before each use
  // rather than left wherever the previous call stopped.
  EMOJI_GLYPH.lastIndex = 0;
  const count = [...trimmed.matchAll(EMOJI_GLYPH)].length;
  if (count === 0 || count > 3) return 0;

  // Anything left once the emoji are removed means this is a normal message
  // that happens to contain one.
  EMOJI_GLYPH.lastIndex = 0;
  return trimmed.replace(EMOJI_GLYPH, "").trim().length === 0 ? count : 0;
}

/** `Today at 14:32` — the long form, for a message-info panel. */
export function fullTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "d MMM yyyy");
  return `${day} at ${format(d, "HH:mm")}`;
}
