/**
 * A school's mark.
 *
 * University logos are not distributable assets — we can't ship 45 trademarked
 * crests in `public/` — so this fetches them from public logo endpoints and
 * degrades through them. The last stop is a monogram built from the school's
 * own brand colour, which always renders, never 404s, and looks deliberate
 * rather than broken. That last property is the point: a grey box where a crest
 * should be reads as a bug, and this page is the first thing a student sees.
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { SchoolInterviewProfile } from "@/lib/interview/types";

/**
 * Ordered by measured quality. Each is tried once; a failure falls to the next.
 *
 * Google's favicon service at sz=128 is first because it was checked against
 * every domain in the table and returned a correct, legible mark for all of
 * them. DuckDuckGo is the backup: it is reliable but frequently only serves a
 * 16 or 32 pixel icon, which is visibly soft at crest size.
 *
 * Clearbit used to lead this list and has been removed. It now fails for every
 * domain in the table — so it cost one dead request per crest, forty-five of
 * them on the lobby — and where it did answer it served a generic placeholder
 * rather than a 404, which `onError` cannot detect: Rice rendered as a grey
 * arrow and Vanderbilt as an empty white box. A source that fails loudly is
 * worth more here than one that fails quietly.
 *
 * Note that neither remaining service sends CORS headers, so the image cannot
 * be read back into a canvas — there is no way to detect a mark that loads but
 * is blank. That is why the ordering had to be verified by eye rather than by
 * a runtime check.
 */
function sourcesFor(domain: string): string[] {
  if (!domain) return [];
  return [
    `https://www.google.com/s2/favicons?sz=128&domain=${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
}

function initials(name: string): string {
  const words = name
    .replace(/\b(the|of|at|university|college|institute|school)\b/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function SchoolCrest({
  school,
  size = 44,
  className,
  rounded = "rounded-xl",
}: {
  school: Pick<SchoolInterviewProfile, "name" | "shortName" | "domain" | "color">;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const sources = sourcesFor(school.domain);
  const [attempt, setAttempt] = useState(0);

  // A different school in the same slot has a different source list, so the
  // attempt counter has to go back to the top or the new crest inherits the old
  // one's failures.
  useEffect(() => { setAttempt(0); }, [school.domain]);

  const src = sources[attempt];

  if (!src) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size, backgroundColor: school.color }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center font-display font-bold tracking-tight text-white shadow-sm ring-1 ring-black/10",
          rounded,
          className,
        )}
      >
        <span style={{ fontSize: Math.max(11, size * 0.38) }}>{initials(school.name)}</span>
      </span>
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-sm ring-1 ring-black/10",
        rounded,
        className,
      )}
    >
      <img
        src={src}
        alt=""
        aria-hidden
        width={size}
        height={size}
        loading="lazy"
        onError={() => setAttempt((a) => a + 1)}
        className="h-full w-full object-contain p-1"
      />
    </span>
  );
}
