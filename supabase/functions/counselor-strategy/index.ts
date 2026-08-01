// Counselor on-demand AI strategy generator.
// Called by counselors from a student's Strategy tab. Returns a focused
// narrative + 3-6 prioritized "Next Best Actions" tailored to the student's
// real journey + outcomes data. Costs 1 credit per call.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NextAction {
  title: string;
  why: string;
  category: "Academics" | "Activities" | "Leadership" | "Competitions" | "Test prep" | "Applications";
  effort: "low" | "medium" | "high";
  timeframe: string;
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
    if (!authHeader) {
      return json({ error: "Not authenticated" }, 401);
    }

    // User-scoped client (verifies caller, enforces RLS for writes)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const counselorId = userRes?.user?.id;
    if (!counselorId) return json({ error: "Not authenticated" }, 401);

    const { studentId } = await req.json();
    if (!studentId) return json({ error: "studentId required" }, 400);

    // Service client for cross-user reads (RLS already enforces counselor_can_view_student)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Authorization: caller must be a verified teacher linked to this student
    const { data: canView } = await adminClient.rpc("teacher_can_view_student", {
      _teacher_uid: counselorId,
      _student_uid: studentId,
    });
    if (!canView) return json({ error: "Not authorized for this student" }, 403);

    // Charge a credit to the counselor
    const { data: ok } = await userClient.rpc("consume_credits", { amount: 2, _feature_type: "counselor_strategy" });
    if (!ok) return json({ error: "Out of credits" }, 402);

    // Pull the student's snapshot
    const [{ data: ob }, { data: scores }, { data: outcomes }] = await Promise.all([
      adminClient.from("onboarding_data")
        .select("grade,intended_major,curriculum,gpa,country,application_year,target_universities,standardized_test_score,standardized_test_type,areas_of_interest,career_direction")
        .eq("user_id", studentId).maybeSingle(),
      adminClient.from("journey_scores")
        .select("overall_score,academics_score,activities_score,leadership_score,competitions_score,test_prep_score")
        .eq("user_id", studentId).maybeSingle(),
      adminClient.from("outcomes_data")
        .select("courses,projects,leadership_roles,competitions,target_tier")
        .eq("user_id", studentId).maybeSingle(),
    ]);

    const profile = {
      grade: ob?.grade ?? null,
      major: ob?.intended_major ?? null,
      curriculum: ob?.curriculum ?? null,
      gpa: ob?.gpa ?? null,
      country: ob?.country ?? null,
      application_year: ob?.application_year ?? null,
      targets: ob?.target_universities ?? [],
      test_type: ob?.standardized_test_type ?? null,
      test_score: ob?.standardized_test_score ?? null,
      interests: ob?.areas_of_interest ?? [],
      career: ob?.career_direction ?? null,
      target_tier: outcomes?.target_tier ?? null,
      scores: scores ?? null,
      counts: {
        courses: Array.isArray(outcomes?.courses) ? outcomes!.courses.length : 0,
        projects: Array.isArray(outcomes?.projects) ? outcomes!.projects.length : 0,
        leadership: Array.isArray(outcomes?.leadership_roles) ? outcomes!.leadership_roles.length : 0,
        competitions: Array.isArray(outcomes?.competitions) ? outcomes!.competitions.length : 0,
      },
    };

    const systemPrompt = `You are a senior college counselor advising another counselor about ONE specific student.
Your job is to produce a SHORT strategic brief and 3-6 PRIORITIZED next best actions.
Rules:
- Be specific to this student's intended major, grade, country, and target universities.
- Never invent achievements, awards, or test scores not present in the data.
- Use plain language. No hype, no marketing tone.
- "Next best actions" must be concrete, doable in the next 4-12 weeks, and high-leverage.
- Do not output generic advice ("study hard", "join clubs"). Reference the student's specifics.
- If a critical signal is missing (e.g. no test score in grade 11+), surface that explicitly.`;

    const userPrompt = `Student snapshot:
${JSON.stringify(profile, null, 2)}

Produce: (1) a 2-3 sentence "diagnosis" of where this student stands, (2) 3-6 next best actions.
Each action needs: title (5-9 words), why (one sentence tied to this student), category, effort (low/medium/high), timeframe (e.g. "next 2 weeks", "by end of term").`;

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
            name: "deliver_strategy",
            description: "Return the counselor brief and ranked next actions.",
            parameters: {
              type: "object",
              properties: {
                diagnosis: { type: "string" },
                next_actions: {
                  type: "array",
                  minItems: 3,
                  maxItems: 6,
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      why: { type: "string" },
                      category: {
                        type: "string",
                        enum: ["Academics", "Activities", "Leadership", "Competitions", "Test prep", "Applications"],
                      },
                      effort: { type: "string", enum: ["low", "medium", "high"] },
                      timeframe: { type: "string" },
                    },
                    required: ["title", "why", "category", "effort", "timeframe"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["diagnosis", "next_actions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "deliver_strategy" } },
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
    let parsed: { diagnosis: string; next_actions: NextAction[] } = { diagnosis: "", next_actions: [] };
    try {
      parsed = JSON.parse(call?.function?.arguments ?? "{}");
    } catch {
      return json({ error: "Could not parse AI response" }, 500);
    }

    // Log usage (best-effort)
    await adminClient.from("ai_usage_logs").insert({
      user_id: counselorId,
      feature_type: "counselor_strategy",
      tokens_used: aiJson?.usage?.total_tokens ?? 0,
      request_metadata: { student_id: studentId },
    });

    return json({
      diagnosis: parsed.diagnosis ?? "",
      nextActions: parsed.next_actions ?? [],
    });
  } catch (e) {
    console.error("counselor-strategy error", e);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
