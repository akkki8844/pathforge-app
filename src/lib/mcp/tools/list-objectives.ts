import { defineTool } from "@lovable.dev/mcp-js";
import { failed, notAuthenticated, ok, sb } from "../client";

export default defineTool({
  name: "list_objectives",
  title: "List objectives assigned to me",
  description:
    "List the objectives the signed-in student owns or was assigned, with status, priority and due date. Objectives with status 'suggested' are detections awaiting the student's confirmation — never present those as commitments they have already made.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const userId = ctx.getUserId();
    const { data, error } = await sb(ctx)
      .from("objectives")
      .select("id,title,description,status,priority,due_at,team_id,source_type,routine_task_id,completed_at")
      .or(`assignee_id.eq.${userId},created_by.eq.${userId}`)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(50);
    if (error) return failed(error.message);

    const rows = data ?? [];
    return ok({
      open: rows.filter((o) => o.status !== "done" && o.status !== "suggested"),
      suggested: rows.filter((o) => o.status === "suggested"),
      completed: rows.filter((o) => o.status === "done"),
    });
  },
});
