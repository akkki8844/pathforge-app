import { useEffect, useMemo, useState } from "react";
import { Gem, Flame, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

import { CollegeLogo } from "@/components/CollegeLogo";
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
 * no full name.
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

/**
 * Ordinal weight for the top three.
 *
 * This used to be a medal palette — amber, zinc, orange — which is three
 * colours spent restating a number the reader can already see. On a
 * Cluely-scoped page the one accent means "this is the measured quantity",
 * and on a leaderboard that is the rank itself, so first place gets it and
 * everyone else is drawn in plain ink at decreasing weight.
 */
/**
 * How a place is dressed.
 *
 * The board carried no ranking colour at all: first was indigo — the same
 * indigo as every button on the page — second and third were plain ink, and
 * everything below was muted. Nothing on it said "podium", which is the one
 * thing a leaderboard is for.
 *
 * Gold / silver / bronze are their own tokens rather than borrowed state
 * colours, because they encode WHICH place, not how good or bad something is.
 * They are also well desaturated: a literal metallic gold on a warm paper card
 * reads as a sticker, and the previous attempt at this (an amber ring over an
 * amber glow, plus a zinc one and an orange one) was three gradients restating
 * the number printed directly underneath them. One hue per place, carried by
 * the numeral and a hairline — no gradients, no glow.
 */
export interface RankStyle {
  /** Colour for the numeral itself. */
  text: string;
  /**
   * Hairline + wash for the row or card. Empty below the podium.
   *
   * Marked important. The champion's Panel is `tone="lead"`, which sets its own
   * border and an opaque background, and that was winning the merge — measured
   * live, the gold card resolved to `bg: rgb(255,255,255)` with a neutral
   * border, so the one place that most needs to look gold was the only one that
   * did not. Silver and bronze sit on `tone="default"` and were never affected.
   */
  surface: string;
  /** Ring used by the podium medallion. Empty below the podium. */
  ring: string;
  /** Word for the place, for screen readers and the podium eyebrow. */
  label: string;
  medal: boolean;
}

const MEDALS: Record<number, RankStyle> = {
  1: {
    text: "text-medal-gold",
    surface: "!border-medal-gold/30 !bg-medal-gold/[0.055]",
    ring: "ring-medal-gold/40 bg-medal-gold/10 text-medal-gold",
    label: "Gold",
    medal: true,
  },
  2: {
    text: "text-medal-silver",
    surface: "!border-medal-silver/30 !bg-medal-silver/[0.055]",
    ring: "ring-medal-silver/40 bg-medal-silver/10 text-medal-silver",
    label: "Silver",
    medal: true,
  },
  3: {
    text: "text-medal-bronze",
    surface: "!border-medal-bronze/30 !bg-medal-bronze/[0.055]",
    ring: "ring-medal-bronze/40 bg-medal-bronze/10 text-medal-bronze",
    label: "Bronze",
    medal: true,
  },
};

/*
 * Below the podium the board still steps down rather than going flat at rank 4.
 * Top ten keeps full ink; the rest is muted. Two steps, not a gradient of ten —
 * a board where every row is a slightly different grey is a board where none of
 * them mean anything.
 */
const TOP_TEN: RankStyle = {
  text: "text-foreground",
  surface: "",
  ring: "",
  label: "Top ten",
  medal: false,
};
const REST: RankStyle = {
  text: "text-muted-foreground",
  surface: "",
  ring: "",
  label: "",
  medal: false,
};

export function rankStyle(rank: number): RankStyle {
  return MEDALS[rank] ?? (rank <= 10 ? TOP_TEN : REST);
}

/** Just the numeral colour, for callers that only need that. */
export function rankAccent(rank: number): string {
  return rankStyle(rank).text;
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
      <span className="font-cluely text-[13px] font-semibold text-foreground">{value}</span>
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
  const medal = rankStyle(r.rank);
  return (
    <li
      className={cn(
        STANDINGS_GRID,
        "rounded-lg border border-transparent px-3 transition-colors",
        dense ? "py-2" : "py-2.5",
        // "You" wins over the medal when both apply: which row is yours is the
        // thing you are scanning for, and two tinted surfaces on one row would
        // just muddy each other.
        r.is_me
          ? "border-primary/25 bg-primary/[0.06]"
          : cn(medal.surface, "hover:border-border hover:bg-muted/40"),
      )}
    >
      {/* Top three get the numeral in a medallion so the podium still reads as
          a podium in the flat list; below that it is a bare numeral, stepping
          from full ink in the top ten down to muted. */}
      <span
        className={cn(
          "font-cluely text-[17px] font-semibold leading-none tabular-nums tracking-[-0.02em]",
          medal.text,
          medal.medal &&
            "flex h-7 w-7 items-center justify-center rounded-full text-[14px] ring-1",
          medal.medal && medal.ring,
        )}
      >
        {r.rank}
        {medal.label && <span className="sr-only"> — {medal.label}</span>}
      </span>

      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="truncate font-cluely text-sm font-medium text-foreground">{r.display_name}</span>
          {r.is_me && (
            <span className="shrink-0 font-cluely text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
              You
            </span>
          )}
        </span>
        {(r.school_name || r.grade) && (
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {r.school_name && (
              <CollegeLogo name={r.school_name} size={12} className="rounded-[2px]" hideWhenUnknown />
            )}
            <span className="truncate">
              {[r.school_name, r.grade ? `Grade ${r.grade}` : null].filter(Boolean).join(" · ")}
            </span>
          </span>
        )}
      </span>

      {/* Gems is the sort key, so it is the one figure carrying the accent;
          streak and hearts are context and stay in ink. */}
      <Stat icon={Gem} value={r.diamonds} className="text-primary" label="Gems" />
      <span className="hidden sm:block">
        <Stat icon={Flame} value={r.streak} className="text-muted-foreground" label="Streak" />
      </span>
      <span className="hidden sm:block">
        <Stat icon={Heart} value={r.hearts} className="text-muted-foreground" label="Hearts" />
      </span>
    </li>
  );
}
