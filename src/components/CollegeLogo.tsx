import { useState, useEffect, useMemo } from "react";
import { colleges } from "@/lib/colleges";
import { cn } from "@/lib/utils";

/**
 * Renders a university's real logo instead of a generic graduation-cap icon.
 *
 * Domains come from the `website` field already present on every entry in
 * colleges.ts, so this stays in sync with the college database automatically.
 * Names that users type in free-form (or that reporting abbreviates) are
 * matched via ALIASES plus a normalized fuzzy pass.
 *
 * Logo sources are tried in order and we fall back to a lettered tile, so a
 * blocked/missing logo never leaves a hole in the layout.
 */

/** Short names and abbreviations that won't fuzzy-match the official name. */
const ALIASES: Record<string, string> = {
  mit: "mit.edu",
  caltech: "caltech.edu",
  ucla: "ucla.edu",
  usc: "usc.edu",
  nyu: "nyu.edu",
  cmu: "cmu.edu",
  ucb: "berkeley.edu",
  berkeley: "berkeley.edu",
  "uc berkeley": "berkeley.edu",
  "uc san diego": "ucsd.edu",
  ucsd: "ucsd.edu",
  "uc davis": "ucdavis.edu",
  "uc irvine": "uci.edu",
  penn: "upenn.edu",
  upenn: "upenn.edu",
  "u penn": "upenn.edu",
  "university of pennsylvania": "upenn.edu",
  uchicago: "uchicago.edu",
  "u chicago": "uchicago.edu",
  jhu: "jhu.edu",
  "johns hopkins": "jhu.edu",
  "johns hopkins university": "jhu.edu",
  gatech: "gatech.edu",
  "georgia tech": "gatech.edu",
  umich: "umich.edu",
  michigan: "umich.edu",
  "university of michigan": "umich.edu",
  unc: "unc.edu",
  "unc chapel hill": "unc.edu",
  utaustin: "utexas.edu",
  "ut austin": "utexas.edu",
  "texas a&m": "tamu.edu",
  uiuc: "illinois.edu",
  "uw madison": "wisc.edu",
  "washu": "wustl.edu",
  "washington university in st. louis": "wustl.edu",
  "virginia tech": "vt.edu",
  bu: "bu.edu",
  "boston university": "bu.edu",
  "boston college": "bc.edu",
  oxford: "ox.ac.uk",
  "university of oxford": "ox.ac.uk",
  cambridge: "cam.ac.uk",
  "university of cambridge": "cam.ac.uk",
  imperial: "imperial.ac.uk",
  "imperial college london": "imperial.ac.uk",
  ucl: "ucl.ac.uk",
  lse: "lse.ac.uk",
  "eth zurich": "ethz.ch",
  nus: "nus.edu.sg",
  ntu: "ntu.edu.sg",
  tsinghua: "tsinghua.edu.cn",
  "peking university": "pku.edu.cn",
  toronto: "utoronto.ca",
  "university of toronto": "utoronto.ca",
  mcgill: "mcgill.ca",
  ubc: "ubc.ca",
  iitb: "iitb.ac.in",
  "iit bombay": "iitb.ac.in",
  "iit delhi": "iitd.ac.in",
  "iit madras": "iitm.ac.in",
  bits: "bits-pilani.ac.in",
  "bits pilani": "bits-pilani.ac.in",
  brown: "brown.edu",
  cornell: "cornell.edu",
  dartmouth: "dartmouth.edu",
  columbia: "columbia.edu",
  harvard: "harvard.edu",
  princeton: "princeton.edu",
  yale: "yale.edu",
  stanford: "stanford.edu",
  duke: "duke.edu",
  northwestern: "northwestern.edu",
  rice: "rice.edu",
  vanderbilt: "vanderbilt.edu",
  emory: "emory.edu",
  georgetown: "georgetown.edu",
  notredame: "nd.edu",
  "notre dame": "nd.edu",
  "university of alabama": "ua.edu",
  alabama: "ua.edu",
  "new york university": "nyu.edu",
  "the new school": "newschool.edu",
  "bowdoin college": "bowdoin.edu",
  bowdoin: "bowdoin.edu",
  "hamilton college": "hamilton.edu",
  hamilton: "hamilton.edu",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,']/g, "")
    .replace(/\b(the|university|universities|college|institute|of|at|for)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip protocol/path/www off a website URL to get a bare domain. */
function domainFromWebsite(website?: string): string | null {
  if (!website) return null;
  try {
    const host = new URL(website).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Built once: exact-name and normalized-name lookups over the whole DB.
const DOMAIN_INDEX: { exact: Map<string, string>; normalized: Map<string, string> } = (() => {
  const exact = new Map<string, string>();
  const normalized = new Map<string, string>();
  for (const c of colleges) {
    const domain = domainFromWebsite(c.website);
    if (!domain) continue;
    exact.set(c.name.toLowerCase(), domain);
    const norm = normalize(c.name);
    if (norm && !normalized.has(norm)) normalized.set(norm, domain);
  }
  return { exact, normalized };
})();

/** Resolve a free-form college name to a logo domain, or null if unknown. */
export function resolveCollegeDomain(name: string): string | null {
  if (!name) return null;
  const raw = name.trim().toLowerCase();
  if (ALIASES[raw]) return ALIASES[raw];
  if (DOMAIN_INDEX.exact.has(raw)) return DOMAIN_INDEX.exact.get(raw)!;

  const norm = normalize(name);
  if (ALIASES[norm]) return ALIASES[norm];
  if (DOMAIN_INDEX.normalized.has(norm)) return DOMAIN_INDEX.normalized.get(norm)!;

  // Last resort: a unique substring match, so "Columbia" finds "Columbia
  // University". Ambiguous matches are rejected rather than guessed at.
  if (norm.length >= 4) {
    const hits: string[] = [];
    for (const [key, domain] of DOMAIN_INDEX.normalized) {
      if (key.includes(norm) || norm.includes(key)) {
        if (!hits.includes(domain)) hits.push(domain);
        if (hits.length > 1) break;
      }
    }
    if (hits.length === 1) return hits[0];
  }
  return null;
}

function initialsFor(name: string): string {
  const words = name
    .replace(/\b(the|of|at|for|and)\b/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

interface CollegeLogoProps {
  name: string;
  /** Rendered pixel size (square). */
  size?: number;
  className?: string;
}

export function CollegeLogo({ name, size = 24, className }: CollegeLogoProps) {
  const domain = useMemo(() => resolveCollegeDomain(name), [name]);

  const sources = useMemo(() => {
    if (!domain) return [];
    const px = Math.max(64, size * 3); // request crisp art for retina
    return [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      `https://logo.clearbit.com/${domain}?size=${px}`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    ];
  }, [domain, size]);

  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  // Reset the fallback chain whenever the college changes.
  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [domain]);

  const dim = { width: size, height: size };

  if (!domain || failed || sources.length === 0) {
    return (
      <span
        style={{ ...dim, fontSize: Math.max(9, size * 0.38) }}
        className={cn(
          "shrink-0 rounded-md bg-accent/10 text-accent border border-accent/20",
          "inline-flex items-center justify-center font-bold leading-none",
          className,
        )}
        aria-hidden
      >
        {initialsFor(name)}
      </span>
    );
  }

  return (
    <img
      key={sources[idx]}
      src={sources[idx]}
      alt=""
      aria-hidden
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (idx + 1 < sources.length) setIdx(idx + 1);
        else setFailed(true);
      }}
      style={dim}
      className={cn("shrink-0 rounded-md object-contain bg-background", className)}
    />
  );
}
