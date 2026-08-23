import { useEffect, useMemo, useState } from "react";
import { Gem, Flame, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Leaderboard data + row primitives.
 *
 * This used to be a self-contained 220-line card wedged into the Journey
 * sidebar at 260px wide, where six columns of numbers had nowhere to go. The
 * board now has its own page (`src/pages/Leaderboard.tsx`); what lives here is
 * the part that page needs — one fetch, one row renderer, one podium — so the
 * page file stays about layout and typography rather than about Supabase.
 */

/**
 * The non-PII fallback handle the backend assigns when a student has set
 * neither a username nor a full name.
 *
 * This regex was already here, with a comment claiming `get_journey_leaderboard`
 * produced that shape. It did not — the live function fell back to the local
 * part of the user's EMAIL, so 66 students had their address on a board every
 * other student could read. 20260808120000_leaderboard_no_guests_no_pii.sql
 * makes the claim true.
 */
export const AUTO_HANDLE_RE = /^Student-[A-Z0-9]{4}$/;

export type LeaderboardScope = "global" | "school" | "grade";

export interface LeaderboardRow {
  rank: number;
  display_name: string;
  grade: string | null;
  school_name: string | null;
  diamonds: number;
  streak: number;
  hearts: number;
  is_me: boolean;
}

/** Ordinal medal colour for the top three. */
export function rankAccent(rank: number): string {
  if (rank === 1) return "text-amber-500";
  if (rank === 2) return "text-zinc-400";
  if (rank === 3) return "text-orange-600";
  return "text-muted-foreground";
}

/**
 * Loads the whole board once per scope.
 *
 * Pagination is client-side on purpose: the population is in the low hundreds,
 * and holding every row means the signed-in student's own rank can be pinned
 * without a second round-trip for the page they aren't looking at.
 */
export function useLeaderboard(scope: LeaderboardScope) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    supabase
      .rpc("get_journey_leaderboard", { scope, limit_count: 10000 })
      .then(({ data, error: rpcError }) => {
        if (!alive) return;
        if (rpcError) {
          console.error("Leaderboard failed:", rpcError);
          setRows([]);
          setError(rpcError.message || "Couldn't load the leaderboard.");
        } else {
          setRows((data ?? []) as unknown as LeaderboardRow[]);
        }
        setLoading(false);
      });
    return () => { alive = false; };
  }, [scope]);

  const me = useMemo(() => rows.find((r) => r.is_me) ?? null, [rows]);

  return { rows, loading, error, me };
}

/** Shared column template so the header and every row line up exactly. */
export const STANDINGS_GRID =
  "grid grid-cols-[2.25rem_minmax(0,1fr)_3.25rem] sm:grid-cols-[2.75rem_minmax(0,1fr)_4rem_4rem_4rem] items-center gap-3";

function Stat({
  icon: Icon, value, className, label,
}: { icon: typeof Gem; value: number; className: string; label: string }) {
  return (
    <span className="flex items-center justify-end gap-1 tabular-nums" title={label}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", className)} />
      <span className="font-display text-[13px] font-semibold">{value}</span>
    </span>
  );
}

/**
 * One line of the standings table.
 *
 * On phones the streak and hearts columns are dropped rather than shrunk —
 * three tiny numbers in a 40px column is the failure mode of the old card.
 */
export function StandingRow({ r, dense = false }: { r: LeaderboardRow; dense?: boolean }) {
  return (
    <li
      className={cn(
        STANDINGS_GRID,
        "rounded-lg border border-transparent px-3 transition-colors",
        dense ? "py-2" : "py-2.5",
        r.is_me
          ? "border-primary/25 bg-primary/[0.06]"
          : "hover:border-border hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "font-serif text-[17px] leading-none tabular-nums",
          rankAccent(r.rank),
          r.rank > 3 && "text-muted-foreground/80",
        )}
      >
        {r.rank}
      </span>

      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-foreground">{r.display_name}</span>
          {r.is_me && (
            <span className="shrink-0 font-display text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
              You
            </span>
          )}
        </span>
        {(r.school_name || r.grade) && (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {[r.school_name, r.grade ? `Grade ${r.grade}` : null].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>

      <Stat icon={Gem} value={r.diamonds} className="text-sky-500" label="Gems" />
      <span className="hidden sm:block">
        <Stat icon={Flame} value={r.streak} className="text-orange-500" label="Streak" />
      </span>
      <span className="hidden sm:block">
        <Stat icon={Heart} value={r.hearts} className="text-rose-500" label="Hearts" />
      </span>
    </li>
  );
}
