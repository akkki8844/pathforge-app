import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Composio's brand mark.
 *
 * Drawn from Composio's own favicon rather than a hand-traced SVG, so it is
 * their actual logo and stays correct if they rebrand. Same source chain the
 * professor cards use for university logos: unavatar first because it returns
 * the high-resolution mark, Google's favicon service second, and a monogram
 * tile last so a blocked request degrades to something legible instead of a
 * broken image.
 */
export function ComposioMark({ className, size = 20 }: { className?: string; size?: number }) {
  const sources = [
    "https://unavatar.io/composio.dev?fallback=false",
    "https://www.google.com/s2/favicons?domain=composio.dev&sz=128",
    "https://icons.duckduckgo.com/ip3/composio.dev.ico",
  ];
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        style={{ width: size, height: size, fontSize: size * 0.6 }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[5px] bg-foreground font-bold leading-none text-background",
          className,
        )}
        aria-hidden="true"
      >
        C
      </span>
    );
  }

  return (
    <img
      key={sources[idx]}
      src={sources[idx]}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => (idx + 1 < sources.length ? setIdx(idx + 1) : setFailed(true))}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-[5px] object-contain", className)}
    />
  );
}
