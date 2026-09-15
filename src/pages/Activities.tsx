import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark, BookmarkCheck, ExternalLink, X, Check, CheckCircle2, MoreHorizontal, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Eyebrow, ColumnHead, Tag } from "@/components/cluely/primitives";
import {
  activities, avoidActivities, calculatePriority, generatePriorityExplanation,
  isActivityAvailableInCountry, Activity,
} from "@/lib/activities";
import {
  competitionCalendar, getCompetitionStatusInfo, daysUntil, formatDate,
  type CompetitionWindow,
} from "@/lib/competitionCalendar";
import {
  getBookmarks, addBookmark, removeBookmark, isBookmarked,
  getCompleted, addCompleted, removeCompleted, isCompleted,
} from "@/lib/storage";
import {
  addCompletedActivityToOutcomes, removeCompletedActivityFromOutcomes,
} from "@/lib/completedActivitiesSync";
import { useAuth } from "@/contexts/AuthContext";
import { findCollegeByName } from "@/lib/colleges";
import { Seo } from "@/components/Seo";
import { useActivityRefresh, MANUAL_REFRESH_LIMIT } from "@/hooks/useActivityRefresh";
import { listItem, staggerParent, staggerStep, transition, viewportOnce } from "@/lib/motion";
import { toast } from "sonner";

type CostType = "all" | "free" | "paid";
type DifficultyType = "all" | "Beginner" | "Intermediate" | "Advanced";
type StatusType = "all" | "open" | "upcoming" | "closed";

/**
 * The calendar is scanned once per card, per filter pass and per signature
 * rebuild. Indexing it here turns every one of those from a linear scan into a
 * lookup.
 */
const calendarById = new Map<string, CompetitionWindow>(
  competitionCalendar.map((c) => [c.activityId, c]),
);

/** Below this many days a deadline stops being information and starts being urgent. */
const URGENT_DAYS = 14;

type DeadlineStatus = "open" | "upcoming" | "closed" | "rolling";

interface DeadlineView {
  label: string;
  value: string;
  daysLeft: number | null;
  urgent: boolean;
  status: DeadlineStatus;
}

/**
 * The one genuinely time-critical fact on a card, resolved into something
 * printable. Everything else about a competition is true all year; only this
 * changes under the student's feet.
 */
function deadlineFor(activity: Activity): DeadlineView {
  const cal = calendarById.get(activity.id);
  if (!cal) {
    return {
      label: "Deadline",
      value: activity.deadline?.trim() || "Rolling — open year-round",
      daysLeft: null,
      urgent: false,
      status: "rolling",
    };
  }

  const info = getCompetitionStatusInfo(cal);

  if (info.status === "registration_open" || info.status === "ongoing") {
    const daysLeft = cal.registrationClose ? daysUntil(cal.registrationClose) : null;
    return {
      label: "Registration closes",
      value: cal.registrationClose ? formatDate(cal.registrationClose) : "Open now",
      daysLeft,
      urgent: daysLeft !== null && daysLeft > 0 && daysLeft <= URGENT_DAYS,
      status: "open",
    };
  }

  if (info.status === "upcoming") {
    const opens = cal.registrationOpen ?? cal.competitionStart ?? null;
    return {
      label: "Registration opens",
      value: opens ? formatDate(opens) : "Dates announced soon",
      daysLeft: opens ? daysUntil(opens) : null,
      urgent: false,
      status: "upcoming",
    };
  }

  return {
    label: "This cycle",
    value: info.reopenInfo ?? "Closed — check the official site",
    daysLeft: null,
    urgent: false,
    status: "closed",
  };
}

const STATUS_LABEL: Record<DeadlineStatus, string> = {
  open: "Open",
  upcoming: "Upcoming",
  closed: "Closed",
  rolling: "Rolling",
};

// ── Refresh diffing ────────────────────────────────────────────────────
//
// The Refresh button used to await refreshOnboardingData(), bump a tick and
// toast "Activities refreshed" unconditionally. The tick did bust the memos,
// but every input those memos read is either static module data or a clock
// that only moves at midnight — so the recomputed list was byte-identical and
// nothing on screen changed. Pressing it looked broken because, visibly, it
// was. Now we fingerprint what a refresh could legitimately alter and report
// the actual difference, including when there isn't one.

type SignedActivity = Activity & { priority?: string };

function signatureOf(list: SignedActivity[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const a of list) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    const cal = calendarById.get(a.id);
    const status = cal ? getCompetitionStatusInfo(cal).status : "none";
    const days = cal?.registrationClose ? daysUntil(cal.registrationClose) : "";
    parts.push(`${a.id}:${a.priority ?? ""}:${status}:${days}`);
  }
  return parts.sort().join("|");
}

function parseSignature(signature: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!signature) return map;
  for (const part of signature.split("|")) {
    const split = part.indexOf(":");
    if (split > 0) map.set(part.slice(0, split), part.slice(split + 1));
  }
  return map;
}

function describeChange(before: string, after: string): string | null {
  const prev = parseSignature(before);
  const next = parseSignature(after);

  let added = 0;
  let updated = 0;
  for (const [id, state] of next) {
    const was = prev.get(id);
    if (was === undefined) added += 1;
    else if (was !== state) updated += 1;
  }
  let removed = 0;
  for (const id of prev.keys()) if (!next.has(id)) removed += 1;

  const bits: string[] = [];
  if (added) bits.push(`${added} new`);
  if (updated) bits.push(`${updated} updated`);
  if (removed) bits.push(`${removed} dropped`);
  return bits.length ? bits.join(" · ") : null;
}

// ── Card ───────────────────────────────────────────────────────────────
// forwardRef because AnimatePresence attaches a ref for exit measurement.

const ActivityCard = forwardRef<HTMLDivElement, {
  activity: SignedActivity & { explanation?: string };
  userMajor: string;
  showPriority: boolean;
  bookmarkedIds: string[];
  completedIds: string[];
  onBookmarkToggle: (a: Activity, e: React.MouseEvent) => void;
  onCompletedToggle: (a: Activity, e: React.MouseEvent) => void;
  onClick: (a: Activity) => void;
}>(function ActivityCard({
  activity, userMajor, showPriority, bookmarkedIds, completedIds,
  onBookmarkToggle, onCompletedToggle, onClick,
}, ref) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const deadline = useMemo(() => deadlineFor(activity), [activity]);
  const done = completedIds.includes(activity.id);
  const bookmarked = bookmarkedIds.includes(activity.id);
  const fits = !!userMajor && activity.relevantMajors.includes(userMajor);

  return (
    <motion.article
      ref={ref}
      layout
      variants={listItem}
      exit="exit"
      onClick={() => onClick(activity)}
      className={[
        "group relative flex cursor-pointer flex-col rounded-[0.75rem] border p-4 transition-colors",
        done
          ? "border-foreground/20 bg-muted/40"
          : "border-border bg-card hover:border-foreground/25 hover:bg-muted/20",
      ].join(" ")}
    >
      {/* Status + row actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Tag tone={deadline.status === "open" ? "positive" : "muted"}>
            {STATUS_LABEL[deadline.status]}
          </Tag>
          {done && <Tag tone="muted">Done</Tag>}
          {showPriority && activity.priority && (
            <Tag tone="muted">{activity.priority}</Tag>
          )}
        </div>

        <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="-mr-1 -mt-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Actions for ${activity.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { onCompletedToggle(activity, e); setActionsOpen(false); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted"
            >
              {done
                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                : <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              {done ? "Mark as not completed" : "Mark as completed"}
            </button>
            <button
              onClick={(e) => { onBookmarkToggle(activity, e); setActionsOpen(false); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted"
            >
              {bookmarked
                ? <BookmarkCheck className="h-3.5 w-3.5 shrink-0" />
                : <Bookmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              {bookmarked ? "Remove bookmark" : "Bookmark"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(activity.learnMoreUrl, "_blank", "noopener,noreferrer");
                setActionsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              Visit official site
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {activity.explanation ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <h3 className="mt-2.5 cursor-help font-cluely text-[14.5px] font-semibold leading-[1.3] tracking-[-0.012em] text-foreground decoration-border underline-offset-4 hover:underline">
              {activity.name}
            </h3>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="max-w-[260px]" onClick={(e) => e.stopPropagation()}>
            {activity.explanation}
          </TooltipContent>
        </Tooltip>
      ) : (
        <h3 className="mt-2.5 font-cluely text-[14.5px] font-semibold leading-[1.3] tracking-[-0.012em] text-foreground">
          {activity.name}
        </h3>
      )}

      <p className="mt-1 truncate font-cluely text-[11.5px] text-muted-foreground">
        {activity.category} · {activity.difficulty} · {activity.cost}
      </p>

      <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
        {activity.description}
      </p>

      {fits && activity.whyRelevant && (
        <p className="mt-2 line-clamp-2 border-l-2 border-border pl-2.5 text-[11.5px] leading-snug text-muted-foreground">
          {activity.whyRelevant}
        </p>
      )}

      {/* Deadline — deliberately the loudest line on the card. */}
      <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0">
          <ColumnHead>{deadline.label}</ColumnHead>
          <div className="mt-1 truncate font-cluely text-[13.5px] font-semibold tabular-nums tracking-[-0.01em] text-foreground">
            {deadline.value}
          </div>
        </div>
        {deadline.daysLeft !== null && deadline.daysLeft > 0 && (
          <span
            className={[
              "shrink-0 font-cluely text-[12.5px] font-semibold tabular-nums",
              deadline.urgent ? "text-destructive" : "text-muted-foreground",
            ].join(" ")}
            title={deadline.urgent ? "Closing soon" : undefined}
          >
            {deadline.daysLeft}d
          </span>
        )}
      </div>

    </motion.article>
  );
});

/** A labelled figure in the header rail. Plain, tabular, no decoration. */
function HeaderStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <ColumnHead>{label}</ColumnHead>
      <div
        className={[
          "mt-1 font-cluely text-[19px] font-semibold leading-none tabular-nums tracking-[-0.02em]",
          accent ? "text-destructive" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function Activities() {
  const navigate = useNavigate();
  const { onboardingData, loading, user, refreshOnboardingData } = useAuth();
  const userMajor = onboardingData?.intended_major || "";
  const userCountry = onboardingData?.country || "";
  const targetUniversities = useMemo(
    () => onboardingData?.target_universities || [],
    [onboardingData?.target_universities],
  );
  const primaryTargetCollege = targetUniversities[0] || "";

  const askAdvisor = (context: "recommended" | "explore") => {
    const prompt = context === "recommended"
      ? `I'm a high school student interested in ${userMajor}${userCountry ? ` based in ${userCountry}` : ""}. The Activities page didn't surface any high-priority competitions for me. Please recommend 5 specific, real competitions or awards (with names and official links) I should enter this year, and explain how to get started with each.`
      : `I'm exploring ${userMajor}${userCountry ? ` from ${userCountry}` : ""} and want competitions beyond the top picks. Recommend 5 specific real competitions or awards (with names and links) that would broaden my profile, and tell me how to begin each one.`;
    navigate(`/advisor?prompt=${encodeURIComponent(prompt)}`);
  };

  const [costFilter, setCostFilter] = useState<CostType>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusType>("all");

  const [exploreDifficulty, setExploreDifficulty] = useState<DifficultyType>("all");
  const [explorePriority, setExplorePriority] = useState<"all" | "Medium" | "Low">("all");
  const [exploreSearch, setExploreSearch] = useState("");

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => getBookmarks().map((b) => b.id));
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>(() => getCompleted().map((b) => b.id));
  const [showCompleted, setShowCompleted] = useState(false);

  // Bumped on refresh so the derivations that read the clock (registration
  // windows, days-left) are recomputed rather than served from the memo cache.
  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Recommended — High priority only.
  const personalizedActivities = useMemo(() => {
    if (!userMajor) return [];
    const pool = activities
      .filter((a) => a.type === "Competition")
      .filter((a) => isActivityAvailableInCountry(a, userCountry))
      .filter((a) => a.relevantMajors.includes(userMajor));

    const withPriority = pool.map((activity) => {
      const priority = calculatePriority(activity, userMajor, primaryTargetCollege);
      const explanation = generatePriorityExplanation(activity, priority, userMajor, primaryTargetCollege);
      return { ...activity, priority, explanation };
    });

    let filtered = withPriority.filter((a) => a.priority === "High");
    if (costFilter === "free") filtered = filtered.filter((a) => a.cost === "Free");
    else if (costFilter === "paid") filtered = filtered.filter((a) => a.cost !== "Free");
    if (difficultyFilter !== "all") filtered = filtered.filter((a) => a.difficulty === difficultyFilter);
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => {
        const cal = calendarById.get(a.id);
        if (!cal) return statusFilter !== "closed";
        const info = getCompetitionStatusInfo(cal);
        if (statusFilter === "open") return info.status === "registration_open" || info.status === "ongoing";
        if (statusFilter === "upcoming") return info.status === "upcoming";
        return info.status === "closed";
      });
    }

    // Soonest real deadline first — the only ordering that matches why a
    // student opens this page.
    return filtered.sort((a, b) => {
      const da = deadlineFor(a).daysLeft;
      const db = deadlineFor(b).daysLeft;
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
    // refreshTick is a deliberate cache-buster for the clock-dependent reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMajor, userCountry, primaryTargetCollege, costFilter, difficultyFilter, statusFilter, refreshTick]);

  // Explore — Medium + Low, fuzzily related to the major.
  const exploreActivities = useMemo(() => {
    if (!userMajor) return [];

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const userTokens = new Set(norm(userMajor).split(" ").filter((t) => t.length > 2));
    const isMajorRelated = (a: Activity) => {
      if (a.relevantMajors.includes(userMajor)) return true;
      const userN = norm(userMajor);
      return a.relevantMajors.some((m) => {
        const mN = norm(m);
        if (mN === userN) return true;
        if (mN.includes(userN) || userN.includes(mN)) return true;
        const mTokens = new Set(mN.split(" ").filter((t) => t.length > 2));
        for (const t of userTokens) if (mTokens.has(t)) return true;
        return false;
      });
    };

    let result = activities
      .filter((a) => a.type === "Competition")
      .filter((a) => isActivityAvailableInCountry(a, userCountry))
      .filter(isMajorRelated)
      .map((a) => ({ ...a, priority: calculatePriority(a, userMajor, primaryTargetCollege) }))
      .filter((a) => a.priority === "Medium" || a.priority === "Low");

    if (explorePriority !== "all") result = result.filter((a) => a.priority === explorePriority);
    if (exploreDifficulty !== "all") result = result.filter((a) => a.difficulty === exploreDifficulty);
    if (exploreSearch.trim()) {
      const q = exploreSearch.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q),
      );
    }
    const order = { Medium: 0, Low: 1 };
    return result.sort((a, b) => (order[a.priority as "Medium" | "Low"] ?? 0) - (order[b.priority as "Medium" | "Low"] ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMajor, userCountry, primaryTargetCollege, explorePriority, exploreDifficulty, exploreSearch, refreshTick]);

  /** What the whole tracked set looks like right now. Real numbers, not decoration. */
  const pulse = useMemo(() => {
    const seen = new Set<string>();
    let open = 0;
    let closingSoon = 0;
    let upcoming = 0;
    for (const a of [...personalizedActivities, ...exploreActivities]) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      const view = deadlineFor(a);
      if (view.status === "open") {
        open += 1;
        if (view.urgent) closingSoon += 1;
      } else if (view.status === "upcoming") {
        upcoming += 1;
      }
    }
    return { tracked: seen.size, open, closingSoon, upcoming };
  }, [personalizedActivities, exploreActivities]);

  const signature = useMemo(
    () => signatureOf([...personalizedActivities, ...exploreActivities]),
    [personalizedActivities, exploreActivities],
  );

  const lastSignature = useRef<string | null>(null);
  const pendingRefresh = useRef<"manual" | "auto" | null>(null);

  const refreshState = useActivityRefresh({
    userId: user?.id ?? null,
    enabled: !loading && !!onboardingData && !!userMajor,
    onAutoRefresh: () => { void runRefresh("auto"); },
  });
  const { markRefreshed } = refreshState;

  const runRefresh = useCallback(async (kind: "manual" | "auto") => {
    if (refreshing) return;
    setRefreshing(true);
    pendingRefresh.current = kind;
    try {
      await refreshOnboardingData();
      setBookmarkedIds(getBookmarks().map((b) => b.id));
      setCompletedIds(getCompleted().map((b) => b.id));
      setRefreshTick((t) => t + 1);
    } catch (err) {
      console.error("activities refresh failed:", err);
      pendingRefresh.current = null;
      toast.error("Couldn't refresh — check your connection and try again.");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, refreshOnboardingData]);

  const handleManualRefresh = () => {
    if (refreshing) return;
    if (!refreshState.spendManual()) {
      toast.error(
        `No refreshes left this week — the next one unlocks ${refreshState.nextResetLabel}.`,
      );
      return;
    }
    void runRefresh("manual");
  };

  /*
   * Reports what a refresh actually did.
   *
   * Keyed on refreshTick alone, on purpose: `signature` is read as a snapshot
   * of the render carrying this tick (both memos above list refreshTick as a
   * dependency, so they have already recomputed by then). Adding `signature`
   * to the dependency list would break this in both directions — it would
   * re-fire the comparison on unrelated renders, and, worse, it would NOT fire
   * at all in the most important case: when nothing changed, the memo returns
   * an identical string and the effect would never run, which is exactly the
   * silence this whole change exists to remove.
   */
  useEffect(() => {
    const previous = lastSignature.current;
    lastSignature.current = signature;

    // First commit only seeds the baseline. It must NOT consume a pending
    // flag: the automatic refresh is kicked off by this component's own
    // effects, so on mount it is already in flight and its result lands a
    // render later — clearing the flag here would swallow that report.
    if (previous === null) return;

    const kind = pendingRefresh.current;
    if (!kind) return;
    pendingRefresh.current = null;

    markRefreshed();
    const change = describeChange(previous, signature);
    if (change) {
      toast.success(`Updated — ${change}`);
    } else if (kind === "manual") {
      toast("Already up to date", {
        description: "Nothing has changed since the last check.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  const handleBookmarkToggle = (activity: Activity, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBookmarked(activity.id)) {
      removeBookmark(activity.id);
      setBookmarkedIds((prev) => prev.filter((id) => id !== activity.id));
    } else {
      addBookmark({
        id: activity.id, name: activity.name, category: activity.category, type: activity.type,
        cost: activity.cost, gradeSuitability: activity.gradeSuitability, description: activity.description,
      });
      setBookmarkedIds((prev) => [...prev, activity.id]);
    }
  };

  const handleCompletedToggle = (activity: Activity, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleted(activity.id)) {
      removeCompleted(activity.id);
      setCompletedIds((prev) => prev.filter((id) => id !== activity.id));
      if (user) {
        removeCompletedActivityFromOutcomes(user.id, activity).catch((err) =>
          console.error("outcomes sync (remove) failed:", err),
        );
      }
      toast.success("Removed from completed");
    } else {
      addCompleted({
        id: activity.id, name: activity.name, category: activity.category,
        type: activity.type, description: activity.description,
      });
      setCompletedIds((prev) => [...prev, activity.id]);
      if (user) {
        addCompletedActivityToOutcomes(user.id, activity)
          .then(() => toast.success("Marked complete — added to your Outcomes & Resume"))
          .catch((err) => {
            console.error("outcomes sync (add) failed:", err);
            toast.error("Saved locally, but couldn't sync to your profile");
          });
      } else {
        toast.success("Marked complete");
      }
    }
  };

  const handleActivityClick = (activity: Activity) => {
    window.open(activity.learnMoreUrl, "_blank", "noopener,noreferrer");
  };

  const bookmarkedActivities = getBookmarks();
  const completedActivities = getCompleted();

  const lastCheckedLabel = useMemo(() => {
    if (!refreshState.lastRefreshAt) return null;
    try {
      return refreshState.lastRefreshAt.toLocaleString(undefined, {
        weekday: "short", hour: "numeric", minute: "2-digit",
      });
    } catch {
      return null;
    }
  }, [refreshState.lastRefreshAt]);

  if (loading) {
    return (
      <div data-cluely className="flex min-h-svh items-center justify-center bg-background font-cluely">
        <div className="text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-foreground/25 border-t-foreground" />
          <p className="mt-4 text-[13px] text-muted-foreground">Loading competitions…</p>
        </div>
      </div>
    );
  }

  if (!onboardingData || !userMajor) {
    return (
      <div data-cluely className="flex min-h-svh items-center justify-center bg-background font-cluely">
        <div className="mx-auto max-w-md px-4 text-center">
          <Eyebrow>Competitions</Eyebrow>
          <h1 className="mt-2 font-cluely text-[22px] font-semibold tracking-[-0.02em] text-foreground">
            Complete your profile
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Finish your profile setup to see competitions matched to your major.
          </p>
          <Button onClick={() => (window.location.href = "/auth")} className="mt-5">Get started</Button>
        </div>
      </div>
    );
  }

  const gridClass = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

  return (
    <div data-cluely className="min-h-svh bg-background font-cluely">
      <div className="pad-safe-x pad-safe-bottom mx-auto w-full max-w-[1800px] px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        <Seo
          title="Competitions"
          description="Olympiads, awards and honors matched to your intended college major, ordered by the deadline that matters next."
          path="/activities"
        />

        {/* Header */}
        <header className="mb-6 border-b border-border pb-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Eyebrow>Competitions</Eyebrow>
              <h1 className="mt-2 font-cluely text-[clamp(1.6rem,3.4vw,2.15rem)] font-semibold leading-[1.06] tracking-[-0.035em]">
                Competitions, awards &amp; honors
              </h1>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                {userMajor} · {userCountry}
                {targetUniversities.length > 0 && ` · ${targetUniversities.slice(0, 2).join(", ")}`}
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <HeaderStat label="Tracked" value={pulse.tracked} />
              <HeaderStat label="Open now" value={pulse.open} />
              <HeaderStat label={`Closing ≤${URGENT_DAYS}d`} value={pulse.closingSoon} accent={pulse.closingSoon > 0} />
              <HeaderStat label="Upcoming" value={pulse.upcoming} />

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleManualRefresh}
                        disabled={refreshing || !refreshState.canManualRefresh}
                        aria-label="Refresh competitions"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        {refreshState.canManualRefresh
                          ? `Refresh · ${refreshState.manualRemaining} left`
                          : `Next refresh ${refreshState.nextResetLabel}`}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end" className="max-w-[260px]">
                    The set rebuilds automatically every {refreshState.nextResetLabel}. You can pull it
                    forward {MANUAL_REFRESH_LIMIT} times a week.
                    {lastCheckedLabel && ` Last checked ${lastCheckedLabel}.`}
                  </TooltipContent>
                </Tooltip>

                <Sheet open={showBookmarks} onOpenChange={setShowBookmarks}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <BookmarkCheck className="h-4 w-4" />
                      Saved ({bookmarkedActivities.length})
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="cly-scope bg-card font-cluely">
                    <SheetHeader><SheetTitle>Saved competitions</SheetTitle></SheetHeader>
                    <div className="mt-6 space-y-2.5">
                      {bookmarkedActivities.length === 0 ? (
                        <p className="text-[13px] text-muted-foreground">Nothing saved yet.</p>
                      ) : (
                        bookmarkedActivities.map((activity) => (
                          <div key={activity.id} className="rounded-[0.625rem] border border-border bg-background p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-cluely text-[13px] font-medium text-foreground">{activity.name}</h4>
                                <p className="text-[11.5px] text-muted-foreground">{activity.category}</p>
                              </div>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                                onClick={(e) => handleBookmarkToggle(activity as unknown as Activity, e)}
                                aria-label="Remove bookmark"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </SheetContent>
                </Sheet>

                <Sheet open={showCompleted} onOpenChange={setShowCompleted}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Done ({completedActivities.length})
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="cly-scope bg-card font-cluely">
                    <SheetHeader><SheetTitle>Completed competitions</SheetTitle></SheetHeader>
                    <p className="mt-2 text-[12px] text-muted-foreground">
                      These are added to your Outcomes profile and pulled into your Resume when relevant.
                    </p>
                    <div className="mt-6 space-y-2.5">
                      {completedActivities.length === 0 ? (
                        <p className="text-[13px] text-muted-foreground">
                          Nothing marked complete yet. Use the actions menu on any card.
                        </p>
                      ) : (
                        completedActivities.map((activity) => (
                          <div key={activity.id} className="rounded-[0.625rem] border border-border bg-background p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-cluely text-[13px] font-medium text-foreground">{activity.name}</h4>
                                <p className="text-[11px] text-muted-foreground">{activity.category}</p>
                              </div>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                                onClick={(e) => handleCompletedToggle(activity as unknown as Activity, e)}
                                aria-label="Remove from completed"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </header>

        <Tabs defaultValue="recommended" className="w-full">
          <TabsList className="mb-5 h-auto w-auto gap-1 rounded-[0.625rem] border border-border bg-muted/40 p-1">
            <TabsTrigger
              value="recommended"
              className="rounded-[0.5rem] px-3 font-cluely text-[13px] font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Recommended
            </TabsTrigger>
            <TabsTrigger
              value="explore"
              className="rounded-[0.5rem] px-3 font-cluely text-[13px] font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Explore more
            </TabsTrigger>
          </TabsList>

          {/* RECOMMENDED */}
          <TabsContent value="recommended" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={difficultyFilter} onValueChange={(v) => setDifficultyFilter(v as DifficultyType)}>
                <SelectTrigger className="h-9 w-[140px] font-cluely text-[12.5px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent className="cly-scope bg-popover font-cluely">
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <Select value={costFilter} onValueChange={(v) => setCostFilter(v as CostType)}>
                <SelectTrigger className="h-9 w-[120px] font-cluely text-[12.5px]"><SelectValue placeholder="Cost" /></SelectTrigger>
                <SelectContent className="cly-scope bg-popover font-cluely">
                  <SelectItem value="all">All costs</SelectItem>
                  <SelectItem value="free">Free only</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusType)}>
                <SelectTrigger className="h-9 w-[130px] font-cluely text-[12.5px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="cly-scope bg-popover font-cluely">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open now</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <span className="ml-auto text-[12px] tabular-nums text-muted-foreground">
                {personalizedActivities.length} matched · soonest deadline first
              </span>
            </div>

            <motion.div
              className={gridClass}
              variants={staggerParent}
              custom={staggerStep(personalizedActivities.length)}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="popLayout">
                {personalizedActivities.map((a) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    userMajor={userMajor}
                    showPriority={false}
                    bookmarkedIds={bookmarkedIds}
                    completedIds={completedIds}
                    onBookmarkToggle={handleBookmarkToggle}
                    onCompletedToggle={handleCompletedToggle}
                    onClick={handleActivityClick}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {personalizedActivities.length === 0 && (
              <div className="rounded-[0.75rem] border border-dashed border-border py-12 text-center">
                <p className="font-cluely text-[14px] font-medium text-foreground">
                  No competitions match these filters for {userMajor}.
                </p>
                <p className="mb-5 mt-1 text-[13px] text-muted-foreground">
                  Clear the filters, or ask your advisor for specific recommendations.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={() => askAdvisor("recommended")}>Ask advisor</Button>
                  <Button
                    variant="link"
                    onClick={() => { setCostFilter("all"); setDifficultyFilter("all"); setStatusFilter("all"); }}
                  >
                    Clear filters
                  </Button>
                </div>
              </div>
            )}

            <section className="mt-10 border-t border-border pt-6">
              <Eyebrow>What to avoid</Eyebrow>
              <p className="mb-4 mt-1.5 text-[13px] text-muted-foreground">
                Low-signal entries that don't differentiate an application.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {avoidActivities.map((item) => (
                  <motion.div
                    key={item.name}
                    variants={listItem}
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewportOnce}
                    transition={transition.base}
                    className="rounded-[0.75rem] border border-border bg-muted/25 p-3.5"
                  >
                    <h4 className="font-cluely text-[13px] font-medium text-foreground">{item.name}</h4>
                    <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">{item.reason}</p>
                  </motion.div>
                ))}
              </div>
            </section>
          </TabsContent>

          {/* EXPLORE */}
          <TabsContent value="explore" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[220px] max-w-sm flex-1">
                <Input
                  placeholder="Search by name, category or description…"
                  value={exploreSearch}
                  onChange={(e) => setExploreSearch(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </div>
              <Select value={explorePriority} onValueChange={(v) => setExplorePriority(v as "all" | "Medium" | "Low")}>
                <SelectTrigger className="h-9 w-[150px] font-cluely text-[12.5px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent className="cly-scope bg-popover font-cluely">
                  <SelectItem value="all">Medium + low</SelectItem>
                  <SelectItem value="Medium">Medium only</SelectItem>
                  <SelectItem value="Low">Low only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={exploreDifficulty} onValueChange={(v) => setExploreDifficulty(v as DifficultyType)}>
                <SelectTrigger className="h-9 w-[140px] font-cluely text-[12.5px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent className="cly-scope bg-popover font-cluely">
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <span className="ml-auto text-[12px] tabular-nums text-muted-foreground">
                {exploreActivities.length} supporting
              </span>
            </div>

            <motion.div
              className={gridClass}
              variants={staggerParent}
              custom={staggerStep(exploreActivities.length)}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="popLayout">
                {exploreActivities.map((a) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    userMajor={userMajor}
                    showPriority
                    bookmarkedIds={bookmarkedIds}
                    completedIds={completedIds}
                    onBookmarkToggle={handleBookmarkToggle}
                    onCompletedToggle={handleCompletedToggle}
                    onClick={handleActivityClick}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {exploreActivities.length === 0 && (
              <div className="rounded-[0.75rem] border border-dashed border-border py-12 text-center">
                <p className="font-cluely text-[14px] font-medium text-foreground">
                  Nothing matches that search for {userMajor}.
                </p>
                <p className="mb-5 mt-1 text-[13px] text-muted-foreground">
                  Clear the filters, or ask your advisor for specific recommendations.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={() => askAdvisor("explore")}>Ask advisor</Button>
                  <Button
                    variant="link"
                    onClick={() => { setExploreSearch(""); setExplorePriority("all"); setExploreDifficulty("all"); }}
                  >
                    Clear filters
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
