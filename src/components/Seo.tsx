import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
  image?: string;
  /** Alt text for the social card image. Falls back to the page title. */
  imageAlt?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Set on pages that shouldn't be crawled/indexed, e.g. 404s. */
  noindex?: boolean;
}

const SITE = "https://pathforge.co.in";
// Must stay in sync with the og:image in index.html. They used to be two
// different pictures, so which card a scraper showed depended on whether it
// ran our JS — and the og:image:width/height in index.html described only one
// of them. One image, one declared size.
const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/CswkUhC78OgkSYDPS7UkrpFjZvW2/social-images/social-1778983109778-Screenshot_2026-05-17_071556.webp";

/**
 * Turn a URL segment into a human label: "refund-policy" -> "Refund Policy".
 *
 * Deliberately dumb. It only ever runs on our own route segments, which are
 * lower-case kebab words, so there is nothing to be clever about.
 */
function humanise(segment: string) {
  return segment
    .split("-")
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * BreadcrumbList for the current path, or null on the home page.
 *
 * Built from the path rather than from a per-page prop, so every route gets it
 * without forty call sites having to remember. Google wants the trail to match
 * what a user sees; our nav is hierarchical by URL (/communications/chats sits
 * under /communications), so the URL is the honest source.
 *
 * A segment that is an opaque identifier - a LOR portal token, a team UUID -
 * would make a meaningless crumb, so anything that does not look like a word is
 * dropped along with everything after it.
 */
function breadcrumbLd(path: string | undefined) {
  if (!path || path === "/") return null;
  const raw = path.split("?")[0].split("#")[0].split("/").filter(Boolean);

  const segments: string[] = [];
  for (const seg of raw) {
    // Words and hyphens only; a UUID, a token or a number is not a crumb.
    if (!/^[a-z][a-z-]*$/i.test(seg)) break;
    segments.push(seg);
  }
  if (segments.length === 0) return null;

  const items = [{ "@type": "ListItem", position: 1, name: "Home", item: SITE }];
  segments.forEach((seg, i) => {
    items.push({
      "@type": "ListItem",
      position: i + 2,
      name: humanise(seg),
      item: `${SITE}/${segments.slice(0, i + 1).join("/")}`,
    });
  });

  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
}

export function Seo({
  title, description, path, type = "website", image, imageAlt, jsonLd, noindex,
}: SeoProps) {
  const url = `${SITE}${path ?? (typeof window !== "undefined" ? window.location.pathname : "/")}`;
  const fullTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
  const desc = description.length > 160 ? description.slice(0, 157) + "..." : description;
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  // No breadcrumbs on pages we are telling crawlers to ignore - structured data
  // on a noindex page is markup nobody will ever read.
  const crumbs = noindex ? null : breadcrumbLd(path);
  const allLd = crumbs ? [...ldArray, crumbs] : ldArray;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {/* Emitted unconditionally, both values. index.html marks its copy
          `data-rh`, which hands the tag to Helmet — and Helmet deletes any tag
          it owns that the current render doesn't re-declare. Emitting this only
          in the noindex case would therefore strip the robots directive off
          every normal page instead of leaving the default in place. */}
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={url} />
      {/* The site audit reported no international targeting at all. Pathforge
          serves the US, UK, Canada and India from one English build — the
          Google Translate widget translates at runtime and does not produce
          separate URLs, so there are no locale variants to point at. `en` plus
          `x-default` is the correct declaration for that: it tells crawlers this
          single URL serves every region, rather than leaving them to guess. */}
      <link rel="alternate" hrefLang="en" href={url} />
      <link rel="alternate" hrefLang="x-default" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      {/* These three must be emitted unconditionally. index.html marks its
          copies `data-rh`, which hands them to Helmet — and Helmet removes any
          tag it owns that the current render doesn't re-declare. Dropping them
          here would strip the card dimensions from every route. */}
      {/* Real pixel size of DEFAULT_OG_IMAGE. These previously claimed 1200x630
          while the asset is 754x396, so scrapers reserved the wrong card box.
          If the social image is regenerated at 1200x630, update these and the
          matching pair in index.html together. */}
      <meta property="og:image:width" content="754" />
      <meta property="og:image:height" content="396" />
      <meta property="og:image:alt" content={imageAlt ?? fullTitle} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={imageAlt ?? fullTitle} />
      {allLd.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
