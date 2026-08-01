import { useEffect, useMemo, useState } from "react";
import { Loader2, Trophy, Gem, Heart, Globe, School as SchoolIcon, GraduationCap, Flame, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Matches the non-PII fallback handle the backend assigns when a student
// hasn't set a display name yet (see get_journey_leaderboard SQL).
const AUTO_HANDLE_RE = /^Student-[A-Z0-9]{4}$/;

type Scope = "global" | "school" | "grade";

interface Row {
  rank: number;
  display_name: string;
  grade: string | null;
  school_name: string | null;
  diamonds: number;
  streak: number;
  hearts: number;
  is_me: boolean;
}

const PAGE_SIZE = 10;

function LeaderboardRow({ r }: { r: Row }) {
  return (
    <li
      className={cn(
        "grid grid-cols-[1.5rem_minmax(0,1fr)_3rem_3rem_3rem] items-center gap-2 rounded-lg px-2 py-1.5 text-xs",
        r.is_me ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"
      )}
    >
      <span
        className={cn(
          "w-6 text-center font-extrabold tabular-nums",
          r.rank === 1 && "text-amber-500",
          r.rank === 2 && "text-zinc-400",
          r.rank === 3 && "text-orange-500",
          r.rank > 3 && "text-muted-foreground"
        )}
      >
        {r.rank}
      </span>
      <span className="min-w-0 truncate font-medium">
        {r.display_name}
        {r.is_me && <span className="ml-1 text-[9px] text-primary font-bold uppercase">you</span>}
      </span>
      <span className="flex items-center justify-end gap-0.5 text-sky-500 tabular-nums font-bold">
        <Gem className="h-3 w-3" />
        {r.diamonds}
      </span>
      <span className="flex items-center justify-end gap-0.5 text-orange-500 tabular-nums font-bold">
        <Flame className="h-3 w-3" />
        {r.streak}
      </span>
      <span className="flex items-center justify-end gap-0.5 text-rose-500 tabular-nums font-bold">
        <Heart className="h-3 w-3" />
        {r.hearts}
      </span>
    </li>
  );
}

export function JourneyLeaderboard() {
  const [scope, setScope] = useState<Scope>("global");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setPage(1);
    supabase
      .rpc("get_journey_leaderboard", { scope, limit_count: 10000 })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.error("Leaderboard failed:", error);
          setRows([]);
          setError(error.message || "Couldn't load the leaderboard.");
        } else {
          setRows((data ?? []) as unknown as Row[]);
        }
        setLoading(false);
      });
    return () => { alive = false; };
  }, [scope]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page]
  );

  // The signed-in user's own row, so we can pin it when it falls off the
  // visible page — otherwise a mid-pack rank is invisible without paging.
  const myRow = useMemo(() => rows.find((r) => r.is_me) ?? null, [rows]);
  const myRowOnPage = useMemo(
    () => (myRow ? pageRows.some((r) => r.is_me) : false),
    [myRow, pageRows]
  );

  const emptyMessage =
    scope === "school"
      ? "No school on your profile yet — set one to see classmates here."
      : scope === "grade"
      ? "Set your grade in onboarding to see grade-mates here."
      : "No one's on the board yet — complete a stage to claim the top spot.";

  return (
    <div className="rounded-2xl border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-bold text-foreground">Leaderboard</h2>
      </div>

      {myRow && AUTO_HANDLE_RE.test(myRow.display_name) && (
        <Link
          to="/profile?section=general"
          className="mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2 text-[11px] font-medium text-foreground hover:bg-primary/10 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          You're showing up as "{myRow.display_name}" — set a real display name
        </Link>
      )}

      <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
        <TabsList className="grid grid-cols-3 w-full mb-3 h-9">
          <TabsTrigger value="global" className="text-[11px] gap-1"><Globe className="h-3 w-3" />Global</TabsTrigger>
          <TabsTrigger value="school" className="text-[11px] gap-1"><SchoolIcon className="h-3 w-3" />School</TabsTrigger>
          <TabsTrigger value="grade" className="text-[11px] gap-1"><GraduationCap className="h-3 w-3" />Grade</TabsTrigger>
        </TabsList>

        <TabsContent value={scope} className="m-0">
          {loading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div>
              <div className="mb-2 grid grid-cols-[1.5rem_minmax(0,1fr)_3rem_3rem_3rem] items-center gap-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <span>#</span>
                <span>User</span>
                <span className="text-right">Gems</span>
                <span className="text-right">Streak</span>
                <span className="text-right">Hearts</span>
              </div>
              <ul className="space-y-1.5">
                {pageRows.map((r) => (
                  <LeaderboardRow key={`${r.rank}-${r.display_name}`} r={r} />
                ))}
              </ul>

              {/* Pin the user's own row when it isn't on the visible page. */}
              {myRow && !myRowOnPage && (
                <>
                  <div className="my-1.5 flex items-center gap-2 px-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    <span className="h-px flex-1 bg-border" />
                    Your rank
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <ul>
                    <LeaderboardRow r={myRow} />
                  </ul>
                </>
              )}

              {totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between px-2 text-[11px] text-muted-foreground">
                  <span className="tabular-nums">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="px-1 tabular-nums font-medium text-foreground">
                      {page}/{totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
