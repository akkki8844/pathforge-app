import { defineTool } from "@lovable.dev/mcp-js";
import { failed, notAuthenticated, ok, sb } from "../client";

export default defineTool({
  name: "get_weekly_checkin",
  title: "Get my recent weekly check-ins",
  description:
    "Fetch the signed-in student's last eight weekly check-ins: morale, what they said they got done, and their own reflection. This is their account of the week in their own words — quote it rather than characterising their state from anywhere else.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { data, error } = await sb(ctx)
      .from("weekly_checkins")
      .select("week_start,morale,progress,reflection,updated_at")
      .eq("user_id", ctx.getUserId())
      .order("week_start", { ascending: false })
      .limit(8);
    if (error) return failed(error.message);
    return ok({ checkins: data ?? [] });
  },
});
