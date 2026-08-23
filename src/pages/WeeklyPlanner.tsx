import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, Target, TrendingUp, CheckCircle2, AlertCircle, Lightbulb, Edit3, Trash2, BookOpen, Trophy, Users, X, Loader2, RefreshCw, Unplug, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getProfile } from "@/lib/storage";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import googleCalendarLogo from "@/assets/google-calendar-logo.png";
import {
  PlannerActivity,
  WeeklyPlan,
  ActivityCategory,
  getWeekStart,
  getWeeklyPlan,
  getWeeklyPlansForWeeks,
  saveWeeklyPlan,
  createEmptyWeeklyPlan,
  generateActivityId,
  getCategoryLabel,
  getDayName,
  getDayShortName,
  calculateWeeklyStats,
  generateSmartRecommendations,
} from "@/lib/plannerStorage";
import { Seo } from "@/components/Seo";

const categoryIcons: Record<ActivityCategory, React.ReactNode> = {
  academics: <BookOpen className="h-4 w-4" />,
  extracurriculars: <Users className="h-4 w-4" />,
  competitions: <Trophy className="h-4 w-4" />,
  "personal-development": <CalendarDays className="h-4 w-4" />,
};

const categoryColorClasses: Record<ActivityCategory, string> = {
  academics: "bg-blue-500/10 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800",
  extracurriculars: "bg-green-500/10 text-green-600 border-green-200 dark:text-green-400 dark:border-green-800",
  competitions: "bg-purple-500/10 text-purple-600 border-purple-200 dark:text-purple-400 dark:border-purple-800",
  "personal-development": "bg-amber-500/10 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Helper to get all days in a month grid (including padding days from prev/next month)
function getCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }

  // Current month
  for (let i = 1; i <= totalDays; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  // Next month padding to fill 6 rows
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return days;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.15, ease: "easeIn" as const } },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.01, y: -2, transition: { duration: 0.2, ease: "easeOut" as const } },
};

const MAX_SELECTED_DAYS = 3;

const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function WeeklyPlanner() {
  const today = new Date();
  // Restore last-selected date so users land back on the same day (and so
  // adding an activity then navigating away doesn't appear to lose context).
  const initialSelected = (() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("pf_planner_selected_date") : null;
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) return d;
      }
    } catch { /* noop */ }
    return today;
  })();
  const [viewMonth, setViewMonth] = useState(initialSelected.getMonth());
  const [viewYear, setViewYear] = useState(initialSelected.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(initialSelected);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<PlannerActivity | null>(null);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const syncedConnectionRef = useRef<string | null>(null);
  const { connection: googleConnection, loading: calendarLoading, busy: calendarBusy, connect: connectGoogleCalendar, disconnect: disconnectGoogleCalendar, syncEvents } = useGoogleCalendar();

  // Form state
  const [activityName, setActivityName] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [activityCategory, setActivityCategory] = useState<ActivityCategory>("academics");
  const [activitySubject, setActivitySubject] = useState("");
  const [plannedHours, setPlannedHours] = useState(1);
  const [activityTime, setActivityTime] = useState("09:00");

  // Multi-day selection in the modal (max 3)
  const [modalSelectedDays, setModalSelectedDays] = useState<Date[]>([]);
  const [modalMonth, setModalMonth] = useState(initialSelected.getMonth());
  const [modalYear, setModalYear] = useState(initialSelected.getFullYear());

  const profile = getProfile();

  // Derive the week start from selectedDate
  const currentWeekStart = getWeekStart(selectedDate);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  // All weeks intersecting the visible month grid → used for per-date indicators.
  const [monthPlans, setMonthPlans] = useState<Record<string, WeeklyPlan>>({});

  // Persist selection so it survives reloads / re-navigations.
  useEffect(() => {
    try {
      localStorage.setItem("pf_planner_selected_date", selectedDate.toISOString());
    } catch { /* noop */ }
  }, [selectedDate]);

  const loadWeeklyPlan = useCallback(async () => {
    const plan = await getWeeklyPlan(currentWeekStart);
    setWeeklyPlan(plan || createEmptyWeeklyPlan(currentWeekStart));
  }, [currentWeekStart]);

  useEffect(() => {
    void loadWeeklyPlan();
  }, [loadWeeklyPlan]);

  const stats = useMemo(() => {
    if (!weeklyPlan) return null;
    return calculateWeeklyStats(weeklyPlan.activities);
  }, [weeklyPlan]);

  const recommendations = useMemo(() => {
    if (!weeklyPlan) return [];
    return generateSmartRecommendations(weeklyPlan.activities, profile?.intendedMajor);
  }, [weeklyPlan, profile?.intendedMajor]);

  const calendarDays = useMemo(() => getCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const modalCalendarDays = useMemo(() => getCalendarGrid(modalYear, modalMonth), [modalYear, modalMonth]);

  // Load every weekly plan touching the visible month grid so date indicators
  // reflect the user's real saved activities (not just the focused week).
  const visibleWeekStarts = useMemo(() => {
    const set = new Set<string>();
    calendarDays.forEach(({ date }) => set.add(getWeekStart(date)));
    return Array.from(set);
  }, [calendarDays]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const plans = await getWeeklyPlansForWeeks(visibleWeekStarts);
      if (!cancelled) setMonthPlans(plans);
    })();
    return () => { cancelled = true; };
  }, [visibleWeekStarts, weeklyPlan]);

  const navigateMonth = (dir: number) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  const navigateModalMonth = (dir: number) => {
    let m = modalMonth + dir;
    let y = modalYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setModalMonth(m);
    setModalYear(y);
  };

  const goToToday = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
    setSelectedDate(new Date());
  };

  const selectedDayIndex = selectedDate.getDay();

  const getActivitiesForDay = useCallback((dayIndex: number) => {
    if (!weeklyPlan) return [];
    return weeklyPlan.activities.filter((a) => a.dayOfWeek === dayIndex);
  }, [weeklyPlan]);

  const selectedDayActivities = getActivitiesForDay(selectedDayIndex);

  // Map "YYYY-M-D" → activity count using ALL loaded plans so every saved day
  // shows an indicator (even outside the focused week).
  const activityCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    const fold = (plan: WeeklyPlan) => {
      const [y, m, d] = plan.weekStart.split("-").map(Number);
      const base = new Date(y, (m || 1) - 1, d || 1);
      plan.activities.forEach((a) => {
        const date = new Date(base);
        date.setDate(date.getDate() + a.dayOfWeek);
        const key = dateKey(date);
        counts[key] = (counts[key] || 0) + 1;
      });
    };
    Object.values(monthPlans).forEach(fold);
    // Overlay the live in-memory week (covers unsaved edits / freshly added).
    if (weeklyPlan && !monthPlans[weeklyPlan.weekStart]) fold(weeklyPlan);
    return counts;
  }, [monthPlans, weeklyPlan]);

  // Activities happening today + within the next 2 days. Drives the
  // "coming up" reminder banner.
  const upcomingActivities = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 2);
    const items: Array<{ date: Date; activity: PlannerActivity }> = [];
    Object.values(monthPlans).forEach((plan) => {
      const [y, m, d] = plan.weekStart.split("-").map(Number);
      const base = new Date(y, (m || 1) - 1, d || 1);
      plan.activities.forEach((a) => {
        if (a.completed) return;
        const date = new Date(base);
        date.setDate(date.getDate() + a.dayOfWeek);
        if (date >= start && date <= end) items.push({ date, activity: a });
      });
    });
    return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 4);
  }, [monthPlans]);

  const resetForm = () => {
    setActivityName("");
    setActivityDescription("");
    setActivityCategory("academics");
    setActivitySubject("");
    setPlannedHours(1);
    setActivityTime("09:00");
    setModalSelectedDays([]);
  };

  const openAddModal = () => {
    resetForm();
    setEditingActivity(null);
    // Pre-select the currently focused calendar day
    setModalSelectedDays([new Date(selectedDate)]);
    setModalMonth(selectedDate.getMonth());
    setModalYear(selectedDate.getFullYear());
    setIsModalOpen(true);
  };

  const openEditModal = (activity: PlannerActivity) => {
    setEditingActivity(activity);
    setActivityName(activity.name);
    setActivityDescription(activity.notes || "");
    setActivityCategory(activity.category);
    setActivitySubject(activity.subject || "");
    setPlannedHours(activity.plannedHours);
    setActivityTime("09:00");
    // Edit only updates a single existing day
    const editDate = new Date(selectedDate);
    setModalSelectedDays([editDate]);
    setModalMonth(editDate.getMonth());
    setModalYear(editDate.getFullYear());
    setIsModalOpen(true);
  };

  const toggleModalDay = (date: Date) => {
    const key = dateKey(date);
    const exists = modalSelectedDays.find((d) => dateKey(d) === key);
    if (exists) {
      setModalSelectedDays(modalSelectedDays.filter((d) => dateKey(d) !== key));
      return;
    }
    if (modalSelectedDays.length >= MAX_SELECTED_DAYS) {
      toast.error(`You can select up to ${MAX_SELECTED_DAYS} days per activity`);
      return;
    }
    setModalSelectedDays([...modalSelectedDays, date]);
  };

  const handleSave = async () => {
    if (!activityName.trim()) {
      toast.error("Please enter an activity name");
      return;
    }
    if (modalSelectedDays.length === 0) {
      toast.error("Pick at least one day on the calendar");
      return;
    }
    if (!weeklyPlan) return;

    // Group selected days by their week-start so cross-week selections
    // are saved into the correct week row instead of silently dropping.
    const daysByWeek = new Map<string, Date[]>();
    for (const d of modalSelectedDays) {
      const ws = getWeekStart(d);
      const arr = daysByWeek.get(ws) ?? [];
      arr.push(d);
      daysByWeek.set(ws, arr);
    }

    const focusDay = modalSelectedDays[0];
    const focusWeek = getWeekStart(focusDay);

    if (editingActivity) {
      const day = modalSelectedDays[0];
      const updatedActivity: PlannerActivity = {
        ...editingActivity,
        name: activityName.trim(),
        category: activityCategory,
        subject: activitySubject.trim() || undefined,
        plannedHours,
        dayOfWeek: day.getDay(),
        notes: activityDescription.trim() || undefined,
      };
      const updated = weeklyPlan.activities.map((a) => (a.id === editingActivity.id ? updatedActivity : a));
      const updatedPlan = { ...weeklyPlan, activities: updated };
      // Save first so the subsequent reload reflects the change
      await saveWeeklyPlan(updatedPlan);
      if (focusWeek === currentWeekStart) setWeeklyPlan(updatedPlan);
      setSelectedDate(day);
      toast.success("Activity updated");
    } else {
      // Save each affected week independently
      for (const [ws, days] of daysByWeek.entries()) {
        const existing = ws === currentWeekStart
          ? weeklyPlan
          : (await getWeeklyPlan(ws)) ?? createEmptyWeeklyPlan(ws);
        const newActivities: PlannerActivity[] = days.map((day) => ({
          id: generateActivityId(),
          name: activityName.trim(),
          category: activityCategory,
          subject: activitySubject.trim() || undefined,
          plannedHours,
          actualHours: 0,
          dayOfWeek: day.getDay(),
          completed: false,
          notes: activityDescription.trim() || undefined,
        }));
        const merged = { ...existing, activities: [...existing.activities, ...newActivities] };
        await saveWeeklyPlan(merged);
        if (ws === currentWeekStart) setWeeklyPlan(merged);
      }
      setSelectedDate(focusDay);
      toast.success(
        modalSelectedDays.length > 1
          ? `Activity added to ${modalSelectedDays.length} days`
          : "Activity added"
      );
    }

    setIsModalOpen(false);
    setEditingActivity(null);
    resetForm();
    // Ensure the now-focused week is re-read from source of truth
    if (focusWeek !== currentWeekStart) {
      // selectedDate change will trigger loadWeeklyPlan automatically
    } else {
      void loadWeeklyPlan();
    }
  };

  const handleDelete = (id: string) => {
    if (!weeklyPlan) return;
    const updated = { ...weeklyPlan, activities: weeklyPlan.activities.filter((a) => a.id !== id) };
    setWeeklyPlan(updated);
    void saveWeeklyPlan(updated);
    toast.success("Activity removed");
  };

  const handleToggleComplete = (id: string) => {
    if (!weeklyPlan) return;
    const updated = {
      ...weeklyPlan,
      activities: weeklyPlan.activities.map((a) =>
        a.id === id ? { ...a, completed: !a.completed, actualHours: !a.completed ? a.plannedHours : a.actualHours } : a
      ),
    };
    setWeeklyPlan(updated);
    void saveWeeklyPlan(updated);
  };

  const handleLogHours = (id: string, hours: number) => {
    if (!weeklyPlan) return;
    const updated = {
      ...weeklyPlan,
      activities: weeklyPlan.activities.map((a) => (a.id === id ? { ...a, actualHours: hours } : a)),
    };
    setWeeklyPlan(updated);
    void saveWeeklyPlan(updated);
  };

  const handleGoogleConnect = async () => {
    try {
      await connectGoogleCalendar();
      toast.info("A Google sign-in tab opened. After approval, your events will sync here.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start Google Calendar connection.");
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      await disconnectGoogleCalendar();
      syncedConnectionRef.current = null;
      toast.success("Google Calendar disconnected.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disconnect Google Calendar.");
    }
  };

  const handleGoogleSync = useCallback(async (silent = false) => {
    if (!googleConnection) return;
    setSyncingCalendar(true);
    try {
      const result = await syncEvents();
      await loadWeeklyPlan();
      if (!silent) toast.success(`Synced ${result.imported} Google Calendar event${result.imported === 1 ? "" : "s"} to Pathforge.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sync Google Calendar events.");
    } finally {
      setSyncingCalendar(false);
    }
  }, [googleConnection, loadWeeklyPlan, syncEvents]);

  useEffect(() => {
    if (!googleConnection || calendarLoading) return;
    const key = googleConnection.google_email || "connected";
    if (syncedConnectionRef.current === key) return;
    syncedConnectionRef.current = key;
    void handleGoogleSync(true);
  }, [calendarLoading, googleConnection, handleGoogleSync]);

  return (
    <div className="section-container py-8 sm:py-10 space-y-6">
      <Seo title='Weekly Planner — Pathforge' description='Plan and track weekly hours across study, activities, and applications with smart AI adjustments.' path='/weekly-planner' />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 px-6 sm:px-8 py-6 sm:py-7 shadow-[0_1px_0_0_hsl(var(--border)/0.5)]"
      >
        <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80 mb-2">
              Planner
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Weekly Action Planner
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Plan your week visually, log actual hours, and let Pathforge surface intelligent adjustments.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={openAddModal} size="lg" className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Add Activity
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Upcoming-activity reminder banner — surfaces activities happening
          today or in the next two days so users don't miss them. */}
      <AnimatePresence>
        {upcomingActivities.length > 0 && (
          <motion.div
            key="upcoming-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-amber-300/60 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 px-5 py-4"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Coming up — don't forget to log these
                </p>
                <ul className="mt-1.5 space-y-0.5 text-sm text-amber-900/90 dark:text-amber-100/90">
                  {upcomingActivities.map(({ date, activity }) => {
                    const isToday = isSameDay(date, today);
                    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                    const isTomorrow = isSameDay(date, tomorrow);
                    const label = isToday ? "Today" : isTomorrow ? "Tomorrow" : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                    return (
                      <li key={`${activity.id}-${dateKey(date)}`} className="flex items-center gap-2">
                        <span className="font-medium">{label}:</span>
                        <span className="truncate">{activity.name}</span>
                        <span className="text-amber-700/80 dark:text-amber-300/80 text-xs">· {activity.plannedHours}h</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, duration: 0.35 }}
      >
        <Card className="card-elevated border-accent/20">
          <CardContent className="pt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl border border-border bg-background p-1.5 flex-shrink-0">
                  <img src={googleCalendarLogo} alt="Google Calendar" className="h-full w-full object-contain" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Google Calendar sync</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                    {googleConnection
                      ? "Your Google Calendar is connected. Sync anytime to pull new events into Pathforge."
                      : "Connect Google Calendar here to transfer your existing events into the Pathforge planner."}
                  </p>
                  {googleConnection?.google_email && (
                    <p className="text-xs text-muted-foreground mt-2">Connected as <span className="font-medium text-foreground">{googleConnection.google_email}</span></p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {calendarLoading ? (
                  <Button disabled variant="outline" size="sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Checking…
                  </Button>
                ) : googleConnection ? (
                  <Button onClick={() => handleGoogleSync(false)} disabled={syncingCalendar} size="sm" className="gap-2">
                    {syncingCalendar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Sync events
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline" className="gap-2">
                    <a href="/profile?section=connectors">
                      <img src={googleCalendarLogo} alt="" className="h-4 w-4" />
                      Connect in Settings
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Overview */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { icon: <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />, label: "Planned", value: `${stats.totalPlannedHours}h`, bg: "bg-blue-500/10" },
            { icon: <Target className="h-5 w-5 text-green-600 dark:text-green-400" />, label: "Actual", value: `${stats.totalActualHours}h`, bg: "bg-green-500/10" },
            { icon: <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />, label: "Completion", value: `${stats.completionRate}%`, bg: "bg-purple-500/10" },
            { icon: <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />, label: "Activities", value: `${weeklyPlan?.activities.length || 0}`, bg: "bg-amber-500/10" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={cardHover}
              initial="rest"
              whileHover="hover"
            >
              <Card className="card-elevated">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bg}`}>{stat.icon}</div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Main Grid: Calendar + Day Detail */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="grid gap-6 md:grid-cols-5"
      >
        {/* Monthly Calendar */}
        <Card className="card-elevated md:col-span-3">
          {/* flex-wrap + a fluid month heading: the fixed 160px heading between
              two nav buttons and a Today button came to ~360px, past a 320px
              viewport. */}
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} className="h-10 w-10 shrink-0 sm:h-8 sm:w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="min-w-0 flex-1 truncate text-center text-lg font-semibold sm:min-w-[160px] sm:flex-none">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} className="h-10 w-10 shrink-0 sm:h-8 sm:w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_HEADERS.map((d, i) => (
                <div
                  key={d}
                  className={`text-center text-xs font-medium py-2 ${
                    i === 0 || i === 6 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                const isSelected = isSameDay(date, selectedDate);
                const isCurrentDay = isSameDay(date, today);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const actCount = activityCountByDate[dateKey(date)] || 0;

                return (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedDate(new Date(date));
                      if (date.getMonth() !== viewMonth) {
                        setViewMonth(date.getMonth());
                        setViewYear(date.getFullYear());
                      }
                    }}
                    className={`
                      relative p-2 h-14 md:h-16 flex flex-col items-center justify-center rounded-xl text-sm transition-colors cursor-pointer
                      ${!isCurrentMonth ? "opacity-50" : ""}
                      ${isSelected ? "bg-primary text-primary-foreground shadow-md" : ""}
                      ${!isSelected && isCurrentDay ? "ring-2 ring-primary/50 bg-primary/5" : ""}
                      ${!isSelected && !isCurrentDay && isCurrentMonth ? "hover:bg-muted" : ""}
                    `}
                  >
                    <span
                      className={`font-medium ${isSelected ? "font-bold" : ""} ${
                        !isSelected && isWeekend ? "text-red-600 dark:text-red-400" : ""
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {actCount > 0 && isCurrentMonth && (
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: Math.min(actCount, 3) }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground/80" : "bg-primary"}`}
                          />
                        ))}
                        {actCount > 3 && (
                          <span className={`text-[11px] leading-none ml-0.5 ${isSelected ? "text-primary-foreground/80" : "text-primary"}`}>
                            +{actCount - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day Detail Panel */}
        <Card className="card-elevated md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">{getDayName(selectedDayIndex)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="sm" variant="outline" onClick={openAddModal} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </motion.div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {selectedDayActivities.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No activities for this day</p>
                  <Button variant="link" size="sm" onClick={openAddModal} className="mt-1">
                    Add your first activity
                  </Button>
                </motion.div>
              ) : (
                selectedDayActivities.map((activity) => (
                  <motion.div
                    key={activity.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className={`p-3.5 rounded-xl border transition-colors ${activity.completed ? "bg-muted/50 border-muted" : "bg-card border-border hover:border-primary/20"}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={activity.completed}
                        onCheckedChange={() => handleToggleComplete(activity.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm ${activity.completed ? "line-through text-muted-foreground" : ""}`}>
                            {activity.name}
                          </span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColorClasses[activity.category]}`}>
                            {getCategoryLabel(activity.category)}
                          </Badge>
                        </div>
                        {activity.subject && (
                          <span className="text-xs text-muted-foreground">{activity.subject}</span>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {activity.plannedHours}h planned
                          </span>
                          <div className="flex items-center gap-1">
                            <span>Actual:</span>
                            <Input
                              type="number"
                              min={0}
                              max={12}
                              step={0.5}
                              value={activity.actualHours}
                              onChange={(e) => handleLogHours(activity.id, parseFloat(e.target.value) || 0)}
                              className="w-14 h-6 text-xs text-center"
                            />
                            <span>h</span>
                          </div>
                        </div>
                      </div>
                      {/* Edit sits next to a destructive delete, so these get
                          real targets and real space between them. */}
                      <div className="flex gap-1.5 sm:gap-0.5">
                        <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => openEditModal(activity)}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive sm:h-8 sm:w-8" onClick={() => handleDelete(activity.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Time Distribution + Recommendations */}
      {stats && stats.totalPlannedHours > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4 }}
          className="grid md:grid-cols-2 gap-6"
        >
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Time Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.keys(stats.byCategory) as ActivityCategory[]).map((category) => {
                const data = stats.byCategory[category];
                const pct = stats.totalPlannedHours > 0 ? Math.round((data.planned / stats.totalPlannedHours) * 100) : 0;
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {categoryIcons[category]}
                        <span className="font-medium">{getCategoryLabel(category)}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{data.actual}h / {data.planned}h ({pct}%)</span>
                    </div>
                    <Progress value={(data.actual / Math.max(data.planned, 1)) * 100} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {(recommendations.length > 0 || (stats.balanceIndicators.length > 0)) && (
            <div className="space-y-4">
              {recommendations.length > 0 && (
                <Card className="card-elevated border-accent/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-accent" /> Smart Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-accent mt-0.5">•</span><span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {stats.balanceIndicators.length > 0 && (
                <Card className="card-elevated border-amber-200 dark:border-amber-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Balance Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {stats.balanceIndicators.map((ind, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span><span>{ind}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Week at a Glance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.4 }}
      >
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">Week at a Glance</CardTitle>
          </CardHeader>
          {/* Seven cells with "N tasks" and "Nh" in each cannot fit 320px —
              each cell got ~29px. Scroll the strip instead of crushing it. */}
          <CardContent className="overflow-x-auto">
            <div className="grid min-w-[420px] grid-cols-7 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                const acts = getActivitiesForDay(dayIdx);
                const completed = acts.filter((a) => a.completed).length;
                const hours = acts.reduce((s, a) => s + a.plannedHours, 0);
                return (
                  <motion.div
                    key={dayIdx}
                    whileHover={{ scale: 1.04 }}
                    className="p-2.5 rounded-xl bg-muted/50 text-center text-sm cursor-default"
                  >
                    <div className="font-medium text-xs">{getDayShortName(dayIdx)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{acts.length} tasks</div>
                    <div className="text-xs text-muted-foreground">{hours}h</div>
                    {acts.length > 0 && (
                      <Progress value={(completed / acts.length) * 100} className="h-1 mt-1.5" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add/Edit Activity Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => { setIsModalOpen(false); setEditingActivity(null); resetForm(); }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-background border border-border rounded-2xl shadow-2xl p-6 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold">
                    {editingActivity ? "Edit Activity" : "New Activity"}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => { setIsModalOpen(false); setEditingActivity(null); resetForm(); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Title</Label>
                    <Input
                      placeholder="e.g., Math Practice, Debate Prep"
                      value={activityName}
                      onChange={(e) => setActivityName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Description <span className="text-muted-foreground">(optional)</span></Label>
                    <Textarea
                      placeholder="Notes about this activity..."
                      value={activityDescription}
                      onChange={(e) => setActivityDescription(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* Inline Calendar - multi-day select (max 3) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">
                        {editingActivity ? "Date" : "Pick Days"}
                        {!editingActivity && (
                          <span className="text-muted-foreground font-normal ml-1">
                            (up to {MAX_SELECTED_DAYS})
                          </span>
                        )}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {modalSelectedDays.length}/{MAX_SELECTED_DAYS} selected
                      </span>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                      {/* Month nav */}
                      <div className="flex items-center justify-between mb-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => navigateModalMonth(-1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium">
                          {MONTH_NAMES[modalMonth]} {modalYear}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => navigateModalMonth(1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Day headers */}
                      <div className="grid grid-cols-7 mb-1">
                        {DAY_HEADERS.map((d) => (
                          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                            {d}
                          </div>
                        ))}
                      </div>

                      {/* Days */}
                      <div className="grid grid-cols-7 gap-0.5">
                        {modalCalendarDays.map(({ date, isCurrentMonth }, idx) => {
                          const isPicked = modalSelectedDays.some((d) => dateKey(d) === dateKey(date));
                          const isCurrentDay = isSameDay(date, today);
                          const atLimit = !isPicked && modalSelectedDays.length >= MAX_SELECTED_DAYS;
                          const disabled = editingActivity ? false : false;

                          return (
                            <motion.button
                              key={idx}
                              type="button"
                              whileHover={!atLimit ? { scale: 1.08 } : {}}
                              whileTap={!atLimit ? { scale: 0.92 } : {}}
                              disabled={disabled}
                              onClick={() => {
                                if (editingActivity) {
                                  // single-select for edit
                                  setModalSelectedDays([date]);
                                  if (date.getMonth() !== modalMonth) {
                                    setModalMonth(date.getMonth());
                                    setModalYear(date.getFullYear());
                                  }
                                  return;
                                }
                                toggleModalDay(date);
                                if (date.getMonth() !== modalMonth) {
                                  setModalMonth(date.getMonth());
                                  setModalYear(date.getFullYear());
                                }
                              }}
                              className={`
                                h-9 rounded-lg text-xs font-medium transition-all
                                ${!isCurrentMonth ? "text-muted-foreground/40" : ""}
                                ${isPicked ? "bg-primary text-primary-foreground shadow-sm" : ""}
                                ${!isPicked && isCurrentDay ? "ring-1 ring-primary/50 bg-primary/5" : ""}
                                ${!isPicked && !isCurrentDay && isCurrentMonth ? "hover:bg-background" : ""}
                                ${atLimit ? "opacity-40 cursor-not-allowed" : ""}
                              `}
                            >
                              {date.getDate()}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {modalSelectedDays.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {modalSelectedDays
                          .slice()
                          .sort((a, b) => a.getTime() - b.getTime())
                          .map((d) => (
                            <Badge
                              key={dateKey(d)}
                              variant="secondary"
                              className="text-[10px] gap-1"
                            >
                              {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                              {!editingActivity && (
                                <button
                                  type="button"
                                  onClick={() => toggleModalDay(d)}
                                  className="hover:text-destructive"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Time + Category row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Time</Label>
                      <Input
                        type="time"
                        value={activityTime}
                        onChange={(e) => setActivityTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Category</Label>
                      <Select value={activityCategory} onValueChange={(v) => setActivityCategory(v as ActivityCategory)}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="academics">Academics</SelectItem>
                          <SelectItem value="extracurriculars">Extracurriculars</SelectItem>
                          <SelectItem value="competitions">Competitions</SelectItem>
                          <SelectItem value="personal-development">Personal Dev</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Subject (academics only) */}
                  {activityCategory === "academics" && (
                    <div className="space-y-1.5">
                      <Label className="text-sm">Subject <span className="text-muted-foreground">(optional)</span></Label>
                      <Input
                        placeholder="e.g., Physics, Calculus"
                        value={activitySubject}
                        onChange={(e) => setActivitySubject(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Planned hours */}
                  <div className="space-y-1.5">
                    <Label className="text-sm">Planned Hours: {plannedHours}h</Label>
                    <Slider value={[plannedHours]} onValueChange={([v]) => setPlannedHours(v)} min={0.5} max={8} step={0.5} />
                  </div>

                  {/* Save button */}
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={handleSave} className="w-full">
                      {editingActivity ? "Update Activity" : "Add Activity"}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
