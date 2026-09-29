import { useLocation } from "react-router-dom";
import { PageSkeleton } from "@/components/PageSkeletons";

/**
 * Loading placeholder for the current route. Kept as a thin wrapper so
 * existing callers pick up the page-shaped skeletons in PageSkeletons.
 */
export function RouteSkeleton() {
  const { pathname } = useLocation();
  return <PageSkeleton pathname={pathname} />;
}
