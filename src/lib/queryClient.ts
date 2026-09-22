import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/**
 * The app's single React Query client, and the localStorage persister behind it.
 *
 * WHY THIS LIVES HERE RATHER THAN IN `App.tsx`
 *
 * Sign-out has to be able to empty it. The cache holds whatever the signed-in
 * person was looking at, and `App.tsx` cannot be imported from the auth context
 * without a cycle, so the client moved to its own module and both sides import
 * it. Clearing it is not housekeeping: everything cached for one account is
 * still in memory when the next account signs in on the same tab, which on a
 * shared or school machine is somebody else's data on somebody else's screen.
 */
export const QUERY_CACHE_KEY = "pathforge-rq-cache";

/** Who the cache currently belongs to, so a different user invalidates it. */
export const QUERY_CACHE_OWNER_KEY = "pathforge-rq-owner";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min: less refetch churn
      gcTime: 24 * 60 * 60 * 1000, // 24h cache retention
      refetchOnWindowFocus: false, // don't blow away state on tab return
      refetchOnReconnect: "always",
      retry: 1,
    },
  },
});

export const persister =
  typeof window !== "undefined"
    ? createSyncStoragePersister({
        storage: window.localStorage,
        key: QUERY_CACHE_KEY,
        throttleTime: 1000,
      })
    : undefined;

/**
 * Forget everything cached for the account that was signed in.
 *
 * Called on sign-out and whenever the signed-in user id changes, including the
 * case where one person signs out and another signs in without the page ever
 * reloading — which is the case that used to leave the previous person's data
 * on screen until something happened to refetch it.
 */
export function clearUserCaches() {
  try {
    queryClient.clear();
  } catch {
    /* ignore */
  }
  try {
    window.localStorage.removeItem(QUERY_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Record who the cache belongs to, and wipe it if that is someone else.
 *
 * Returns true when a foreign cache was discarded, which callers use only for
 * logging. A signed-out state (`null`) does not clear anything on its own —
 * sign-out already does, and a page load before auth resolves must not throw
 * away the cache belonging to the person about to be restored.
 */
export function reconcileCacheOwner(userId: string | null | undefined): boolean {
  if (!userId) return false;
  let previous: string | null = null;
  try {
    previous = window.localStorage.getItem(QUERY_CACHE_OWNER_KEY);
  } catch {
    return false;
  }
  if (previous && previous !== userId) {
    clearUserCaches();
    try {
      window.localStorage.setItem(QUERY_CACHE_OWNER_KEY, userId);
    } catch {
      /* ignore */
    }
    return true;
  }
  if (previous !== userId) {
    try {
      window.localStorage.setItem(QUERY_CACHE_OWNER_KEY, userId);
    } catch {
      /* ignore */
    }
  }
  return false;
}
