import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAuth(req: Request): Promise<{ authorized: boolean; userId?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { authorized: false };
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return { authorized: false };
  const token = authHeader.replace("Bearer ", "");
  const sb = createClient(url, key, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await sb.auth.getUser(token);
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

    const authHeader = req.headers.get("Authorization")!;
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Credit check
    const { data: hasCredit, error: creditErr } = await sb.rpc("consume_credits", { amount: 2, _feature_type: "linkedin_grow" });
    if (creditErr || !hasCredit) {
      return new Response(JSON.stringify({ error: "Daily credit limit reached. Please upgrade." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const major = String(body.major || "").slice(0, 200);
    const targetCollege = String(body.targetCollege || "").slice(0, 200);
    const country = String(body.country || "").slice(0, 100);
    const grade = String(body.grade || "").slice(0, 50);
    const activities = Array.isArray(body.activities) ? body.activities.slice(0, 30).map((a: unknown) => String(a).slice(0, 200)) : [];

    // Fetch user's LinkedIn import
    const { data: imp, error: impErr } = await sb
      .from("linkedin_imports")
      .select("linkedin_url, profile_text")
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (impErr || !imp) {
      return new Response(JSON.stringify({ error: "No LinkedIn import found. Please import your LinkedIn first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileText = (imp.profile_text || "").slice(0, 12000);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a senior LinkedIn growth strategist for high school students (grades 9-12) preparing for college admissions. Output ONLY valid JSON matching the schema. No markdown, no preamble.

Student context:
- Intended Major: ${major || "unspecified"}
- Target College: ${targetCollege || "unspecified"}
- Country: ${country || "unspecified"}
- Grade: ${grade || "unspecified"}
- Activities: ${activities.length ? activities.join(", ") : "none listed"}
- LinkedIn URL: ${imp.linkedin_url}

LinkedIn profile content (truncated):
"""
${profileText}
"""

Return JSON with this EXACT shape:
{
  "summary": "2-3 sentence personalized growth thesis grounded in the student's major and current LinkedIn profile.",
  "outreach": [
    {
      "category": "Professors | Industry Professionals | Alumni | Student Leaders | Researchers | Recruiters",
      "title": "Specific persona, e.g. 'Computer Science professors at MIT/Stanford working on ML'",
      "why": "Why this person matters for the student's major and goals",
      "where": "Concrete LinkedIn search query or filter, e.g. 'Search: Professor Computer Science MIT'",
      "messageTemplate": "A short, polite, specific connection-request message (under 280 chars) the student can copy/paste"
    }
  ],
  "contentPlan": [
    {
      "week": 1,
      "theme": "Theme of the week",
      "posts": [
        { "type": "Post | Article | Repost+Comment", "topic": "Specific topic", "hook": "First line", "outline": "3-5 bullet outline of what to write", "hashtags": ["#tag1", "#tag2"] }
      ]
    }
  ],
  "engagementHabits": [
    { "frequency": "Daily | 3x/week | Weekly", "action": "Concrete action", "why": "Impact" }
  ],
  "skillsToAdd": ["Skill 1", "Skill 2"],
  "groupsToJoin": [
    { "name": "Group name", "why": "Why this group helps the student" }
  ],
  "milestones30_60_90": {
    "day30": ["Milestone 1", "Milestone 2"],
    "day60": ["Milestone 1", "Milestone 2"],
    "day90": ["Milestone 1", "Milestone 2"]
  }
}

CRITICAL RULES:
1. Output ONLY the JSON, no \`\`\`json fences, no commentary.
2. Provide AT LEAST 5 outreach personas, 4 content-plan weeks (each with 2-3 posts), 4 engagement habits, 6 skills, 4 groups.
3. EVERY recommendation MUST be tied to evidence in the LinkedIn profile content above. In the "summary" field you MUST quote or paraphrase at least one specific item from the profile (a project, role, school, certification, or interest). If the profile is sparse, say so honestly in the summary instead of inventing context.
4. Do NOT fabricate metrics about the student (followers, post views, network size, engagement %). Speak in concrete actions, not invented numbers.
5. Never invent specific people's names — describe personas, search queries, or roles instead.
6. Message templates must sound like a polite, curious high schooler — not a recruiter. Reference something real from the recipient's likely role.
7. "skillsToAdd" must be skills NOT already present in the profile content above. Re-read the profile before listing them.`;

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
          { role: "user", content: "Generate the personalized LinkedIn growth plan now." },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("AI gateway error:", response.status, txt);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content: string = data.choices?.[0]?.message?.content || "";
    content = content.trim();
    if (content.startsWith("```json")) content = content.slice(7);
    else if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    content = content.trim();

    let plan: unknown;
    try {
      plan = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) plan = JSON.parse(m[0]);
      else throw new Error("Could not parse AI response");
    }

    // Persist plan
    await sb.from("linkedin_imports")
      .update({ grow_plan: plan, grow_plan_updated_at: new Date().toISOString() })
      .eq("user_id", auth.userId);

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("linkedin-grow error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
