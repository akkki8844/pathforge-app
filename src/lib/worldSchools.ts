/**
 * High schools worldwide, beyond the curated list in `schools.ts`.
 *
 * The curated list is a few hundred well-known schools, mostly in the US, UK
 * and India, so a student in Russia or most other countries could not find
 * their school and had to type it in by hand. This adds the secondary schools
 * recorded in Wikidata (CC0): high schools, secondary schools, lyceums,
 * gymnasiums, grammar, international, boarding and independent schools, in
 * every country Wikidata covers. See scripts/build-world-data.py.
 *
 * Like the university list it is a static file in public/data (~4 MB raw,
 * ~0.9 MB over the wire), fetched only when a student focuses the school box.
 * It is fetched rather than imported so the bundler and the type checker never
 * have to process it.
 */
import { useEffect, useState } from "react";
import type { School } from "@/lib/schools";

interface SchoolFile {
  countries: string[];
  /** [name, country index, city] */
  schools: [string, number, string][];
}

interface Indexed extends School {
  /** Lowercased, accent-stripped name + city + country, for matching. */
  haystack: string;
  /** The same, name only, for ranking. */
  folded: string;
}

let cache: Indexed[] | null = null;
let pending: Promise<Indexed[]> | null = null;

/** Lowercase and strip accents, so "lycee" finds "Lycée". */
export function foldForSearch(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function loadWorldSchools(): Promise<Indexed[]> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch("/data/world-schools.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<SchoolFile>;
      })
      .then((file) => {
        cache = file.schools.map(([name, ci, city]) => {
          const country = file.countries[ci];
          return { name, city, country, haystack: foldForSearch(`${name} ${city} ${country}`), folded: foldForSearch(name) };
        });
        return cache;
      })
      .catch((err) => {
        pending = null;
        console.warn("world schools failed to load", err);
        return [];
      });
  }
  return pending;
}

/** Start loading once `enabled` turns true; null until loaded. */
export function useWorldSchools(enabled: boolean): Indexed[] | null {
  const [list, setList] = useState<Indexed[] | null>(cache);
  useEffect(() => {
    if (cache) {
      setList(cache);
      return;
    }
    if (!enabled) return;
    let live = true;
    loadWorldSchools().then((l) => live && setList(l));
    return () => {
      live = false;
    };
  }, [enabled]);
  return list;
}

/**
 * Schools whose name, city or country contain every word of the query.
 * Name-prefix matches rank first, then name matches, then city/country only.
 */
export function searchWorldSchools(list: Indexed[], query: string, limit: number): School[] {
  const words = foldForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const first = words[0];
  const hits: { s: Indexed; rank: number }[] = [];
  for (const s of list) {
    if (!words.every((w) => s.haystack.includes(w))) continue;
    const name = s.folded;
    const rank = name.startsWith(first) ? 0 : words.every((w) => name.includes(w)) ? 1 : 2;
    hits.push({ s, rank });
  }
  hits.sort((a, b) => a.rank - b.rank || a.s.name.length - b.s.name.length);
  return hits.slice(0, limit).map(({ s }) => ({ name: s.name, city: s.city, country: s.country }));
}
