import { cn } from "@/lib/utils";

function Block({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-muted/60 animate-pulse", className)} />;
}

/**
 * Shared loading placeholder for route-level lazy chunks and in-page data
 * fetches. Mirrors the rough shape of a typical page (header + content
 * cards) so switching between load phases (chunk fetch → data fetch →
 * content) doesn't flash between visually unrelated states.
 */
export function RouteSkeleton() {
  return (
    <div className="min-h-[100svh] bg-background">
      <div className="section-container py-8 space-y-6">
        <Block className="h-8 w-56" />
        <Block className="h-4 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Block className="h-32" />
          <Block className="h-32" />
          <Block className="h-32" />
          <Block className="h-32" />
        </div>
      </div>
    </div>
  );
}
