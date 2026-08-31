import React from "react";

import { cn } from "@/lib/utils";

/**
 * Overlapping avatar stack, with the overflow collapsed into a final bubble.
 *
 * Three departures from the component as published, each because this codebase
 * already has a rule about it:
 *
 * - The ring is `border-background`, not a hardcoded white/`dark:gray-800`
 *   pair. These sit on a `bg-card` header in one place and could sit on any
 *   surface in the next, and a white ring on a cream card is a visible seam.
 * - The overflow bubble is a `<button>` when it does something and a `<span>`
 *   when it does not. The original is an `<a href="">`, which navigates to the
 *   current page on click and is announced as a link to nowhere.
 * - Every image carries `loading="lazy"` and an empty `alt`. The stack is
 *   decorative — the names are already in the details pane — so announcing
 *   "Avatar 1, Avatar 2, Avatar 3" to a screen reader is noise. The count is
 *   given a real label instead.
 */
interface AvatarCirclesProps {
  className?: string;
  /** How many more people than are pictured. Omit or pass 0 to hide the bubble. */
  numPeople?: number;
  avatarUrls: string[];
  /** Falls back to `md` (40px), the published size. */
  size?: "sm" | "md";
  /** Makes the overflow bubble a real control — usually "open the member list". */
  onMoreClick?: () => void;
  /** What the overflow bubble announces. */
  moreLabel?: string;
}

const AvatarCircles = ({
  numPeople,
  className,
  avatarUrls,
  size = "md",
  onMoreClick,
  moreLabel,
}: AvatarCirclesProps) => {
  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const px = size === "sm" ? 32 : 40;
  const showMore = (numPeople ?? 0) > 0;

  return (
    <div className={cn("z-10 flex -space-x-3 rtl:space-x-reverse", className)}>
      {avatarUrls.map((url, index) => (
        <img
          key={`${url}-${index}`}
          className={cn(dim, "rounded-full border-2 border-background object-cover")}
          src={url}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          alt=""
          aria-hidden="true"
        />
      ))}

      {showMore &&
        (onMoreClick ? (
          <button
            type="button"
            onClick={onMoreClick}
            aria-label={moreLabel ?? `Show ${numPeople} more`}
            className={cn(
              dim,
              "flex items-center justify-center rounded-full border-2 border-background",
              "bg-foreground text-center text-xs font-semibold tabular-nums text-background",
              "transition-opacity hover:opacity-80",
            )}
          >
            +{numPeople}
          </button>
        ) : (
          <span
            aria-label={moreLabel ?? `${numPeople} more`}
            className={cn(
              dim,
              "flex items-center justify-center rounded-full border-2 border-background",
              "bg-foreground text-center text-xs font-semibold tabular-nums text-background",
            )}
          >
            +{numPeople}
          </span>
        ))}
    </div>
  );
};

export { AvatarCircles };
