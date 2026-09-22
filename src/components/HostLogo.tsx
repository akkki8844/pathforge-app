import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The mark of whoever runs a thing.
 *
 * WHY THIS IS DERIVED RATHER THAN STORED
 *
 * The scholarships page carries an explicit `logoCandidates` array on every
 * record, hand-maintained. The activities dataset has no host or organiser
 * field at all — it is 7,670 lines of static data and adding one would mean
 * editing several hundred entries by hand and keeping them right forever.
 *
 * But every activity already carries `learnMoreUrl` and usually `applyUrl`,
 * and the host of that URL *is* the organiser: imo-official.org is the IMO,
 * physicsolympiad.org.uk is the BPhO. Deriving the domain from a link the
 * record already has gets a correct logo for the whole catalogue immediately,
 * with nothing to maintain and nothing to go stale.
 *
 * The chain is unavatar -> Google favicon -> DuckDuckGo -> monogram, the same
 * order the scholarships and professors pages use, because any single source
 * 404s on a meaningful fraction of real organisations and the monogram should
 * only appear once all three have genuinely failed.
 */

/** Hosts that identify a platform rather than an organiser, so their logo lies. */
const GENERIC_HOSTS = new Set([
  "docs.google.com",
  "forms.gle",
  "drive.google.com",
  "sites.google.com",
  "eventbrite.com",
  "bit.ly",
  "tinyurl.com",
  "notion.so",
  "airtable.com",
  "typeform.com",
  "linktr.ee",
]);

/**
 * Pull a usable organisation domain out of a URL.
 *
 * Returns null for a link that identifies a form host rather than an
 * organiser — a Google Forms favicon on twelve different competitions tells a
 * student nothing and makes the grid look broken rather than branded.
 */
function hostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (!host.includes(".")) return null;
    if (GENERIC_HOSTS.has(host)) return null;
    // A subdomain of a generic host is just as uninformative.
    for (const g of GENERIC_HOSTS) if (host.endsWith(`.${g}`)) return null;
    return host;
  } catch {
    return null;
  }
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter((w) => /^[A-Za-z0-9]/.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function HostLogo({
  name,
  urls,
  size = 44,
  className,
}: {
  /** Used for the monogram and the alt text. */
  name: string;
  /** Candidate URLs, in preference order. The first usable host wins. */
  urls: Array<string | null | undefined>;
  size?: number;
  className?: string;
}) {
  const domain = useMemo(() => {
    for (const u of urls) {
      const h = hostFromUrl(u);
      if (h) return h;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join("|")]);

  const candidates = useMemo(
    () =>
      domain
        ? [
            `https://unavatar.io/${domain}?fallback=false`,
            `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            `https://icons.duckduckgo.com/ip3/${domain}.ico`,
          ]
        : [],
    [domain],
  );

  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  // Cards get recycled as filters change, so a logo that failed for one
  // activity must not suppress the logo of whatever takes its place.
  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [domain]);

  const dim = { width: size, height: size };

  if (failed || candidates.length === 0) {
    return (
      <span
        aria-hidden
        style={dim}
        className={cn(
          "grid shrink-0 place-items-center rounded-lg border border-border bg-muted font-semibold text-muted-foreground",
          className,
        )}
      >
        <span style={{ fontSize: size * 0.34 }}>{initialsOf(name)}</span>
      </span>
    );
  }

  return (
    <span
      style={dim}
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background p-1.5",
        className,
      )}
    >
      <img
        key={candidates[idx]}
        src={candidates[idx]}
        alt={`${name} logo`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => (idx + 1 < candidates.length ? setIdx(idx + 1) : setFailed(true))}
        className="max-h-full max-w-full object-contain"
      />
    </span>
  );
}
