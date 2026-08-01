import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify user authentication using getClaims (works with signing-keys system)
async function verifyAuth(req: Request): Promise<{ authorized: boolean; userId?: string; isGuest?: boolean }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith("Bearer ")) {
    console.log("Auth failed: Missing or invalid authorization header");
    return { authorized: false };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("Auth failed: Server configuration error");
    return { authorized: false };
  }

  const token = authHeader.replace("Bearer ", "");
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Validate the JWT by passing token directly to getUser
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error) {
    console.log("Auth error from getUser:", error.message);
    return { authorized: false };
  }

  if (!user) {
    console.log("Auth failed: No user returned");
    return { authorized: false };
  }

  const userId = user.id;
  const isAnonymous = user.is_anonymous === true;

  console.log("Authenticated user:", userId, "isGuest:", isAnonymous);
  return { authorized: true, userId, isGuest: isAnonymous };
}

// Server-side input validation for report card analysis
interface ExtractRequest {
  action: "extract";
  pdfBase64: string;
}

interface AnalyzeRequest {
  action: "analyze";
  reportCardText: string;
  intendedMajor: string;
  targetUniversities?: string;
  shortTermGoals?: string;
}

function validateExtractRequest(data: Record<string, unknown>): { valid: boolean; error?: string } {
  if (typeof data.pdfBase64 !== 'string') {
    return { valid: false, error: "pdfBase64 must be a string" };
  }
  // Limit PDF size to ~10MB base64 encoded
  if (data.pdfBase64.length > 15000000) {
    return { valid: false, error: "PDF file too large (max 10MB)" };
  }
  return { valid: true };
}

function validateAnalyzeRequest(data: Record<string, unknown>): { valid: boolean; error?: string } {
  if (typeof data.reportCardText !== 'string') {
    return { valid: false, error: "reportCardText must be a string" };
  }
  if (data.reportCardText.length > 50000) {
    return { valid: false, error: "reportCardText exceeds maximum length of 50000 characters" };
  }
  
  if (typeof data.intendedMajor !== 'string') {
    return { valid: false, error: "intendedMajor must be a string" };
  }
  if (data.intendedMajor.length > 200) {
    return { valid: false, error: "intendedMajor exceeds maximum length of 200 characters" };
  }
  
  if (data.targetUniversities !== undefined && typeof data.targetUniversities !== 'string') {
    return { valid: false, error: "targetUniversities must be a string" };
  }
  if (typeof data.targetUniversities === 'string' && data.targetUniversities.length > 1000) {
    return { valid: false, error: "targetUniversities exceeds maximum length of 1000 characters" };
  }
  
  if (data.shortTermGoals !== undefined && typeof data.shortTermGoals !== 'string') {
    return { valid: false, error: "shortTermGoals must be a string" };
  }
  if (typeof data.shortTermGoals === 'string' && data.shortTermGoals.length > 1000) {
    return { valid: false, error: "shortTermGoals exceeds maximum length of 1000 characters" };
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.authorized) {
      console.log("Unauthorized request attempted");
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please sign in to use this feature." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("Request authorized for user:", auth.userId, "isGuest:", auth.isGuest);

    // Server-side credit check
    const rcAuthHeader = req.headers.get('Authorization')!;
    const creditClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: rcAuthHeader } } }
    );
    const { data: hasCredit, error: creditError } = await creditClient.rpc('consume_credits', { amount: 2, _feature_type: "report_card" });
    if (creditError || !hasCredit) {
      return new Response(
        JSON.stringify({ error: "Daily credit limit reached. Please upgrade your plan." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let requestBody: Record<string, unknown>;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate action field
    if (typeof requestBody.action !== 'string' || !['extract', 'analyze'].includes(requestBody.action)) {
      return new Response(
        JSON.stringify({ error: "action must be 'extract' or 'analyze'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { action, pdfBase64, reportCardText, intendedMajor, targetUniversities, shortTermGoals } = requestBody as {
      action: string;
      pdfBase64?: string;
      reportCardText?: string;
      intendedMajor?: string;
      targetUniversities?: string;
      shortTermGoals?: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (action === "extract") {
      // Validate extract request
      const extractValidation = validateExtractRequest(requestBody);
      if (!extractValidation.valid) {
        return new Response(
          JSON.stringify({ error: extractValidation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Extract text from PDF using AI vision
      console.log("Extracting text from PDF...");
      
      const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert at extracting academic data from student report cards. 
Extract ALL academic information from this report card including:
- Subject names and grades/marks
- GPA or cumulative scores if present
- Teacher remarks or comments
- Grade level and term/semester info
- Any conduct or effort grades

Format the output as clear, structured text. Be thorough but concise.`
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${pdfBase64}`
                  }
                },
                {
                  type: "text",
                  text: "Extract all academic information from this report card. List each subject with its grade, any GPA/overall score, and any teacher remarks."
                }
              ]
            }
          ],
          temperature: 0,
        }),
      });

      if (!extractionResponse.ok) {
        const errorText = await extractionResponse.text();
        console.error("Extraction API error:", extractionResponse.status, errorText);
        
        if (extractionResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        throw new Error(`Extraction failed: ${extractionResponse.status}`);
      }

      const extractionData = await extractionResponse.json();
      const extractedText = extractionData.choices?.[0]?.message?.content || "";

      console.log("Extraction complete, text length:", extractedText.length);

      return new Response(JSON.stringify({ extractedText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "analyze") {
      // Validate analyze request
      const analyzeValidation = validateAnalyzeRequest(requestBody);
      if (!analyzeValidation.valid) {
        return new Response(
          JSON.stringify({ error: analyzeValidation.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("Analyzing report card for major:", intendedMajor);
      
      const truncatedText = (reportCardText || "").substring(0, 6000);

      const systemPrompt = `You are an expert college admissions counselor analyzing a student's report card. 
The student is aged 13-18 and aiming for: ${intendedMajor}
${targetUniversities ? `Target universities/countries: ${targetUniversities}` : ""}
${shortTermGoals ? `Short-term goals: ${shortTermGoals}` : ""}

Analyze the report card and provide a STRUCTURED assessment. Be encouraging but honest.

IMPORTANT: Return ONLY valid JSON with this exact structure:
{
  "summary": "2-3 sentence executive summary the student can read first",
  "academicStrengths": ["3-5 specific strengths aligned with their major"],
  "riskAreas": ["2-4 areas that need improvement for college readiness"],
  "recommendations": ["4-6 actionable recommendations for the next year"],
  "alignmentScore": "Strong" or "Moderate" or "Needs Work",
  "alignmentExplanation": "1-2 sentence explanation of the alignment score",
  "extractedData": {
    "subjects": ["list of subjects found"],
    "gpa": "GPA if found or null",
    "remarks": "summary of teacher remarks or null"
  },
  "pillars": {
    "academics": 0-100 integer,
    "rigor": 0-100 integer,
    "majorAlignment": 0-100 integer,
    "growth": 0-100 integer,
    "ecReadiness": 0-100 integer
  },
  "subjectScores": [
    { "subject": "Math", "rawGrade": "the exact grade as it appears on the report card (e.g. 'A-', '87', '87%', 'B+')", "score": 0-100 integer, "trend": "up" | "flat" | "down", "note": "1 short sentence" }
  ],
  "actionPlan": [
    { "title": "short action title", "why": "1 sentence reason", "horizon": "This Month" | "This Quarter" | "This Year", "priority": "High" | "Medium" | "Low" }
  ],
  "collegeFit": [
    { "university": "name from target list", "fit": "Reach" | "Match" | "Safety", "notes": "1 short sentence" }
  ]
}

Guidelines:
- Keep each bullet point under 50 words
- Be specific to their intended major
- Include subject-specific advice
- Suggest relevant extracurriculars, competitions, or courses
- Consider course rigor recommendations (AP/IB/honors)
- Be age-appropriate and encouraging
- subjectScores: cover every subject found (cap at 10)
- actionPlan: return 5-8 items mixing horizons and priorities
- collegeFit: empty array if no target universities provided
- All numeric scores must be integers between 0 and 100`;

      const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Here is the student's report card:\n\n${truncatedText}\n\nProvide the college readiness analysis as JSON.` }
          ],
          temperature: 0,
        }),
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error("Analysis API error:", analysisResponse.status, errorText);
        
        if (analysisResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (analysisResponse.status === 402) {
          return new Response(JSON.stringify({ error: "API credits exhausted. Please try again later." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        throw new Error(`Analysis failed: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      let content = analysisData.choices?.[0]?.message?.content || "";

      console.log("Raw analysis response length:", content.length);

      // Clean markdown formatting
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      let analysis;
      try {
        analysis = JSON.parse(content);
      } catch (parseError) {
        console.error("JSON parse error, attempting extraction...", parseError);
        
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            analysis = JSON.parse(jsonMatch[0]);
          } catch {
            console.error("Failed to extract JSON");
          }
        }
        
        // Fallback analysis
        if (!analysis) {
          analysis = {
            academicStrengths: [
              "Shows academic engagement across multiple subjects",
              "Demonstrates consistent effort in coursework",
              "Has foundational skills for further development"
            ],
            riskAreas: [
              "Consider strengthening subjects related to " + intendedMajor,
              "Review opportunities for advanced coursework"
            ],
            recommendations: [
              "Focus on core subjects aligned with " + intendedMajor,
              "Explore extracurricular activities in your field of interest",
              "Consider taking more rigorous courses if available",
              "Build relationships with teachers for strong recommendations"
            ],
            alignmentScore: "Moderate",
            alignmentExplanation: "Your academic record shows potential for pursuing " + intendedMajor + ". Focus on strengthening relevant subjects and gaining practical experience.",
            extractedData: {
              subjects: [],
              gpa: null,
              remarks: null
            }
          };
        }
      }

      // Validate and ensure required fields
      analysis.academicStrengths = analysis.academicStrengths || [];
      analysis.riskAreas = analysis.riskAreas || [];
      analysis.recommendations = analysis.recommendations || [];
      analysis.alignmentExplanation = analysis.alignmentExplanation || "Analysis based on available academic data.";
      analysis.extractedData = analysis.extractedData || { subjects: [], gpa: null, remarks: null };
      analysis.summary = typeof analysis.summary === "string" ? analysis.summary : "";

      const clamp = (n: unknown) => {
        const v = Math.round(Number(n));
        if (!Number.isFinite(v)) return 0;
        return Math.max(0, Math.min(100, v));
      };

      // ── DETERMINISTIC SCORING ────────────────────────────────────────
      // The AI gave per-subject grade signals; we recompute every numeric
      // pillar in code from the report text + extracted subjects so the
      // same input always produces the same output. No more 45 → 70 jumps.

      // 1. Per-subject scores: parse rawGrade-like signals (letter or %).
      const gradeToScore = (raw: string): number | null => {
        const s = String(raw || "").trim().toUpperCase();
        if (!s) return null;
        // Percentage like "85" or "85%" or "85/100"
        const pctMatch = s.match(/(\d{1,3})(?:\s*%|\s*\/\s*100)?/);
        if (pctMatch) {
          const n = parseInt(pctMatch[1], 10);
          if (n >= 0 && n <= 100) return n;
        }
        // Letter grades
        const letterMap: Record<string, number> = {
          "A+": 97, "A": 93, "A-": 90,
          "B+": 87, "B": 83, "B-": 80,
          "C+": 77, "C": 73, "C-": 70,
          "D+": 67, "D": 63, "D-": 60,
          "F": 50,
        };
        for (const k of Object.keys(letterMap).sort((a, b) => b.length - a.length)) {
          if (s.startsWith(k)) return letterMap[k];
        }
        return null;
      };

      const aiSubjects = Array.isArray(analysis.subjectScores) ? analysis.subjectScores : [];
      const subjectScores = aiSubjects.slice(0, 10).map((s: any) => {
        const fromGrade = gradeToScore(s?.rawGrade ?? s?.grade ?? "");
        const score = fromGrade !== null ? fromGrade : clamp(s?.score);
        return {
          subject: String(s?.subject ?? "").slice(0, 60),
          score,
          trend: ["up", "flat", "down"].includes(s?.trend) ? s.trend : "flat",
          note: typeof s?.note === "string" ? s.note.slice(0, 200) : "",
        };
      });
      analysis.subjectScores = subjectScores;

      // 2. Academics = mean of subject scores
      const avg = (arr: number[]) =>
        arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      const academics = subjectScores.length > 0
        ? avg(subjectScores.map((s) => s.score))
        : clamp((analysis.pillars || {}).academics);

      // 3. Rigor = derived from AP/IB/Honors/Advanced mentions in text
      const text = (reportCardText || "").toLowerCase();
      const rigorHits =
        (text.match(/\bap\b|advanced placement/g) || []).length +
        (text.match(/\bib\b|international baccalaureate|higher level|\bhl\b/g) || []).length +
        (text.match(/honou?rs|honor roll|advanced/g) || []).length;
      const rigor = rigorHits === 0 ? Math.max(40, academics - 15) : Math.min(100, 55 + rigorHits * 8);

      // 4. Major alignment = mean of subjects whose name matches major keywords
      const majorWords = String(intendedMajor || "")
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 3);
      const majorAligned = subjectScores.filter((s) =>
        majorWords.some((w) => s.subject.toLowerCase().includes(w))
      );
      const majorAlignment = majorAligned.length > 0
        ? avg(majorAligned.map((s) => s.score))
        : academics; // fall back to overall academics

      // 5. Growth = trend-derived
      const trendVals = subjectScores.map((s) =>
        s.trend === "up" ? 1 : s.trend === "down" ? -1 : 0
      );
      const trendMean = trendVals.length === 0 ? 0 : trendVals.reduce((a, b) => a + b, 0) / trendVals.length;
      const growth = Math.max(0, Math.min(100, Math.round(60 + trendMean * 25)));

      // 6. EC readiness has no signal in a report card; derive from academics
      const ecReadiness = Math.max(30, Math.min(95, academics - 10));

      analysis.pillars = { academics, rigor, majorAlignment, growth, ecReadiness };

      // 7. Alignment score derived from pillars (deterministic)
      const overall = avg([academics, rigor, majorAlignment]);
      analysis.alignmentScore = overall >= 80 ? "Strong" : overall >= 65 ? "Moderate" : "Needs Work";

      analysis.actionPlan = Array.isArray(analysis.actionPlan)
        ? analysis.actionPlan.slice(0, 10).map((a: any) => ({
            title: String(a?.title ?? "").slice(0, 120),
            why: typeof a?.why === "string" ? a.why.slice(0, 240) : "",
            horizon: ["This Month", "This Quarter", "This Year"].includes(a?.horizon) ? a.horizon : "This Quarter",
            priority: ["High", "Medium", "Low"].includes(a?.priority) ? a.priority : "Medium",
          }))
        : [];
      analysis.collegeFit = Array.isArray(analysis.collegeFit)
        ? analysis.collegeFit.slice(0, 10).map((c: any) => ({
            university: String(c?.university ?? "").slice(0, 120),
            fit: ["Reach", "Match", "Safety"].includes(c?.fit) ? c.fit : "Match",
            notes: typeof c?.notes === "string" ? c.notes.slice(0, 200) : "",
          }))
        : [];

      console.log("Analysis complete");

      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Error in analyze-report-card function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
