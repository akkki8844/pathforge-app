/**
 * Build-time stand-in for `@/integrations/supabase/client`, used ONLY by the
 * prerender SSR bundle (aliased in vite.prerender.config.mts). It is never
 * reachable from `index.html`, so `vite build` never sees it.
 *
 * Two reasons it has to exist:
 *
 * 1. The real client passes `storage: localStorage` at module scope. In Node
 *    that identifier is undefined, so merely *importing* the module — which
 *    AuthContext, Pricing and Contact all do — throws a ReferenceError before
 *    a single component renders.
 *
 * 2. Prerendering must not talk to Supabase. Pointing the client at an
 *    unroutable host with a throwaway key makes that a property of the build,
 *    not a promise: even if some component ever did fire a query during
 *    render, it could not reach the real project or carry a real credential.
 *
 * It is a genuine `createClient` result rather than a hand-written mock so the
 * API surface matches exactly — nothing here has to be kept in sync by hand.
 * No request is made at construction time, and `persistSession` /
 * `autoRefreshToken` are off so no timers are left running to hang the build.
 */
import { createClient } from "@supabase/supabase-js";

const memoryStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const supabase = createClient("https://prerender.invalid", "prerender-anon-key", {
  auth: {
    storage: memoryStorage,
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
