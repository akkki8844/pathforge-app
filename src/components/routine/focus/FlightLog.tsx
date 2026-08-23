/**
 * The flight log: every route flown, drawn as a network.
 *
 * Deliberately not a table. The same rows presented as `date | duration |
 * status` are an analytics readout, and nobody has ever felt anything about an
 * analytics readout. As a map of everywhere you have been plus a shelf of the
 * passes you kept, the identical data becomes a record of a term's work.
 *
 * Destinations here are focus destinations, and the empty state says so — the
 * map is a picture of sessions completed, not of places visited.
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Globe2, Plane, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AirportBadge } from "./AirportBadge";
import { MAP_HEIGHT, MAP_WIDTH, project, routeSegments, toPath } from "@/lib/focus-flight/geo";
import { airportByCode, type Airport } from "@/lib/focus-flight/airports";
import type { FocusFlight } from "@/lib/focus-flight/flight";
import type { RoutineFocusFlight } from "@/lib/routine/types";

/** Rebuilds the in-memory flight a stored row describes, for the pass viewer. */
function rowToFlight(row: RoutineFocusFlight): FocusFlight {
  const mk = (
    code: string,
    name: string,
    city: string,
    country: string,
    lat: number,
    lon: number,
  ): Airport => ({
    code,
    name,
    city,
    country,
    lat,
    lon,
    region: airportByCode(code)?.region ?? "Europe",
  });

  return {
    id: row.id,
    origin: mk(row.origin_code, row.origin_name, row.origin_country, row.origin_country, row.origin_lat, row.origin_lon),
    destination: mk(
      row.destination_code,
      row.destination_name,
      row.destination_country,
      row.destination_country,
      row.destination_lat,
      row.destination_lon,
    ),
    distanceKm: row.distance_km,
    plannedMinutes: row.planned_minutes,
    intent: row.intent,
    cabin: row.cabin,
    objective: row.objective,
    targetType: "none",
    targetId: null,
    targetLabel: null,
    flightNumber: row.flight_number,
    seat: row.seat,
    gate: row.gate,
    startedAt: new Date(row.started_at).getTime(),
    status: row.status,
  };
}

export function RouteNetwork({ flights }: { flights: RoutineFocusFlight[] }) {
  const routes = useMemo(() => {
    // Deduplicate: flying DEL→LHR eight times is one line, drawn a little
    // brighter, rather than eight identical strokes stacked on each other.
    const byPair = new Map<string, { row: RoutineFocusFlight; count: number }>();
    for (const f of flights) {
      const key = `${f.origin_code}-${f.destination_code}`;
      const existing = byPair.get(key);
      if (existing) existing.count += 1;
      else byPair.set(key, { row: f, count: 1 });
    }
    return [...byPair.values()];
  }, [flights]);

  const nodes = useMemo(() => {
    const map = new Map<string, { code: string; x: number; y: number; visits: number }>();
    for (const f of flights) {
      for (const [code, lat, lon] of [
        [f.origin_code, f.origin_lat, f.origin_lon],
        [f.destination_code, f.destination_lat, f.destination_lon],
      ] as [string, number, number][]) {
        const existing = map.get(code);
        if (existing) existing.visits += 1;
        else {
          const p = project({ lat, lon });
          map.set(code, { code, x: p.x, y: p.y, visits: 1 });
        }
      }
    }
    return [...map.values()];
  }, [flights]);

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className="h-full w-full"
      role="img"
      aria-label={`Focus destination map: ${nodes.length} airports across ${routes.length} routes`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="log-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g stroke="currentColor" className="text-white/[0.05]" strokeWidth="0.6">
        {Array.from({ length: 11 }, (_, i) => {
          const x = (i / 12) * MAP_WIDTH + MAP_WIDTH / 12;
          return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={MAP_HEIGHT} />;
        })}
        {Array.from({ length: 8 }, (_, i) => {
          const y = (i / 9) * MAP_HEIGHT + MAP_HEIGHT / 9;
          return <line key={`h${i}`} x1={0} y1={y} x2={MAP_WIDTH} y2={y} />;
        })}
      </g>

      <g fill="none" strokeLinecap="round" filter="url(#log-glow)">
        {routes.map(({ row, count }) =>
          routeSegments(
            { lat: row.origin_lat, lon: row.origin_lon },
            { lat: row.destination_lat, lon: row.destination_lon },
            72,
          ).map((seg, i) => (
            <path
              key={`${row.origin_code}-${row.destination_code}-${i}`}
              d={toPath(seg)}
              stroke="hsl(var(--accent))"
              strokeWidth={Math.min(2.4, 0.9 + count * 0.35)}
              strokeOpacity={Math.min(0.85, 0.35 + count * 0.14)}
            />
          )),
        )}
      </g>

      <g>
        {nodes.map((n) => (
          <g key={n.code} transform={`translate(${n.x} ${n.y})`}>
            <circle r={Math.min(6, 2.4 + n.visits * 0.5)} className="fill-accent/25" />
            <circle r="2" className="fill-accent" />
            <text
              y={-8}
              textAnchor="middle"
              className="fill-flight-yellow/80 font-sans text-[10px] font-bold italic tracking-wide"
            >
              {n.code}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function FlightLog({
  flights,
  renderPass,
}: {
  flights: RoutineFocusFlight[];
  /** Injected so this file does not have to import the pass and its deps. */
  renderPass: (flight: FocusFlight, outcome: "landed" | "diverted") => React.ReactNode;
}) {
  const [open, setOpen] = useState<RoutineFocusFlight | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? flights : flights.slice(0, 6);
  const selected = open ? rowToFlight(open) : null;

  if (flights.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 px-6 py-12 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/40">
          <Ticket className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-sans text-base font-semibold text-foreground">
          No boarding passes yet
        </h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          Every flight you finish leaves its pass here — route, seat, duration and what you set out
          to do. Book your first one and the collection starts.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((row, i) => {
          const flight = rowToFlight(row);
          const landed = row.status === "landed";
          return (
            <motion.button
              key={row.id}
              type="button"
              onClick={() => setOpen(row)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: Math.min(i * 0.04, 0.2) }}
              className="group rounded-2xl border border-border bg-card/60 p-3.5 text-left transition-colors hover:border-accent/50"
            >
              <div className="flex items-center gap-2.5">
                <AirportBadge code={row.origin_code} tone="muted" size="sm" />
                <span className="flex flex-1 items-center gap-1.5">
                  <span className="h-px flex-1 border-t border-dashed border-border" />
                  <Plane className="h-3 w-3 -rotate-[20deg] text-muted-foreground" aria-hidden="true" />
                  <span className="h-px flex-1 border-t border-dashed border-border" />
                </span>
                <AirportBadge code={row.destination_code} tone="outline" size="sm" />
              </div>

              <p className="mt-1 truncate text-xs text-muted-foreground">
                {row.origin_country} → {row.destination_country}
              </p>

              {row.objective && (
                <p className="mt-2 line-clamp-1 text-xs text-foreground/75">{row.objective}</p>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5">
                <span className="font-sans text-[11px] text-muted-foreground">
                  {row.flight_number}
                </span>
                <span className="text-[11px] text-muted-foreground">{row.planned_minutes} min</span>
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                    landed
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  )}
                >
                  {landed ? "Completed" : "Diverted"}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {new Date(row.started_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {flights.length > 6 && (
        <div className="mt-3 text-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : `Show all ${flights.length} passes`}
          </Button>
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-[52rem] bg-slate-950 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Globe2 className="h-4 w-4 text-accent" aria-hidden="true" />
              {open?.origin_code} → {open?.destination_code}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {open &&
                `${open.origin_country} to ${open.destination_country} · ${new Date(
                  open.started_at,
                ).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}`}
            </DialogDescription>
          </DialogHeader>
          {selected && open && renderPass(selected, open.status === "landed" ? "landed" : "diverted")}
        </DialogContent>
      </Dialog>
    </>
  );
}
