/**
 * Client-executed advisor tools.
 *
 * The model never touches the database or the router directly. It emits a tool
 * call over the stream; this module decides whether the call is legal, and the
 * Advisor page executes the legal ones through the same RLS-protected hooks the
 * rest of the app uses.
 *
 * Safety boundaries, in one place so they are auditable:
 *  1. Only the tool names in TOOL_NAMES exist. Anything else is dropped.
 *  2. Arguments are validated here, client-side, against a hand-written schema
 *     — the model's JSON is never spread into a DB row unchecked.
 *  3. `navigate` accepts only an exact match from IN_APP_ROUTES. Anything with
 *     a scheme, a protocol-relative prefix, a `..` segment, or a route outside
 *     the allowlist is rejected. There is no way to express an external URL.
 *  4. No tool accepts a user id. Every mutation runs through a hook that scopes
 *     writes to `auth.uid()` under RLS.
 *  5. `requiresConfirmation` tools do not run until the user presses the button
 *     in the inline card. Nothing here executes silently.
 *  6. `install_skill` carries a slug and nothing else. The instructions that
 *     end up in the student's system prompt are read from the catalogue table
 *     by the executing hook, so the model can name a skill but can never write
 *     one — which is the difference between "install the essay editor" and a
 *     prompt-injected payload installing itself as standing instructions.
 */

export const TOOL_NAMES = ["navigate", "add_outcome_item", "install_skill", "remove_skill"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

/* ------------------------------------------------------------------ routes */

export interface AppRoute {
  path: string;
  label: string;
  /** What the page is for — fed to the model so it picks the right one. */
  purpose: string;
}

/**
 * Navigation allowlist, transcribed from the student-facing entries in the
 * route table in `src/App.tsx`.
 *
 * Deliberately excluded: `/admin*`, `/teacher/*`, `/auth`, `/reset-password`,
 * the OAuth callbacks and the tokenised `/lor/portal/:token` route. Those are
 * either privileged, parameterised, or destructive to land on mid-flow.
 *
 * If a route is added or renamed in App.tsx, add it here too — a missing entry
 * degrades to "the advisor can't take you there", never to an unsafe jump.
 */
export const IN_APP_ROUTES: readonly AppRoute[] = [
  { path: "/dashboard", label: "Dashboard", purpose: "Overview of progress, credits and next actions" },
  { path: "/outcomes", label: "Outcomes", purpose: "Projects, leadership, competitions, service, internships, research and creative work" },
  { path: "/activities", label: "Activities", purpose: "The Common App activities list" },
  { path: "/journey", label: "Journey", purpose: "The 300-quest guided journey" },
  { path: "/profile-builder", label: "Profile Builder", purpose: "LinkedIn and public profile building" },
  { path: "/resume", label: "Resume", purpose: "Resume builder and export" },
  { path: "/essays", label: "Essays", purpose: "Essay drafting and feedback" },
  { path: "/application-builder", label: "Application Builder", purpose: "Assemble the full application" },
  { path: "/lor", label: "Letters of Recommendation", purpose: "Recommenders, requests and LOR strategy" },
  { path: "/scholarships", label: "Scholarships", purpose: "Scholarship search and tracking" },
  { path: "/college-readiness", label: "College Readiness", purpose: "Readiness score and history" },
  { path: "/weekly-planner", label: "Weekly Planner", purpose: "Week-by-week task planning" },
  { path: "/requirements", label: "Requirements", purpose: "Per-college application requirements" },
  { path: "/admissions-probability", label: "Admissions Probability", purpose: "Chance estimates for target schools" },
  { path: "/exemplar-essays", label: "Exemplar Essays", purpose: "Library of successful essays" },
  { path: "/past-admits", label: "Past Admits", purpose: "Profiles of admitted students" },
  { path: "/recommendations", label: "Recommendations", purpose: "Personalised suggestions" },
  { path: "/profile", label: "Profile & Settings", purpose: "Account, plan and advisor settings" },
  { path: "/advisor", label: "Advisor", purpose: "This chat" },
  { path: "/pricing", label: "Pricing", purpose: "Plans and upgrades" },
  { path: "/about", label: "About", purpose: "About Pathforge" },
  { path: "/contact", label: "Contact", purpose: "Contact the team" },
] as const;

const ROUTE_BY_PATH = new Map(IN_APP_ROUTES.map((r) => [r.path, r]));

/**
 * Normalise then allowlist-check. Returns the matched route or null.
 *
 * Anything that could leave the app is rejected before normalisation can
 * "helpfully" rewrite it: `https://evil.com`, `//evil.com`, `javascript:`,
 * `/../admin`. Query strings and hashes are stripped rather than forwarded,
 * because nothing in the allowlist needs them and they are a free-text channel.
 */
export function resolveRoute(input: unknown): AppRoute | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;
  // Reject anything that is not an app-relative path outright.
  if (raw.includes("://") || raw.startsWith("//") || raw.includes("\\")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
  if (raw.includes("..")) return null;

  let path = raw.split(/[?#]/)[0].toLowerCase();
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return ROUTE_BY_PATH.get(path) ?? null;
}

/* ---------------------------------------------------------------- outcomes */

export const OUTCOME_CATEGORIES = [
  "project",
  "leadership",
  "competition",
  "service",
  "internship",
  "research",
  "creative",
] as const;
export type OutcomeCategory = (typeof OUTCOME_CATEGORIES)[number];

export const OUTCOME_CATEGORY_LABEL: Record<OutcomeCategory, string> = {
  project: "Project",
  leadership: "Leadership role",
  competition: "Competition",
  service: "Community service",
  internship: "Internship",
  research: "Research output",
  creative: "Creative work",
};

export interface AddOutcomeArgs {
  category: OutcomeCategory;
  title: string;
  organization: string;
  detail: string;
}

export interface NavigateArgs {
  path: string;
  label: string;
}

export interface SkillArgs {
  slug: string;
}

export type ToolArgs =
  | { name: "navigate"; args: NavigateArgs }
  | { name: "add_outcome_item"; args: AddOutcomeArgs }
  | { name: "install_skill"; args: SkillArgs }
  | { name: "remove_skill"; args: SkillArgs };

/**
 * Slugs are generated by `slugifySkillName` and stored as the primary key of
 * the catalogue, so the shape is known exactly. Checking it here means the
 * lookup that follows is a miss rather than an injection surface.
 */
const SKILL_SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;

export interface ToolSpec {
  name: ToolName;
  /** Verb shown on the inline card while pending / after running. */
  pendingLabel: string;
  doneLabel: string;
  /** When true the user must press a button before anything happens. */
  requiresConfirmation: boolean;
  /** True for anything that cannot be trivially undone. */
  destructive: boolean;
}

export const TOOL_SPECS: Record<ToolName, ToolSpec> = {
  navigate: {
    name: "navigate",
    pendingLabel: "Opening",
    doneLabel: "Opened",
    // Read-only and instantly reversible with the back button.
    requiresConfirmation: false,
    destructive: false,
  },
  add_outcome_item: {
    name: "add_outcome_item",
    pendingLabel: "Add to outcomes",
    doneLabel: "Added to outcomes",
    // Writes to the student's real profile data, so it waits for a click.
    requiresConfirmation: true,
    destructive: false,
  },
  install_skill: {
    name: "install_skill",
    pendingLabel: "Install skill",
    doneLabel: "Skill installed",
    // A skill changes how the advisor answers from here on. That is a standing
    // change to the student's account, so it waits for a click even though the
    // body itself comes from our own catalogue.
    requiresConfirmation: true,
    destructive: false,
  },
  remove_skill: {
    name: "remove_skill",
    pendingLabel: "Remove skill",
    doneLabel: "Skill removed",
    requiresConfirmation: true,
    // Reinstalling is one click, but a hand-written skill is gone for good, and
    // the card cannot tell which kind it is until it has looked it up.
    destructive: true,
  },
};

/** Collapse control characters and runs of whitespace, then hard-cap length. */
function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  let out = "";
  for (const ch of v) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 32 || code === 127 ? " " : ch;
  }
  return out.replace(/\s{2,}/g, " ").trim().slice(0, max);
}

// `reason?: undefined` on the success branch is load-bearing: this project
// compiles with `strict: false`, and without strictNullChecks TypeScript will
// not narrow a union by a *boolean* discriminant inside the `if (!ok)` branch,
// so `verdict.reason` is otherwise unreachable at the rejection call site.
export type ValidationResult =
  | { ok: true; call: ToolArgs; reason?: undefined }
  | { ok: false; reason: string };

/**
 * The only door into tool execution. Unknown names, malformed arguments and
 * disallowed routes all come back as `ok: false` with a reason we can surface.
 */
export function validateToolCall(name: unknown, rawArgs: unknown): ValidationResult {
  if (typeof name !== "string" || !(TOOL_NAMES as readonly string[]).includes(name)) {
    return { ok: false, reason: `Unknown tool "${String(name)}".` };
  }
  const args = (rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs))
    ? (rawArgs as Record<string, unknown>)
    : null;
  if (!args) return { ok: false, reason: "Tool arguments were not an object." };

  if (name === "navigate") {
    const route = resolveRoute(args.path);
    if (!route) {
      return { ok: false, reason: `"${str(args.path, 80) || "that page"}" is not a page in this app.` };
    }
    return { ok: true, call: { name: "navigate", args: { path: route.path, label: route.label } } };
  }

  if (name === "install_skill" || name === "remove_skill") {
    const slug = typeof args.slug === "string" ? args.slug.trim().toLowerCase() : "";
    if (!SKILL_SLUG.test(slug)) {
      return { ok: false, reason: `"${str(args.slug, 60) || "that"}" is not a skill name.` };
    }
    return { ok: true, call: { name, args: { slug } } };
  }

  // add_outcome_item
  const category = typeof args.category === "string" ? args.category.toLowerCase().trim() : "";
  if (!(OUTCOME_CATEGORIES as readonly string[]).includes(category)) {
    return { ok: false, reason: `"${str(args.category, 40) || "that"}" is not an outcome category.` };
  }
  const title = str(args.title, 120);
  if (title.length < 2) return { ok: false, reason: "The item needs a title." };

  return {
    ok: true,
    call: {
      name: "add_outcome_item",
      args: {
        category: category as OutcomeCategory,
        title,
        organization: str(args.organization, 120),
        detail: str(args.detail, 400),
      },
    },
  };
}

/* ------------------------------------------------------- streamed tool call */

export type ToolCallStatus = "pending" | "running" | "done" | "rejected" | "dismissed" | "failed";

export interface AdvisorToolCall {
  id: string;
  name: ToolName;
  call: ToolArgs;
  status: ToolCallStatus;
  /** Human sentence describing what happened, shown on the card. */
  summary: string;
  error?: string;
}

/** One-line description of what a validated call will do. */
export function describeCall(call: ToolArgs): string {
  if (call.name === "navigate") return call.args.label;
  // The slug is all we have here. The executing hook replaces this with the
  // skill's real name once it has resolved the row.
  if (call.name === "install_skill" || call.name === "remove_skill") return call.args.slug;
  const label = OUTCOME_CATEGORY_LABEL[call.args.category];
  const where = call.args.organization ? ` · ${call.args.organization}` : "";
  return `${label}: ${call.args.title}${where}`;
}
