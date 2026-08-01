import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logActivity } from "@/lib/activityLogger";

/**
 * Logs a `page_view` whenever the route changes (path + search).
 * Mount once near the router root.
 */
export function RouteActivityLogger() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    void logActivity("page_view", pathname + (search || ""));
  }, [pathname, search]);
  return null;
}
