import { defineTool } from "@lovable.dev/mcp-js";
import { failed, notAuthenticated, ok, sb } from "../client";

export default defineTool({
  name: "list_tasks",
  title: "List my tasks",
  description:
    "List the signed-in student's open Routine tasks, soonest deadline first, with the overdue ones separated out. Use this before suggesting what they should work on so the advice matches what they have actually planned.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { data, error } = await sb(ctx)
      .from("routine_tasks")
      .select("id,title,description,category,priority,status,due_at,estimated_minutes,goal_id")
      .eq("user_id", ctx.getUserId())
      .neq("status", "done")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(50);
    if (error) return failed(error.message);

    const now = Date.now();
    const rows = data ?? [];
    const overdue = rows.filter((t) => t.due_at && +new Date(t.due_at) < now);
    const upcoming = rows.filter((t) => t.due_at && +new Date(t.due_at) >= now);
    const undated = rows.filter((t) => !t.due_at);

    return ok({ open_count: rows.length, overdue, upcoming, undated });
  },
});
