// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM = `You are a strict resume/LinkedIn profile parser. Extract structured information from the provided LinkedIn profile text. Do NOT invent or infer anything not explicitly present. If a field isn't present, leave it empty/null. Return ONLY a JSON object that matches the requested schema. No preamble.`;

const SCHEMA_HINT = `Return JSON with this exact shape:
{
  "headline": string|null,
  "about": string|null,
  "education": [{"school": string, "degree": string|null, "field": string|null, "start": string|null, "end": string|null, "grade": string|null}],
  "experiences": [{"title": string, "organization": string, "start": string|null, "end": string|null, "description": string|null}],
  "projects": [{"title": string, "description": string|null, "duration": string|null, "outcome": string|null, "link": string|null}],
  "leadership": [{"title": string, "organization": string, "duration": string|null, "team_size": number|null}],
  "competitions": [{"name": string, "level": "school"|"regional"|"state"|"national"|"international"|null, "result": string|null}],
  "awards": [{"title": string, "issuer": string|null, "date": string|null, "description": string|null}],
  "skills": [string],
  "volunteer": [{"role": string, "organization": string, "duration": string|null}],
  "certifications": [{"name": string, "issuer": string|null, "date": string|null}]
}`;

function uid() { return crypto.randomUUID(); }
function dedupKey(title: string, org = "") { return (title + "|" + org).toLowerCase().trim().replace(/\s+/g, " "); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const sbAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await sbAuth.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    let profileText: string = (body.profile_text || "").toString().slice(0, 60000);
    const linkedinUrl: string = (body.linkedin_url || "").toString().slice(0, 500);

    if (!profileText.trim() && !linkedinUrl.trim()) {
      return json({ error: "Provide profile_text or linkedin_url" }, 400);
    }

    // If we only have a URL (no real profile content), try scraping via Firecrawl.
    // The text we get back becomes the profile content for the AI parser.
    const isThin = profileText.replace(/\s+/g, " ").trim().length < 200;
    const LINKEDIN_URL_RE = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/.+/i;
    if (isThin && linkedinUrl.trim()) {
      if (!LINKEDIN_URL_RE.test(linkedinUrl.trim())) {
        return json({ error: "Invalid LinkedIn URL. Must be an https://linkedin.com/... URL." }, 400);
      }
      const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (fcKey) {
        try {
          const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
            method: "POST",
            headers: { Authorization: `Bearer ${fcKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: linkedinUrl, formats: ["markdown"], onlyMainContent: true }),
          });
          if (fcRes.ok) {
            const fcJson = await fcRes.json();
            const md: string =
              fcJson?.data?.markdown || fcJson?.markdown || fcJson?.data?.content || "";
            if (md && md.trim().length > 200) {
              profileText = md.slice(0, 60000);
            }
          } else {
            console.warn("Firecrawl scrape failed", fcRes.status);
          }
        } catch (err) {
          console.warn("Firecrawl scrape error", err);
        }
      }
    }

    // If still thin, refuse instead of pretending: the AI would just hallucinate or return empty.
    if (profileText.replace(/\s+/g, " ").trim().length < 200) {
      return json({
        error:
          "We couldn't read your LinkedIn from a URL alone. Please use the PDF option (LinkedIn → More → Save to PDF) so we can extract your real activities, awards, and experience.",
      }, 422);
    }

    // Call Lovable AI Gateway
    const aiPayload = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM + "\n\n" + SCHEMA_HINT },
        {
          role: "user",
          content: `LinkedIn URL: ${linkedinUrl || "n/a"}\n\nProfile text:\n${profileText}`,
        },
      ],
      response_format: { type: "json_object" },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify(aiPayload),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      if (aiRes.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "AI extraction failed" }, 502);
    }
    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content || "{}";
    let extracted: any = {};
    try { extracted = JSON.parse(content); } catch { extracted = {}; }

    // Normalize
    const normalized = {
      headline: extracted.headline ?? null,
      about: extracted.about ?? null,
      education: Array.isArray(extracted.education) ? extracted.education : [],
      experiences: Array.isArray(extracted.experiences) ? extracted.experiences : [],
      projects: Array.isArray(extracted.projects) ? extracted.projects : [],
      leadership: Array.isArray(extracted.leadership) ? extracted.leadership : [],
      competitions: Array.isArray(extracted.competitions) ? extracted.competitions : [],
      awards: Array.isArray(extracted.awards) ? extracted.awards : [],
      skills: Array.isArray(extracted.skills) ? extracted.skills : [],
      volunteer: Array.isArray(extracted.volunteer) ? extracted.volunteer : [],
      certifications: Array.isArray(extracted.certifications) ? extracted.certifications : [],
    };

    // Save canonical extracted profile
    await sb.from("profile_extracted_data").upsert({
      user_id: user.id,
      data: normalized,
      source: "linkedin",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // ---- Merge into outcomes_data (append only, dedupe) ----
    const { data: outcomes } = await sb.from("outcomes_data").select("*").eq("user_id", user.id).maybeSingle();

    const existingProjects: any[] = (outcomes?.projects as any[]) || [];
    const existingLeadership: any[] = (outcomes?.leadership_roles as any[]) || [];
    const existingCompetitions: any[] = (outcomes?.competitions as any[]) || [];
    const existingInternships: any[] = (outcomes?.internships as any[]) || [];
    const existingService: any[] = (outcomes?.service_roles as any[]) || [];
    const existingResearch: any[] = (outcomes?.research_outputs as any[]) || [];

    const projKeys = new Set(existingProjects.map(p => dedupKey(p.title || "", p.outcome || "")));
    const newProjects = normalized.projects
      .filter((p: any) => p.title && !projKeys.has(dedupKey(p.title, p.outcome || "")))
      .map((p: any) => ({
        id: uid(),
        title: String(p.title).slice(0, 200),
        description: String(p.description || "").slice(0, 1000),
        duration: String(p.duration || "").slice(0, 100),
        outcome: String(p.outcome || "").slice(0, 500),
        link: p.link ? String(p.link).slice(0, 500) : undefined,
        evidenceState: "not_started",
      }));

    const ldKeys = new Set(existingLeadership.map(l => dedupKey(l.title || "", l.organization || "")));
    const newLeadership = normalized.leadership
      .filter((l: any) => l.title && !ldKeys.has(dedupKey(l.title, l.organization || "")))
      .map((l: any) => ({
        id: uid(),
        title: String(l.title).slice(0, 200),
        organization: String(l.organization || "").slice(0, 200),
        duration: String(l.duration || "").slice(0, 100),
        teamSize: typeof l.team_size === "number" ? l.team_size : 0,
        evidenceState: "not_started",
      }));

    // Competitions — ONLY from competitions (not awards). Awards have their own home.
    const cpKeys = new Set(existingCompetitions.map(c => dedupKey(c.name || "", c.result || "")));
    const newCompetitions = normalized.competitions
      .filter((c: any) => c.name && !cpKeys.has(dedupKey(c.name, c.result || "")))
      .map((c: any) => ({
        id: uid(),
        name: String(c.name).slice(0, 200),
        level: ["school","regional","state","national","international"].includes(c.level) ? c.level : "school",
        result: String(c.result || "").slice(0, 200),
        evidenceState: "not_started",
      }));

    // Internships — pulled from experiences that look like internships/research
    const internshipExps = normalized.experiences.filter((e: any) =>
      /intern|research|lab|shadow|fellow|trainee|apprentice/i.test(`${e.title || ""} ${e.description || ""}`));
    const inKeys = new Set(existingInternships.map(i => dedupKey(i.title || "", i.organization || "")));
    const newInternships = internshipExps
      .filter((e: any) => e.title && !inKeys.has(dedupKey(e.title, e.organization || "")))
      .map((e: any) => ({
        id: uid(),
        title: String(e.title).slice(0, 200),
        organization: String(e.organization || "").slice(0, 200),
        duration: [e.start, e.end].filter(Boolean).join(" – ").slice(0, 100),
        outcome: String(e.description || "").slice(0, 500),
        evidenceState: "not_started",
      }));

    // Service / volunteering
    const svKeys = new Set(existingService.map(s => dedupKey(s.role || "", s.organization || "")));
    const newService = normalized.volunteer
      .filter((v: any) => v.role && !svKeys.has(dedupKey(v.role, v.organization || "")))
      .map((v: any) => ({
        id: uid(),
        role: String(v.role).slice(0, 200),
        organization: String(v.organization || "").slice(0, 200),
        hours: 0,
        impact: String(v.duration || "").slice(0, 300),
        evidenceState: "not_started",
      }));

    // Research outputs — projects with link OR awards/experiences that look like publications
    const isResearch = (p: any) => /paper|publication|journal|conference|preprint|arxiv|research/i.test(`${p.title || ""} ${p.description || ""} ${p.outcome || ""}`);
    const researchCandidates = [
      ...normalized.projects.filter(isResearch).map((p: any) => ({
        title: p.title, venue: p.outcome || "", role: "Author", link: p.link,
      })),
    ];
    const rsKeys = new Set(existingResearch.map(r => dedupKey(r.title || "", r.venue || "")));
    const newResearch = researchCandidates
      .filter((r: any) => r.title && !rsKeys.has(dedupKey(r.title, r.venue || "")))
      .map((r: any) => ({
        id: uid(),
        title: String(r.title).slice(0, 200),
        venue: String(r.venue || "").slice(0, 200),
        role: String(r.role || "Author").slice(0, 100),
        link: r.link ? String(r.link).slice(0, 500) : undefined,
        evidenceState: "not_started",
      }));

    if (outcomes) {
      await sb.from("outcomes_data").update({
        projects: [...existingProjects, ...newProjects],
        leadership_roles: [...existingLeadership, ...newLeadership],
        competitions: [...existingCompetitions, ...newCompetitions],
        internships: [...existingInternships, ...newInternships],
        service_roles: [...existingService, ...newService],
        research_outputs: [...existingResearch, ...newResearch],
      }).eq("user_id", user.id);
    } else {
      await sb.from("outcomes_data").insert({
        user_id: user.id,
        grade_level: "11",
        target_tier: "top-20",
        test_type: "none",
        test_score: "",
        courses: [],
        projects: newProjects,
        leadership_roles: newLeadership,
        competitions: newCompetitions,
        internships: newInternships,
        service_roles: newService,
        research_outputs: newResearch,
        task_states: {},
        follow_pathforge: true,
      });
    }

    // ---- Merge into admissions_data (only fill blanks) ----
    const ecSummary = [
      ...normalized.experiences.map((e: any) => `• ${e.title}${e.organization ? " — " + e.organization : ""}${e.description ? ": " + e.description : ""}`),
      ...normalized.leadership.map((l: any) => `• Leadership: ${l.title}${l.organization ? " — " + l.organization : ""}`),
      ...normalized.projects.map((p: any) => `• Project: ${p.title}${p.outcome ? " — " + p.outcome : ""}`),
      ...normalized.awards.map((a: any) => `• Award: ${a.title}${a.issuer ? " — " + a.issuer : ""}`),
    ].join("\n").slice(0, 4000);

    if (ecSummary.trim()) {
      const { data: existingAdm } = await sb.from("admissions_data")
        .select("id, extracurricular_details, extracurricular_level")
        .eq("user_id", user.id)
        .order("sequence_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingAdm) {
        const upd: any = {};
        if (!existingAdm.extracurricular_details?.trim()) upd.extracurricular_details = ecSummary;
        if (!existingAdm.extracurricular_level?.trim()) {
          const hasNational = normalized.competitions.some((c: any) => c.level === "national" || c.level === "international");
          upd.extracurricular_level = hasNational ? "national" : (normalized.leadership.length ? "regional" : "school");
        }
        if (Object.keys(upd).length) await sb.from("admissions_data").update(upd).eq("id", existingAdm.id);
      }
    }

    // ---- Pre-fill application_entries when empty ----
    const sectionsToFill: Array<{ id: string; text: string }> = [];
    if (normalized.experiences.length || normalized.leadership.length || normalized.projects.length) {
      sectionsToFill.push({ id: "extracurriculars", text: ecSummary });
    }
    if (normalized.awards.length) {
      sectionsToFill.push({
        id: "awards",
        text: normalized.awards.map((a: any) => `${a.title}${a.issuer ? " (" + a.issuer + ")" : ""}${a.date ? " — " + a.date : ""}`).join("\n"),
      });
    }
    const internships = normalized.experiences.filter((e: any) =>
      /intern|research|lab|shadow|fellow/i.test(`${e.title || ""} ${e.description || ""}`));
    if (internships.length) {
      sectionsToFill.push({
        id: "research",
        text: internships.map((e: any) => `${e.title}${e.organization ? " — " + e.organization : ""}${e.description ? ": " + e.description : ""}`).join("\n"),
      });
    }
    if (normalized.volunteer.length) {
      sectionsToFill.push({
        id: "volunteering",
        text: normalized.volunteer.map((v: any) => `${v.role}${v.organization ? " — " + v.organization : ""}${v.duration ? ` (${v.duration})` : ""}`).join("\n"),
      });
    }
    if (normalized.certifications.length || normalized.education.length) {
      const certText = normalized.certifications.map((c: any) => `${c.name}${c.issuer ? " — " + c.issuer : ""}${c.date ? ` (${c.date})` : ""}`).join("\n");
      const eduText = normalized.education.map((e: any) => `${e.school}${e.degree ? " — " + e.degree : ""}${e.field ? ", " + e.field : ""}`).join("\n");
      sectionsToFill.push({ id: "courses", text: [certText, eduText].filter(Boolean).join("\n") });
    }
    for (const s of sectionsToFill) {
      if (!s.text.trim()) continue;
      const { data: existing } = await sb.from("application_entries")
        .select("id, input_text").eq("user_id", user.id).eq("section_id", s.id).maybeSingle();
      if (!existing) {
        await sb.from("application_entries").insert({
          user_id: user.id, section_id: s.id, input_text: s.text,
        });
      } else if (!existing.input_text?.trim()) {
        await sb.from("application_entries").update({ input_text: s.text }).eq("id", existing.id);
      }
    }

    return json({
      ok: true,
      counts: {
        projects_added: newProjects.length,
        leadership_added: newLeadership.length,
        competitions_added: newCompetitions.length,
        internships_added: newInternships.length,
        service_added: newService.length,
        research_added: newResearch.length,
        awards_added: normalized.awards.length,
        certifications_added: normalized.certifications.length,
        application_sections_filled: sectionsToFill.length,
      },
      data: normalized,
    });
  } catch (e) {
    console.error("linkedin-extract error", e);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
