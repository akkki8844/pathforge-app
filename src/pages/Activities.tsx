import { forwardRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark, BookmarkCheck, Filter, AlertTriangle, ExternalLink, GraduationCap, X, Clock, Layers, Compass, MessageSquare, Check, CheckCircle2, Trophy, MoreHorizontal } from "lucide-react";
import { BackpackIcon } from "@/components/icons/FlatSvgIcons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  activities, avoidActivities, calculatePriority, generatePriorityExplanation,
  isActivityAvailableInCountry, Activity,
} from "@/lib/activities";
import { competitionCalendar, getCompetitionStatusInfo, daysUntil, formatDate } from "@/lib/competitionCalendar";
import {
  getBookmarks, addBookmark, removeBookmark, isBookmarked,
  getCompleted, addCompleted, removeCompleted, isCompleted,
} from "@/lib/storage";
import {
  addCompletedActivityToOutcomes, removeCompletedActivityFromOutcomes,
} from "@/lib/completedActivitiesSync";
import { useAuth } from "@/contexts/AuthContext";
import { colleges } from "@/lib/colleges";
import { Seo } from "@/components/Seo";
import { toast } from "sonner";


type FilterType = "all" | "Competition" | "Project" | "Research" | "Leadership" | "Service";
type CostType = "all" | "free" | "paid";
type DifficultyType = "all" | "Beginner" | "Intermediate" | "Advanced";
type PriorityType = "all" | "High" | "Medium" | "Low";
type StatusType = "all" | "open" | "upcoming" | "closed";

const priorityColors: Record<string, string> = {
  High: "bg-green-100 text-green-800 border-green-300 dark:bg-green-500/15 dark:text-green-300",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-300",
  Low: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-muted dark:text-muted-foreground",
};

// ── Shared Card ────────────────────────────────────────────────────────
// Wrapped in forwardRef because AnimatePresence attaches a ref to this
// component for exit-animation measurement.
const ActivityCard = forwardRef<HTMLDivElement, {
  activity: Activity & { priority?: any; explanation?: string; collegeExplanations?: any[] };
  idx: number;
  userMajor: string;
  bookmarkedIds: string[];
  completedIds: string[];
  onBookmarkToggle: (a: Activity, e: React.MouseEvent) => void;
  onCompletedToggle: (a: Activity, e: React.MouseEvent) => void;
  onClick: (a: Activity) => void;
}>(function ActivityCard({
  activity, idx, userMajor, bookmarkedIds, completedIds,
  onBookmarkToggle, onCompletedToggle, onClick,
}, ref) {
  const calEntry = competitionCalendar.find((c) => c.activityId === activity.id);
  const statusInfo = calEntry ? getCompetitionStatusInfo(calEntry) : null;
  const regClose = calEntry?.registrationClose;
  const dLeft = regClose ? daysUntil(regClose) : null;
  const priority = activity.priority || "Medium";
  const done = completedIds.includes(activity.id);
  const bookmarked = bookmarkedIds.includes(activity.id);
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <motion.div
      ref={ref}
      key={activity.id}
      initial={{ opacity: 0, scale: 0.97, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3 }}
      transition={{ delay: Math.min(idx * 0.025, 0.4), duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onClick(activity)}
      className={`card-elevated p-5 relative group cursor-pointer hover:border-accent/50 transition-colors ${done ? "ring-1 ring-green-500/40" : ""}`}
    >
      <div className="absolute top-3 right-3 z-10">
        <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={`p-1.5 rounded-lg transition-colors ${done ? "bg-green-500/15 hover:bg-green-500/25" : "hover:bg-muted"}`}
              aria-label="Quick actions"
              title="Quick actions"
            >
              <MoreHorizontal className={`h-4 w-4 ${done ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-48 p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                onCompletedToggle(activity, e);
                setActionsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
            >
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <Check className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {done ? "Mark as not completed" : "Mark as completed"}
            </button>
            <button
              onClick={(e) => {
                onBookmarkToggle(activity, e);
                setActionsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
            >
              {bookmarked ? (
                <BookmarkCheck className="h-3.5 w-3.5 text-accent" />
              ) : (
                <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {bookmarked ? "Remove bookmark" : "Bookmark"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(activity.learnMoreUrl, "_blank", "noopener,noreferrer");
                setActionsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-3.5 w-3.5 text-accent" />
              Visit official site
            </button>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2.5 pr-20">
        {activity.explanation ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={`${priorityColors[priority]} text-[10px] border cursor-help`}>
                {priority} Priority
              </Badge>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="start"
              className="max-w-[240px]"
              onClick={(e) => e.stopPropagation()}
            >
              {activity.explanation}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Badge className={`${priorityColors[priority]} text-[10px] border`}>
            {priority} Priority
          </Badge>
        )}
        {done && (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300 text-[10px]">
            Completed
          </Badge>
        )}
        {statusInfo?.status === "registration_open" && (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300 text-[10px]">
            Open Now
          </Badge>
        )}
        {statusInfo?.status === "registration_open" && dLeft !== null && dLeft <= 14 && dLeft > 0 && (
          <Badge variant="destructive" className="text-[10px]">{dLeft}d left</Badge>
        )}
        {statusInfo?.status === "upcoming" && (
          <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">Upcoming</Badge>
        )}
      </div>

      <h3 className="font-semibold text-foreground text-sm group-hover:text-accent transition-colors">
        {activity.name}
      </h3>

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        <Badge variant="secondary" className="text-[10px]">{activity.type}</Badge>
        <Badge variant="outline" className="text-[10px]">{activity.difficulty}</Badge>
        <Badge
          className={`text-[10px] ${
            activity.cost === "Free"
              ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
              : "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300"
          }`}
        >
          {activity.cost}
        </Badge>
      </div>

      <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{activity.description}</p>

      {userMajor && activity.relevantMajors.includes(userMajor) && (
        <div className="mt-3 p-2.5 rounded-lg bg-accent/5 border border-accent/20">
          <p className="text-[10px] font-medium text-accent flex items-center gap-1">
            <Trophy className="h-3 w-3" /> Why it fits {userMajor}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{activity.whyRelevant}</p>
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
        {calEntry?.registrationClose && statusInfo?.status === "registration_open" ? (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Deadline: {formatDate(calEntry.registrationClose)}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">Click to visit official site</span>
        )}
        <ExternalLink className="h-3.5 w-3.5 text-accent" />
      </div>
    </motion.div>
  );
});

// ── Main Page ──────────────────────────────────────────────────────────

export default function Activities() {
  const navigate = useNavigate();
  const { onboardingData, loading, user } = useAuth();
  const userMajor = onboardingData?.intended_major || "";
  const userCountry = onboardingData?.country || "";
  const targetUniversities = onboardingData?.target_universities || [];
  const primaryTargetCollege = targetUniversities[0] || "";

  const askAdvisor = (context: "recommended" | "explore") => {
    const prompt = context === "recommended"
      ? `I'm a high school student interested in ${userMajor}${userCountry ? ` based in ${userCountry}` : ""}. The Activities page didn't surface any high-priority competitions or programs for me. Please recommend 5 specific, real activities (with names and official links) I should pursue this year, and explain how to get started with each.`
      : `I'm exploring ${userMajor}${userCountry ? ` from ${userCountry}` : ""} and want supporting activities beyond the top picks. Recommend 5 specific real-world projects, clubs, or competitions (with names and links) that would broaden my profile, and tell me how to begin each one.`;
    navigate(`/advisor?prompt=${encodeURIComponent(prompt)}`);
  };

  // Recommended tab filters (High priority only)
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [costFilter, setCostFilter] = useState<CostType>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusType>("all");

  // Explore tab filters (Medium + Low priority, still major-relevant)
  const [exploreType, setExploreType] = useState<FilterType>("all");
  const [exploreDifficulty, setExploreDifficulty] = useState<DifficultyType>("all");
  const [explorePriority, setExplorePriority] = useState<"all" | "Medium" | "Low">("all");
  const [exploreSearch, setExploreSearch] = useState("");

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(getBookmarks().map((b) => b.id));
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [completedIds, setCompletedIds] = useState<string[]>(getCompleted().map((b) => b.id));
  const [showCompleted, setShowCompleted] = useState(false);

  // Recommended (personalized)
  const personalizedActivities = useMemo(() => {
    if (!userMajor) return [];
    let result = activities.filter((a) => isActivityAvailableInCountry(a, userCountry));
    result = result.filter((a) => a.relevantMajors.includes(userMajor));

    const withPriority = result.map((activity) => {
      const priority = calculatePriority(activity, userMajor, primaryTargetCollege);
      const explanation = generatePriorityExplanation(activity, priority, userMajor, primaryTargetCollege);
      const collegeExplanations = targetUniversities.slice(0, 3).map((collegeName) => {
        const college = colleges.find((c) => c.name === collegeName);
        if (!college) return null;
        const isRelevant = activity.relevantMajors.some((m) => college.strongMajors.includes(m));
        if (isRelevant) {
          return { collegeName, reason: `Valued by ${collegeName} for its emphasis on ${college.strongMajors.slice(0, 2).join(" and ")}` };
        }
        return null;
      }).filter(Boolean);
      return { ...activity, priority, explanation, collegeExplanations };
    });

    // RECOMMENDED = High priority only
    let filtered = withPriority.filter((a) => a.priority === "High");
    if (typeFilter !== "all") filtered = filtered.filter((a) => a.type === typeFilter);
    if (costFilter === "free") filtered = filtered.filter((a) => a.cost === "Free");
    else if (costFilter === "paid") filtered = filtered.filter((a) => a.cost !== "Free");
    if (difficultyFilter !== "all") filtered = filtered.filter((a) => a.difficulty === difficultyFilter);
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => {
        const calEntry = competitionCalendar.find((c) => c.activityId === a.id);
        if (!calEntry) return statusFilter !== "closed";
        const info = getCompetitionStatusInfo(calEntry);
        if (statusFilter === "open") return info.status === "registration_open" || info.status === "ongoing";
        if (statusFilter === "upcoming") return info.status === "upcoming";
        if (statusFilter === "closed") return info.status === "closed";
        return true;
      });
    }
    return filtered;
  }, [userMajor, userCountry, targetUniversities, primaryTargetCollege, typeFilter, costFilter, difficultyFilter, statusFilter]);

  // EXPLORE = Medium + Low priority, related to the user's major (fuzzy match for resilience)
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
        // bidirectional substring (e.g. "Engineering" ↔ "Mechanical Engineering")
        if (mN.includes(userN) || userN.includes(mN)) return true;
        // shared significant word (e.g. "Computer Science" ↔ "Data Science")
        const mTokens = new Set(mN.split(" ").filter((t) => t.length > 2));
        for (const t of userTokens) if (mTokens.has(t)) return true;
        return false;
      });
    };

    let result = activities
      .filter((a) => isActivityAvailableInCountry(a, userCountry))
      .filter(isMajorRelated)
      .map((a) => ({ ...a, priority: calculatePriority(a, userMajor, primaryTargetCollege) }))
      .filter((a) => a.priority === "Medium" || a.priority === "Low");

    if (explorePriority !== "all") result = result.filter((a) => a.priority === explorePriority);
    if (exploreType !== "all") result = result.filter((a) => a.type === exploreType);
    if (exploreDifficulty !== "all") result = result.filter((a) => a.difficulty === exploreDifficulty);
    if (exploreSearch.trim()) {
      const q = exploreSearch.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }
    const order = { Medium: 0, Low: 1 };
    return result.sort((a, b) => (order[a.priority as "Medium" | "Low"] ?? 0) - (order[b.priority as "Medium" | "Low"] ?? 0));
  }, [userMajor, userCountry, primaryTargetCollege, explorePriority, exploreType, exploreDifficulty, exploreSearch]);

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
    const wasDone = isCompleted(activity.id);
    if (wasDone) {
      removeCompleted(activity.id);
      setCompletedIds((prev) => prev.filter((id) => id !== activity.id));
      if (user) {
        removeCompletedActivityFromOutcomes(user.id, activity).catch((err) =>
          console.error("outcomes sync (remove) failed:", err)
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

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading activities…</p>
      </div>
    );
  }

  if (!onboardingData || !userMajor) {
    return (
      <div className="py-20">
        <div className="section-container max-w-lg text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground mb-4">
            Please complete your profile setup to see activities.
          </p>
          <Button onClick={() => (window.location.href = "/auth")} className="btn-accent">Get Started</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-10">
      <Seo title='Activities — Pathforge' description='Discover must-do extracurriculars, Olympiads, and competitions tailored to your intended college major.' path='/activities' />
      <div className="section-container">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2.5">
              <BackpackIcon className="h-7 w-7 sm:h-8 sm:w-8" />
              Activities & Competitions
            </h1>
            <h2 className="sr-only">Recommended activities for your major</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {userMajor} · {userCountry}
              {targetUniversities.length > 0 && ` · ${targetUniversities.slice(0, 2).join(", ")}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={showBookmarks} onOpenChange={setShowBookmarks}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <BookmarkCheck className="h-4 w-4" />
                  Bookmarked ({bookmarkedActivities.length})
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-card">
                <SheetHeader><SheetTitle>Bookmarked Activities</SheetTitle></SheetHeader>
                <div className="mt-6 space-y-3">
                  {bookmarkedActivities.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No bookmarks yet.</p>
                  ) : (
                    bookmarkedActivities.map((activity) => (
                      <div key={activity.id} className="p-3 rounded-lg border border-border bg-background">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-foreground text-sm">{activity.name}</h4>
                            <p className="text-xs text-muted-foreground">{activity.category}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={(e) => handleBookmarkToggle(activity as any, e)} className="shrink-0 h-7 w-7" aria-label="Remove bookmark">
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
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Completed ({completedActivities.length})
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-card">
                <SheetHeader>
                  <SheetTitle>Completed Activities</SheetTitle>
                </SheetHeader>
                <p className="mt-2 text-xs text-muted-foreground">
                  These are auto-added to your Outcomes profile and pulled into your Resume when relevant.
                </p>
                <div className="mt-6 space-y-3">
                  {completedActivities.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Nothing marked complete yet. Tap the check icon on any activity card.
                    </p>
                  ) : (
                    completedActivities.map((activity) => (
                      <div key={activity.id} className="p-3 rounded-lg border border-border bg-background">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-foreground text-sm">{activity.name}</h4>
                            <p className="text-[11px] text-muted-foreground">
                              {activity.type} · {activity.category}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleCompletedToggle(activity as any, e)}
                            className="shrink-0 h-7 w-7"
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

        {/* Tabs */}
        <Tabs defaultValue="recommended" className="w-full">
          <TabsList className="grid grid-cols-2 max-w-md mb-6 h-12 p-1 rounded-xl bg-muted/60 backdrop-blur border border-border/50">
            <TabsTrigger
              value="recommended"
              className="gap-2 text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-accent transition-all"
            >
              <Trophy className="h-3.5 w-3.5" /> Recommended for you
            </TabsTrigger>
            <TabsTrigger
              value="explore"
              className="gap-2 text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-accent transition-all"
            >
              <Compass className="h-3.5 w-3.5" /> Explore more
            </TabsTrigger>
          </TabsList>

          {/* RECOMMENDED TAB */}
          <TabsContent value="recommended" className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] px-2.5 py-1 rounded-md bg-accent/10 text-accent border border-accent/20 font-medium">
                Must-do, high-impact picks for {userMajor}
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
                <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Competition">Competitions</SelectItem>
                  <SelectItem value="Project">Projects</SelectItem>
                  <SelectItem value="Research">Research</SelectItem>
                  <SelectItem value="Leadership">Leadership</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                </SelectContent>
              </Select>
              <Select value={difficultyFilter} onValueChange={(v) => setDifficultyFilter(v as DifficultyType)}>
                <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              <Select value={costFilter} onValueChange={(v) => setCostFilter(v as CostType)}>
                <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Cost" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Costs</SelectItem>
                  <SelectItem value="free">Free Only</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusType)}>
                <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open Now</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground">
              {personalizedActivities.length} activities matched to your profile
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {personalizedActivities.map((a, i) => (
                  <ActivityCard
                    key={a.id} activity={a} idx={i} userMajor={userMajor}
                    bookmarkedIds={bookmarkedIds}
                    onBookmarkToggle={handleBookmarkToggle}
                    completedIds={completedIds}
                    onCompletedToggle={handleCompletedToggle}
                    onClick={handleActivityClick}
                  />
                ))}
              </AnimatePresence>
            </div>

            {personalizedActivities.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/20">
                <Trophy className="mx-auto h-10 w-10 text-accent mb-4" />
                <p className="text-foreground font-medium mb-1">No activities found for {userMajor}.</p>
                <p className="text-sm text-muted-foreground mb-5">Ask your advisor for personalized recommendations.</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={() => askAdvisor("recommended")} className="btn-accent gap-2">
                    <MessageSquare className="h-4 w-4" /> Ask Advisor
                  </Button>
                  <Button variant="link" onClick={() => {
                    setTypeFilter("all"); setCostFilter("all"); setDifficultyFilter("all");
                    setStatusFilter("all");
                  }}>Clear filters</Button>
                </div>
              </div>
            )}

            {/* What to avoid */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h2 className="text-lg font-bold text-foreground">What to Avoid</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Common low-impact activities that don't differentiate your application.
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {avoidActivities.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    className="p-3.5 rounded-lg border border-destructive/20 bg-destructive/5"
                  >
                    <h4 className="font-medium text-foreground text-sm">{item.name}</h4>
                    <p className="mt-1.5 text-xs text-muted-foreground">{item.reason}</p>
                  </motion.div>
                ))}
              </div>
            </section>
          </TabsContent>

          {/* EXPLORE TAB */}
          <TabsContent value="explore" className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border font-medium">
                Supporting picks tied to {userMajor}
              </div>
              <div className="flex-1 min-w-[200px] max-w-md">
                <Input
                  placeholder="Search by name, category, or description…"
                  value={exploreSearch}
                  onChange={(e) => setExploreSearch(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <Select value={explorePriority} onValueChange={(v) => setExplorePriority(v as "all" | "Medium" | "Low")}>
                <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Medium + Low</SelectItem>
                  <SelectItem value="Medium">Medium only</SelectItem>
                  <SelectItem value="Low">Low only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={exploreType} onValueChange={(v) => setExploreType(v as FilterType)}>
                <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Competition">Competitions</SelectItem>
                  <SelectItem value="Project">Projects</SelectItem>
                  <SelectItem value="Research">Research</SelectItem>
                  <SelectItem value="Leadership">Leadership</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                </SelectContent>
              </Select>
              <Select value={exploreDifficulty} onValueChange={(v) => setExploreDifficulty(v as DifficultyType)}>
                <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3 w-3" />
              {exploreActivities.length} supporting activities for {userMajor} (Medium + Low priority)
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {exploreActivities.map((a, i) => (
                  <ActivityCard
                    key={a.id} activity={a} idx={i} userMajor={userMajor}
                    bookmarkedIds={bookmarkedIds}
                    onBookmarkToggle={handleBookmarkToggle}
                    completedIds={completedIds}
                    onCompletedToggle={handleCompletedToggle}
                    onClick={handleActivityClick}
                  />
                ))}
              </AnimatePresence>
            </div>

            {exploreActivities.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/20">
                <Trophy className="mx-auto h-10 w-10 text-accent mb-4" />
                <p className="text-foreground font-medium mb-1">No activities found for {userMajor}.</p>
                <p className="text-sm text-muted-foreground mb-5">Ask your advisor for personalized recommendations.</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={() => askAdvisor("explore")} className="btn-accent gap-2">
                    <MessageSquare className="h-4 w-4" /> Ask Advisor
                  </Button>
                  <Button variant="link" onClick={() => {
                    setExploreSearch(""); setExplorePriority("all"); setExploreType("all"); setExploreDifficulty("all");
                  }}>Clear filters</Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
