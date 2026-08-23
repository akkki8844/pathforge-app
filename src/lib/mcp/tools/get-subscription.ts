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
  name: "get_subscription",
  title: "Get my Pathforge plan",
  description:
    "Fetch the signed-in user's current Pathforge subscription plan (Free / Pro / Enterprise) and credit balance.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await sb(ctx)
      .from("subscriptions")
      .select("*")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? { plan: "free" }, null, 2) }],
      structuredContent: (data ?? { plan: "free" }) as Record<string, unknown>,
    };
  },
});
