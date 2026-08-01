// Generate a brag sheet tailored to a specific professor.
// Uses Gemini 3.1 Pro Preview for highest-quality reasoning.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.1-pro-preview";

interface Body {
  professor: {
    name: string;
    title?: string;
    department?: string;
    university?: string;
    research_interests?: string[];
  };
  answers: {
    why_this_professor: string;
    your_background: string;
    relevant_coursework: string;
    projects_or_research: string;
    achievements: string;
    intended_purpose: string; // research / phd / summer / mentorship / LOR
    contact_goal: string; // what student wants from email
    extras?: string;
  };
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
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const prof = body?.professor;
    const ans = body?.answers;
    if (!prof?.name || !ans?.why_this_professor || !ans?.your_background) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You write professional, factual brag sheets for high-school and undergraduate students to send to professors.
STRICT REFINEMENT MODE: only use facts the student provided. Never invent coursework, grades, awards, papers, dates, or affiliations.
If a section has thin information, keep it brief — do not pad with generic claims.
Tone: confident, concise, specific. No emojis. No exclamation marks.
Tailor wording to the professor's research area and the student's stated purpose.
Output Markdown only, with these sections in order:
1. Header (student's name placeholder, intended purpose, one-line position statement)
2. Why I'm reaching out to Prof. {LastName}  — 2-4 sentences, cite professor's research focus
3. Background snapshot — bullet list (school, grade if mentioned, intended field, GPA only if provided)
4. Relevant coursework — bullets, exact items only
5. Projects & research — bullets with one-line outcomes
6. Achievements — bullets, factual only
7. What I'm hoping for — 1-2 sentences matching the contact_goal
8. Optional extras — if extras provided, otherwise omit

Do not include preambles like "Here is the brag sheet". Output the document directly.`;

    const user = `PROFESSOR:\n${JSON.stringify(prof, null, 2)}\n\nSTUDENT ANSWERS:\n${JSON.stringify(ans, null, 2)}`;

    const r = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error("AI failure", r.status, txt);
      if (r.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit hit. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (r.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const markdown = String(data?.choices?.[0]?.message?.content ?? "").trim();

    // Also produce a short cold-email draft for convenience
    const emailPrompt = `Using the same student answers and professor info, write a single 120-160 word cold email from the student to Prof. ${prof.name}.
Plain text, no markdown, no preamble. Subject line on first line as "Subject: ...". Then a blank line, then the body.
Reference one specific aspect of the professor's research. End with a clear ask matching the student's contact_goal.`;
    const r2 = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You write concise, professional cold emails. Never fabricate facts." },
          { role: "user", content: `${emailPrompt}\n\nPROFESSOR:\n${JSON.stringify(prof)}\n\nSTUDENT ANSWERS:\n${JSON.stringify(ans)}` },
        ],
      }),
    });
    let email = "";
    if (r2.ok) {
      const d2 = await r2.json();
      email = String(d2?.choices?.[0]?.message?.content ?? "").trim();
    }

    return new Response(JSON.stringify({ success: true, markdown, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-professor-brag-sheet error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
