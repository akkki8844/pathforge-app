import { defineTool } from "@lovable.dev/mcp-js";
import { failed, notAuthenticated, ok, sb } from "../client";

export default defineTool({
  name: "list_applications",
  title: "List my applications and recommenders",
  description:
    "Fetch the signed-in student's saved college applications and their recommender requests, with status and due dates. Report only what is returned here — do not estimate admission chances or state deadlines that are not in the data.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const client = sb(ctx);
    const userId = ctx.getUserId();

    const [appsRes, recRes] = await Promise.all([
      client
        .from("full_applications")
        .select("id,university,status,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(50),
      client
        .from("recommenders")
        .select("id,name,subject,status,due_date,submitted_at")
        .eq("user_id", userId)
        .order("due_date", { ascending: true, nullsFirst: false }),
    ]);

    if (appsRes.error) return failed(appsRes.error.message);
    if (recRes.error) return failed(recRes.error.message);

    return ok({
      applications: appsRes.data ?? [],
      recommenders: recRes.data ?? [],
    });
  },
});
