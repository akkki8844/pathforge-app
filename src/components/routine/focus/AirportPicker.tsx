/**
 * Airport search, and the "where am I flying from" question.
 *
 * Location is offered, never required — and it is worth being precise about
 * what it is used for: the browser's coordinates are compared against the
 * bundled atlas *on this device* and immediately discarded. Nothing is sent
 * anywhere, no reverse-geocoding request is made, and declining the prompt
 * costs the student nothing but two seconds of typing.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, LocateFixed, Plane, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AIRPORTS,
  airportsByRegion,
  searchAirports,
  type Airport,
} from "@/lib/focus-flight/airports";
import { distanceKm } from "@/lib/focus-flight/geo";
import { AirportBadge } from "./AirportBadge";

type LocateState = "idle" | "locating" | "denied" | "unavailable";

export function AirportPicker({
  value,
  onSelect,
  /** Excluded from results — you cannot fly to where you already are. */
  excludeCode,
  /** Codes flown before, surfaced above the fold. */
  recentCodes = [],
  showLocate = false,
  placeholder = "Search by country or code",
  autoFocus = false,
}: {
  value?: Airport;
  onSelect: (airport: Airport) => void;
  excludeCode?: string;
  recentCodes?: string[];
  showLocate?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [locate, setLocate] = useState<LocateState>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const results = useMemo(() => {
    const found = searchAirports(query);
    return excludeCode ? found.filter((a) => a.code !== excludeCode) : found;
  }, [query, excludeCode]);

  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: Airport[] = [];
    for (const code of recentCodes) {
      if (seen.has(code) || code === excludeCode) continue;
      const a = AIRPORTS.find((x) => x.code === code);
      if (a) {
        out.push(a);
        seen.add(code);
      }
      if (out.length >= 6) break;
    }
    return out;
  }, [recentCodes, excludeCode]);

  const regions = useMemo(
    () =>
      airportsByRegion()
        .map((g) => ({ ...g, airports: g.airports.filter((a) => a.code !== excludeCode).slice(0, 6) }))
        .filter((g) => g.airports.length > 0),
    [excludeCode],
  );

  const detect = () => {
    if (!("geolocation" in navigator)) {
      setLocate("unavailable");
      return;
    }
    setLocate("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        let best: Airport | null = null;
        let bestKm = Infinity;
        for (const a of AIRPORTS) {
          const km = distanceKm(here, a);
          if (km < bestKm) {
            bestKm = km;
            best = a;
          }
        }
        setLocate("idle");
        if (best) onSelect(best);
      },
      () => setLocate("denied"),
      { timeout: 8000, maximumAge: 600_000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search airports"
            className="h-11 border-white/12 bg-white/[0.04] pl-9 text-white placeholder:text-white/35 focus-visible:ring-accent"
          />
        </div>
        {showLocate && (
          <Button
            type="button"
            variant="outline"
            onClick={detect}
            disabled={locate === "locating"}
            className="h-11 shrink-0 border-white/15 bg-white/[0.04] text-white hover:bg-white/10 hover:text-white"
          >
            {locate === "locating" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="ml-2 hidden sm:inline">Nearest</span>
          </Button>
        )}
      </div>

      {locate === "denied" && (
        <p className="text-xs text-amber-300/80">
          Location was declined — no problem. Search for your airport above instead.
        </p>
      )}
      {locate === "unavailable" && (
        <p className="text-xs text-amber-300/80">
          This browser cannot share a location. Search for your airport above instead.
        </p>
      )}

      <div className="max-h-[19rem] overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02]">
        {query.trim() ? (
          results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-white/45">
              No country matches "{query.trim()}". Try a country name or a three-letter code.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {results.map((a) => (
                <AirportRow
                  key={a.code}
                  airport={a}
                  selected={a.code === value?.code}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          )
        ) : (
          <div>
            {recents.length > 0 && (
              <Group title="Flown before">
                {recents.map((a) => (
                  <AirportRow
                    key={a.code}
                    airport={a}
                    selected={a.code === value?.code}
                    onSelect={onSelect}
                  />
                ))}
              </Group>
            )}
            {regions.map((g) => (
              <Group key={g.region} title={g.region}>
                {g.airports.map((a) => (
                  <AirportRow
                    key={a.code}
                    airport={a}
                    selected={a.code === value?.code}
                    onSelect={onSelect}
                  />
                ))}
              </Group>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="sticky top-0 z-10 bg-slate-950/85 px-4 py-2 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 backdrop-blur">
        {title}
      </h4>
      <ul className="divide-y divide-white/[0.06]">{children}</ul>
    </section>
  );
}

function AirportRow({
  airport,
  selected,
  onSelect,
}: {
  airport: Airport;
  selected: boolean;
  onSelect: (a: Airport) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(airport)}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
          selected ? "bg-accent/15" : "hover:bg-white/[0.05]",
        )}
      >
        <AirportBadge
          code={airport.code}
          tone={selected ? "solid" : "outline"}
          size="lg"
          className="shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{airport.name}</span>
          <span className="block truncate text-xs text-white/45">{airport.country}</span>
        </span>
        {selected ? (
          <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        ) : (
          <Plane className="h-3.5 w-3.5 shrink-0 text-white/20" aria-hidden="true" />
        )}
      </button>
    </li>
  );
}
