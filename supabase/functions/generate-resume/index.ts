import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let supabase: ReturnType<typeof createClient> | null = null;
  let creditConsumed = false;
  const refundCredit = async () => {
    if (!creditConsumed || !supabase) return;
    try { await supabase.rpc("refund_credit"); creditConsumed = false; } catch (_) { /* best-effort */ }
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const rawBody = await req.text();
    if (rawBody.length > 50_000) {
      return new Response(JSON.stringify({ error: "Request payload too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let body: any;
    try { body = JSON.parse(rawBody); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Cap arrays and bullet strings before interpolation into the AI prompt
    const capArr = <T,>(a: unknown, n: number): T[] =>
      Array.isArray(a) ? (a.slice(0, n) as T[]) : [];
    const capBullets = (item: any) => {
      if (item && Array.isArray(item.bullets)) {
        item.bullets = item.bullets
          .slice(0, 6)
          .map((b: any) => (typeof b === "string" ? b.slice(0, 400) : b));
      }
      return item;
    };
    if (body && typeof body === "object") {
      body.experience = capArr(body.experience, 10).map(capBullets);
      body.activities = capArr(body.activities, 10).map(capBullets);
      body.projects = capArr(body.projects, 10).map(capBullets);
      body.research = capArr(body.research, 10).map(capBullets);
      body.honors = capArr(body.honors, 15);
      body.certifications = capArr(body.certifications, 15);
      body.coursework = capArr(body.coursework, 30).map((s: any) => typeof s === "string" ? s.slice(0, 200) : s);
    }
    const {
      header,        // { name, email, phone, city, linkedin, website }
      targetRole,    // string ("Undergraduate Admission — Computer Science")
      intendedMajor, // string from onboarding (drives personalization emphasis)
      summaryHint,   // optional one-liner from the user
      education,     // [{school, location, graduationDate, gpa, curriculum, classRank, courses, honorsCount, apCount}]
      experience,    // [{role, organization, location, startDate, endDate, bullets[]}]
      activities,    // [{role, organization, startDate, endDate, bullets[]}]
      projects,      // [{name, tech, link, bullets[]}]
      research,      // [{title, advisor, organization, startDate, endDate, bullets[]}]
      honors,        // [{title, level, year, description}]
      certifications,// [{name, issuer, year}]
      coursework,    // string[] (AP/IB/Honors course names)
      skills,        // { technical: string[], languages: string[], interests: string[] }
    } = body || {};

    if (!header?.name) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasCredit, error: creditError } = await supabase.rpc("consume_credits", { amount: 2, _feature_type: "resume" });
    if (creditError || !hasCredit) {
      return new Response(JSON.stringify({ error: "Daily credit limit reached. Please upgrade your plan." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    creditConsumed = true;

    const systemPrompt = `You are an elite college-application resume writer. You produce ONE-PAGE, classic, ATS-friendly resumes in the exact format used by accepted applicants to top US universities (UPenn / Ivy "classic" style).

REFERENCE LAYOUT (mirror this structure precisely):
- Centered NAME at top.
- Single contact line: email | address | city | phone (only fields provided).
- Sections in ALL CAPS with a horizontal rule.
- Each item: bold left header + italic right (location or dates), then italic sub-line (degree / org), then 2-4 tight bullets.
- Section ORDER (omit any not provided): Education → Skills → Experience → Activities & Leadership → Projects → Research & Publications → Honors & Awards → Certifications → Coursework.

OUTPUT FORMAT (NON-NEGOTIABLE):
- Return the resume EXCLUSIVELY via the deliver_resume tool call.
- Every bullet: complete sentence, strong action verb first, past tense (present for current roles).
- Quantify impact wherever possible (numbers, %, $, hours, people).
- ≤ 165 chars per bullet. 2-4 bullets per item.
- Total bullets across all sections ≤ 22 so it fits ONE page.

STRICT ANTI-PLACEHOLDER RULES:
- NEVER output any of these patterns: "20xx", "20XX", "XXXX", "TBD", "TBA", "[insert ...]", "Lorem", "John Doe", "Jane Doe", "Sample", "example.com", "555-555".
- NEVER fabricate dates, GPAs, scores, organizations, awards, or coursework not present in the input.
- If a field is missing, OMIT it — do not guess, do not put a placeholder.
- If user dates are missing, leave startDate/endDate empty strings — do NOT write "20xx".

VOICE:
- Strong action verbs (Built, Led, Designed, Researched, Founded, Analyzed, Engineered, Launched, Coordinated, Published).
- BANNED words: "passionate", "responsible for", "duties included", "various", "in today's world", "team player", "hard worker".
- ATS-friendly: no emoji, no decorative symbols. Allowed punctuation: - – , . ; : / % $ + ( ).

PERSONALIZATION:
- The targetRole and the user's intended major drive emphasis. For STEM applicants, foreground research / projects / technical skills. For Business / Economics, foreground leadership, initiatives, quantifiable financial / operational impact. For Humanities, foreground writing, publications, debate, language, research. For Pre-Med / Bio, foreground lab work, clinical / volunteer hours, research methods.

INTEGRITY:
- Use ONLY facts from input. Rewrite for clarity and impact; never fabricate.

Return ONLY through the deliver_resume tool call.`;

    const eduBlock = (education || []).map((e: any, i: number) =>
      `${i + 1}. ${e.school || "—"} | ${e.location || "—"} | Grad: ${e.graduationDate || "—"} | GPA: ${e.gpa || "—"} | ${e.curriculum || ""} | Rank: ${e.classRank || "—"} | AP/Honors: ${e.apCount || "—"}/${e.honorsCount || "—"}\n   Courses: ${e.courses || "—"}`
    ).join("\n");

    const expBlock = (experience || []).map((x: any, i: number) =>
      `${i + 1}. ${x.role || "—"} @ ${x.organization || "—"} (${x.location || "—"}) | ${x.startDate || "—"} – ${x.endDate || "Present"}\n   Notes: ${(x.bullets || []).join(" | ") || "—"}`
    ).join("\n");

    const actBlock = (activities || []).map((a: any, i: number) =>
      `${i + 1}. ${a.role || "—"} @ ${a.organization || "—"} | ${a.startDate || "—"} – ${a.endDate || "Present"}\n   Notes: ${(a.bullets || []).join(" | ") || "—"}`
    ).join("\n");

    const projBlock = (projects || []).map((p: any, i: number) =>
      `${i + 1}. ${p.name || "—"} | Tech: ${p.tech || "—"} | Link: ${p.link || "—"}\n   Notes: ${(p.bullets || []).join(" | ") || "—"}`
    ).join("\n");

    const resBlock = (research || []).map((r: any, i: number) =>
      `${i + 1}. ${r.title || "—"} | Advisor: ${r.advisor || "—"} | ${r.organization || "—"} | ${r.startDate || "—"} – ${r.endDate || "—"}\n   Notes: ${(r.bullets || []).join(" | ") || "—"}`
    ).join("\n");

    const honBlock = (honors || []).map((h: any, i: number) =>
      `${i + 1}. ${h.title} | ${h.level || "School"} | ${h.year || "—"} — ${h.description || ""}`
    ).join("\n");

    const certBlock = (certifications || []).map((c: any, i: number) =>
      `${i + 1}. ${c.name} | ${c.issuer || "—"} | ${c.year || "—"}`
    ).join("\n");

    const userPrompt = `Generate a ONE-PAGE classic ATS-friendly resume tailored for: ${targetRole || "Undergraduate college admission"}.

CONTACT (use as-is, do NOT modify):
- Name: ${header?.name || "—"}
- Email: ${header?.email || "—"}
- Phone: ${header?.phone || "—"}
- Location: ${header?.city || "—"}
- LinkedIn: ${header?.linkedin || "—"}
- Website: ${header?.website || "—"}

USER SUMMARY HINT (optional starting point):
${summaryHint || "—"}

INTENDED MAJOR (drives section emphasis): ${intendedMajor || targetRole || "—"}
EDUCATION (raw):
${eduBlock || "None provided"}

EXPERIENCE (raw):
${expBlock || "None provided"}

ACTIVITIES (raw):
${actBlock || "None provided"}

PROJECTS (raw):
${projBlock || "None provided"}

RESEARCH / PUBLICATIONS (raw):
${resBlock || "None provided"}

HONORS / AWARDS (raw):
${honBlock || "None provided"}

CERTIFICATIONS (raw):
${certBlock || "None provided"}

COURSEWORK (raw): ${(coursework || []).join(", ") || "—"}
SKILLS (raw):
- Technical: ${(skills?.technical || []).join(", ") || "—"}
- Languages: ${(skills?.languages || []).join(", ") || "—"}
- Interests: ${(skills?.interests || []).join(", ") || "—"}

Generate the polished resume via the tool call. Omit empty sections.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        tools: [
          {
            type: "function",
            function: {
              name: "deliver_resume",
              description: "Return the polished one-page resume.",
              parameters: {
                type: "object",
                properties: {
                  header: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      city: { type: "string" },
                      linkedin: { type: "string" },
                      website: { type: "string" },
                    },
                    required: ["name"],
                    additionalProperties: false,
                  },
                  summary: { type: "string", description: "≤180 char tailored summary." },
                  education: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        school: { type: "string" },
                        location: { type: "string" },
                        graduationDate: { type: "string" },
                        gpa: { type: "string" },
                        curriculum: { type: "string" },
                        classRank: { type: "string" },
                        relevantCourses: { type: "string" },
                      },
                      required: ["school"],
                      additionalProperties: false,
                    },
                  },
                  experience: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        role: { type: "string" },
                        organization: { type: "string" },
                        location: { type: "string" },
                        startDate: { type: "string" },
                        endDate: { type: "string" },
                        bullets: { type: "array", items: { type: "string" } },
                      },
                      required: ["role", "organization", "bullets"],
                      additionalProperties: false,
                    },
                  },
                  activities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        role: { type: "string" },
                        organization: { type: "string" },
                        startDate: { type: "string" },
                        endDate: { type: "string" },
                        bullets: { type: "array", items: { type: "string" } },
                      },
                      required: ["role", "organization", "bullets"],
                      additionalProperties: false,
                    },
                  },
                  projects: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        tech: { type: "string" },
                        link: { type: "string" },
                        bullets: { type: "array", items: { type: "string" } },
                      },
                      required: ["name", "bullets"],
                      additionalProperties: false,
                    },
                  },
                  research: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        advisor: { type: "string" },
                        organization: { type: "string" },
                        startDate: { type: "string" },
                        endDate: { type: "string" },
                        bullets: { type: "array", items: { type: "string" } },
                      },
                      required: ["title", "bullets"],
                      additionalProperties: false,
                    },
                  },
                  honors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        level: { type: "string" },
                        year: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["title"],
                      additionalProperties: false,
                    },
                  },
                  certifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        issuer: { type: "string" },
                        year: { type: "string" },
                      },
                      required: ["name"],
                      additionalProperties: false,
                    },
                  },
                  coursework: { type: "array", items: { type: "string" } },
                  skills: {
                    type: "object",
                    properties: {
                      technical: { type: "array", items: { type: "string" } },
                      languages: { type: "array", items: { type: "string" } },
                      interests: { type: "array", items: { type: "string" } },
                    },
                    additionalProperties: false,
                  },
                },
                required: ["header", "summary", "education"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "deliver_resume" } },
      }),
    });

    if (!response.ok) {
      await refundCredit();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");
    const result = JSON.parse(toolCall.function.arguments);

    // Strip any placeholder text the model may have echoed from sample-style guidance.
    const PLACEHOLDER_RE = /\b(20[xX]{2}|XXXX|TBD|TBA|\[insert[^\]]*\]|Lorem\s+ipsum|John\s+Doe|Jane\s+Doe|example\.com|555[-\s]?555[-\s]?\d{0,4})\b/g;
    const clean = (s: unknown): string => typeof s === "string" ? s.replace(PLACEHOLDER_RE, "").replace(/\s{2,}/g, " ").trim() : (s as string);
    const cleanArr = (arr: unknown): string[] => Array.isArray(arr) ? arr.map(clean).filter(Boolean) as string[] : [];
    const sanitize = (obj: any): any => {
      if (!obj || typeof obj !== "object") return obj;
      if (Array.isArray(obj)) return obj.map(sanitize);
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string") out[k] = clean(v);
        else if (Array.isArray(v)) out[k] = v.every((x) => typeof x === "string") ? cleanArr(v) : v.map(sanitize);
        else if (v && typeof v === "object") out[k] = sanitize(v);
        else out[k] = v;
      }
      return out;
    };
    const cleaned = sanitize(result);

    return new Response(JSON.stringify(cleaned), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-resume error:", e);
    await refundCredit();
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
