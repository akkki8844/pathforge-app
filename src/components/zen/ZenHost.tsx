import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useZenMode } from "@/lib/zen";

// The room (three.js, models, textures) is only fetched when Zen is used.
const loadStudio = () => import("./ZenStudio");
const ZenStudio = lazy(loadStudio);

const CURTAIN = "#040509";

/**
 * Shown while the study's code is still downloading, so entering Zen never
 * sits on a plain black screen. Matches the study's own loader, which takes
 * over as soon as the chunk arrives.
 */
function StudioFallback() {
  return (
    <div
      className="absolute inset-0 flex items-end p-4 sm:p-8"
      style={{ color: "#eef1f8", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" }}
      role="status"
    >
      <div>
        <div className="text-[11px] uppercase" style={{ color: "rgba(238, 241, 248, 0.56)" }}>
          Zen mode / building your study
        </div>
        <div className="mt-2 text-[64px] leading-none tabular-nums sm:text-[96px]">000</div>
      </div>
    </div>
  );
}

/** How long a closed study stays parked before its GPU memory is released. */
const PARK_MS = 3 * 60_000;

/**
 * Mounts Zen's study over the whole app while Zen is on.
 *
 * The page underneath is wiped away by a curtain rising from the bottom edge,
 * then made inert and unscrollable, so no navbar, banner, dock or button of
 * the normal interface can be seen, focused or clicked. When Zen is turned
 * off the study plays its own exit, then the curtain drops away downward to
 * give the page back.
 *
 * A closed study is parked rather than destroyed: hidden, with its render
 * loop stopped. Tearing a WebGL context down and immediately building a new
 * one stalls the GPU process for seconds, so going back into Zen within a few
 * minutes reuses the same room and starts at once. After PARK_MS it is
 * unmounted and the memory goes back.
 */
export function ZenHost() {
  const [zen] = useZenMode();
  const [mounted, setMounted] = useState(zen);
  const [parked, setParked] = useState(false);
  const curtain = useRef<HTMLDivElement>(null);
  const reduced =
    typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

  // Fetch the study's code while the app is idle, so entering Zen does not
  // wait on it. Models still download only on first entry.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    const run = () => void loadStudio().catch(() => {});
    const id = window.setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(run) : run()), 4000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!zen) return;
    setMounted(true);
    setParked(false);
  }, [zen]);

  // Wipe in: an exit for the page, so it accelerates away (ease-in).
  useLayoutEffect(() => {
    if (!zen || !mounted || !curtain.current) return;
    curtain.current.animate([{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)" }], {
      duration: reduced ? 1 : 520,
      easing: "cubic-bezier(0.7, 0, 0.84, 0)",
      fill: "forwards",
    });
  }, [zen, mounted, reduced]);

  // Release a parked room after a while.
  useEffect(() => {
    if (!parked) return;
    const id = window.setTimeout(() => {
      setMounted(false);
      setParked(false);
    }, PARK_MS);
    return () => window.clearTimeout(id);
  }, [parked]);

  // Take the app out of reach while the study is up.
  const covering = mounted && !parked;
  useEffect(() => {
    if (!covering) return;
    const app = document.getElementById("root");
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    app?.setAttribute("inert", "");
    app?.setAttribute("aria-hidden", "true");
    html.style.overflow = "hidden";
    return () => {
      app?.removeAttribute("inert");
      app?.removeAttribute("aria-hidden");
      html.style.overflow = prevOverflow;
    };
  }, [covering]);

  const onExited = useCallback(() => {
    const el = curtain.current;
    if (!el || el.style.display === "none") {
      setParked(true);
      return;
    }
    // The room is gone; the curtain and everything on it drop away to hand
    // the page back (ease-out, since the page is what arrives).
    const a = el.animate([{ clipPath: "inset(0 0 0% 0)" }, { clipPath: "inset(0 0 100% 0)" }], {
      duration: reduced ? 1 : 460,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "forwards",
    });
    a.onfinish = () => {
      // Turned back on while the curtain was dropping: the wipe-in has
      // already restarted, so stay.
      if (document.documentElement.hasAttribute("data-zen")) return;
      setParked(true);
    };
  }, [reduced]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={curtain}
      className="pf-zen-curtain fixed inset-0 z-[2147482999] overflow-hidden"
      style={{ background: CURTAIN, clipPath: "inset(100% 0 0 0)", display: parked ? "none" : undefined }}
      aria-hidden={parked || undefined}
    >
      <Suspense fallback={<StudioFallback />}>
        <ZenStudio leaving={!zen} parked={parked} onExited={onExited} />
      </Suspense>
    </div>,
    document.body,
  );
}
