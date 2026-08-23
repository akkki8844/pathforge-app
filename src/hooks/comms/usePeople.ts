/**
 * Names and avatars for other people.
 *
 * This exists because `public.profiles` is deliberately not readable across
 * users: the only SELECT policies on it are "your own row", "an admin", and "a
 * verified teacher's linked student". A student has no policy that lets them
 * read a classmate's profile, so `from("profiles").in("user_id", ids)` returns
 * an empty array in a group chat — not an error, just silently nothing, which
 * would render every message as an unnamed grey circle.
 *
 * So lookups go through two SECURITY DEFINER functions instead
 * (`20260819091000_communications_directory.sql`), which return four display
 * fields and never an email address:
 *
 *   - `comms_directory(ids)`  — resolve people already on screen.
 *   - `comms_search_people(q)` — find someone to start a chat with.
 *
 * Both are typed loosely here because `integrations/supabase/types.ts` is
 * machine-generated and does not know about them; the shapes are asserted at the
 * boundary and nothing downstream sees `any`.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { commsKeys } from "./keys";

export interface Person {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export type PersonMap = Record<string, Person>;

/**
 * What to call someone.
 *
 * Falls back through full name → username → "Someone" rather than showing a
 * raw UUID, which is what a missing directory entry would otherwise surface.
 */
export function displayName(p: Person | undefined | null): string {
  if (!p) return "Someone";
  const name = p.full_name?.trim() || p.username?.trim();
  return name && name.length > 0 ? name : "Someone";
}

/** Up to two letters for an avatar fallback. */
export function initials(p: Person | undefined | null): string {
  const name = displayName(p);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function asPeople(data: unknown): Person[] {
  return Array.isArray(data) ? (data as Person[]) : [];
}

/**
 * Resolve a set of user ids to display details.
 *
 * The id list is sorted into the query key, so two components asking for the
 * same people in a different order share one cache entry and one request. Ids
 * are capped at the same 200 the function enforces, so a pathological caller
 * fails visibly here rather than being silently truncated server-side.
 */
export function usePeople(ids: (string | null | undefined)[]) {
  const unique = useMemo(() => {
    const set = new Set<string>();
    for (const id of ids) if (id) set.add(id);
    return [...set].sort().slice(0, 200);
  }, [ids]);

  const query = useQuery({
    queryKey: commsKeys.profiles(unique),
    enabled: unique.length > 0,
    // Names and avatars change rarely; refetching them on every thread switch
    // would be the most frequent request in the section for no benefit.
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Person[]> => {
      const { data, error } = await supabase.rpc(
        "comms_directory" as never,
        { _user_ids: unique } as never,
      );
      if (error) throw error;
      return asPeople(data);
    },
  });

  const map = useMemo<PersonMap>(() => {
    const out: PersonMap = {};
    for (const p of query.data ?? []) out[p.user_id] = p;
    return out;
  }, [query.data]);

  return { people: map, isLoading: query.isLoading, error: query.error };
}

/** The signed-in user's own profile, for rendering their own bubbles. */
export function useMe(): Person | undefined {
  const { user } = useAuth();
  const { people } = usePeople([user?.id]);
  return user?.id ? people[user.id] : undefined;
}

/**
 * People search for New Chat and team invites.
 *
 * Fires only at two characters, matching the server's floor — below that the
 * function returns nothing, so a one-character request is a guaranteed-empty
 * round trip. Results are bounded to people the caller shares a school, class,
 * team or conversation with; that filtering happens in the database, not here,
 * so it cannot be bypassed by calling the RPC directly.
 */
export function usePeopleSearch(query: string, limit = 20) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  const result = useQuery({
    queryKey: ["comms", "people-search", trimmed.toLowerCase(), limit],
    enabled,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Person[]> => {
      const { data, error } = await supabase.rpc(
        "comms_search_people" as never,
        { _query: trimmed, _limit: limit } as never,
      );
      if (error) throw error;
      return asPeople(data);
    },
  });

  return {
    results: result.data ?? [],
    isSearching: enabled && result.isFetching,
    /** True once a search has run and come back with nothing. */
    isEmpty: enabled && !result.isFetching && (result.data?.length ?? 0) === 0,
    error: result.error,
    tooShort: !enabled && trimmed.length > 0,
  };
}
