import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type BragSheet = {
  id: string;
  user_id: string;
  title: string;
  intended_major: string | null;
  career_goals: string | null;
  top_accomplishments: string | null;
  challenges_overcome: string | null;
  character_traits: string | null;
  anecdotes: string | null;
  leadership_examples: string | null;
  community_impact: string | null;
  why_this_recommender: string | null;
  extra_context: string | null;
  last_pdf_artifact_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BragSheetInput = Partial<Omit<BragSheet, "id" | "user_id" | "created_at" | "updated_at">>;

const QK = ["brag_sheets"] as const;

export function useBragSheets() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: QK,
    queryFn: async (): Promise<BragSheet[]> => {
      const { data, error } = await (supabase as any)
        .from("brag_sheets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BragSheet[];
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ id, patch }: { id?: string; patch: BragSheetInput }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (id) {
        const { data, error } = await (supabase as any)
          .from("brag_sheets")
          .update(patch)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as BragSheet;
      }
      const { data, error } = await (supabase as any)
        .from("brag_sheets")
        .insert({ ...patch, user_id: user.id, title: patch.title ?? "My Brag Sheet" })
        .select()
        .single();
      if (error) throw error;
      return data as BragSheet;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: Error) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("brag_sheets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });

  const generatePdf = useMutation({
    mutationFn: async (sheet: BragSheet): Promise<{ url: string; artifactId: string }> => {
      const markdown = bragSheetToMarkdown(sheet);
      const { data, error } = await supabase.functions.invoke("generate-artifact-pdf", {
        body: { title: sheet.title || "Brag Sheet", markdown },
      });
      if (error) throw error;
      const artifact = (data as any)?.artifact;
      if (!artifact?.file_path) throw new Error("PDF generation failed");
      const { data: signed, error: signErr } = await supabase.storage
        .from("advisor-artifacts")
        .createSignedUrl(artifact.file_path, 600);
      if (signErr) throw signErr;
      // store last_pdf_artifact_id
      await (supabase as any)
        .from("brag_sheets")
        .update({ last_pdf_artifact_id: artifact.id })
        .eq("id", sheet.id);
      return { url: signed.signedUrl, artifactId: artifact.id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (e: Error) =>
      toast({ title: "Could not generate PDF", description: e.message, variant: "destructive" }),
  });

  return { list, upsert, remove, generatePdf };
}

function section(title: string, body: string | null | undefined): string {
  if (!body || !body.trim()) return "";
  return `## ${title}\n\n${body.trim()}\n\n`;
}

export function bragSheetToMarkdown(s: BragSheet): string {
  let md = `# ${s.title || "Brag Sheet"}\n\n`;
  md += section("Intended Major", s.intended_major);
  md += section("Career Goals", s.career_goals);
  md += section("Top Accomplishments", s.top_accomplishments);
  md += section("Challenges Overcome", s.challenges_overcome);
  md += section("Character Traits", s.character_traits);
  md += section("Stories & Anecdotes", s.anecdotes);
  md += section("Leadership Examples", s.leadership_examples);
  md += section("Community Impact", s.community_impact);
  md += section("Why This Recommender", s.why_this_recommender);
  md += section("Additional Context", s.extra_context);
  return md;
}

export const BRAG_STEPS = [
  {
    id: "basics",
    title: "The basics",
    description: "Set the stage with your direction.",
    fields: [
      { key: "title", label: "Title", placeholder: "My Brag Sheet — Ms. Chen", type: "input" },
      { key: "intended_major", label: "Intended major", placeholder: "Computer Science", type: "input" },
      { key: "career_goals", label: "Career goals", placeholder: "Build accessible learning tools.", type: "textarea" },
    ],
  },
  {
    id: "wins",
    title: "Your wins",
    description: "What are you most proud of?",
    fields: [
      { key: "top_accomplishments", label: "Top accomplishments", placeholder: "3-5 highlights with context.", type: "textarea" },
      { key: "leadership_examples", label: "Leadership examples", placeholder: "Where did you lead, and what changed?", type: "textarea" },
      { key: "community_impact", label: "Community impact", placeholder: "Who benefits from your work?", type: "textarea" },
    ],
  },
  {
    id: "character",
    title: "Who you are",
    description: "Give your recommender real stories to draw from.",
    fields: [
      { key: "character_traits", label: "Character traits", placeholder: "Curious, persistent, collaborative…", type: "textarea" },
      { key: "anecdotes", label: "Stories & anecdotes", placeholder: "Specific moments only you remember.", type: "textarea" },
      { key: "challenges_overcome", label: "Challenges you overcame", placeholder: "What did you learn from struggle?", type: "textarea" },
    ],
  },
  {
    id: "context",
    title: "For this letter",
    description: "Tailor what you want emphasized.",
    fields: [
      { key: "why_this_recommender", label: "Why this recommender", placeholder: "Why did you ask them specifically?", type: "textarea" },
      { key: "extra_context", label: "Anything else", placeholder: "Notes, themes to highlight, things to avoid.", type: "textarea" },
    ],
  },
] as const;
