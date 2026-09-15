/**
 * localStorage keys for the two walkthroughs, and nothing else.
 *
 * This file imports nothing on purpose. `TourProvider` is mounted eagerly in
 * `App.tsx` — it has to be, it decides whether to open the tour at all — and it
 * needs to read these three keys. Reading `JOURNEY_TOUR_SEEN_KEY` from
 * `JourneyTour.tsx` would have pulled that whole component, its step script and
 * its framer-motion surface into the entry chunk, for one string. Same for the
 * product tour's own keys, which live beside its script in `steps.ts`.
 *
 * `JourneyTour.tsx` and `lib/tour/steps.ts` both re-export their key from here,
 * so every existing import site keeps working and there is still exactly one
 * definition of each string.
 */

/** Journey's own first-run walkthrough. Written by `pages/Journey.tsx`. */
export const JOURNEY_TOUR_SEEN_KEY = "pf_journey_tour_seen";

/**
 * Written when the product tour first opens, so it is offered once. Set on
 * open rather than on completion: a student who skips on step one has made a
 * decision, and re-offering it next login ignores that.
 */
export const PRODUCT_TOUR_SEEN_KEY = "pf_product_tour_seen";

/**
 * Written by `OnboardingSurvey` on submit.
 *
 * Its only job is to keep the product tour to accounts that have just signed
 * up. Without it, gating on "has not seen it" alone would open the tour for
 * every existing student the first time they loaded the build that shipped it.
 */
export const PRODUCT_TOUR_PENDING_KEY = "pf_product_tour_pending";
