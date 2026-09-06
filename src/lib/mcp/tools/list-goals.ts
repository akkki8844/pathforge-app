import { defineTool } from "@lovable.dev/mcp-js";
import { failed, notAuthenticated, ok, sb } from "../client";

export default defineTool({
  name: "list_goals",
  title: "List my goals",
  description:
    "List the signed-in student's Routine goals with their milestones, so advice can be tied to targets they have already set rather than new ones invented for them.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const client = sb(ctx);

    const { data: goals, error } = await client
      .from("routine_goals")
      .select("id,title,description,category,priority,status,target_date,progress_override,completed_at")
      .eq("user_id", ctx.getUserId())
      .order("target_date", { ascending: true, nullsFirst: false })
      .limit(50);
    if (error) return failed(error.message);

    const ids = (goals ?? []).map((g) => g.id);
    let milestones: unknown[] = [];
    if (ids.length > 0) {
      const { data: ms, error: msErr } = await client
        .from("routine_goal_milestones")
        .select("*")
        .in("goal_id", ids);
      if (msErr) return failed(msErr.message);
      milestones = ms ?? [];
    }

    return ok({ goals: goals ?? [], milestones });
  },
});
