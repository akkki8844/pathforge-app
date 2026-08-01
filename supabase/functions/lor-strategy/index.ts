// LOR Strategy engine — ranks a student's recommenders and surfaces gaps
// (e.g. "no STEM teacher", "missing a recent grade-12 voice") tailored to
// the student's intended major, grade, and target tier. Costs 1 credit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Ranked {
  recommender_id: string;
  name: string;
  rank: number;
  rating: "strong" | "average" | "weak";
  reasoning: string;
}
interface Gap {
  title: string;
  why: string;
  severity: "low" | "medium" | "high";
}

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

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [{ data: recommenders }, { data: ob }, { data: outcomes }] = await Promise.all([
      admin.from("recommenders")
        .select("id,name,position,subject,school,relationship_duration,status,notes")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      admin.from("onboarding_data")
        .select("grade,intended_major,curriculum,country,application_year,target_universities,areas_of_interest,career_direction")
        .eq("user_id", userId).maybeSingle(),
      admin.from("outcomes_data")
        .select("target_tier")
        .eq("user_id", userId).maybeSingle(),
    ]);

    if (!recommenders || recommenders.length === 0) {
      return json({ error: "Add at least one recommender first." }, 400);
    }

    // Charge 1 credit
    const { data: ok } = await userClient.rpc("consume_credits", { amount: 1, _feature_type: "lor_strategy" });
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

    const systemPrompt = `You are a senior admissions strategist analyzing a student's recommender lineup.
Strict rules:
- Use ONLY the data provided. Do not invent letters, grades, or relationships not in the input.
- Be specific to this student's intended major, target tier, and grade.
- "Gaps" must be concrete and actionable, e.g. "No STEM teacher despite engineering major" — never generic.
- If the lineup is already strong, say so honestly and return fewer gaps.
- Plain language. No marketing tone. No preamble.`;

    const userPrompt = `Student profile:
${JSON.stringify(profile, null, 2)}

Recommenders:
${JSON.stringify(recommenders, null, 2)}

Task:
1. Rank ALL recommenders from strongest to weakest fit for this student's profile.
2. For each, give a one-sentence reasoning tied to the student's major/targets.
3. List 0-4 GAPS in the lineup (missing subject coverage, missing recency, missing leadership voice, etc.).`;

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
            name: "deliver_lor_strategy",
            description: "Return ranked recommenders and gap analysis.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string" },
                ranked: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      recommender_id: { type: "string" },
                      name: { type: "string" },
                      rank: { type: "number" },
                      rating: { type: "string", enum: ["strong", "average", "weak"] },
                      reasoning: { type: "string" },
                    },
                    required: ["recommender_id", "name", "rank", "rating", "reasoning"],
                    additionalProperties: false,
                  },
                },
                gaps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      why: { type: "string" },
                      severity: { type: "string", enum: ["low", "medium", "high"] },
                    },
                    required: ["title", "why", "severity"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["summary", "ranked", "gaps"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "deliver_lor_strategy" } },
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
    let parsed: { summary: string; ranked: Ranked[]; gaps: Gap[] } = {
      summary: "", ranked: [], gaps: [],
    };
    try {
      parsed = JSON.parse(call?.function?.arguments ?? "{}");
    } catch {
      return json({ error: "Could not parse AI response" }, 500);
    }

    await admin.from("ai_usage_logs").insert({
      user_id: userId,
      feature_type: "lor_strategy",
      tokens_used: aiJson?.usage?.total_tokens ?? 0,
      request_metadata: { recommender_count: recommenders.length },
    });

    return json({
      summary: parsed.summary ?? "",
      ranked: parsed.ranked ?? [],
      gaps: parsed.gaps ?? [],
    });
  } catch (e) {
    console.error("lor-strategy error", e);
    return json({ error: "Internal server error" }, 500);
  }
});
