import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Compact "Back to Command center" affordance for counsellor sub-pages.
 * Sits above the page header so navigation back is always one click.
 */
export function BackToCommand({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/teacher"
      className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 ${className}`}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to Command center
    </Link>
  );
}
