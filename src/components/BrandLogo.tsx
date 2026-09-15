import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { resolveCompanyDomain } from "@/lib/companyDomains";

/**
 * A company or organisation's real mark, wherever its name is shown.
 *
 * The university equivalent is `CollegeLogo`, which resolves a name against the
 * college database. This is the same idea for everything that is not a
 * university — employers, labs, NGOs, competition organisers, news outlets —
 * where there is no such database.
 *
 * A domain is only ever taken from something factual: an explicit `domain`, a
 * `url` the record already carries, or a curated name table. An unknown name
 * draws a monogram tile, because guessing a domain from free text would sooner
 * or later put one company's logo against another company's name.
 */

/**
 * Logo sources for a domain, in the order they are tried.
 *
 * unavatar aggregates real brand marks and is asked to 404 rather than return a
 * generic avatar, so a miss falls through instead of rendering a grey silhouette.
 * Google's favicon service is the reliable-but-small fallback, DuckDuckGo last.
 * Same chain the scholarship provider logos already use.
 */
export function logoSourcesForDomain(domain: string): string[] {
  return [
    `https://unavatar.io/${domain}?fallback=false`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
}

/** The bare host of a URL, or null if it is not one. */
export function domainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

function initialsFor(name: string): string {
  const words = name
    .replace(/\b(the|of|at|for|and|inc|llc|ltd|pvt)\b/gi, " ")
    .split(/[\s/&-]+/)
    .filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

export interface BrandLogoProps {
  /** What the thing is called. Used for the monogram and the curated lookup. */
  name: string;
  /** Skip resolution and use this domain. */
  domain?: string | null;
  /** A URL the record already has (a website, an application link). */
  url?: string | null;
  size?: number;
  className?: string;
  /**
   * Render nothing rather than a monogram when no logo can be found. For rows
   * where a lettered tile beside an avatar would just be clutter.
   */
  hideWhenUnknown?: boolean;
}

export function BrandLogo({
  name,
  domain,
  url,
  size = 24,
  className,
  hideWhenUnknown = false,
}: BrandLogoProps) {
  const resolved = useMemo(
    () => domain || domainFromUrl(url) || resolveCompanyDomain(name),
    [domain, url, name],
  );
  const sources = useMemo(
    () => (resolved ? logoSourcesForDomain(resolved) : []),
    [resolved],
  );

  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  // Restart the fallback chain when the subject changes — these components are
  // recycled down lists and a stale index would keep an old failure.
  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [resolved]);

  const dim = { width: size, height: size };

  if (!resolved || failed || sources.length === 0) {
    if (hideWhenUnknown) return null;
    return (
      <span
        style={{ ...dim, fontSize: Math.max(9, size * 0.36) }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-muted",
          "font-semibold leading-none text-muted-foreground",
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
      className={cn("shrink-0 rounded-md object-contain", className)}
    />
  );
}

export default BrandLogo;
