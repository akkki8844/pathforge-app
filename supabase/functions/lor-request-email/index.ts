// Drafts a polite, specific recommendation-request email for ONE recommender.
// Costs 1 credit. Returns { subject, body }. Strict no-hallucination prompt.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI key missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) return json({ error: "Not authenticated" }, 401);

    const { recommenderId, deadline } = await req.json();
    if (!recommenderId) return json({ error: "recommenderId required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: rec } = await admin
      .from("recommenders")
      .select("id,user_id,name,position,subject,school,relationship_duration,notes")
      .eq("id", recommenderId)
      .maybeSingle();
    if (!rec || rec.user_id !== userId) return json({ error: "Not found" }, 404);

    const [{ data: profile }, { data: ob }] = await Promise.all([
      admin.from("profiles").select("display_name,full_name").eq("id", userId).maybeSingle(),
      admin.from("onboarding_data")
        .select("grade,intended_major,country,application_year,target_universities,career_direction")
        .eq("user_id", userId).maybeSingle(),
    ]);

    const { data: ok } = await userClient.rpc("consume_credits", { amount: 1, _feature_type: "lor_request" });
    if (!ok) return json({ error: "Out of credits" }, 402);

    const student = {
      name: profile?.display_name || profile?.full_name || "the student",
      grade: ob?.grade ?? null,
      major: ob?.intended_major ?? null,
      country: ob?.country ?? null,
      application_year: ob?.application_year ?? null,
      targets: (ob?.target_universities ?? []).slice(0, 5),
      career: ob?.career_direction ?? null,
    };

    const systemPrompt = `You draft ONE polite, specific recommendation-request email from a high school student to a teacher/mentor.
Strict rules:
- Use ONLY the provided facts. Never invent classes, grades, projects, or shared memories.
- Tone: warm, respectful, concise. No flattery, no marketing language, no emojis.
- Open with a clear ask, give context (major, application year, target tier when known), state deadline if provided, offer to send materials (brag sheet, resume), and close with thanks.
- 120–180 words. Plain text, paragraphs separated by blank lines. No salutation placeholders like [Name] — use the recommender's actual name.
- Subject line: short, specific, no clickbait.`;

    const userPrompt = `Recommender:
${JSON.stringify(rec, null, 2)}

Student:
${JSON.stringify(student, null, 2)}

Deadline: ${deadline || "not specified"}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "draft_email",
            description: "Return the subject and body of the request email.",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string" },
                body: { type: "string" },
              },
              required: ["subject", "body"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "draft_email" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "Rate limited, try again shortly." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted on the workspace." }, 402);
      return json({ error: "AI service error" }, 500);
    }

    const aiJson = await aiResp.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { subject: string; body: string } = { subject: "", body: "" };
    try { parsed = JSON.parse(call?.function?.arguments ?? "{}"); }
    catch { return json({ error: "Could not parse AI response" }, 500); }

    await admin.from("ai_usage_logs").insert({
      user_id: userId,
      feature_type: "lor_request_email",
      tokens_used: aiJson?.usage?.total_tokens ?? 0,
      request_metadata: { recommender_id: recommenderId },
    });

    return json(parsed);
  } catch (e) {
    console.error("lor-request-email error", e);
    return json({ error: "Internal server error" }, 500);
  }
});
