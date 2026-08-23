/**
 * Great-circle geometry, and the projection the flight map draws in.
 *
 * The aircraft has to move along the same curve the route line is drawn on, or
 * the whole illusion collapses — a plane that drifts off its own path is worse
 * than no plane at all. So both come from one function, `interpolate()`, and
 * the map simply asks it for 128 points to stroke and for one point to put the
 * aircraft on. There is no second, "close enough" path used for animation.
 */

const R_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The point `t` of the way along the great circle from `a` to `b`.
 *
 * Spherical linear interpolation rather than a straight lerp of latitude and
 * longitude: the naive version puts a London-to-Tokyo aircraft somewhere over
 * Kazakhstan at the halfway mark instead of over the Arctic, which is visibly
 * wrong on any map with a coastline on it.
 *
 * The antipodal case (sin d == 0) falls back to the start point. Two airports
 * exactly opposite each other have no unique great circle between them, and no
 * pair in the atlas is anywhere near that, so the guard exists only to keep the
 * division defined.
 */
export function interpolate(a: LatLon, b: LatLon, t: number): LatLon {
  const lat1 = toRad(a.lat);
  const lon1 = toRad(a.lon);
  const lat2 = toRad(b.lat);
  const lon2 = toRad(b.lon);

  const d =
    2 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin((lat2 - lat1) / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
        ),
      ),
    );
  if (d === 0) return { lat: a.lat, lon: a.lon };

  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);

  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);

  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lon: toDeg(Math.atan2(y, x)),
  };
}

/** Initial great-circle bearing from `a` to `b`, in degrees clockwise from north. */
export function bearing(a: LatLon, b: LatLon): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ── Projection ────────────────────────────────────────────────────────────

/** The world map's intrinsic SVG size. Every projected point lands inside it. */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 500;

export interface Point {
  x: number;
  y: number;
}

/**
 * Equirectangular projection onto the map's viewBox.
 *
 * Chosen over anything fancier because the world outline this draws over is
 * itself equirectangular, and because the inverse is trivial — which matters
 * for keeping the route inside the frame rather than clipping it at the seam.
 */
export function project({ lat, lon }: LatLon): Point {
  return {
    x: ((lon + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

/**
 * The route as projected points, split wherever it crosses the date line.
 *
 * A Tokyo-to-Los-Angeles great circle runs off the right edge of an
 * equirectangular map and reappears on the left. Drawn as one polyline that is
 * a horizontal streak straight back across the entire Atlantic — the single
 * most common way a flight map betrays that it is fake. Emitting separate
 * segments and stroking each one lets the line leave one edge and re-enter the
 * other, which is what actually happens.
 */
export function routeSegments(a: LatLon, b: LatLon, steps = 128): Point[][] {
  const segments: Point[][] = [];
  let current: Point[] = [];
  let prevLon: number | null = null;

  for (let i = 0; i <= steps; i++) {
    const p = interpolate(a, b, i / steps);
    if (prevLon !== null && Math.abs(p.lon - prevLon) > 180) {
      // Crossed the seam. Close the run and start a new one on the far side.
      if (current.length > 1) segments.push(current);
      current = [];
    }
    current.push(project(p));
    prevLon = p.lon;
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

/** An SVG path `d` for one projected run of points. */
export function toPath(points: Point[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
}

/** Kilometres formatted the way a boarding pass would print them. */
export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString()} km`;
}
