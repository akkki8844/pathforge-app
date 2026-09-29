/**
 * Every university in the world we have a record of, not just the curated set.
 *
 * `colleges.ts` is hand-curated: about a thousand schools with tiers, strong
 * majors and admissions data, concentrated in the countries most students
 * apply to. It had nothing for Russia and most of the rest of the world, so a
 * student there met an empty picker. This module adds the open
 * university-domains-list dataset (about 10,000 institutions in 200 countries,
 * MIT licensed) underneath it.
 *
 * The data is a static file in public/data, fetched on demand (~550 kB raw,
 * ~150 kB over the wire) the first time a picker needs it, so nothing else pays for it. Curated
 * schools always come first and keep their richer data; a world entry that
 * names a curated school is dropped rather than shown twice.
 */
import { useEffect, useState } from "react";
import { colleges, findCollegeByName } from "@/lib/colleges";
import { canonicalCountry } from "@/lib/countries";

export interface WorldUniversity {
  name: string;
  country: string;
  /** Primary web domain, used for the logo. May be empty. */
  domain: string;
}

interface WorldFile {
  countries: string[];
  universities: [string, number, string][];
}

let cache: WorldUniversity[] | null = null;
let pending: Promise<WorldUniversity[]> | null = null;
const DOMAIN_BY_NAME = new Map<string, string>();

/** Load (once) and return every world university. */
export function loadWorldUniversities(): Promise<WorldUniversity[]> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch("/data/world-universities.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<WorldFile>;
      })
      .then((file) => {
        const list = file.universities.map(([name, ci, domain]) => ({
          name,
          country: file.countries[ci],
          domain,
        }));
        for (const u of list) {
          const key = u.name.toLowerCase();
          if (u.domain && !DOMAIN_BY_NAME.has(key)) DOMAIN_BY_NAME.set(key, u.domain);
        }
        cache = list;
        return list;
      })
      .catch((err) => {
        // A failed chunk load should not break the picker; the curated list
        // still works. Clear the promise so the next open can retry.
        pending = null;
        console.warn("world universities failed to load", err);
        return [];
      });
  }
  return pending;
}

/** The world list, or null until it has loaded. Starts the load on mount. */
export function useWorldUniversities(enabled = true): WorldUniversity[] | null {
  const [list, setList] = useState<WorldUniversity[] | null>(cache);
  useEffect(() => {
    if (!enabled || cache) {
      if (cache) setList(cache);
      return;
    }
    let live = true;
    loadWorldUniversities().then((l) => live && setList(l));
    return () => {
      live = false;
    };
  }, [enabled]);
  return list;
}

/** Logo domain for a world university name, once the list has loaded. */
export function worldUniversityDomain(name: string): string | null {
  return DOMAIN_BY_NAME.get(name.trim().toLowerCase()) ?? null;
}

const LEVEL_ORDER = { global: 0, national: 1, regional: 2 } as const;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Curated schools' domains, so a world row for the same school under another name is dropped. */
const CURATED_HOSTS = new Set(colleges.map((c) => hostOf(c.website)).filter(Boolean));

/**
 * University names for the given countries: curated schools first (most
 * selective first), then every other institution in those countries A to Z.
 * With no countries, returns everything, curated first.
 */
export function universityNamesFor(countries: string[], world: WorldUniversity[] | null): string[] {
  const wanted = new Set(countries.map(canonicalCountry));
  const inScope = (country: string) => wanted.size === 0 || wanted.has(canonicalCountry(country));

  const curated = colleges
    .filter((c) => inScope(c.country))
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.name.localeCompare(b.name));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of curated) {
    const key = c.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c.name);
  }

  if (world) {
    const rest: string[] = [];
    for (const u of world) {
      if (!inScope(u.country)) continue;
      const key = u.name.toLowerCase();
      if (seen.has(key) || findCollegeByName(u.name) || (u.domain && CURATED_HOSTS.has(u.domain))) continue;
      seen.add(key);
      rest.push(u.name);
    }
    rest.sort((a, b) => a.localeCompare(b));
    out.push(...rest);
  }
  return out;
}
