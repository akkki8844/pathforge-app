// Lightweight Core Web Vitals reporter.
//
// Uses the native PerformanceObserver API directly (no `web-vitals` package)
// to track LCP, CLS, and INP with zero added bundle weight. In dev this logs
// to the console so regressions are visible while iterating locally. In prod
// it's a no-op unless an analytics pipe is wired up later — deliberately not
// inventing a backend endpoint here.
//
// Safe by construction: every observer is wrapped so an unsupported entry
// type (older browsers) never throws and never affects the app.

type VitalName = "LCP" | "CLS" | "INP";

function report(name: VitalName, value: number, extra?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[web-vitals] ${name}:`, Math.round(value * 100) / 100, extra ?? "");
  }
  // Prod: intentionally a no-op. Hook up to a real analytics pipe here if/when
  // one exists — see project notes; do not invent a backend endpoint.
}

function safeObserve(type: string, callback: (list: PerformanceObserverEntryList) => void) {
  try {
    if (typeof PerformanceObserver === "undefined") return;
    if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return;
    const observer = new PerformanceObserver(callback);
    observer.observe({ type, buffered: true } as PerformanceObserverInit);
  } catch {
    // Unsupported in this browser — silently skip, never break the app.
  }
}

export function initWebVitalsReporting() {
  if (typeof window === "undefined") return;

  // ---- Largest Contentful Paint ----
  // LCP can update multiple times before the page settles; report the final
  // value once the page is hidden/backgrounded (the standard approach).
  let latestLcp = 0;
  safeObserve("largest-contentful-paint", (list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
    if (!last) return;
    latestLcp = last.renderTime || last.loadTime || 0;
  });

  const reportLcpOnce = (() => {
    let reported = false;
    return () => {
      if (reported || latestLcp === 0) return;
      reported = true;
      report("LCP", latestLcp);
    };
  })();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") reportLcpOnce();
  });
  window.addEventListener("pagehide", reportLcpOnce, { once: true });

  // ---- Cumulative Layout Shift ----
  let clsValue = 0;
  safeObserve("layout-shift", (list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & {
      value?: number;
      hadRecentInput?: boolean;
    })[]) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value ?? 0;
      }
    }
  });

  const reportClsOnce = (() => {
    let reported = false;
    return () => {
      if (reported) return;
      reported = true;
      report("CLS", clsValue);
    };
  })();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") reportClsOnce();
  });
  window.addEventListener("pagehide", reportClsOnce, { once: true });

  // ---- Interaction to Next Paint (approximate via event timing) ----
  let worstInteraction = 0;
  safeObserve("event", (list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & { duration: number; interactionId?: number })[]) {
      if (entry.interactionId && entry.duration > worstInteraction) {
        worstInteraction = entry.duration;
      }
    }
  });

  window.addEventListener(
    "pagehide",
    () => {
      if (worstInteraction > 0) report("INP", worstInteraction);
    },
    { once: true },
  );
}
