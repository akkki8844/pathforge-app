import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

/**
 * A button-based pager.
 *
 * WHY THIS LIVES BESIDE `pagination.tsx` RATHER THAN REPLACING IT
 *
 * `src/components/ui/pagination.tsx` is the stock shadcn pager, and its parts
 * are anchors inside a `<ul>` — an API for paging that changes the URL. This
 * one is `<button>`s driven by React state, for paging that never leaves the
 * route. Neither is a superset of the other, so overwriting the shadcn file
 * would have silently changed the meaning of `PaginationItem` for anything
 * that adopts it later. Two files, two clear jobs.
 *
 * The ellipsis is a `<span>`, not a button: it is not a page, clicking it
 * should do nothing, and it must not be focusable or announced as a control.
 * `aria-current="page"` marks the active number, because colour alone leaves a
 * screen-reader user with no way to know where they are in the list.
 */

const paginationVariants = cva("flex items-center justify-center", {
  variants: {
    variant: {
      default: "gap-1",
      compact: "gap-0.5",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const paginationItemVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[0.6rem] text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "text-foreground hover:bg-muted",
        outline: "border border-border text-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
      },
      size: {
        default: "h-9 w-9",
        sm: "h-8 w-8 text-xs",
        lg: "h-10 w-10",
      },
      state: {
        default: "",
        active:
          "border border-foreground bg-foreground font-semibold text-background hover:bg-foreground hover:text-background",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
      state: "default",
    },
  },
);

const paginationNavVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[0.6rem] border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      size: {
        default: "h-9",
        sm: "h-8 px-2 text-xs",
        lg: "h-10 px-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export interface PaginationProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof paginationVariants> {}

export interface PaginationItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof paginationItemVariants> {
  isActive?: boolean;
}

export interface PaginationNavProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof paginationNavVariants> {}

export type PaginationEllipsisProps = React.HTMLAttributes<HTMLSpanElement>;

const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({ className, variant, ...props }, ref) => (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn(paginationVariants({ variant, className }))}
      ref={ref}
      {...props}
    />
  ),
);
Pagination.displayName = "Pagination";

const PaginationItem = React.forwardRef<HTMLButtonElement, PaginationItemProps>(
  ({ className, variant, size, state, isActive, ...props }, ref) => (
    <button
      type="button"
      className={cn(
        paginationItemVariants({
          variant,
          size,
          state: isActive ? "active" : state,
          className,
        }),
      )}
      ref={ref}
      aria-current={isActive ? "page" : undefined}
      {...props}
    />
  ),
);
PaginationItem.displayName = "PaginationItem";

const PaginationPrevious = React.forwardRef<HTMLButtonElement, PaginationNavProps>(
  ({ className, size, children, ...props }, ref) => (
    <button
      type="button"
      className={cn(paginationNavVariants({ size, className }))}
      ref={ref}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      {children ?? "Previous"}
    </button>
  ),
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = React.forwardRef<HTMLButtonElement, PaginationNavProps>(
  ({ className, size, children, ...props }, ref) => (
    <button
      type="button"
      className={cn(paginationNavVariants({ size, className }))}
      ref={ref}
      {...props}
    >
      {children ?? "Next"}
      <ChevronRight className="h-4 w-4" />
    </button>
  ),
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = React.forwardRef<HTMLSpanElement, PaginationEllipsisProps>(
  ({ className, ...props }, ref) => (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center text-muted-foreground",
        className,
      )}
      ref={ref}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
    </span>
  ),
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  paginationVariants,
  paginationItemVariants,
  paginationNavVariants,
};
