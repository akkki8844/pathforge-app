/**
 * The in-flight map: a heading-up chase camera, not a static overview.
 *
 * Every other map surface in this feature — booking preview, hero, the route
 * network — draws the atlas from the same dotted SVG projection, and that is
 * deliberate: those are decorative or overview surfaces, and a live network
 * request has no business on a page loading forty of them at once.
 *
 * The flight deck is different. It is the one screen a student stares at for
 * the whole session, and the reference app it's modelled after runs an
 * Apple-Maps-style turn-by-turn view here: a light streets basemap, zoomed in
 * close, with the camera itself rotating so the direction of travel always
 * points to the top of the screen and the plane glyph never turns — the map
 * turns under it. That's a different technique from "draw an overview and
 * move a rotating pin across it," so this component sets the map's `bearing`
 * to the current heading every tick and keeps the marker's own rotation fixed
 * at 0 (`rotationAlignment: "viewport"`) rather than rotating the marker
 * against a stationary map.
 *
 * MapLibre GL, not Leaflet or a `<img>` tile grid: it is already the renderer
 * the project reaches for when real cartography is warranted.
 *
 * The basemap is CARTO's Positron raster tiles, not a MapTiler vector style —
 * tried first, but MapTiler's `style.json` (both the streets and the earlier
 * hybrid-satellite one) never fires MapLibre's `load` event on this project's
 * maplibre-gl version: style/sprite/tilejson all 200, yet the map sits
 * permanently unloaded and nothing ever paints. Confirmed live — a bare
 * raster source loads and renders instantly, a MapTiler style URL never
 * does, so raster is the only reliable option here regardless of style
 * pedigree. CARTO's `light_all` tiles happen to land close to the reference
 * app's light streets look anyway.
 *
 * The route itself is drawn on the map, not just implied by the marker's
 * position — a "you are here" pin with no line under it reads as a toy. One
 * GeoJSON source carries two LineStrings, flown and remaining, split at the
 * current progress and re-sliced from the same `interpolate()` curve the
 * marker walks, so the drawn path and the marker's motion can never disagree.
 */
import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import { interpolate } from "@/lib/focus-flight/geo";
import type { Airport } from "@/lib/focus-flight/airports";

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© CARTO © OpenStreetMap contributors",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

// Close enough to read roads and place names, matching the reference's
// street-level nav zoom instead of a whole-route overview.
const CHASE_ZOOM = 13.2;
const ROUTE_STEPS = 96;

function headingBetween(from: { lon: number; lat: number }, to: { lon: number; lat: number }) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLon = ((to.lon - from.lon) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Decelerating ease, not linear — the camera should settle into each hop
// rather than snap through it at constant speed.
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

type LonLat = [number, number];

function routeCoords(origin: Airport, destination: Airport, from: number, to: number): LonLat[] {
  if (to <= from) return [];
  const steps = Math.max(2, Math.round(ROUTE_STEPS * (to - from)));
  const coords: LonLat[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = from + ((to - from) * i) / steps;
    const p = interpolate(origin, destination, t);
    coords.push([p.lon, p.lat]);
  }
  return coords;
}

function routeGeoJSON(origin: Airport, destination: Airport, clamped: number) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { leg: "flown" },
        geometry: { type: "LineString" as const, coordinates: routeCoords(origin, destination, 0, clamped) },
      },
      {
        type: "Feature" as const,
        properties: { leg: "remaining" },
        geometry: {
          type: "LineString" as const,
          coordinates: routeCoords(origin, destination, clamped, 1),
        },
      },
    ],
  };
}

/**
 * Can this browser actually run the map?
 *
 * MapLibre GL requires WebGL2 and THROWS from its constructor when it is
 * missing — "WebGL2 is required to display this map". That throw happened
 * inside an effect, so React tore the flight deck down and the bug reporter
 * raised a red banner; then the cleanup ran `m.remove()` on a map that had
 * never finished building and crashed again with "Cannot read properties of
 * undefined (reading 'destroy')". Two banners, from one unsupported GPU.
 *
 * WebGL2 is missing more often than it sounds: software-rendering fallbacks,
 * blocklisted drivers, privacy-hardened browsers, remote desktops, and older
 * integrated GPUs all land here. It is an environment fact, not a Pathforge
 * bug, so it must degrade rather than report.
 *
 * The probe result is cached because creating a context to ask the question
 * is itself expensive, and the answer cannot change within a page session.
 * The context is explicitly released — asking the question must not consume
 * one of the browser's handful of live WebGL contexts.
 */
let webgl2Support: boolean | null = null;
function hasWebGL2(): boolean {
  if (webgl2Support !== null) return webgl2Support;
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    webgl2Support = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2Support = false;
  }
  return webgl2Support;
}

export function LiveRouteMap({
  origin,
  destination,
  progress,
  className,
}: {
  origin: Airport;
  destination: Airport;
  progress: number;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const loaded = useRef(false);
  /** Flipped when this browser cannot run the map at all. */
  const [unsupported, setUnsupported] = useState(() => !hasWebGL2());

  // Mount once per route. Rebuilding the whole map on every progress tick
  // would tear down tiles that are already loaded for no reason.
  useEffect(() => {
    if (!container.current) return;
    if (!hasWebGL2()) {
      setUnsupported(true);
      return;
    }
    loaded.current = false;

    let m: MapLibreMap;
    try {
      m = new MapLibreMap({
        container: container.current,
        style: MAP_STYLE,
        center: [origin.lon, origin.lat],
        // Start pulled back and swoop in once tiles are up — a static cut
        // straight to cruise zoom reads as a screenshot, not a live flight.
        zoom: CHASE_ZOOM - 3,
        pitch: 45,
        attributionControl: false,
        dragRotate: false,
        touchPitch: false,
      });
    } catch {
      // Context creation can still fail after the probe passed — the browser
      // caps how many live WebGL contexts a page may hold, and the oldest is
      // dropped when that ceiling is crossed. Degrade, do not report.
      setUnsupported(true);
      return;
    }
    map.current = m;

    // MapLibre emits tile and style failures through this event. Unhandled,
    // it re-throws them onto window.onerror, which is a red banner for a
    // basemap CDN hiccup the student would never otherwise notice.
    m.on("error", () => {});

    m.on("load", () => {
      m.addSource("route", {
        type: "geojson",
        data: routeGeoJSON(origin, destination, 0),
      });

      // White casing under the whole route (both legs) — the same trick
      // Apple/Google Maps use to lift a route off a busy basemap: the line
      // itself is drawn a shade darker than its casing, never bare on tiles.
      m.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 7,
          "line-opacity": 0.9,
        },
      });

      // Remaining leg: solid, muted — the plan, read at a glance as "not yet
      // flown" without resorting to a dashed line, which reads as unfinished
      // artwork rather than a deliberate route style.
      m.addLayer({
        id: "route-remaining",
        type: "line",
        source: "route",
        filter: ["==", ["get", "leg"], "remaining"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#94a3b8",
          "line-width": 3.5,
          "line-opacity": 0.75,
        },
      });

      // Flown leg: the deed, in full color.
      m.addLayer({
        id: "route-flown",
        type: "line",
        source: "route",
        filter: ["==", ["get", "leg"], "flown"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#1d4ed8",
          "line-width": 3.5,
          "line-opacity": 0.95,
        },
      });

      const el = document.createElement("div");
      el.className = "flight-deck-plane";
      // A real airplane silhouette (the classic top-down "airplane mode"
      // glyph), not an abstract compass star — plus a soft ground shadow
      // offset beneath it, the same cue Apple Maps uses to sell altitude.
      el.innerHTML =
        '<span class="flight-deck-plane__shadow" aria-hidden="true"></span>' +
        '<svg class="flight-deck-plane__glyph" viewBox="0 0 24 24" width="22" height="22" fill="white" stroke="#0f172a" stroke-width="0.6">' +
        '<path d="M21 15.5v-1.7l-8-4.9V4.2a1.6 1.6 0 0 0-3.2 0v4.7l-8 4.9v1.7l8-2.5v5.1l-2.6 1.9v1.5l4.2-1.2 4.2 1.2v-1.5l-2.6-1.9v-5.1z"/>' +
        "</svg>";
      // "viewport" alignment, and a rotation that's never touched, is what
      // pins the glyph facing up on screen while the camera rotates under it
      // — the reference's heading-up behavior, not a marker spinning in place.
      marker.current = new Marker({ element: el, rotationAlignment: "viewport" })
        .setLngLat([origin.lon, origin.lat])
        .setRotation(0)
        .addTo(m);
      loaded.current = true;

      // The swoop-in: settle from the pulled-back establishing shot to the
      // real chase zoom once the first tiles are actually on screen.
      m.easeTo({ zoom: CHASE_ZOOM, duration: 1400, easing: easeOutCubic });
    });

    return () => {
      marker.current = null;
      loaded.current = false;
      try {
        // `remove()` walks internals that a map which never reached `load`
        // has not built yet, and throws on the way past them. The map is
        // being discarded either way, so a failure here has nothing left to
        // damage — but uncaught it would surface as a render crash.
        m.remove();
      } catch {
        /* already torn down, or never finished building */
      }
      map.current = null;
    };
    // Route identity only — a live progress update must not remount the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin.code, destination.code]);

  // Progress ticks drive the camera, not the marker — the marker stays put at
  // the map's center and the map itself pans + rotates beneath it.
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded.current) return;
    const clamped = Math.max(0, Math.min(1, progress));
    const here = interpolate(origin, destination, clamped);
    const ahead = interpolate(origin, destination, Math.min(1, clamped + 0.01));
    const heading = headingBetween(here, ahead);
    marker.current?.setLngLat([here.lon, here.lat]);

    const source = m.getSource("route") as GeoJSONSource | undefined;
    source?.setData(routeGeoJSON(origin, destination, clamped));

    m.easeTo({
      center: [here.lon, here.lat],
      bearing: heading,
      zoom: CHASE_ZOOM,
      duration: 480,
      easing: easeOutCubic,
    });
  }, [origin, destination, progress]);

  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const label = `Live route from ${origin.country} to ${destination.country}, ${pct} percent complete`;

  /*
   * No WebGL2: the session is unaffected, only its scenery. The same three
   * facts the map conveys — where you left, where you are heading, how far
   * along you are — are shown as text on the surface the map would have
   * filled, so the deck never renders as a blank rectangle.
   */
  if (unsupported) {
    return (
      <div
        role="img"
        aria-label={label}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/40 px-4 text-center",
          className,
        )}
      >
        <p className="text-sm font-medium text-foreground">
          {origin.code} → {destination.code}
        </p>
        <div
          className="h-1.5 w-full max-w-[14rem] overflow-hidden rounded-full bg-border"
          aria-hidden="true"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          {pct}% there · live map needs WebGL, which this browser has turned off
        </p>
      </div>
    );
  }

  return (
    <div
      ref={container}
      role="img"
      aria-label={label}
      className={cn("h-full w-full [&_.maplibregl-ctrl-logo]:hidden", className)}
    />
  );
}
