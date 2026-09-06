import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import getJourneyScore from "./tools/get-journey-score";
import getSubscription from "./tools/get-subscription";
import listReadinessReports from "./tools/list-recommendations";
import listTasks from "./tools/list-tasks";
import getSchedule from "./tools/get-schedule";
import listGoals from "./tools/list-goals";
import listApplications from "./tools/list-applications";
import getWeeklyCheckin from "./tools/get-weekly-checkin";
import listObjectives from "./tools/list-objectives";

// Issuer MUST be the direct supabase.co host (not the Cloud proxy). Build it
// from VITE_SUPABASE_PROJECT_ID which Vite inlines as a literal at build time,
// so no runtime env read happens at module-eval time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pathforge-mcp",
  title: "Pathforge",
  version: "0.2.0",
  instructions:
    "Pathforge MCP exposes read-only access to the signed-in student's college-prep data: profile and onboarding info, journey score, subscription plan, saved readiness reports, Routine tasks, class timetable and calendar, goals and milestones, college applications and recommenders, weekly check-ins, and objectives. Every tool runs as that student under row-level security, so it can only ever return their own rows. Use them to ground advice in what the student has actually recorded — never fill a gap with an estimate: if a tool returns nothing, say the data is not there.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getProfile,
    getJourneyScore,
    getSubscription,
    listReadinessReports,
    listTasks,
    getSchedule,
    listGoals,
    listApplications,
    getWeeklyCheckin,
    listObjectives,
  ],
});
