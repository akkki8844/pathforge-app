import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Generic per-user draft persistence to localStorage.
 *
 * Survives page refresh, navigation, and re-renders so users never lose
 * in-progress work when their session is interrupted.
 *
 * Usage:
 *   const { hydrated, clear } = useDraftPersistence(
 *     "essay-draft",
 *     { originalEssay, promptText, essayType },
 *     (saved) => {
 *       if (saved.originalEssay) setOriginalEssay(saved.originalEssay);
 *       if (saved.promptText) setPromptText(saved.promptText);
 *       if (saved.essayType) setEssayType(saved.essayType);
 *     },
 *   );
 *
 * `hydrated` becomes true after the saved snapshot has been restored. Wait
 * for it before running effects that depend on user-entered state.
 *
 * `clear()` wipes the draft (call after successful submission/reset).
 */
export function useDraftPersistence<T>(
  key: string,
  state: T,
  restore: (saved: T) => void,
  options?: {
    /** When false, persistence is disabled (e.g. while a user is signed out). */
    enabled?: boolean;
    /** Throttle window in ms (default 400). */
    throttleMs?: number;
  },
) {
  const { user } = useAuth();
  const enabled = options?.enabled !== false;
  const throttleMs = options?.throttleMs ?? 400;
  const storageKey = user ? `pf:draft:${user.id}:${key}` : null;
  const [hydrated, setHydrated] = useState(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore once per user/key
  useEffect(() => {
    if (!storageKey || !enabled) {
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        restore(parsed);
      }
    } catch (e) {
      console.warn(`[draft] failed to restore ${storageKey}`, e);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled]);

  // Persist on change (throttled)
  useEffect(() => {
    if (!storageKey || !enabled || !hydrated) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        /* quota / private mode — silent */
      }
    }, throttleMs);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [storageKey, enabled, hydrated, state, throttleMs]);

  const clear = () => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
  };

  return { hydrated, clear };
}
