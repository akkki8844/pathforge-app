import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseFunctionError } from "@/lib/functionError";
import { safeExternalUrl } from "@/lib/safeUrl";
import type { Activity } from "@/lib/activities";

/**
 * Competitions found on the live web, on top of the curated set.
 *
 * The activities page ships a 7,670-line static array. That array is the floor,
 * not the ceiling: it is reliable and always present, but it cannot know about
 * a competition that opened last month. This hook is the ceiling.
 *
 * Nothing here can empty the page. Every failure path — discovery unconfigured,
 * search returned nothing, model refused, request rate-limited — resolves to an
 * empty list plus a reason, and the caller keeps rendering the curated set. A
 * discovery feature that can blank the page when it fails is worse than no
 * discovery feature.
 */

/** Why a refresh produced nothing, in words a student can act on. */
const REASON_COPY: Record<string, string> = {
  discovery_unavailable: "Live search is not configured, so this is the curated list.",
  search_failed: "Could not reach the web search just now. Showing the curated list.",
  no_results: "The web search found nothing new for this field.",
  malformed_ai: "Could not read the search results. Showing the curated list.",
  nothing_verifiable:
    "Nothing new passed verification — every result was missing a real deadline or a real link.",
};

export interface DiscoveryOutcome {
  added: number;
  cached: boolean;
  /** Present when the refresh legitimately found nothing. Not an error. */
  note?: string;
  /** Present only when the request itself failed. */
  error?: string;
}

/** Map a database row onto the Activity shape the page already renders. */
function rowToActivity(r: Record<string, unknown>): Activity {
  return {
    // Prefixed so a discovered row can never collide with a curated id, and so
    // the UI can tell where a card came from if it ever needs to.
    id: `discovered:${String(r.fingerprint ?? r.id)}`,
    name: String(r.name ?? ""),
    category: String(r.category ?? "Competition"),
    type: (r.type as Activity["type"]) ?? "Competition",
    cost: (r.cost as Activity["cost"]) ?? "Free",
    difficulty: (r.difficulty as Activity["difficulty"]) ?? "Intermediate",
    gradeSuitability: String(r.grade_suitability ?? "Grades 9-12"),
    description: String(r.description ?? ""),
    detailedDescription: String(r.detailed_description ?? r.description ?? ""),
    relevantMajors: Array.isArray(r.relevant_majors) ? (r.relevant_majors as string[]) : [],
    whyRelevant: String(r.why_relevant ?? ""),
    countries: Array.isArray(r.countries) ? (r.countries as string[]) : [],
    // These come from a model reading a crawled page, so they are untrusted
    // strings. Anything that is not http(s) — a javascript: or data: URI — is
    // dropped here rather than reaching an href or window.open().
    learnMoreUrl: safeExternalUrl(r.learn_more_url as string | null) ?? "",
    applyUrl: safeExternalUrl(r.apply_url as string | null),
    deadline: (r.deadline as string | undefined) ?? undefined,
    priorityFactors: {
      // Discovered entries carry no hand-assigned weighting. Mid values keep
      // them in the ranking without letting an unvetted result outrank a
      // curated one that a human scored.
      majorAlignment: 6,
      collegeImpact: 5,
      uniqueness: 6,
    },
  };
}

export function useDiscoveredActivities() {
  const [discovered, setDiscovered] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const discover = useCallback(
    async (field: string, country: string, force: boolean): Promise<DiscoveryOutcome> => {
      if (!field || field.trim().length < 2) {
        return { added: 0, cached: false, note: "Set your intended major to search for new competitions." };
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("refresh-activities", {
          body: { field, country, force },
        });

        if (error) {
          // supabase-js collapses every non-2xx into one message; the real one
          // is on error.context. Without this a rate-limit and a dead model
          // read identically to the student.
          const info = await parseFunctionError(error);

          /*
           * The function not being deployed is not a student-facing error.
           *
           * `refresh-activities` ships in the repo but reaches the live project
           * only when someone deploys it, and the rest of the page works
           * perfectly without it. Until then every refresh would raise a red
           * toast about a feature the student never asked for and cannot fix.
           * Treat "not found" as "discovery is off" and stay quiet.
           */
          if (info.status === 404 || /not found|does not exist/i.test(info.message)) {
            return { added: 0, cached: false };
          }
          return { added: 0, cached: false, error: info.message };
        }

        const rows = Array.isArray(data?.activities) ? data.activities : [];
        const mapped = rows.map((r: Record<string, unknown>) => rowToActivity(r));
        setDiscovered(mapped);

        return {
          added: mapped.length,
          cached: data?.cached === true,
          note: mapped.length === 0 ? (REASON_COPY[data?.reason] ?? "No new competitions found.") : undefined,
        };
      } catch (e) {
        return {
          added: 0,
          cached: false,
          error: e instanceof Error ? e.message : "Could not search for new competitions.",
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { discovered, loading, discover };
}
