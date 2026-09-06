/**
 * The Composio toolkits Pathforge offers a connect button for.
 *
 * All of these are free to connect: Composio's own free tier plus a free
 * account on the service itself. Pathforge holds no shared Composio key — a
 * student pastes their own (free) key once in Settings → Connectors, and every
 * connection after that is made on their account, against their quota.
 *
 * The slug is Composio's toolkit slug and is what the edge function sends to
 * `POST /api/v3/auth_configs`; it must match the list in
 * `supabase/functions/composio-connect-init/index.ts` or the connect call is
 * refused before it reaches Composio.
 *
 * `use` is what the connection is actually for inside Pathforge. Nothing here
 * claims a capability the Advisor does not have: these connections let the
 * Advisor read and write in the tool on the student's behalf when they ask it
 * to, and do nothing on their own.
 */
export interface ComposioApp {
  slug: string;
  name: string;
  /** One line, shown on the card. */
  use: string;
  /** Grouping heading in the UI. */
  group: "Notes and documents" | "Planning and tasks" | "Files" | "Messaging";
}

export const COMPOSIO_APPS: readonly ComposioApp[] = [
  {
    slug: "notion",
    name: "Notion",
    use: "Let the Advisor read a page you point it at, and write drafts and research notes back into your workspace.",
    group: "Notes and documents",
  },
  {
    slug: "googledocs",
    name: "Google Docs",
    use: "Open an essay draft in Docs and let the Advisor read it or write a revision into a new document.",
    group: "Notes and documents",
  },
  {
    slug: "googlesheets",
    name: "Google Sheets",
    use: "Keep a college or scholarship tracker in Sheets and let the Advisor read and update rows in it.",
    group: "Notes and documents",
  },
  {
    slug: "googledrive",
    name: "Google Drive",
    use: "Pull a transcript, resume or portfolio file straight from Drive instead of downloading and re-uploading it.",
    group: "Files",
  },
  {
    slug: "dropbox",
    name: "Dropbox",
    use: "Same as Drive, if your documents live in Dropbox instead.",
    group: "Files",
  },
  {
    slug: "onedrive",
    name: "OneDrive",
    use: "Same as Drive, for school accounts that run on Microsoft 365.",
    group: "Files",
  },
  {
    slug: "todoist",
    name: "Todoist",
    use: "Push a task the Advisor suggests into the list you already use, instead of keeping two task lists.",
    group: "Planning and tasks",
  },
  {
    slug: "trello",
    name: "Trello",
    use: "Track applications on a board and let the Advisor add or move cards as stages complete.",
    group: "Planning and tasks",
  },
  {
    slug: "asana",
    name: "Asana",
    use: "For students whose school or club work already runs in Asana.",
    group: "Planning and tasks",
  },
  {
    slug: "clickup",
    name: "ClickUp",
    use: "For students whose school or club work already runs in ClickUp.",
    group: "Planning and tasks",
  },
  {
    slug: "linear",
    name: "Linear",
    use: "If you run projects in Linear, let the Advisor file and read issues there.",
    group: "Planning and tasks",
  },
  {
    slug: "slack",
    name: "Slack",
    use: "Post an update or a reminder into a workspace you are in, when you ask the Advisor to.",
    group: "Messaging",
  },
  {
    slug: "discord",
    name: "Discord",
    use: "Same as Slack, for study servers and club servers.",
    group: "Messaging",
  },
] as const;

export const COMPOSIO_GROUPS = [
  "Notes and documents",
  "Planning and tasks",
  "Files",
  "Messaging",
] as const;
