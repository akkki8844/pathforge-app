import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_profile",
  title: "Get my Pathforge profile",
  description:
    "Fetch the signed-in user's Pathforge profile: name/username/email plus onboarding data (grade, school, country, curriculum, GPA, intended major, target universities, application year).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const client = sb(ctx);
    const userId = ctx.getUserId();
    const [{ data: profile, error: pe }, { data: onboarding, error: oe }] = await Promise.all([
      client.from("profiles").select("username,full_name,email").eq("user_id", userId).maybeSingle(),
      client
        .from("onboarding_data")
        .select(
          "grade,high_school_name,country,curriculum,gpa,gpa_range,standardized_test_type,standardized_test_score,intended_major,target_universities,application_year,extracurricular_level,areas_of_interest,career_direction,onboarding_completed",
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    if (pe || oe) {
      return {
        content: [{ type: "text", text: (pe ?? oe)!.message }],
        isError: true,
      };
    }
    const payload = { profile: profile ?? null, onboarding: onboarding ?? null };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
