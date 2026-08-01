import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify user authentication
async function verifyAuth(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.log("Auth failed: Missing or invalid authorization header");
    return { userId: null, error: "Missing authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("Auth failed: Server configuration error");
    return { userId: null, error: "Server configuration error" };
  }

  const token = authHeader.replace("Bearer ", "");
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error) {
    console.log("Auth error from getUser:", error.message);
    return { userId: null, error: "Unauthorized" };
  }

  if (!user) {
    console.log("Auth failed: No user returned");
    return { userId: null, error: "Unauthorized" };
  }

  console.log("Auth successful for user:", user.id);
  return { userId: user.id, error: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let creditClient: any = null;
  let creditConsumed = false;
  const refundCredit = async () => {
    if (!creditConsumed || !creditClient) return;
    try { await creditClient.rpc("refund_credit"); creditConsumed = false; } catch (_) { /* best-effort */ }
  };

  try {
    // Verify authentication first
    const { userId, error: authError } = await verifyAuth(req);
    if (authError || !userId) {
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get('Authorization')!;
    creditClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const rawBody = await req.text();
    if (rawBody.length > 50_000) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: any = {};
    try { parsed = JSON.parse(rawBody); } catch {}
    let { section, input, context, language } = parsed;

    if (!input || typeof input !== "string" || !input.trim()) {
      return new Response(
        JSON.stringify({ error: "Input text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    section = typeof section === "string" ? section.slice(0, 64) : "";
    input = input.slice(0, 15_000);
    if (typeof context === "string") context = context.slice(0, 2_000);

    // Fire-and-forget auto-moderation
    try {
      const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SERVICE) {
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/moderate-prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}`, apikey: SERVICE },
          body: JSON.stringify({ user_id: userId, feature: `refine-text:${section || "unknown"}`, prompt: input }),
        }).catch(() => {});
      }
    } catch { /* ignore */ }


    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { data: hasCredit, error: creditError } = await creditClient.rpc('consume_credit', { _feature_type: "refine_text" });
    if (creditError || !hasCredit) {
      return new Response(
        JSON.stringify({ error: "Daily credit limit reached. Please upgrade your plan." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    creditConsumed = true;

    // Determine the type of refinement needed
    const isLinkedIn = ['headline', 'about', 'experience', 'education', 'skills', 'posts'].includes(section);
    const isEssay = section.startsWith('essay-');
    
    // Get the appropriate system prompt
    let systemPrompt: string;
    if (isEssay) {
      systemPrompt = getEssayRefinementPrompt(section.replace('essay-', ''));
    } else if (isLinkedIn) {
      systemPrompt = getLinkedInRefinementPrompt(section);
    } else {
      systemPrompt = getApplicationRefinementPrompt(section);
    }
    if (typeof language === "string" && language && language !== "en") {
      systemPrompt += `\n\nOUTPUT LANGUAGE: Write the refined text in language code "${language}" (proper grammar and native script). Preserve proper nouns. Do not add an English version.`;
    }

    console.log(`Refining ${section} for user ${userId}, isLinkedIn: ${isLinkedIn}`);
    console.log(`Input length: ${input.trim().length} characters`);

    // Higher-quality model for high-stakes essays + Common App entries.
    // LinkedIn copy stays on the fast model since outputs are short.
    const accuracyModel = isEssay || (!isLinkedIn)
      ? "google/gemini-3.1-pro-preview"
      : "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: accuracyModel,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `REFINE THIS TEXT (do not add any new information):\n\n${input.trim()}`
          }
        ],
        max_tokens: 8000, // High limit for full essays
        temperature: isEssay ? 0.15 : 0.2, // Lower for essays — preserve voice
      }),
    });

    if (!response.ok) {
      await refundCredit();
      if (response.status === 429) {
        console.error("Rate limit hit");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "API credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let refinedText = data.choices?.[0]?.message?.content?.trim() || "";

    if (!refinedText) {
      throw new Error("No response from AI");
    }

    // Extensive post-processing to remove AI preambles and formatting
    refinedText = cleanAIResponse(refinedText);

    console.log(`Refined output length: ${refinedText.length} characters`);

    return new Response(
      JSON.stringify({ refined: refinedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("refine-text error:", error);
    await refundCredit();
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Clean AI response of any preambles or unnecessary formatting
function cleanAIResponse(text: string): string {
  // Remove common AI preambles
  const preamblePatterns = [
    /^(Here'?s?|Here is|I'?ve|I have|This is|The refined|Below is|Sure,?|Okay,?|Certainly,?|Of course,?|Absolutely,?|Great,?|Perfect,?|No problem,?)[^•\n]*[\n:]/gi,
    /^(Refined version|Refined text|Output|Result|Here you go|Let me|I'll|I can|I will)[^•\n]*[\n:]/gi,
    /^\*\*[^*]+\*\*\n*/g,  // Remove bold headers
    /^["']|["']$/g,        // Remove wrapping quotes
    /^#+\s+.+\n*/gm,       // Remove markdown headers
    /^---+\n*/gm,          // Remove horizontal rules
  ];
  
  let cleaned = text;
  for (const pattern of preamblePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Trim and ensure no leading/trailing whitespace issues
  cleaned = cleaned.trim();
  
  // If the result starts with a newline, remove it
  cleaned = cleaned.replace(/^\n+/, '');
  
  return cleaned;
}

// LinkedIn refinement prompts - STRICT NO HALLUCINATION
function getLinkedInRefinementPrompt(section: string): string {
  const sectionGuides: Record<string, string> = {
    headline: "Create a compelling LinkedIn headline (max 220 characters). Keep the user's actual role and status. Format naturally: Role | Focus | Strength. Do NOT upgrade their position.",
    about: "Write a professional About section (150-250 words). Use first person, confident tone. Keep ALL facts exactly as provided. Add no new achievements.",
    experience: "Format as professional bullet points with varied action verbs. Use • prefix. Include ONLY numbers/metrics the user mentioned. Never add budgets or team sizes.",
    education: "Polish into professional education entry (2-3 sentences). Keep exact school name, dates, and achievements mentioned. Add nothing new.",
    skills: "Organize skills professionally. Use format: Category: Skill • Skill • Skill. Only include skills they explicitly listed.",
    posts: "Create an engaging LinkedIn post. Maintain their story and message. Add 3-5 relevant hashtags at the end. Never add achievements they didn't mention.",
  };

  return `You are a professional text refiner. Your ONLY job is to improve the WORDING of what users write.

## CRITICAL RULES - VIOLATIONS ARE UNACCEPTABLE:
1. NEVER add ANY information the user did not provide
2. NEVER change their role or position (student stays student, intern stays intern, member stays member)
3. NEVER invent achievements, metrics, numbers, budgets, or outcomes
4. NEVER add research topics, publications, tools, or technologies not mentioned
5. NEVER fabricate team sizes, hours worked, or impact measurements
6. If their text is vague, make it SOUND better without adding specifics

## YOUR SPECIFIC TASK:
${sectionGuides[section] || sectionGuides.about}

## WHAT YOU ARE ALLOWED TO DO:
- Fix grammar, spelling, and punctuation
- Use stronger, more varied vocabulary
- Improve sentence structure and flow
- Make it sound more professional and polished
- Add transitions between ideas
- Rephrase awkward sentences

## STRICTLY FORBIDDEN:
- Starting sentences with clichés like "Passionate about", "Dedicated to", "Enthusiastic"
- Using the same sentence starter more than once
- Adding emojis (never — not even in posts)
- Creating lists when the user didn't use lists
- Inventing any concrete details

## OUTPUT FORMAT:
- Return ONLY the refined text
- No preambles like "Here's the refined text"
- No explanations or commentary
- No markdown formatting (except bullet points if appropriate)`;
}

// Application refinement prompts - EXTREME STRICTNESS BUT MUST ACTIVELY REWRITE
function getApplicationRefinementPrompt(section: string): string {
  const sectionGuides: Record<string, string> = {
    extracurriculars: "Common App activity slot (max 150 chars). Format: ROLE, ORGANIZATION — concrete weekly action + measurable outcome. Strong verb first. No filler adjectives.",
    "uc-activity": "UC Activity/Award entry (max 350 chars). Two short sentences: (1) what you did, (2) the result. Quantify when the user provided numbers.",
    research: "Research description (max 250 chars). Topic → method → outcome. Mention any paper, talk, conference, or competition the user listed verbatim.",
    awards: "Honor/award (max 100 chars). Award name, level (school/state/national/international), grade or year. No adjectives.",
    courses: "Coursework (max 150 chars). List the actual course names; one short clause on what they took away.",
    volunteering: "Service entry (max 350 chars). Org, role, frequency, what was done, the actual impact in their words.",
  };

  return `You are a college application text refiner. You MUST actively rewrite the text into a polished, application-ready entry. Adding punctuation alone is FAILURE.

## REFERENCE FORMAT — match this density and style (taken from a Stanford-admit Common App):
- "Research Intern, Dartmouth College — developed machine learning algorithms for colorectal cancer detection; published two first-authored papers at top ML conferences."
- "President, Machine Learning Club — led weekly meetings discussing research papers; grew membership by 13 students."
- "Vice-President, Model United Nations — increased club participation from 1 to 5 conferences per year."
- "ISEF Finalist, International, Grade 10."
- "Computational Linguistics Research (Self-Directed), Grade 11 Summer, 40 hr/wk × 12 wks — built a COVID-19 question-answering system; published a paper and gave 2 invited talks at ACL workshop."

Notice: short, factual, noun-led, no adjectives like "passionate" or "dedicated", every clause earns its space, every number/credential preserved exactly.

## ABSOLUTE RULES — VIOLATIONS = FAILURE:
1. The user's ROLE stays EXACTLY the same: member→member, participant→participant, volunteer→volunteer.
2. NEVER invent numbers, hours, percentages, dollar amounts, team sizes, or outcomes.
3. NEVER add tools, software, methodologies, conferences, or publications not in the input.
4. NEVER add findings, awards, or recognition not stated.
5. Every concrete detail in the output MUST be traceable to the input.

## YOU MUST:
1. Compress to a noun-led, verb-driven, fact-dense entry that fits within the limit.
2. Use strong verbs (led, built, organized, designed, presented, mentored, published, co-authored, increased, reduced, launched).
3. Drop hedging words ("kind of", "sort of", "tried to", "helped with").
4. Keep the user's quantification verbatim. If they wrote "3 hr/wk", keep "3 hr/wk".
5. Output should be noticeably more compelling AND shorter or equal to the input.

## SECTION-SPECIFIC TASK:
${sectionGuides[section] || sectionGuides.extracurriculars}

## EXAMPLES:

Input: "robotics club member, helped build robots and went to competitions"
Output: "Member, Robotics Club — built competition robots; competed in 4 regional tournaments."

Input: "i help at food bank every saturday"
Output: "Volunteer, Local Food Bank — sort and distribute donations weekly (4 hr/wk)."

Input: "president of cs club, ran meetings about coding"
Output: "President, Computer Science Club — ran weekly coding workshops; led club through year-long curriculum."

Input: "did research at a lab on cancer with my professor and we wrote a paper"
Output: "Research Intern (mentor: [Professor]) — investigated cancer; co-authored paper."

## OUTPUT:
- ONLY the refined text. No preamble, no quotes, no markdown headers.
- Do NOT start with "Here's", "Sure", "The refined", etc.`;
}

// Essay refinement prompts - PRESERVE VOICE, IMPROVE QUALITY
function getEssayRefinementPrompt(essayType: string): string {
  const typeGuides: Record<string, string> = {
    personal: "This is a Personal Statement. Focus on narrative flow, emotional authenticity, and showing rather than telling. Preserve the student's unique perspective.",
    "why-us": "This is a 'Why This College' essay. Improve specificity about the college while maintaining the student's genuine interest. Keep any specific programs, professors, or opportunities they mentioned.",
    activity: "This is an Activity Description. Make achievements sound impressive but accurate. Use action verbs and quantify impact only if numbers were provided.",
    challenge: "This is a Challenge/Failure essay. Preserve vulnerability and growth narrative. Focus on what they learned, not just what happened.",
    diversity: "This is a Diversity/Background essay. Maintain cultural authenticity and personal voice. Polish the writing without sanitizing their experience.",
    intellectual: "This is an Intellectual Curiosity essay. Enhance the passion and depth of thought. Keep specific examples and discoveries they mentioned.",
    community: "This is a Community/Leadership essay. Strengthen impact descriptions while keeping them grounded in reality."
  };

  return `You are a college admissions essay editor. Your goal is to make this essay BETTER while preserving the student's authentic voice.

## ESSAY TYPE:
${typeGuides[essayType] || "General college essay. Improve quality while maintaining authenticity."}

## CRITICAL RULES - DO NOT BREAK THESE:
1. PRESERVE the student's authentic voice and writing style
2. NEVER invent experiences, achievements, or details they didn't mention
3. NEVER add statistics, dollar amounts, or specific numbers unless they wrote them
4. NEVER change the core message or conclusion of their essay
5. Keep any specific names, places, or experiences exactly as written
6. If something is vague, make it CLEARER, not more specific with invented details

## WHAT YOU SHOULD IMPROVE:
- Fix grammar, spelling, and punctuation errors
- Improve sentence variety and flow
- Replace weak verbs with stronger ones
- Eliminate redundant words and phrases
- Strengthen transitions between paragraphs
- Tighten wordy sentences
- Make the opening more engaging (if needed)
- Ensure the conclusion resonates
- Replace clichés with more original language

## WHAT YOU SHOULD NOT DO:
- Add flowery or overly dramatic language
- Insert inspirational quotes
- Change factual details
- Make the essay longer than necessary
- Add reflections or lessons the student didn't express
- Use SAT vocabulary that doesn't match their voice

## FORMATTING:
- Return ONLY the improved essay text
- No preambles like "Here's your refined essay"
- No commentary or explanations
- Preserve paragraph structure
- Do not add headers or formatting`;
}
