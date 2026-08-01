// Generates a 25-task, major-specific Journey roadmap via Lovable AI gateway.
// Cached per (user, major) in public.journey_personalizations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const STAGES = [
  { level: 1, count: 5 },
  { level: 2, count: 5 },
  { level: 3, count: 5 },
  { level: 4, count: 5 },
  { level: 5, count: 5 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing auth" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid auth" }, 401);
    const userId = userData.user.id;

    // Sanitize all user-controlled inputs before interpolating into AI prompt:
    // strip control chars (CR/LF/TAB) and cap length to prevent prompt injection.
    const sanitizeField = (v: unknown, max = 120) =>
      String(v ?? "")
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);

    const body = await req.json().catch(() => ({}));
    const major = sanitizeField(body.major, 120);
    const country = sanitizeField(body.country, 80);
    const curriculum = sanitizeField(body.curriculum, 80);
    const grade = sanitizeField(body.grade, 40);
    const targetUniversity = sanitizeField(body.targetUniversity, 160);
    const force = Boolean(body.force);

    if (!major) return json({ error: "major required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Cached?
    if (!force) {
      const { data: cached } = await admin
        .from("journey_personalizations")
        .select("tasks")
        .eq("user_id", userId)
        .eq("major", major)
        .maybeSingle();
      if (cached?.tasks && Array.isArray(cached.tasks) && cached.tasks.length > 0) {
        return json({ tasks: cached.tasks, cached: true });
      }
    }

    const system = `You are a senior college-admissions strategist for high-school students aiming at top universities.
You output a 25-task, 5-level personalized Journey roadmap tailored to ONE specific intended major and student context.

ABSOLUTE RULES (strict refinement mode, anti-hallucination):
- Only reference real, well-known programs, competitions, MOOCs, journals, and platforms. If you are not confident a program exists for this major/country, omit the "link" field entirely (do NOT invent URLs).
- Every task must be CONCRETE and verifiable with a certificate, transcript, public artifact, or screenshot — no vague "explore" or "learn about" tasks.
- Tailor specifically to the major — generic tasks are forbidden. Mention the major in titles where natural.
- Respect country/curriculum (e.g. JEE/NEET for India, SAT/AP for US, A-Levels for UK).
- Respect grade urgency: lower grades = exploration + foundation; senior grades = applications + spike depth.
- No preamble, no apology, no commentary. Output ONLY valid JSON. No markdown fences.`;

    const user = `STUDENT CONTEXT
- Intended major: ${major}
- Country: ${country || "Unknown"}
- Curriculum: ${curriculum || "Unknown"}
- Grade: ${grade || "Unknown"}
- Top target university: ${targetUniversity || "Unspecified"}

Generate EXACTLY 25 tasks, distributed as 5 per level (level 1..5):
- Level 1 Foundation: academic base, first exposure to the major.
- Level 2 Exploration: discover sub-fields, light projects/clubs.
- Level 3 Building: real projects, real roles, first competitions.
- Level 4 Differentiation: measurable spike — awards, research, leadership.
- Level 5 Elite: top-tier signals + application narrative.

For each task provide: id, level (1-5), category (academics|activities|leadership|competitions|test_prep|research|application), title, why (1-2 sentences on admissions value), outcome (concrete deliverable), timeEstimate, exactly 4 microSteps (label + detail), and optionally a real link with linkLabel.

Return exactly this JSON shape:
{"tasks":[{"id":"level-1-task-1","level":1,"category":"academics","title":"...","why":"...","outcome":"...","timeEstimate":"...","microSteps":[{"label":"...","detail":"..."},{"label":"...","detail":"..."},{"label":"...","detail":"..."},{"label":"...","detail":"..."}],"link":"https://official-site.example","linkLabel":"Official site"}]}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let aiRes: Response;
    try {
      aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          max_tokens: 8000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
    } catch (e) {
      console.warn("AI generation timed out/unreachable; using fallback", e);
      const tasks = buildFallbackTasks(major, country, curriculum, grade, targetUniversity);
      await cacheTasks(admin, userId, major, country, curriculum, grade, tasks);
      return json({ tasks, cached: false, fallback: true });
    } finally {
      clearTimeout(timeout);
    }

    if (aiRes.status === 429 || aiRes.status === 402) {
      const tasks = buildFallbackTasks(major, country, curriculum, grade, targetUniversity);
      await cacheTasks(admin, userId, major, country, curriculum, grade, tasks);
      return json({ tasks, cached: false, fallback: true });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      const tasks = buildFallbackTasks(major, country, curriculum, grade, targetUniversity);
      await cacheTasks(admin, userId, major, country, curriculum, grade, tasks);
      return json({ tasks, cached: false, fallback: true });
    }

    let parsed: { tasks: any[] };
    try {
      const aiJson = await aiRes.json();
      const raw = aiJson.choices?.[0]?.message?.content;
      if (!raw || typeof raw !== "string") return json({ error: "Empty AI response" }, 500);
      parsed = JSON.parse(extractJson(raw));
    }
    catch {
      const tasks = buildFallbackTasks(major, country, curriculum, grade, targetUniversity);
      await cacheTasks(admin, userId, major, country, curriculum, grade, tasks);
      return json({ tasks, cached: false, fallback: true });
    }

    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, 25) : [];
    if (tasks.length < 25) return json({ tasks: buildFallbackTasks(major, country, curriculum, grade, targetUniversity), cached: false, fallback: true });

    // Persist cache
    await cacheTasks(admin, userId, major, country, curriculum, grade, tasks);

    return json({ tasks, cached: false });
  } catch (e) {
    console.error("generate-journey error", e);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractJson(raw: string): string {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

async function cacheTasks(admin: any, userId: string, major: string, country: string, curriculum: string, grade: string, tasks: any[]) {
  await admin.from("journey_personalizations").upsert({
    user_id: userId,
    major,
    country: country || null,
    curriculum: curriculum || null,
    grade: grade || null,
    tasks,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,major" });
}

function buildFallbackTasks(major: string, country: string, curriculum: string, grade: string, targetUniversity: string) {
  const cats = ["academics", "activities", "leadership", "competitions", "test_prep", "research", "application"];
  const levelNames = ["Foundation", "Exploration", "Building", "Differentiation", "Elite"];
  return Array.from({ length: 25 }, (_, i) => {
    const level = Math.floor(i / 5) + 1;
    const slot = (i % 5) + 1;
    const category = cats[i % cats.length];
    return {
      id: `fallback-${major.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-l${level}-${slot}`,
      level,
      category,
      title: `${levelNames[level - 1]} ${major} task ${slot}`,
      why: `This creates a verifiable ${major} signal appropriate for grade ${grade || "your grade"}${targetUniversity ? ` and ${targetUniversity}` : ""}.`,
      outcome: `A concrete ${major} deliverable with proof uploaded to Pathforge.`,
      timeEstimate: level <= 2 ? "2-4 weeks" : level <= 4 ? "6-10 weeks" : "8-12 weeks",
      microSteps: [
        { label: "Research", detail: `Find one credible ${major} course, project, competition, or mentor relevant to ${country || "your region"}.` },
        { label: "Select", detail: `Choose the option that fits your ${curriculum || "school"} workload and weekly availability.` },
        { label: "Execute", detail: "Complete the work with screenshots, certificates, notes, or a public artifact as evidence." },
        { label: "Present", detail: "Upload proof, summarize what changed, and add the result to your profile narrative." },
      ],
      link: slot === 1 ? "/activities" : undefined,
      linkLabel: slot === 1 ? "Find activities" : undefined,
    };
  });
}
