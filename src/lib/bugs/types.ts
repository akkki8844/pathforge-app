/**
 * The shape of a bug report, shared by the capture engine, the report widget
 * and the admin console.
 */

export const BUG_SOURCES = [
  "user_report",
  "react_error",
  "window_error",
  "unhandled_rejection",
  "edge_function",
  "network",
  "console_error",
  "server",
] as const;
export type BugSource = (typeof BUG_SOURCES)[number];

export const BUG_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type BugSeverity = (typeof BUG_SEVERITIES)[number];

export const BUG_STATUSES = [
  "open",
  "triaged",
  "in_progress",
  "resolved",
  "wont_fix",
  "duplicate",
] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

/**
 * How each source reads in the admin list.
 *
 * `user_report` is called "Reported by user" rather than "User report" because
 * the distinction that matters at a glance is not what kind of record it is but
 * whether a human was there: those are the ones with a person waiting on the
 * other end.
 */
export const BUG_SOURCE_LABELS: Record<BugSource, string> = {
  user_report: "Reported by user",
  react_error: "Render crash",
  window_error: "Uncaught error",
  unhandled_rejection: "Unhandled rejection",
  edge_function: "Edge function",
  network: "Network",
  console_error: "Console error",
  server: "Server",
};

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  open: "Open",
  triaged: "Triaged",
  in_progress: "In progress",
  resolved: "Resolved",
  wont_fix: "Won't fix",
  duplicate: "Duplicate",
};

/** One thing that happened shortly before the failure. */
export interface Breadcrumb {
  /** ms since page load, so a sequence reads as a timeline without clock skew. */
  t: number;
  kind: "route" | "click" | "request" | "console" | "auth" | "note";
  label: string;
  detail?: string;
}

export interface BugReport {
  id: string;
  fingerprint: string;
  source: BugSource;
  severity: BugSeverity;
  status: BugStatus;
  title: string;
  description: string | null;
  error_message: string | null;
  error_stack: string | null;
  component_stack: string | null;
  route: string | null;
  function_name: string | null;
  http_status: number | null;
  user_agent: string | null;
  viewport: string | null;
  app_version: string | null;
  breadcrumbs: Breadcrumb[];
  context: Record<string, unknown>;
  reporter_id: string | null;
  reporter_email: string | null;
  occurrences: number;
  affected_users: string[];
  first_seen_at: string;
  last_seen_at: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

/** What `report_bug()` accepts. Everything but title and source is optional. */
export interface BugReportPayload {
  fingerprint?: string;
  source: BugSource;
  severity?: BugSeverity;
  title: string;
  description?: string | null;
  error_message?: string | null;
  error_stack?: string | null;
  component_stack?: string | null;
  route?: string | null;
  function_name?: string | null;
  http_status?: number | null;
  user_agent?: string | null;
  viewport?: string | null;
  app_version?: string | null;
  breadcrumbs?: Breadcrumb[];
  context?: Record<string, unknown>;
  reporter_email?: string | null;
}
