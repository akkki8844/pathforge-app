import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

// Lovable Cloud injects SUPABASE_ANON_KEY; only the Vite client build sees the
// VITE_SUPABASE_PUBLISHABLE_KEY spelling. Reading just the latter left the key
// undefined at runtime, so createClient threw before any tool could run.
function supabaseKey(): string {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) is not set");
  return key;
}

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, supabaseKey(), {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_readiness_reports",
  title: "List my readiness reports",
  description:
    "List the signed-in user's saved college readiness analyses (most recent first) with their scores and summary insights.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await sb(ctx)
      .from("readiness_analyses")
      .select("*")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { items: rows },
    };
  },
});
