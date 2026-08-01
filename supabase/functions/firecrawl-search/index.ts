import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";

async function verifyAuth(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
  return user?.id ?? null;
}

function validateScrapeUrl(raw: string): { ok: true } | { ok: false; error: string } {
  let parsed: URL;
  try { parsed = new URL(raw); } catch { return { ok: false, error: "Invalid url" }; }
  if (parsed.protocol !== "https:") return { ok: false, error: "Only https:// URLs are allowed" };
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") {
    return { ok: false, error: "Disallowed host" };
  }
  // Block IP literals in private/link-local/loopback ranges
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    ) return { ok: false, error: "Disallowed host" };
  }
  if (host.includes(":")) {
    // crude IPv6 block for loopback/link-local/unique-local
    if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
      return { ok: false, error: "Disallowed host" };
    }
  }
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await verifyAuth(req);
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Consume 1 credit per request to prevent unbounded external API usage.
    const authHeader = req.headers.get("Authorization")!;
    const creditClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: hasCredit, error: creditError } = await creditClient.rpc("consume_credit", { _feature_type: "activity_search" });
    if (creditError || !hasCredit) {
      return new Response(
        JSON.stringify({ error: "OUT_OF_CREDITS", message: "You've run out of credits." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "Live data not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const raw = await req.text();
    if (raw.length > 10_000) return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const body = JSON.parse(raw);
    const mode = body.mode === "scrape" ? "scrape" : "search";

    let endpoint: string;
    let payload: Record<string, unknown>;

    if (mode === "scrape") {
      const url = String(body.url || "").trim();
      const validation = validateScrapeUrl(url);
      if (!validation.ok) return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      endpoint = `${FIRECRAWL}/scrape`;
      payload = { url, formats: ["markdown"], onlyMainContent: true };
    } else {
      const query = String(body.query || "").trim().slice(0, 300);
      if (!query) return new Response(JSON.stringify({ error: "Query required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      endpoint = `${FIRECRAWL}/search`;
      payload = {
        query,
        limit: Math.min(Math.max(Number(body.limit) || 8, 1), 15),
        tbs: body.recency || undefined, // 'qdr:m', 'qdr:y' etc.
      };
    }

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error("Firecrawl error:", r.status, data);
      return new Response(JSON.stringify({ error: "Live data lookup failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, mode, data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("firecrawl-search error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
