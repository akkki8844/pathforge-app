import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let supabase: ReturnType<typeof createClient> | null = null;
  let creditConsumed = false;
  const refundCredit = async () => {
    if (!creditConsumed || !supabase) return;
    try { await supabase.rpc("refund_credit"); creditConsumed = false; } catch (_) { /* best-effort */ }
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    if (rawBody.length > 50_000) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: any = {};
    try { parsed = JSON.parse(rawBody); } catch {}
    let { essay, essayType, prompt } = parsed;
    if (!essay || typeof essay !== "string" || essay.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Essay must be at least 50 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    essay = essay.slice(0, 20_000);
    essayType = typeof essayType === "string" ? essayType.slice(0, 100) : "";
    prompt = typeof prompt === "string" ? prompt.slice(0, 500) : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { data: ok } = await supabase.rpc("consume_credits", { amount: 2, _feature_type: "essay" });
    if (!ok) {
      return new Response(JSON.stringify({ error: "No credits remaining" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    creditConsumed = true;

    const systemPrompt = `You are an elite college admissions essay reader who has reviewed thousands of essays for top universities (Ivy League, Stanford, MIT, Oxford). You evaluate honestly, specifically, and constructively. Never flatter. Always cite exact phrases from the essay when giving feedback. Never invent facts about the student.`;

    const userPrompt = `Evaluate this ${essayType || "college"} essay${prompt ? ` (prompt: ${prompt})` : ""}.

ESSAY:
"""
${essay}
"""

Return a structured analysis using the score_essay tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "score_essay",
              description: "Return a thorough, honest evaluation of a college essay.",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number", description: "0-100 overall rating" },
                  one_line_verdict: { type: "string", description: "One sentence verdict." },
                  breakdown: {
                    type: "object",
                    properties: {
                      clarity: { type: "number", description: "0-100" },
                      structure: { type: "number", description: "0-100" },
                      originality: { type: "number", description: "0-100" },
                      impact: { type: "number", description: "0-100" },
                      storytelling: { type: "number", description: "0-100" },
                    },
                    required: ["clarity", "structure", "originality", "impact", "storytelling"],
                    additionalProperties: false,
                  },
                  did_well: {
                    type: "array",
                    description: "3-5 specific strengths, each citing a phrase from the essay.",
                    items: { type: "string" },
                  },
                  did_wrong: {
                    type: "array",
                    description: "3-5 specific weaknesses, each citing a phrase from the essay.",
                    items: { type: "string" },
                  },
                  how_to_improve: {
                    type: "array",
                    description: "4-6 actionable, concrete steps the student should take to improve THIS essay.",
                    items: { type: "string" },
                  },
                },
                required: [
                  "overall_score",
                  "one_line_verdict",
                  "breakdown",
                  "did_well",
                  "did_wrong",
                  "how_to_improve",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "score_essay" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      await refundCredit();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      await refundCredit();
      return new Response(JSON.stringify({ error: "No analysis returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-essay error:", e);
    await refundCredit();
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
