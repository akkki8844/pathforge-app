import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  isPrivate: boolean;
  createdAt: string;
  pushedAt: string;
  topics: string[];
}

/** Human-friendly title: "my-cool-app" -> "My Cool App" */
export function repoTitle(repo: GitHubRepo) {
  return repo.name
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function repoSummary(repo: GitHubRepo) {
  const bits = [repo.description?.trim(), repo.language ? `Built with ${repo.language}` : null]
    .filter(Boolean);
  return bits.join(" — ");
}

export function repoOutcome(repo: GitHubRepo) {
  const bits: string[] = [];
  if (repo.stars > 0) bits.push(`${repo.stars} GitHub star${repo.stars === 1 ? "" : "s"}`);
  if (repo.forks > 0) bits.push(`${repo.forks} fork${repo.forks === 1 ? "" : "s"}`);
  return bits.join(", ");
}

export function repoDuration(repo: GitHubRepo) {
  const start = new Date(repo.createdAt);
  const end = new Date(repo.pushedAt);
  const months = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)),
  );
  return `${months} month${months === 1 ? "" : "s"}`;
}

export function useGitHubRepos(auto = true) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<GitHubRepo[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setConnected(false);
        setRepos([]);
        return [];
      }
      const { data, error: fnError } = await supabase.functions.invoke("github-repos");
      if (fnError) throw fnError;
      const payload = data as { connected?: boolean; repos?: GitHubRepo[] };
      const list = payload?.repos ?? [];
      setConnected(Boolean(payload?.connected));
      setRepos(list);
      return list;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load GitHub repositories");
      setRepos([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auto) void refresh();
  }, [auto, refresh]);

  return { repos, connected, loading, error, refresh };
}
