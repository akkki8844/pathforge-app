/**
 * SSR entry used only by `npm run prerender`. Never imported by index.html, so
 * it contributes nothing to `vite build` — it is compiled by its own config
 * (vite.prerender.config.mts) into node_modules/.cache, and read by
 * scripts/prerender.mjs.
 *
 * ---------------------------------------------------------------------------
 * Why this file exists at all, rather than rendering <App /> directly
 * ---------------------------------------------------------------------------
 * App.tsx hardcodes <BrowserRouter>, which reads window.history on construction.
 * Rendering it in Node would mean faking a DOM, and a faked DOM is a far larger
 * blast radius than the small amount of duplication below. So the public route
 * table is restated here against <StaticRouter>.
 *
 * Everything ELSE is the real thing: the real providers, in App.tsx's order,
 * and the real page components. Only the router differs.
 *
 * The route guards are deliberately kept (`LandingRoute`, `PublicGuestRoute`,
 * `Layout`) even though this file could skip them, because they are what decide
 * the signed-out markup. With no session — which is the only state that can
 * exist at build time — each one falls through to its children:
 *   - LandingRoute:      `!user` -> renders <Index />
 *   - PublicGuestRoute:  `loading` is still true -> renders children
 *   - Layout:            `user` is null -> guest nav, and no signed-in chrome
 * which is exactly what a first-time visitor's browser produces.
 *
 * Deliberately NOT rendered: TopLoadingBar, IMessageCursor, ScrollToTop,
 * RouteActivityLogger, KeepAliveProvider. They are pure chrome/side effects
 * with no crawlable text, and every one of them is a browser-global risk for
 * zero SEO gain.
 *
 * If a public route is added to App.tsx it must be added here too, or it simply
 * goes back to shipping the empty shell — the failure mode is "no worse than
 * today", never a broken page.
 */
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { StaticRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "framer-motion";

import { AuthProvider } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";

import Index from "@/pages/Index";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Pricing from "@/pages/Pricing";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import RefundPolicy from "@/pages/RefundPolicy";

/** The routes this build emits static HTML for. Must all be reachable signed out. */
export const PRERENDER_ROUTES = [
  "/",
  "/pricing",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/refund-policy",
] as const;

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
      <Route path="/about" element={<Layout><About /></Layout>} />
      <Route path="/contact" element={<Layout><Contact /></Layout>} />
      <Route path="/terms" element={<Layout><Terms /></Layout>} />
      <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
      <Route path="/refund-policy" element={<Layout><RefundPolicy /></Layout>} />
    </Routes>
  );
}

export interface RenderResult {
  /** Markup for the inside of #root. */
  html: string;
  /** Serialised <head> tags, already stringified in document order. */
  head: string;
}

export function render(url: string): RenderResult {
  // A fresh client per route: no cache carries between renders, and nothing is
  // persisted (the localStorage persister App.tsx uses is browser-only anyway).
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  const helmetContext: { helmet?: HelmetServerState } = {};

  const html = renderToString(
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <AuthProvider>
              <CreditsProvider>
                <TooltipProvider>
                  <StaticRouter location={url}>
                    {/* Matches App.tsx's desktop branch. `useIsMobile` returns
                        false until its effect runs, so the client's first paint
                        agrees with this. */}
                    <MotionConfig reducedMotion="never">
                      <PublicRoutes />
                    </MotionConfig>
                  </StaticRouter>
                </TooltipProvider>
              </CreditsProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </StrictMode>,
  );

  const helmet = helmetContext.helmet;
  const head = helmet
    ? [
        helmet.title.toString(),
        helmet.meta.toString(),
        helmet.link.toString(),
        helmet.script.toString(),
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return { html, head };
}
