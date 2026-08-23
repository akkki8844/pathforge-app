import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CollegeNewsItem {
  id: string;
  source: string;
  title: string;
  url: string;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
}

/**
 * The Dashboard's news feed. `college_news` is filled once a day by the
 * fetch-college-news cron function, not by anything the client writes, so a
 * long staleTime is correct rather than a performance shortcut — refetching
 * every page load would only ever return the same rows until tomorrow's run.
 *
 * `college_news` predates the generated Supabase types (hand-added tables are
 * erased on the next `supabase gen types` re-run, same issue Routine solved
 * with its own typed client) — cast the table name rather than wiring a whole
 * second typed client for one read-only panel.
 */
export function useCollegeNews(limit = 8) {
  return useQuery({
    queryKey: ["college-news", limit],
    queryFn: async (): Promise<CollegeNewsItem[]> => {
      const { data, error } = await supabase
        .from("college_news" as never)
        .select("id, source, title, url, summary, image_url, published_at")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as CollegeNewsItem[];
    },
    staleTime: 1000 * 60 * 60 * 6,
    retry: 1,
  });
}
