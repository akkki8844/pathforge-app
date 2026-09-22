import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Activity refresh cadence.
 *
 * The competition set is rebuilt automatically once a week — Sunday at 12:00
 * local — and a student may pull it forward by hand at most
 * {@link MANUAL_REFRESH_LIMIT} times inside that same week.
 *
 * State lives in localStorage, keyed by user id, deliberately: this is a UX
 * throttle on a client-side derivation, not billing. Nothing here is worth a
 * migration (which only Lovable can apply to the live database), and a user
 * who clears their storage getting three fresh presses is an acceptable
 * outcome for a button that only re-derives data they can already see.
 */

/** Manual refreshes allowed inside one Sunday-to-Sunday cycle. */
export const MANUAL_REFRESH_LIMIT = 3;

/** The weekly boundary, in local time: Sunday (day 0) at 12:00. */
const CYCLE_HOUR = 12;

/**
 * Start of the cycle `now` falls in — the most recent Sunday 12:00 local.
 *
 * Sunday *morning* still belongs to the previous cycle, which is why this
 * can't simply floor to the current week's Sunday: at 09:00 on a Sunday the
 * boundary hasn't been crossed yet.
 */
export function cycleStartFor(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(CYCLE_HOUR, 0, 0, 0);
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 7);
  return d;
}

/**
 * The next boundary. Uses calendar arithmetic rather than `+ 7 * 864e5` so the
 * wall-clock time survives a daylight-saving change inside the week.
 */
export function nextCycleStartFor(now: Date = new Date()): Date {
  const d = cycleStartFor(now);
  d.setDate(d.getDate() + 7);
  return d;
}

interface RefreshRecord {
  /** ISO cycle start this record belongs to. A different one wipes the allowance. */
  cycle: string;
  manualUsed: number;
  /** When the automatic refresh for this cycle ran, if it has. */
  autoAt: string | null;
  lastRefreshAt: string | null;
}

const emptyRecord = (cycle: string): RefreshRecord => ({
  cycle,
  manualUsed: 0,
  autoAt: null,
  lastRefreshAt: null,
});

/*
 * Namespaced so a second catalogue can reuse this throttle without sharing an
 * allowance with the first. Defaults to "activity" so every key written before
 * scholarships existed still resolves to the same slot.
 */
const storageKey = (userId: string | null, namespace = "activity") =>
  `pathforge_${namespace}_refresh_${userId ?? "guest"}`;

function readRecord(userId: string | null, cycle: string, namespace?: string): RefreshRecord {
  try {
    const raw = window.localStorage.getItem(storageKey(userId, namespace));
    if (!raw) return emptyRecord(cycle);
    const parsed = JSON.parse(raw) as Partial<RefreshRecord> | null;
    // A record from a previous week is not migrated, it's replaced — that IS
    // the reset.
    if (!parsed || parsed.cycle !== cycle) return emptyRecord(cycle);
    const used = Number(parsed.manualUsed);
    return {
      cycle,
      manualUsed: Number.isFinite(used) ? Math.min(MANUAL_REFRESH_LIMIT, Math.max(0, used)) : 0,
      autoAt: typeof parsed.autoAt === "string" ? parsed.autoAt : null,
      lastRefreshAt: typeof parsed.lastRefreshAt === "string" ? parsed.lastRefreshAt : null,
    };
  } catch {
    // Private mode / storage disabled / corrupt JSON. Treat as a fresh week
    // rather than throwing on a page that has nothing to do with storage.
    return emptyRecord(cycle);
  }
}

function writeRecord(userId: string | null, record: RefreshRecord, namespace?: string) {
  try {
    window.localStorage.setItem(storageKey(userId, namespace), JSON.stringify(record));
  } catch {
    // Nothing to do — the in-memory guards below still hold for this session.
  }
}

export interface ActivityRefreshApi {
  /** Manual refreshes left in the current cycle. */
  manualRemaining: number;
  /** False once the allowance is spent. */
  canManualRefresh: boolean;
  /** When the allowance — and the automatic refresh — next comes round. */
  nextResetAt: Date;
  /** Ready-made phrase for the exhausted state, e.g. "Sunday at 12 PM". */
  nextResetLabel: string;
  /** Last time the set was actually refreshed, by either route. */
  lastRefreshAt: Date | null;
  /**
   * Spend one manual refresh. Returns false — and spends nothing — when the
   * allowance is gone, so the caller can bail before doing the work.
   */
  spendManual: () => boolean;
  /** Record that a refresh finished. Does not touch the allowance. */
  markRefreshed: () => void;
}

export function useActivityRefresh({
  userId,
  enabled,
  onAutoRefresh,
  namespace,
}: {
  userId: string | null;
  /** Hold everything off until auth and the profile have settled. */
  enabled: boolean;
  onAutoRefresh: () => void;
  /**
   * Which catalogue this allowance belongs to. Omit for activities, which is
   * the default and keeps every key written before this parameter existed.
   */
  namespace?: string;
}): ActivityRefreshApi {
  // Kept in a ref so a new callback identity each render can't re-trigger the
  // automatic refresh effect.
  const autoRef = useRef(onAutoRefresh);
  autoRef.current = onAutoRefresh;

  const [cycle, setCycle] = useState(() => cycleStartFor().toISOString());
  const [record, setRecord] = useState<RefreshRecord>(() =>
    readRecord(userId, cycleStartFor().toISOString(), namespace));

  // Re-hydrate when the account resolves (userId arrives after auth settles)
  // or when the week rolls over.
  useEffect(() => {
    setRecord(readRecord(userId, cycle, namespace));
  }, [userId, cycle, namespace]);

  // Roll the cycle over while the page is sitting open across Sunday noon.
  useEffect(() => {
    const ms = nextCycleStartFor().getTime() - Date.now();
    if (ms <= 0) {
      setCycle(cycleStartFor().toISOString());
      return;
    }
    // setTimeout saturates past ~24.8 days; a week is well inside that.
    const timer = window.setTimeout(() => {
      setCycle(cycleStartFor().toISOString());
    }, ms + 1_000);
    return () => window.clearTimeout(timer);
  }, [cycle]);

  /**
   * Session guard for browsers where the write above is a no-op (private mode):
   * without it the automatic refresh would re-fire on every render pass.
   */
  const autoFiredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // Wait for hydration to catch up with the current cycle.
    if (record.cycle !== cycle) return;
    if (record.autoAt) return;
    if (autoFiredFor.current === cycle) return;

    autoFiredFor.current = cycle;
    const next: RefreshRecord = { ...record, autoAt: new Date().toISOString() };
    setRecord(next);
    writeRecord(userId, next, namespace);
    autoRef.current();
  }, [enabled, cycle, record, userId, namespace]);

  const spendManual = useCallback((): boolean => {
    if (record.manualUsed >= MANUAL_REFRESH_LIMIT) return false;
    const next: RefreshRecord = { ...record, manualUsed: record.manualUsed + 1 };
    setRecord(next);
    writeRecord(userId, next, namespace);
    return true;
  }, [record, userId, namespace]);

  const markRefreshed = useCallback(() => {
    setRecord((prev) => {
      const next: RefreshRecord = { ...prev, lastRefreshAt: new Date().toISOString() };
      writeRecord(userId, next, namespace);
      return next;
    });
  }, [userId, namespace]);

  const nextResetAt = useMemo(() => nextCycleStartFor(new Date(cycle)), [cycle]);

  const nextResetLabel = useMemo(() => {
    try {
      const day = nextResetAt.toLocaleDateString(undefined, { weekday: "long" });
      const time = nextResetAt.toLocaleTimeString(undefined, { hour: "numeric" });
      return `${day} at ${time}`;
    } catch {
      return "Sunday at 12 PM";
    }
  }, [nextResetAt]);

  const manualRemaining = Math.max(0, MANUAL_REFRESH_LIMIT - record.manualUsed);

  return {
    manualRemaining,
    canManualRefresh: manualRemaining > 0,
    nextResetAt,
    nextResetLabel,
    lastRefreshAt: record.lastRefreshAt ? new Date(record.lastRefreshAt) : null,
    spendManual,
    markRefreshed,
  };
}
