import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * The one Supabase client the MCP tools use.
 *
 * Every tool runs as the signed-in student and nothing else: the anon key
 * plus the caller's own bearer token, so RLS is what decides what comes back.
 * No service-role key is read here, and none should be — an MCP tool is a
 * remote caller with a token, not a trusted server.
 *
 * Lovable Cloud injects SUPABASE_ANON_KEY; only the Vite client build sees the
 * VITE_SUPABASE_PUBLISHABLE_KEY spelling. Reading just the latter left the key
 * undefined at runtime, so createClient threw before any tool could run.
 */
export function supabaseKey(): string {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) is not set");
  return key;
}

export function sb(ctx: ToolContext): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, supabaseKey(), {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The same refusal every tool gives an unauthenticated caller. */
export function notAuthenticated() {
  return { content: [{ type: "text" as const, text: "Not authenticated" }], isError: true };
}

/** A Postgres error, handed back as the tool's error rather than thrown. */
export function failed(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

/** A successful result, as both readable text and structured content. */
export function ok(payload: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}
