// Parse uploaded file content with Gemini (multimodal) and return a short summary + extracted text.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { authorized: false };
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { authorized: false };
  return { authorized: true, userId: user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await verifyAuth(req);
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = await req.text();
    if (raw.length > 12_000_000) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsedBody: { name?: string; mime?: string; dataUrl?: string };
    try {
      parsedBody = JSON.parse(raw);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { name, mime, dataUrl } = parsedBody;
    if (!name || !mime || !dataUrl) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Validate decoded byte size of the base64 data URL (cap ~8 MB).
    const commaIdx = dataUrl.indexOf(",");
    const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
    const decodedBytes = Math.floor((b64.length * 3) / 4) - padding;
    if (decodedBytes > 8 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 8 MB)" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build multimodal content. Gemini supports PDF/image/audio via image_url-style data URLs.
    const userParts: any[] = [
      {
        type: "text",
        text: `Extract the key content of this file ("${name}", ${mime}). Reply with TWO sections:\nSUMMARY: 2-4 sentences describing what it is and the most important facts.\nEXTRACT: a faithful plain-text extraction of the readable content (no commentary, no markdown). Cap the extract at ~12000 characters.`,
      },
      { type: "image_url", image_url: { url: dataUrl } },
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You faithfully extract text from user-supplied files. Never invent content. If the file is unreadable, say so." },
          { role: "user", content: userParts },
        ],
        max_tokens: 4000,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("ingest-file gateway error", resp.status, text);
      return new Response(JSON.stringify({ summary: `File attached: ${name}`, extractedText: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const full: string = data.choices?.[0]?.message?.content || "";
    const summaryMatch = full.match(/SUMMARY:\s*([\s\S]*?)(?:EXTRACT:|$)/i);
    const extractMatch = full.match(/EXTRACT:\s*([\s\S]*)/i);
    const summary = (summaryMatch?.[1] || full.slice(0, 400)).trim();
    const extractedText = (extractMatch?.[1] || "").trim().slice(0, 15000);

    return new Response(JSON.stringify({ summary, extractedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ingest-file error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
