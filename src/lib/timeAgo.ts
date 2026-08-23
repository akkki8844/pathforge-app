/**
 * "3 minutes ago", without date-fns.
 *
 * The notification bell lives in the signed-in navbar, which is part of the
 * eager entry graph — so importing `formatDistanceToNow` for it put the whole
 * of date-fns (24 kB, and its locale plumbing) on the critical path of every
 * page load, including the marketing landing page that has no navbar at all.
 *
 * `Intl.RelativeTimeFormat` is in every browser this app supports, is localised
 * for free, and costs nothing to load. Anything older than a week falls back to
 * an absolute date, because "37 days ago" is a worse answer than "12 June".
 */

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const ABSOLUTE = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(input: Date | string | number): string {
  const then = input instanceof Date ? input : new Date(input);
  const ms = then.getTime();
  if (!Number.isFinite(ms)) return "";

  const delta = Date.now() - ms;
  // A clock skewed a few seconds into the future should read as "now", not as
  // "in 4 seconds".
  if (delta < MINUTE) return "just now";
  if (delta < HOUR) return RELATIVE.format(-Math.round(delta / MINUTE), "minute");
  if (delta < DAY) return RELATIVE.format(-Math.round(delta / HOUR), "hour");
  if (delta < 7 * DAY) return RELATIVE.format(-Math.round(delta / DAY), "day");
  return ABSOLUTE.format(then);
}
