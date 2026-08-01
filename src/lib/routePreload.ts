// Centralized chunk preloader: lets the navbar (or any link) warm up the
// route chunk on hover/focus so the actual click feels instant instead of
// blocking on a fresh dynamic import. Big perceived-perf win on a heavy
// multi-route SPA like this one.

type Importer = () => Promise<unknown>;

const importers: Record<string, Importer> = {
  "/journey": () => import("@/pages/Journey"),
  "/advisor": () => import("@/pages/Advisor"),
  "/activities": () => import("@/pages/Activities"),
  "/outcomes": () => import("@/pages/Outcomes"),
  "/admissions-probability": () => import("@/pages/AdmissionsProbability"),
  "/essays": () => import("@/pages/Essays"),
  "/scholarships": () => import("@/pages/Scholarships"),
  "/college-readiness": () => import("@/pages/CollegeReadiness"),
  "/weekly-planner": () => import("@/pages/WeeklyPlanner"),
  "/application-builder": () => import("@/pages/ApplicationBuilder"),
  "/profile-builder": () => import("@/pages/ProfileBuilder"),
  "/resume": () => import("@/pages/Resume"),
  "/profile": () => import("@/pages/Profile"),
  "/about": () => import("@/pages/About"),
  "/contact": () => import("@/pages/Contact"),
  "/pricing": () => import("@/pages/Pricing"),
};

const triggered = new Set<string>();

export function preloadRoute(href: string) {
  const fn = importers[href];
  if (!fn || triggered.has(href)) return;
  triggered.add(href);
  // Best-effort — silently ignore network or chunk errors; the lazyWithRetry
  // wrapper around the actual route handles real failures.
  fn().catch(() => triggered.delete(href));
}

/** Warm up the most common destinations once the app is idle. */
export function preloadCommonRoutes() {
  if (typeof window === "undefined") return;
  const run = () => {
    ["/journey", "/activities", "/profile-builder", "/application-builder"].forEach(preloadRoute);
  };
  const idle = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (idle) idle(run, { timeout: 2500 });
  else setTimeout(run, 1500);
}
