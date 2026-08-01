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

interface AnalysisRequest {
  profileContent: string;
  hasProfilePhoto: boolean;
  targetCollege: string;
  intendedMajor: string;
  userActivities: string[];
}

// Server-side input validation
function validateAnalysisRequest(data: unknown): { valid: boolean; error?: string; data?: AnalysisRequest } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: "Invalid request body" };
  }
  
  const req = data as Record<string, unknown>;
  
  // Validate profileContent
  if (typeof req.profileContent !== 'string') {
    return { valid: false, error: "profileContent must be a string" };
  }
  if (req.profileContent.length > 50000) {
    return { valid: false, error: "profileContent exceeds maximum length of 50000 characters" };
  }
  
  // Validate hasProfilePhoto
  if (typeof req.hasProfilePhoto !== 'boolean') {
    return { valid: false, error: "hasProfilePhoto must be a boolean" };
  }
  
  // Validate targetCollege
  if (typeof req.targetCollege !== 'string') {
    return { valid: false, error: "targetCollege must be a string" };
  }
  if (req.targetCollege.length > 200) {
    return { valid: false, error: "targetCollege exceeds maximum length of 200 characters" };
  }
  
  // Validate intendedMajor
  if (typeof req.intendedMajor !== 'string') {
    return { valid: false, error: "intendedMajor must be a string" };
  }
  if (req.intendedMajor.length > 200) {
    return { valid: false, error: "intendedMajor exceeds maximum length of 200 characters" };
  }
  
  // Validate userActivities
  if (!Array.isArray(req.userActivities)) {
    return { valid: false, error: "userActivities must be an array" };
  }
  if (req.userActivities.length > 50) {
    return { valid: false, error: "userActivities exceeds maximum of 50 items" };
  }
  for (const activity of req.userActivities) {
    if (typeof activity !== 'string' || activity.length > 500) {
      return { valid: false, error: "Each activity must be a string under 500 characters" };
    }
  }
  
  return {
    valid: true,
    data: {
      profileContent: req.profileContent,
      hasProfilePhoto: req.hasProfilePhoto,
      targetCollege: req.targetCollege,
      intendedMajor: req.intendedMajor,
      userActivities: req.userActivities as string[]
    }
  };
}

// Deterministic scoring rubric - scores are calculated based on objective criteria
function calculateDeterministicRatings(content: string, hasPhoto: boolean, major: string) {
  const contentLower = content.toLowerCase();
  
  // Profile Photo Score (0-10)
  let photoScore = hasPhoto ? 7 : 3;
  
  // Headline Score - check for key elements
  let headlineScore = 5;
  const hasRole = contentLower.includes("student") || contentLower.includes("founder") || 
                  contentLower.includes("intern") || contentLower.includes("engineer") ||
                  contentLower.includes("researcher") || contentLower.includes("developer");
  const hasAspiration = contentLower.includes("aspiring") || contentLower.includes("passionate") ||
                        contentLower.includes("interested") || contentLower.includes("pursuing");
  const hasMajorMention = contentLower.includes(major.toLowerCase().split(" ")[0]);
  
  if (hasRole) headlineScore += 2;
  if (hasAspiration) headlineScore += 1;
  if (hasMajorMention) headlineScore += 2;
  headlineScore = Math.min(10, headlineScore);
  
  // About Score - check for length and key elements
  let aboutScore = 4;
  const hasAboutSection = contentLower.includes("about") || content.length > 500;
  const hasGoals = contentLower.includes("goal") || contentLower.includes("aim") || 
                   contentLower.includes("strive") || contentLower.includes("vision");
  const hasStory = content.length > 1000;
  const hasNumbers = /\d+/.test(content);
  
  if (hasAboutSection) aboutScore += 2;
  if (hasGoals) aboutScore += 1;
  if (hasStory) aboutScore += 2;
  if (hasNumbers) aboutScore += 1;
  aboutScore = Math.min(10, aboutScore);
  
  // Experience Score - check for concrete experience indicators
  let experienceScore = 4;
  const experienceKeywords = ["experience", "intern", "worked", "led", "managed", "created", 
                              "developed", "built", "organized", "founded", "co-founder"];
  const experienceMatches = experienceKeywords.filter(kw => contentLower.includes(kw)).length;
  const hasQuantifiedResults = /\d+%|\d+ (people|users|members|team)/i.test(content);
  const hasMultipleExperiences = (content.match(/\b(20\d{2}|present|current)\b/gi) || []).length >= 2;
  
  experienceScore += Math.min(3, experienceMatches);
  if (hasQuantifiedResults) experienceScore += 2;
  if (hasMultipleExperiences) experienceScore += 1;
  experienceScore = Math.min(10, experienceScore);
  
  // Skills Score - check for relevant skills
  let skillsScore = 4;
  const technicalSkills = ["python", "java", "javascript", "sql", "excel", "r", "matlab",
                           "machine learning", "data analysis", "research", "leadership"];
  const skillMatches = technicalSkills.filter(skill => contentLower.includes(skill)).length;
  const hasEndorsements = contentLower.includes("endorsement") || contentLower.includes("endorsed");
  
  skillsScore += Math.min(4, skillMatches);
  if (hasEndorsements) skillsScore += 1;
  if (skillMatches >= 5) skillsScore += 1;
  skillsScore = Math.min(10, skillsScore);
  
  // Calculate overall as weighted average
  const overallScore = Math.round(
    (photoScore * 0.1 + headlineScore * 0.2 + aboutScore * 0.25 + 
     experienceScore * 0.3 + skillsScore * 0.15) * 10
  ) / 10;
  
  return {
    profilePhoto: photoScore,
    headline: headlineScore,
    about: aboutScore,
    experience: experienceScore,
    skills: skillsScore,
    overall: Math.round(overallScore)
  };
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

    const liAuthHeader = req.headers.get('Authorization')!;
    creditClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: liAuthHeader } } }
    );

    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const validation = validateAnalysisRequest(requestBody);
    if (!validation.valid || !validation.data) {
      return new Response(
        JSON.stringify({ error: validation.error || "Invalid request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { profileContent, hasProfilePhoto, targetCollege, intendedMajor, userActivities } = validation.data;
    
    if (profileContent.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Please provide more profile content for analysis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { data: hasCredit, error: creditError } = await creditClient.rpc('consume_credits', { amount: 2, _feature_type: "linkedin_analysis" });
    if (creditError || !hasCredit) {
      return new Response(
        JSON.stringify({ error: "Daily credit limit reached. Please upgrade your plan." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    creditConsumed = true;

    // Calculate deterministic scores BEFORE calling AI
    const deterministicScores = calculateDeterministicRatings(profileContent, hasProfilePhoto, intendedMajor);

    const activitiesContext = userActivities.length > 0 
      ? `User activities from Pathforge: ${userActivities.slice(0, 10).join(", ")}`
      : "";

    // Truncate profile content if too long to avoid response truncation
    const maxContentLength = 8000;
    const truncatedContent = profileContent.length > maxContentLength 
      ? profileContent.substring(0, maxContentLength) + "\n[Content truncated for analysis]"
      : profileContent;

    // System prompt focuses on insights, not scoring (scores are deterministic)
    const systemPrompt = `You are a LinkedIn profile analyst for students applying to college. Analyze the profile and provide insights.

Target College: ${targetCollege}
Intended Major: ${intendedMajor}
Has Professional Photo: ${hasProfilePhoto}
${activitiesContext}

IMPORTANT: The numerical ratings are pre-calculated and will be provided separately. Your job is to provide QUALITATIVE insights only.

Return this exact JSON structure with SHORT responses (1-2 sentences each):

{
  "profileName": "Extract the person's name from the profile",
  "overallSummary": {
    "overview": "Brief 1-2 sentence overview of the profile",
    "strengthsAndWeaknesses": "Key strengths and areas for improvement",
    "collegeAlignment": "How well profile fits ${targetCollege} for ${intendedMajor}"
  },
  "sectionInsights": {
    "profilePhoto": {"content": "status", "working": "what's good", "missing": "what's missing", "suggestions": "how to improve", "collegeRelevance": "why it matters for ${targetCollege}"},
    "headline": {"content": "the headline text", "working": "what's good", "missing": "what's missing", "suggestions": "how to improve", "collegeRelevance": "why it matters"},
    "about": {"content": "summary of about section", "working": "what's good", "missing": "what's missing", "suggestions": "how to improve", "collegeRelevance": "why it matters"},
    "experience": {"content": "summary of experience", "working": "what's good", "missing": "what's missing", "suggestions": "how to improve", "collegeRelevance": "why it matters", "activityAlignment": "how it aligns with user activities"},
    "skills": {"content": "skills found", "working": "what's good", "missing": "what's missing", "suggestions": "how to improve", "collegeRelevance": "why it matters"},
    "posts": {"content": "posting activity", "working": "what's good", "missing": "what's missing", "suggestions": "how to improve", "collegeRelevance": "why it matters"}
  },
  "collegeAlignmentAnalysis": {
    "whatCollegeLooksFor": "What ${targetCollege} values in ${intendedMajor} applicants",
    "whereProfileAligns": "Where this profile meets those expectations",
    "whereProfileNeedsWork": "Gaps to address"
  },
  "improvementPlan": [
    {"area": "Section name", "issue": "specific problem", "whyItMatters": "impact on application", "howToFix": "concrete action"}
  ]
}

CRITICAL RULES:
1. Keep ALL text fields SHORT (under 100 words each)
2. Return ONLY valid JSON, no markdown code blocks
3. Be specific and actionable in suggestions
4. Reference ${targetCollege} and ${intendedMajor} in your analysis`;

    const userPrompt = `Analyze this LinkedIn profile content:\n\n${truncatedContent}`;

    console.log("Sending to AI, content length:", truncatedContent.length);
    console.log("Deterministic scores calculated:", JSON.stringify(deterministicScores));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0 // Ensure deterministic outputs
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      await refundCredit();
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let analysisContent = data.choices?.[0]?.message?.content;
    
    if (!analysisContent) {
      throw new Error("No analysis content received");
    }

    console.log("Raw response length:", analysisContent.length);

    // Clean up the response - remove markdown code blocks if present
    analysisContent = analysisContent.trim();
    if (analysisContent.startsWith("```json")) {
      analysisContent = analysisContent.slice(7);
    } else if (analysisContent.startsWith("```")) {
      analysisContent = analysisContent.slice(3);
    }
    if (analysisContent.endsWith("```")) {
      analysisContent = analysisContent.slice(0, -3);
    }
    analysisContent = analysisContent.trim();

    let analysis;
    try {
      analysis = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Content preview:", analysisContent.substring(0, 500));
      
      // Try to extract JSON from the response
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch {
          // Create a fallback response
          analysis = createFallbackAnalysis(profileContent, targetCollege, intendedMajor, hasProfilePhoto);
        }
      } else {
        analysis = createFallbackAnalysis(profileContent, targetCollege, intendedMajor, hasProfilePhoto);
      }
    }

    // ALWAYS override ratings with deterministic scores
    analysis.ratings = {
      profilePhoto: { 
        score: deterministicScores.profilePhoto, 
        explanation: getScoreExplanation("profilePhoto", deterministicScores.profilePhoto, hasProfilePhoto) 
      },
      headline: { 
        score: deterministicScores.headline, 
        explanation: getScoreExplanation("headline", deterministicScores.headline) 
      },
      about: { 
        score: deterministicScores.about, 
        explanation: getScoreExplanation("about", deterministicScores.about) 
      },
      experience: { 
        score: deterministicScores.experience, 
        explanation: getScoreExplanation("experience", deterministicScores.experience) 
      },
      skills: { 
        score: deterministicScores.skills, 
        explanation: getScoreExplanation("skills", deterministicScores.skills) 
      },
      overall: { 
        score: deterministicScores.overall, 
        explanation: getScoreExplanation("overall", deterministicScores.overall) 
      }
    };

    console.log("Analysis complete for:", analysis.profileName || "Profile");

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-linkedin function:", error);
    await refundCredit();
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getScoreExplanation(section: string, score: number, hasPhoto?: boolean): string {
  const explanations: Record<string, Record<string, string>> = {
    profilePhoto: {
      low: "Missing professional photo reduces credibility significantly",
      medium: "Photo present but could be more professional",
      high: "Professional photo enhances profile credibility"
    },
    headline: {
      low: "Headline lacks key elements like role, field, or aspirations",
      medium: "Headline shows role but could include more specific goals",
      high: "Strong headline with clear role, field, and aspirations"
    },
    about: {
      low: "About section is brief or missing key narrative elements",
      medium: "About section present with room for more compelling storytelling",
      high: "Comprehensive about section with clear goals and story"
    },
    experience: {
      low: "Limited experience entries or lacking quantified achievements",
      medium: "Good experience but could use more metrics and impact statements",
      high: "Strong experience section with quantified results and clear impact"
    },
    skills: {
      low: "Few relevant skills listed for target field",
      medium: "Good skills coverage with room for more endorsements",
      high: "Comprehensive skills aligned with target field"
    },
    overall: {
      low: "Profile needs significant improvements across multiple sections",
      medium: "Solid foundation with specific areas to strengthen",
      high: "Well-rounded profile that effectively showcases qualifications"
    }
  };

  const levels = explanations[section] || explanations.overall;
  if (score <= 4) return levels.low;
  if (score <= 7) return levels.medium;
  return levels.high;
}

function createFallbackAnalysis(content: string, targetCollege: string, intendedMajor: string, hasPhoto: boolean) {
  return {
    profileName: "Profile",
    overallSummary: {
      overview: "This profile shows potential for improvement in several key areas.",
      strengthsAndWeaknesses: "Analysis limited due to content format. Focus on adding specific achievements and experiences.",
      collegeAlignment: `Continue developing content relevant to ${intendedMajor} and ${targetCollege}.`
    },
    sectionInsights: {
      profilePhoto: {
        content: hasPhoto ? "Photo present" : "No photo detected",
        working: hasPhoto ? "Having a photo adds credibility" : "N/A",
        missing: hasPhoto ? "Ensure it's professional" : "Add a professional headshot",
        suggestions: "Use a high-quality, professional headshot with neutral background",
        collegeRelevance: "Professional appearance matters for networking and internships"
      },
      headline: {
        content: "Review your headline for clarity",
        working: "Having a headline is a good start",
        missing: "Consider adding specific interests or goals",
        suggestions: `Add your ${intendedMajor} focus and career aspirations`,
        collegeRelevance: `${targetCollege} admissions look for focused, driven students`
      },
      about: {
        content: "About section could be expanded",
        working: "Having content shows initiative",
        missing: "Add your story, goals, and unique perspective",
        suggestions: "Write 3-4 paragraphs about your journey and aspirations",
        collegeRelevance: "Shows communication skills valued by admissions"
      },
      experience: {
        content: "Experience section needs development",
        working: "Any experience is valuable",
        missing: "Add quantified achievements and impact",
        suggestions: "Use action verbs and include specific results",
        collegeRelevance: "Demonstrates initiative and real-world application",
        activityAlignment: "Align with your tracked activities"
      },
      skills: {
        content: "Skills section needs attention",
        working: "Listing skills shows self-awareness",
        missing: "Add more field-specific skills",
        suggestions: `Include skills relevant to ${intendedMajor}`,
        collegeRelevance: "Shows preparedness for your intended field"
      },
      posts: {
        content: "Limited or no posting activity",
        working: "Quality over quantity matters",
        missing: "Regular, thoughtful posts increase visibility",
        suggestions: "Share insights about your field of interest",
        collegeRelevance: "Active engagement shows genuine interest"
      }
    },
    collegeAlignmentAnalysis: {
      whatCollegeLooksFor: `${targetCollege} values students with demonstrated passion for ${intendedMajor}, leadership potential, and clear goals.`,
      whereProfileAligns: "Shows initiative in creating a professional presence.",
      whereProfileNeedsWork: "Add more specific achievements, experiences, and content that demonstrates passion for your field."
    },
    improvementPlan: [
      {
        area: "Profile Photo",
        issue: hasPhoto ? "Ensure photo is professional" : "Missing professional photo",
        whyItMatters: "First impression for recruiters and admissions",
        howToFix: "Get a professional headshot with neutral background"
      },
      {
        area: "Headline",
        issue: "Could be more specific",
        whyItMatters: "Immediately communicates your focus",
        howToFix: `Include: [Role] | ${intendedMajor} | [Key Strength]`
      },
      {
        area: "Experience",
        issue: "Needs more detail and quantification",
        whyItMatters: "Shows impact and results",
        howToFix: "Add metrics, outcomes, and specific responsibilities"
      }
    ]
  };
}
