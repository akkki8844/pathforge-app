import { useMemo } from "react";
import {
  Pagination,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination-nav";

/**
 * A numbered pager, in the shape search engines use: Previous and Next either
 * side of a run of page numbers, with an ellipsis where the run is cut.
 *
 * This is the window-and-labelling policy only — the buttons themselves come
 * from `@/components/ui/pagination-nav`, so the pager here and any other pager
 * in the app stay the same control rather than drifting apart. What lives in
 * this file is the part that is specific to a long activities list: how wide
 * the window is, what the accessible name is, and when the control should not
 * render at all.
 *
 * WHY A WINDOW RATHER THAN EVERY NUMBER
 *
 * A student whose major is Computer Science has over fifty matched
 * competitions, which is eleven pages at this page size — printable. A student
 * on the Explore tab can have several hundred, and rendering one button per
 * page would wrap the control onto three lines and push the grid off screen.
 * So the control always renders the first page, the last page, and a window of
 * `SIBLINGS` pages either side of the current one, with an ellipsis standing in
 * for whatever was skipped. The number of buttons is therefore constant no
 * matter how long the list gets.
 *
 * The ellipsis is a span, not a button. It is not a page and clicking it should
 * do nothing, so it must not be focusable or announced as a control.
 *
 * `aria-current="page"` marks the active number. Colour alone would leave the
 * current page invisible to a screen reader, and this control is the only way
 * to know where you are in the list. `PaginationItem` sets it from `isActive`.
 */

/** Pages rendered either side of the current page before the ellipsis. */
const SIBLINGS = 1;

type Slot = number | "gap-left" | "gap-right";

function buildSlots(page: number, pageCount: number): Slot[] {
  // Seven or fewer fits without any elision; this is the common case and it
  // avoids rendering an ellipsis that hides exactly one number.
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const first = 1;
  const last = pageCount;
  const start = Math.max(first + 1, page - SIBLINGS);
  const end = Math.min(last - 1, page + SIBLINGS);

  const slots: Slot[] = [first];
  if (start > first + 1) slots.push("gap-left");
  for (let p = start; p <= end; p += 1) slots.push(p);
  if (end < last - 1) slots.push("gap-right");
  slots.push(last);
  return slots;
}

export function ListPager({
  page,
  pageCount,
  onPageChange,
  className = "",
  label = "Results",
}: {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Used in the control's accessible name, e.g. "Recommended competitions". */
  label?: string;
}) {
  const slots = useMemo(() => buildSlots(page, pageCount), [page, pageCount]);

  // One page is not a pager. Rendering a single disabled "1" is noise.
  if (pageCount <= 1) return null;

  return (
    <Pagination
      aria-label={`${label} pagination`}
      // The row can still be wider than a phone once the labels are spelled
      // out, so it wraps rather than forcing the grid into a horizontal scroll.
      className={`flex-wrap gap-1.5 font-cluely text-[13px] ${className}`}
    >
      <PaginationPrevious
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="font-cluely text-[13px]"
      >
        Previous
      </PaginationPrevious>

      {slots.map((slot) =>
        typeof slot === "number" ? (
          <PaginationItem
            key={slot}
            isActive={slot === page}
            onClick={() => onPageChange(slot)}
            aria-label={`Page ${slot}`}
            className="min-w-9 px-3 font-cluely text-[13px]"
          >
            {slot}
          </PaginationItem>
        ) : (
          <PaginationEllipsis key={slot} />
        ),
      )}

      <PaginationNext
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
        className="font-cluely text-[13px]"
      >
        Next
      </PaginationNext>
    </Pagination>
  );
}

export default ListPager;
