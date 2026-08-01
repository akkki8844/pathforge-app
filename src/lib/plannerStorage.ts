// Weekly Action Planner storage utilities
import { supabase } from "@/integrations/supabase/client";

export type ActivityCategory = 'academics' | 'extracurriculars' | 'competitions' | 'personal-development';

export interface PlannerActivity {
  id: string;
  source?: 'manual' | 'google_calendar';
  googleEventId?: string;
  name: string;
  category: ActivityCategory;
  subject?: string;
  plannedHours: number;
  actualHours: number;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  completed: boolean;
  notes?: string;
}

export interface WeeklyPlan {
  weekStart: string; // ISO date string of week start (Sunday)
  activities: PlannerActivity[];
  recommendations?: string[];
}

const PLANNER_KEY = "pathforge_weekly_planner";

export const getWeekStart = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

export const getAllWeeklyPlans = (): Record<string, WeeklyPlan> => {
  const stored = localStorage.getItem(PLANNER_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
};

const getLocalWeeklyPlan = (weekStart: string): WeeklyPlan | null => {
  const plans = getAllWeeklyPlans();
  return plans[weekStart] || null;
};

const saveLocalWeeklyPlan = (plan: WeeklyPlan): void => {
  const plans = getAllWeeklyPlans();
  plans[plan.weekStart] = plan;
  localStorage.setItem(PLANNER_KEY, JSON.stringify(plans));
};

export const getWeeklyPlan = async (weekStart: string): Promise<WeeklyPlan | null> => {
  const localPlan = getLocalWeeklyPlan(weekStart);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return localPlan;

  const { data, error } = await (supabase as any)
    .from("weekly_plans")
    .select("activities, recommendations")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (!error && data) {
    const remotePlan: WeeklyPlan = {
      weekStart,
      activities: Array.isArray(data.activities) ? data.activities : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
    };
    saveLocalWeeklyPlan(remotePlan);
    return remotePlan;
  }

  if (localPlan?.activities.length) await saveWeeklyPlan(localPlan);
  return localPlan;
};

export const saveWeeklyPlan = async (plan: WeeklyPlan): Promise<void> => {
  saveLocalWeeklyPlan(plan);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await (supabase as any).from("weekly_plans").upsert(
    {
      user_id: user.id,
      week_start: plan.weekStart,
      activities: JSON.parse(JSON.stringify(plan.activities)),
      recommendations: JSON.parse(JSON.stringify(plan.recommendations ?? [])),
    },
    { onConflict: "user_id,week_start" },
  );
};

// Load multiple weekly plans at once (used to render multi-week calendar indicators).
export const getWeeklyPlansForWeeks = async (
  weekStarts: string[],
): Promise<Record<string, WeeklyPlan>> => {
  const unique = Array.from(new Set(weekStarts));
  const out: Record<string, WeeklyPlan> = {};
  // seed with local
  for (const ws of unique) {
    const local = getLocalWeeklyPlan(ws);
    if (local) out[ws] = local;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || unique.length === 0) return out;
  const { data, error } = await (supabase as any)
    .from("weekly_plans")
    .select("week_start, activities, recommendations")
    .eq("user_id", user.id)
    .in("week_start", unique);
  if (!error && Array.isArray(data)) {
    for (const row of data) {
      const plan: WeeklyPlan = {
        weekStart: row.week_start,
        activities: Array.isArray(row.activities) ? row.activities : [],
        recommendations: Array.isArray(row.recommendations) ? row.recommendations : [],
      };
      out[row.week_start] = plan;
      saveLocalWeeklyPlan(plan);
    }
  }
  return out;
};

export const createEmptyWeeklyPlan = (weekStart: string): WeeklyPlan => ({
  weekStart,
  activities: [],
  recommendations: [],
});

export const generateActivityId = (): string => {
  return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getCategoryLabel = (category: ActivityCategory): string => {
  const labels: Record<ActivityCategory, string> = {
    'academics': 'Academics',
    'extracurriculars': 'Extracurriculars',
    'competitions': 'Competitions',
    'personal-development': 'Personal Development',
  };
  return labels[category];
};

export const getCategoryColor = (category: ActivityCategory): string => {
  const colors: Record<ActivityCategory, string> = {
    'academics': 'bg-blue-500',
    'extracurriculars': 'bg-green-500',
    'competitions': 'bg-purple-500',
    'personal-development': 'bg-amber-500',
  };
  return colors[category];
};

export const getDayName = (dayIndex: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
};

export const getDayShortName = (dayIndex: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex];
};

export const calculateWeeklyStats = (activities: PlannerActivity[]) => {
  const stats = {
    totalPlannedHours: 0,
    totalActualHours: 0,
    byCategory: {
      academics: { planned: 0, actual: 0 },
      extracurriculars: { planned: 0, actual: 0 },
      competitions: { planned: 0, actual: 0 },
      'personal-development': { planned: 0, actual: 0 },
    } as Record<ActivityCategory, { planned: number; actual: number }>,
    completionRate: 0,
    balanceIndicators: [] as string[],
  };

  activities.forEach((activity) => {
    stats.totalPlannedHours += activity.plannedHours;
    stats.totalActualHours += activity.actualHours;
    stats.byCategory[activity.category].planned += activity.plannedHours;
    stats.byCategory[activity.category].actual += activity.actualHours;
  });

  const completedActivities = activities.filter((a) => a.completed).length;
  stats.completionRate = activities.length > 0 
    ? Math.round((completedActivities / activities.length) * 100) 
    : 0;

  // Generate balance indicators
  const academicRatio = stats.totalPlannedHours > 0 
    ? stats.byCategory.academics.planned / stats.totalPlannedHours 
    : 0;
  
  if (academicRatio < 0.4 && stats.totalPlannedHours > 10) {
    stats.balanceIndicators.push('Consider allocating more time to academics');
  }
  if (academicRatio > 0.8 && stats.totalPlannedHours > 10) {
    stats.balanceIndicators.push('Balance academics with extracurriculars for a well-rounded profile');
  }
  if (stats.byCategory.extracurriculars.planned === 0 && stats.totalPlannedHours > 5) {
    stats.balanceIndicators.push('Add extracurricular activities to strengthen your profile');
  }
  if (stats.totalActualHours > 0 && stats.totalActualHours < stats.totalPlannedHours * 0.7) {
    stats.balanceIndicators.push('Actual hours are below planned - consider adjusting goals');
  }

  return stats;
};

export const generateSmartRecommendations = (
  activities: PlannerActivity[],
  intendedMajor?: string
): string[] => {
  const recommendations: string[] = [];
  const stats = calculateWeeklyStats(activities);

  // Based on completion rate
  if (stats.completionRate < 50 && activities.length > 3) {
    recommendations.push('Focus on completing planned activities before adding new ones');
  }

  // Based on category balance
  if (stats.byCategory.competitions.planned === 0) {
    recommendations.push('Consider adding competition prep to stand out in applications');
  }

  if (stats.byCategory['personal-development'].planned < 2 && stats.totalPlannedHours > 10) {
    recommendations.push('Dedicate time to skill-building for long-term growth');
  }

  // Major-specific suggestions
  if (intendedMajor) {
    const majorLower = intendedMajor.toLowerCase();
    if (majorLower.includes('computer') || majorLower.includes('engineering')) {
      if (!activities.some(a => a.name.toLowerCase().includes('coding') || a.name.toLowerCase().includes('programming'))) {
        recommendations.push('Add coding practice sessions aligned with your major');
      }
    }
    if (majorLower.includes('business') || majorLower.includes('economics')) {
      if (!activities.some(a => a.name.toLowerCase().includes('case') || a.name.toLowerCase().includes('business'))) {
        recommendations.push('Include business case study or entrepreneurship activities');
      }
    }
    if (majorLower.includes('medicine') || majorLower.includes('biology') || majorLower.includes('pre-med')) {
      if (!activities.some(a => a.name.toLowerCase().includes('research') || a.name.toLowerCase().includes('volunteer'))) {
        recommendations.push('Add research or healthcare volunteering to your plan');
      }
    }
  }

  // Time management suggestions
  if (stats.totalPlannedHours > 50) {
    recommendations.push('High weekly hours planned - ensure time for rest and recovery');
  }
  if (stats.totalPlannedHours < 10 && activities.length > 0) {
    recommendations.push('Consider increasing weekly commitment for meaningful progress');
  }

  return recommendations.slice(0, 4); // Limit to 4 recommendations
};
