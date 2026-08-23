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
