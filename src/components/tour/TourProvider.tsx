import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  JOURNEY_TOUR_SEEN_KEY,
  PRODUCT_TOUR_PENDING_KEY,
  PRODUCT_TOUR_SEEN_KEY,
} from "@/lib/tour/keys";

/**
 * The tour itself is code-split and only fetched once it actually opens.
 *
 * This provider is mounted eagerly for every signed-in page load, but the tour
 * runs exactly once per account. A static import would have put the engine and
 * the whole-product script in the entry chunk for every visitor who will never
 * see it.
 */
const ProductTour = lazy(() =>
  import("@/components/tour/PathforgeTour").then((m) => ({ default: m.PathforgeTour })),
);

/**
 * Owns whether the product tour is running, and decides when it starts itself.
 *
 * It auto-runs once, for a student who has just finished the onboarding survey
 * and has not seen it before. Not for counsellors or admins: the tour walks the
 * student nav bar, which is not the bar those accounts see. Not before
 * onboarding either — the survey is itself a full-screen flow, and a tour that
 * opened on top of it would be pointing at pages behind a modal.
 *
 * The "seen" flag is localStorage rather than a profile column on purpose: it
 * is a UI preference, it costs a migration and a round trip to store server
 * side, and the worst case of losing it is that a student who cleared their
 * browser is offered the tour a second time and presses Skip.
 */

interface TourApi {
  open: boolean;
  /** Run the tour from the top, regardless of the seen flag. */
  start: () => void;
  stop: () => void;
}

const TourContext = createContext<TourApi | null>(null);

/**
 * Never throws when there is no provider above it.
 *
 * `Journey` calls this to suppress its own walkthrough while the product tour
 * is running, and `src/prerender/entry.tsx` renders routes without this
 * provider on purpose. A hook that threw would turn "no tour here" into a blank
 * prerendered page.
 */
const INERT: TourApi = { open: false, start: () => {}, stop: () => {} };

export function useProductTour(): TourApi {
  return useContext(TourContext) ?? INERT;
}

/** Routes the tour must never auto-open on top of. */
const BLOCKED_PREFIXES = ["/auth", "/teacher", "/admin", "/onboarding", "/recommendations"];

export function TourProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, onboardingCompleted, isTeacher, isAdmin, roleLoading, loading } = useAuth();
  const location = useLocation();

  const start = useCallback(() => setOpen(true), []);
  const stop = useCallback(() => setOpen(false), []);

  // Auto-run, once.
  useEffect(() => {
    if (open) return;
    if (loading || roleLoading) return;
    if (!user || !onboardingCompleted) return;
    if (isTeacher || isAdmin) return;
    if (BLOCKED_PREFIXES.some((p) => location.pathname.startsWith(p))) return;

    let due = false;
    try {
      due =
        window.localStorage.getItem(PRODUCT_TOUR_PENDING_KEY) === "1" &&
        window.localStorage.getItem(PRODUCT_TOUR_SEEN_KEY) !== "1";
    } catch {
      // Private mode, or storage blocked. Do nothing: silently skipping the
      // tour beats reopening it on every navigation forever.
      due = false;
    }
    if (!due) return;

    // One frame of headroom so the route the student landed on has mounted
    // before the tour starts driving the router away from it.
    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [open, loading, roleLoading, user, onboardingCompleted, isTeacher, isAdmin, location.pathname]);

  // Mark seen the moment it opens, not when it finishes: a student who skips on
  // step one has made a decision, and re-offering it next login ignores that.
  useEffect(() => {
    if (!open) return;
    try {
      window.localStorage.setItem(PRODUCT_TOUR_SEEN_KEY, "1");
      window.localStorage.removeItem(PRODUCT_TOUR_PENDING_KEY);
      // Journey has its own first-run walkthrough, and this tour's Journey stop
      // already covers both of its targets — the banner and the stats row —
      // word for word. Left unset, /journey would auto-open a second
      // full-screen dialog on top of this one the moment the tour arrives
      // there. Marking it seen here is what keeps the two from colliding.
      window.localStorage.setItem(JOURNEY_TOUR_SEEN_KEY, "1");
    } catch {
      /* storage blocked — the tour still runs, it just may be offered again */
    }
  }, [open]);

  const api = useMemo<TourApi>(() => ({ open, start, stop }), [open, start, stop]);

  return (
    <TourContext.Provider value={api}>
      {children}
      {/* No fallback: the tour is an overlay, and a spinner where an overlay
          has not arrived yet would be worse than a few hundred ms of nothing. */}
      {open && (
        <Suspense fallback={null}>
          <ProductTour open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </TourContext.Provider>
  );
}
