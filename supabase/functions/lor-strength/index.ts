// LOR Strength analyzer — rates one recommender as weak/average/strong with
// short reasoning, tailored to the student's intended major + targets.
// Caches result on the recommenders row. Costs 1 credit.

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

    const { recommenderId } = await req.json();
    if (!recommenderId) return json({ error: "recommenderId required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: rec } = await admin
      .from("recommenders")
      .select("id,user_id,name,position,subject,school,relationship_duration,status,notes")
      .eq("id", recommenderId)
      .maybeSingle();

    if (!rec || rec.user_id !== userId) {
      return json({ error: "Recommender not found" }, 404);
    }

    const { data: ob } = await admin
      .from("onboarding_data")
      .select("grade,intended_major,curriculum,country,application_year,target_universities,areas_of_interest,career_direction")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: outcomes } = await admin
      .from("outcomes_data")
      .select("target_tier")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: ok } = await userClient.rpc("consume_credits", { amount: 1, _feature_type: "lor_strength" });
    if (!ok) return json({ error: "Out of credits" }, 402);

    const profile = {
      grade: ob?.grade ?? null,
      major: ob?.intended_major ?? null,
      curriculum: ob?.curriculum ?? null,
      country: ob?.country ?? null,
      application_year: ob?.application_year ?? null,
      targets: ob?.target_universities ?? [],
      interests: ob?.areas_of_interest ?? [],
      career: ob?.career_direction ?? null,
      target_tier: outcomes?.target_tier ?? null,
    };

    const systemPrompt = `You rate ONE recommender's expected strength for ONE student's college application.
Strict rules:
- Use ONLY the data provided. Do not invent achievements, relationships, or letter quality.
- Judge on subject fit, relationship depth, recency, position seniority, and alignment with the student's major and target tier.
- Rate strictly: weak / average / strong. Do NOT default to "strong".
- Reasoning is 1-2 sentences, plain, specific. No preamble, no marketing tone.`;

    const userPrompt = `Student:
${JSON.stringify(profile, null, 2)}

Recommender:
${JSON.stringify(rec, null, 2)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "rate_recommender",
            description: "Return a strength rating and reasoning for this recommender.",
            parameters: {
              type: "object",
              properties: {
                strength: { type: "string", enum: ["weak", "average", "strong"] },
                reasoning: { type: "string" },
              },
              required: ["strength", "reasoning"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "rate_recommender" } },
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
    let parsed: { strength: "weak" | "average" | "strong"; reasoning: string } = {
      strength: "average", reasoning: "",
    };
    try {
      parsed = JSON.parse(call?.function?.arguments ?? "{}");
    } catch {
      return json({ error: "Could not parse AI response" }, 500);
    }

    const analyzedAt = new Date().toISOString();
    await admin
      .from("recommenders")
      .update({
        strength: parsed.strength,
        strength_reasoning: parsed.reasoning,
        strength_analyzed_at: analyzedAt,
      })
      .eq("id", recommenderId);

    await admin.from("ai_usage_logs").insert({
      user_id: userId,
      feature_type: "lor_strength",
      tokens_used: aiJson?.usage?.total_tokens ?? 0,
      request_metadata: { recommender_id: recommenderId },
    });

    return json({
      strength: parsed.strength,
      reasoning: parsed.reasoning,
      analyzed_at: analyzedAt,
    });
  } catch (e) {
    console.error("lor-strength error", e);
    return json({ error: "Internal server error" }, 500);
  }
});
