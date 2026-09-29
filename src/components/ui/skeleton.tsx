import { cn } from "@/lib/utils";

/**
 * A loading placeholder block. Size and shape come from className; the sweep
 * comes from the .skeleton class in index.css. Decorative only: wrap a group
 * of these in an element with role="status" and a label (see PageSkeletons).
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("skeleton rounded-md", className)} {...props} />;
}

export { Skeleton };
