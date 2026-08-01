// Find professors with verified, web-sourced emails.
// Pipeline: Firecrawl search → scrape top faculty pages → Gemini 3.1 Pro Preview
// extracts ONLY rows whose email appears verbatim in scraped text.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.1-pro-preview";

interface Filters {
  field: string;
  university?: string;
  country?: string;
  keywords?: string;
  level?: "any" | "professor" | "associate" | "assistant" | "postdoc";
  limit?: number;
}

interface Professor {
  name: string;
  title: string;
  department: string;
  university: string;
  email: string;
  profile_url: string;
  research_interests: string[];
  country: string;
  email_source_url: string;
}

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

function buildQuery(f: Filters): string {
  const parts: string[] = [];
  if (f.university) parts.push(`"${f.university}"`);
  parts.push(f.field);
  parts.push("faculty directory");
  if (f.level && f.level !== "any") parts.push(f.level);
  if (f.keywords) parts.push(f.keywords);
  parts.push("email");
  if (f.country) parts.push(f.country);
  return parts.join(" ").slice(0, 300);
}

async function firecrawlSearch(query: string, apiKey: string, limit: number) {
  const r = await fetch(`${FIRECRAWL}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: { formats: ["markdown"] },
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Firecrawl search failed: ${r.status}`);
  // Normalize: Firecrawl v2 returns { data: { web: [...], news: [...] } } or
  // legacy { data: [...] }. Coerce to a flat array.
  const raw = data?.data;
  let results: Array<{ url?: string; title?: string; description?: string; markdown?: string }> = [];
  if (Array.isArray(raw)) {
    results = raw;
  } else if (raw && typeof raw === "object") {
    for (const key of ["web", "news", "results", "images"]) {
      const v = (raw as Record<string, unknown>)[key];
      if (Array.isArray(v)) results = results.concat(v as typeof results);
    }
  } else if (Array.isArray(data?.web)) {
    results = data.web;
  } else if (Array.isArray(data?.results)) {
    results = data.results;
  }
  return results.filter((r) => r && r.url);
}

async function firecrawlScrape(url: string, apiKey: string): Promise<string> {
  try {
    const r = await fetch(`${FIRECRAWL}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    const data = await r.json();
    return String(data?.data?.markdown ?? data?.markdown ?? "");
  } catch {
    return "";
  }
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractEmails(text: string): Set<string> {
  const found = new Set<string>();
  const matches = text.match(EMAIL_RE) ?? [];
  for (const m of matches) {
    const e = m.toLowerCase();
    // skip obvious bad ones
    if (e.endsWith(".png") || e.endsWith(".jpg") || e.endsWith(".gif")) continue;
    if (e.includes("example.com") || e.includes("yourdomain")) continue;
    if (e.includes("@sentry") || e.includes("@wixpress")) continue;
    found.add(e);
  }
  return found;
}

async function aiExtract(
  sources: Array<{ url: string; text: string }>,
  filters: Filters,
  apiKey: string
): Promise<Professor[]> {
  // Build allowed-email allowlist from scraped pages
  const sourceMap = new Map<string, string>(); // email → page url
  for (const s of sources) {
    for (const e of extractEmails(s.text)) {
      if (!sourceMap.has(e)) sourceMap.set(e, s.url);
    }
  }
  if (sourceMap.size === 0) return [];
  const allowedEmails = Array.from(sourceMap.keys()).slice(0, 200);

  // Trim sources to keep prompt manageable
  const corpus = sources
    .map(
      (s) =>
        `=== SOURCE: ${s.url} ===\n${s.text.slice(0, 8000)}`
    )
    .join("\n\n")
    .slice(0, 60_000);

  const system = `You are a strict academic-data extractor.
Return ONLY professors who clearly appear in the SOURCES and whose email is in the ALLOWED_EMAILS list.
Never invent, guess, or modify an email. If a person has no listed email in ALLOWED_EMAILS, omit them.
Prefer faculty matching the requested field. Be conservative: it is better to return 5 verified rows than 20 uncertain rows.
Respond as strict JSON: { "professors": Professor[] }.
Each Professor has: name, title, department, university, email, profile_url, research_interests (array of short strings), country, email_source_url.
profile_url and email_source_url must be URLs that appear in the SOURCES.
Title examples: "Professor", "Associate Professor", "Assistant Professor", "Postdoctoral Researcher".`;

  const user = `FILTERS:\n${JSON.stringify(filters)}\n\nALLOWED_EMAILS:\n${allowedEmails.join("\n")}\n\nSOURCES:\n${corpus}`;

  const r = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    console.error("AI extract failed", r.status, t);
    if (r.status === 429) throw new Error("Rate limited. Please try again in a moment.");
    if (r.status === 402) throw new Error("AI credits exhausted. Add credits in Settings.");
    throw new Error("AI extraction failed");
  }
  const data = await r.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  let parsed: { professors?: Professor[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const raw = parsed.professors ?? [];

  // Final guard: drop any prof whose email isn't in the allowlist (model paranoia)
  const verified: Professor[] = [];
  const seen = new Set<string>();
  for (const p of raw) {
    if (!p?.email) continue;
    const em = String(p.email).toLowerCase().trim();
    if (!sourceMap.has(em)) continue;
    if (seen.has(em)) continue;
    seen.add(em);
    verified.push({
      name: String(p.name ?? "").trim(),
      title: String(p.title ?? "").trim(),
      department: String(p.department ?? "").trim(),
      university: String(p.university ?? filters.university ?? "").trim(),
      email: em,
      profile_url: String(p.profile_url ?? sourceMap.get(em) ?? "").trim(),
      research_interests: Array.isArray(p.research_interests)
        ? p.research_interests.slice(0, 6).map((s) => String(s).trim()).filter(Boolean)
        : [],
      country: String(p.country ?? filters.country ?? "").trim(),
      email_source_url: sourceMap.get(em) ?? "",
    });
  }
  return verified;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await verifyAuth(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consume 1 credit per request — this endpoint makes multiple paid Firecrawl + AI calls.
    const authHeader = req.headers.get("Authorization")!;
    const creditClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: hasCredit, error: creditError } = await creditClient.rpc("consume_credit", { _feature_type: "find_professors" });
    if (creditError || !hasCredit) {
      return new Response(
        JSON.stringify({ error: "OUT_OF_CREDITS", message: "You've run out of credits." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!firecrawlKey || !lovableKey) {
      return new Response(JSON.stringify({ error: "Live data not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Filters;
    if (!body?.field || String(body.field).trim().length < 2) {
      return new Response(JSON.stringify({ error: "Field/department is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const limit = Math.min(Math.max(Number(body.limit) || 12, 4), 20);

    const query = buildQuery(body);
    const searchResults = await firecrawlSearch(query, firecrawlKey, 8);

    // Use search-result markdown where available; scrape top 4 otherwise.
    const sources: Array<{ url: string; text: string }> = [];
    for (const r of searchResults) {
      if (r.markdown && r.markdown.length > 400) {
        sources.push({ url: r.url!, text: r.markdown });
      }
    }
    const toScrape = searchResults
      .filter((r) => !sources.some((s) => s.url === r.url))
      .slice(0, 4);
    const scraped = await Promise.all(
      toScrape.map(async (r) => ({ url: r.url!, text: await firecrawlScrape(r.url!, firecrawlKey) }))
    );
    for (const s of scraped) if (s.text) sources.push(s);

    if (sources.length === 0) {
      return new Response(JSON.stringify({ success: true, professors: [], note: "No usable sources found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const professors = await aiExtract(sources, body, lovableKey);
    return new Response(
      JSON.stringify({ success: true, professors: professors.slice(0, limit), query }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("find-professors error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
