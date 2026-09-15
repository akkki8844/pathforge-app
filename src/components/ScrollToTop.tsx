import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Restores scroll position on navigation.
 *
 * This used to unconditionally jump to the top on every pathname change, which
 * quietly broke every in-app anchor link: `/#departments` from another route
 * landed the visitor at the top of the landing page with no explanation, and
 * the target section was never reached. A hash is an explicit request for a
 * position, so it wins over the default.
 *
 * The element may not be mounted on the same tick the route changes (routes are
 * lazy), so a missing target is retried on the next frame before giving up.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0 });
      return;
    }

    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

    let frame = 0;
    const target = () => document.getElementById(decodeURIComponent(hash.slice(1)));

    const scroll = () => {
      const el = target();
      if (el) {
        el.scrollIntoView({ behavior, block: "start" });
        return;
      }
      // Two frames is enough for a lazy route to commit; beyond that the id
      // genuinely does not exist and the top of the page is the honest answer.
      if (frame < 2) {
        frame += 1;
        requestAnimationFrame(scroll);
        return;
      }
      window.scrollTo({ top: 0, left: 0 });
    };

    requestAnimationFrame(scroll);
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
