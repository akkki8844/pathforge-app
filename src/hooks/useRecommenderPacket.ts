import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { bragSheetToMarkdown, type BragSheet } from "@/hooks/useBragSheets";
import type { Recommender } from "@/hooks/useRecommenders";

function header(title: string): string {
  return `## ${title}\n\n`;
}

function bullets(items: Array<string | null | undefined>): string {
  const cleaned = items.map((i) => (i ?? "").trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  return cleaned.map((i) => `- ${i}`).join("\n") + "\n\n";
}

function fmtJsonList(rows: any, getLine: (row: any) => string | null): string {
  if (!Array.isArray(rows)) return "";
  return bullets(rows.map(getLine));
}

function buildPacketMarkdown(args: {
  recommender: Recommender;
  profile: { full_name?: string | null; email?: string | null } | null;
  onboarding: any | null;
  outcomes: any | null;
  applicationEntries: Array<{ section_id: string; refined_text?: string | null; input_text?: string | null }>;
  bragSheet: BragSheet | null;
}): string {
  const { recommender, profile, onboarding, outcomes, applicationEntries, bragSheet } = args;
  const studentName = profile?.full_name?.trim() || "Student";
  const today = new Date().toLocaleDateString(undefined, { dateStyle: "long" });

  let md = `# Recommendation Packet — ${studentName}\n\n`;
  md += `_Prepared for ${recommender.name}${recommender.position ? `, ${recommender.position}` : ""}${recommender.school ? ` · ${recommender.school}` : ""}_\n\n`;
  md += `_Date: ${today}_\n\n`;
  md += `---\n\n`;

  // Snapshot
  md += header("Student snapshot");
  md += bullets([
    profile?.email ? `Email: ${profile.email}` : null,
    onboarding?.grade ? `Grade: ${onboarding.grade}` : null,
    onboarding?.high_school_name ? `School: ${onboarding.high_school_name}` : null,
    onboarding?.curriculum ? `Curriculum: ${onboarding.curriculum}` : null,
    onboarding?.country ? `Country: ${onboarding.country}` : null,
    onboarding?.intended_major ? `Intended major: ${onboarding.intended_major}` : null,
    onboarding?.career_direction ? `Career direction: ${onboarding.career_direction}` : null,
    onboarding?.gpa ? `GPA: ${onboarding.gpa}` : onboarding?.gpa_range ? `GPA range: ${onboarding.gpa_range}` : null,
    onboarding?.standardized_test_type && onboarding?.standardized_test_score
      ? `${onboarding.standardized_test_type}: ${onboarding.standardized_test_score}`
      : null,
    Array.isArray(onboarding?.target_universities) && onboarding.target_universities.length
      ? `Target universities: ${onboarding.target_universities.join(", ")}`
      : null,
    Array.isArray(onboarding?.areas_of_interest) && onboarding.areas_of_interest.length
      ? `Areas of interest: ${onboarding.areas_of_interest.join(", ")}`
      : null,
  ]);

  // Relationship
  md += header("Relationship to recommender");
  md += bullets([
    `Recommender: ${recommender.name}`,
    recommender.position ? `Role: ${recommender.position}` : null,
    recommender.subject ? `Subject taught / context: ${recommender.subject}` : null,
    recommender.school ? `Institution: ${recommender.school}` : null,
    recommender.relationship_duration ? `Known for: ${recommender.relationship_duration}` : null,
    recommender.notes ? `Notes: ${recommender.notes}` : null,
  ]);

  // Outcomes / Profile of work
  if (outcomes) {
    const sections: Array<[string, any, (r: any) => string | null]> = [
      ["Courses", outcomes.courses, (r) => [r?.name, r?.grade, r?.level].filter(Boolean).join(" — ") || null],
      ["Projects", outcomes.projects, (r) => [r?.title, r?.description].filter(Boolean).join(" — ") || null],
      ["Leadership roles", outcomes.leadership_roles, (r) => [r?.title, r?.organization, r?.description].filter(Boolean).join(" — ") || null],
      ["Competitions", outcomes.competitions, (r) => [r?.name, r?.result, r?.year].filter(Boolean).join(" — ") || null],
      ["Service", outcomes.service_roles, (r) => [r?.title, r?.organization, r?.description].filter(Boolean).join(" — ") || null],
      ["Internships", outcomes.internships, (r) => [r?.title, r?.organization, r?.description].filter(Boolean).join(" — ") || null],
      ["Research", outcomes.research_outputs, (r) => [r?.title, r?.description].filter(Boolean).join(" — ") || null],
      ["Creative works", outcomes.creative_works, (r) => [r?.title, r?.description].filter(Boolean).join(" — ") || null],
    ];
    const built = sections
      .map(([t, data, fn]) => {
        const body = fmtJsonList(data, fn);
        return body ? `### ${t}\n\n${body}` : "";
      })
      .filter(Boolean)
      .join("");
    if (built) {
      md += header("Profile of work");
      md += built;
    }
  }

  // Application entries
  if (applicationEntries.length > 0) {
    md += header("Application narrative");
    for (const e of applicationEntries) {
      const text = (e.refined_text || e.input_text || "").trim();
      if (!text) continue;
      md += `### ${e.section_id}\n\n${text}\n\n`;
    }
  }

  // Brag sheet
  if (bragSheet) {
    md += `---\n\n`;
    md += bragSheetToMarkdown(bragSheet);
  }

  md += `---\n\n_Generated by Pathforge for ${studentName}._\n`;
  return md;
}

export function useRecommenderPacket() {
  const qc = useQueryClient();

  const generate = useMutation({
    mutationFn: async (recommender: Recommender): Promise<{ url: string; artifactId: string }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Fetch in parallel
      const [profileRes, onboardingRes, outcomesRes, entriesRes, bragRes] = await Promise.all([
        supabase.from("profiles").select("full_name,email").eq("user_id", user.id).maybeSingle(),
        supabase.from("onboarding_data").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("outcomes_data").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("application_entries").select("section_id,input_text,refined_text").eq("user_id", user.id),
        (recommender as any).brag_sheet_id
          ? (supabase as any).from("brag_sheets").select("*").eq("id", (recommender as any).brag_sheet_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const markdown = buildPacketMarkdown({
        recommender,
        profile: profileRes.data as any,
        onboarding: onboardingRes.data,
        outcomes: outcomesRes.data,
        applicationEntries: (entriesRes.data ?? []) as any[],
        bragSheet: (bragRes.data as BragSheet | null) ?? null,
      });

      const title = `Recommendation Packet — ${recommender.name}`;
      const { data, error } = await supabase.functions.invoke("generate-artifact-pdf", {
        body: { title, markdown },
      });
      if (error) throw error;
      const artifact = (data as any)?.artifact;
      if (!artifact?.file_path) throw new Error("PDF generation failed");

      const { data: signed, error: signErr } = await supabase.storage
        .from("advisor-artifacts")
        .createSignedUrl(artifact.file_path, 600);
      if (signErr) throw signErr;

      await (supabase as any)
        .from("recommenders")
        .update({
          last_packet_artifact_id: artifact.id,
          last_packet_at: new Date().toISOString(),
        })
        .eq("id", recommender.id);

      return { url: signed.signedUrl, artifactId: artifact.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recommenders"] }),
    onError: (e: Error) =>
      toast({ title: "Could not generate packet", description: e.message, variant: "destructive" }),
  });

  return { generate };
}
