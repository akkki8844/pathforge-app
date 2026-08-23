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

export function Seo({
  title, description, path, type = "website", image, imageAlt, jsonLd, noindex,
}: SeoProps) {
  const url = `${SITE}${path ?? (typeof window !== "undefined" ? window.location.pathname : "/")}`;
  const fullTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
  const desc = description.length > 160 ? description.slice(0, 157) + "..." : description;
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

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
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
