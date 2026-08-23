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
  name: "get_journey_score",
  title: "Get my journey score",
  description:
    "Fetch the signed-in user's overall Pathforge journey score (0-100) and per-category progress toward their college application goals.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await sb(ctx)
      .from("journey_scores")
      .select("*")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? { score: null }, null, 2) }],
      structuredContent: (data ?? { score: null }) as Record<string, unknown>,
    };
  },
});
