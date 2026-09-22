/**
 * Turn `ai_usage_logs` rows into a scrubbable trace.
 *
 * The seven bar charts this replaces answered one question — "how many requests
 * on each of the last seven days" — and answered it at a resolution that hid
 * everything interesting. A trace answers the question people actually have:
 * *when* did I use *what*, and how long did each stretch of work run.
 *
 * WHAT IS REAL HERE, AND WHAT IS NOT
 *
 * Every number below comes from a row. `created_at` is a real timestamp, so a
 * span's start and end are real wall-clock moments and its length is real
 * elapsed time. Nothing is interpolated between them.
 *
 * What the table does NOT record is how long a single request took — there is
 * no duration column. So a span is never "this call took 4s". A session span is
 * "your first and last request in this burst were 41 minutes apart", and a
 * burst of exactly one request has a length of zero and renders as the bar's
 * 3px minimum. That is the honest shape of the data; inventing a plausible
 * per-call duration would make the picture prettier and wrong.
 *
 * `tokens_used` is deliberately not plotted. `consume_credits()` writes a
 * feature's CREDIT cost into that column, so reading it as tokens reports a
 * voice session that burned thousands of tokens as "1". The result column shows
 * request counts, which the rows do support. See UsageSection for the longer
 * version of that story.
 */

import type { SpanKind, TraceSpan } from "@/components/ui/agent-trace";

export interface UsageLogRow {
  feature_type: string | null;
  created_at: string;
  tokens_used?: number | null;
  estimated_cost?: number | null;
  request_metadata?: Record<string, unknown> | null;
}

export interface UsageTrace {
  spans: TraceSpan[];
  /** Length of the plotted window in ms — always the full window, so an idle Monday still reads as idle. */
  duration: number;
  /** Epoch ms the axis starts at. Offsets are measured from here. */
  windowStart: number;
  /** Local midnights inside the window, so the gridlines are day boundaries. */
  ticks: number[];
  /** An offset, written as a weekday and clock time. */
  formatTime: (ms: number) => string;
  /** A length, written as a span of time. */
  formatDuration: (ms: number) => string;
  featureCount: number;
  sessionCount: number;
  requestCount: number;
  /** False when the session detail was dropped to keep the card a sane height. */
  showsSessions: boolean;
}

/**
 * Two requests more than half an hour apart are two sittings, not one.
 *
 * There is no session id on these rows, so a boundary has to be inferred from
 * the gap. Thirty minutes is long enough to survive reading a long essay
 * critique before asking the follow-up, and short enough that the morning and
 * the evening never merge into one nine-hour bar.
 */
const SESSION_GAP_MS = 30 * 60 * 1000;

/**
 * Past this many rows the card stops being a chart and starts being a list, so
 * the per-session children are dropped and each feature keeps its single
 * first-to-last bar. Nothing is hidden silently: `showsSessions` says which of
 * the two the caller is looking at, and the caption changes with it.
 */
const ROW_BUDGET = 14;

const IO = /artifact|pdf|docx|pptx|slide|resume|export|upload|ingest|image|file|proof/;
const TOOL = /search|fetch|find|scrape|refresh|news|professor|calendar|verify|extract|moderate/;
const AGENT = /advisor|copilot|voice/;

/** Which icon and colour a feature gets. Cosmetic, but it should not be random. */
function kindOf(feature: string): SpanKind {
  if (AGENT.test(feature)) return "agent";
  if (IO.test(feature)) return "io";
  if (TOOL.test(feature)) return "tool";
  return "model";
}

const two = (n: number) => String(n).padStart(2, "0");

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** The clock is only ever asked about points inside the window. */
function clampOffset(ms: number, duration: number) {
  return ms < 0 ? 0 : ms > duration ? duration : ms;
}

/**
 * Build the trace.
 *
 * @param rows  Raw `ai_usage_logs` rows, in any order.
 * @param days  How many calendar days the window covers, ending now.
 * @param now   Injectable clock, so this is testable without freezing time.
 */
export function buildUsageTrace(rows: UsageLogRow[], days = 7, now = Date.now()): UsageTrace {
  // Start at local midnight so the gridlines land on day boundaries a human
  // recognises, rather than on "seven times twenty-four hours ago".
  const startDay = new Date(now);
  startDay.setHours(0, 0, 0, 0);
  startDay.setDate(startDay.getDate() - (days - 1));
  const windowStart = startDay.getTime();
  const duration = Math.max(1, now - windowStart);

  const ticks: number[] = [];
  for (let i = 1; i < days; i++) {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + i);
    const off = d.getTime() - windowStart;
    if (off > 0 && off < duration) ticks.push(off);
  }

  const formatTime = (ms: number) => {
    const d = new Date(windowStart + clampOffset(ms, duration));
    const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
    if (d.getHours() === 0 && d.getMinutes() === 0) return weekday;
    return `${weekday} ${two(d.getHours())}:${two(d.getMinutes())}`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 60_000) return "<1m";
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
    if (ms < 86_400_000) {
      const h = Math.floor(ms / 3_600_000);
      const m = Math.round((ms % 3_600_000) / 60_000);
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    const d = Math.floor(ms / 86_400_000);
    const h = Math.round((ms % 86_400_000) / 3_600_000);
    return h > 0 ? `${d}d ${h}h` : `${d}d`;
  };

  // Bucket by feature, keeping only what falls inside the window.
  const byFeature = new Map<string, number[]>();
  for (const r of rows) {
    const t = Date.parse(r.created_at);
    if (!Number.isFinite(t) || t < windowStart || t > now) continue;
    const feature = (r.feature_type || "other").trim() || "other";
    const list = byFeature.get(feature);
    if (list) list.push(t);
    else byFeature.set(feature, [t]);
  }

  const parents: TraceSpan[] = [];
  const children: TraceSpan[] = [];
  let requestCount = 0;

  for (const [feature, unsorted] of byFeature) {
    const stamps = unsorted.slice().sort((a, b) => a - b);
    requestCount += stamps.length;

    // Cluster into sittings.
    const sessions: { from: number; to: number; n: number }[] = [];
    let from = stamps[0];
    let prev = stamps[0];
    let n = 0;
    for (const t of stamps) {
      if (t - prev > SESSION_GAP_MS) {
        sessions.push({ from, to: prev, n });
        from = t;
        n = 0;
      }
      prev = t;
      n++;
    }
    sessions.push({ from, to: prev, n });

    const kind = kindOf(feature);
    const parentId = `f:${feature}`;
    parents.push({
      id: parentId,
      label: feature,
      kind,
      start: stamps[0] - windowStart,
      end: stamps[stamps.length - 1] - windowStart,
      /*
       * The sitting count is carried in the text, not in the `attempt` chip.
       *
       * `attempt` renders a tidy "×3" that looks exactly right for "you came
       * back three times" — but the component also writes it into the row's
       * aria-label as "attempt 3", which is a different and false claim. A
       * screen reader would be told these requests were retries. The chip is
       * not worth misreporting the data to anyone using one.
       */
      detail:
        sessions.length > 1
          ? `${plural(stamps.length, "request")}, ${plural(sessions.length, "sitting")}`
          : plural(stamps.length, "request"),
    });

    sessions.forEach((s, i) => {
      children.push({
        id: `${parentId}:${i}`,
        parentId,
        label: formatTime(s.from - windowStart),
        kind,
        start: s.from - windowStart,
        end: s.to - windowStart,
        detail: plural(s.n, "request"),
      });
    });
  }

  const showsSessions = parents.length > 0 && parents.length + children.length <= ROW_BUDGET;

  return {
    spans: showsSessions ? [...parents, ...children] : parents,
    duration,
    windowStart,
    ticks,
    formatTime,
    formatDuration,
    featureCount: parents.length,
    sessionCount: children.length,
    requestCount,
    showsSessions,
  };
}
