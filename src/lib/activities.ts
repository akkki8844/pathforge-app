// Comprehensive Activities Database with external links and country availability


export interface Activity {
  id: string;
  name: string;
  category: string;
  type: "Competition" | "Project" | "Research" | "Leadership" | "Service";
  cost: "Free" | "Paid" | "Scholarships Available";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  gradeSuitability: string;
  description: string;
  detailedDescription: string;
  relevantMajors: string[];
  whyRelevant: string;
  countries: string[]; // Empty array means global/online
  learnMoreUrl: string;
  applyUrl: string | null;
  deadline?: string;
  priorityFactors: {
    majorAlignment: number; // 1-10
    collegeImpact: number; // 1-10
    uniqueness: number; // 1-10
  };
}

// Helper to determine if activity is available in country
export const isActivityAvailableInCountry = (activity: Activity, country: string): boolean => {
  if (activity.countries.length === 0) return true; // Global/online
  return activity.countries.includes(country);
};

// Get college level from name
/**
 * Load the activity catalogue.
 *
 * The 678 records and the helpers that close over them live in
 * `activitiesCatalogue.ts` and arrive as their own chunk, so a route that needs
 * them can paint its shell first and fill the list when the data lands. The
 * promise is cached, so a second caller in the same session gets the already
 * parsed module rather than re-importing it.
 *
 * Everything above this line is pure and stays synchronous — the interface,
 * the country check, and the two scoring helpers are all small and are used
 * per-item while rendering.
 */
export type ActivityCatalogue = typeof import("./activitiesCatalogue");

let cataloguePromise: Promise<ActivityCatalogue> | null = null;

export function loadActivityCatalogue(): Promise<ActivityCatalogue> {
  if (!cataloguePromise) cataloguePromise = import("./activitiesCatalogue");
  return cataloguePromise;
}

/** No data needed, so it stays here and stays synchronous. */
export const getActivityTypes = (): Activity["type"][] => {
  return ["Competition", "Project", "Research", "Leadership", "Service"];
};
