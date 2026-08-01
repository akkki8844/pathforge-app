import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import getJourneyScore from "./tools/get-journey-score";
import getSubscription from "./tools/get-subscription";
import listReadinessReports from "./tools/list-recommendations";

// Issuer MUST be the direct supabase.co host (not the Cloud proxy). Build it
// from VITE_SUPABASE_PROJECT_ID which Vite inlines as a literal at build time,
// so no runtime env read happens at module-eval time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pathforge-mcp",
  title: "Pathforge",
  version: "0.1.0",
  instructions:
    "Pathforge MCP exposes read-only access to the signed-in student's college-prep data: profile & onboarding info, journey score, subscription plan, and saved readiness reports. Use these tools to personalize advice about their college applications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, getJourneyScore, getSubscription, listReadinessReports],
});
