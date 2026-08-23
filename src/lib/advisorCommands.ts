/**
 * Slash commands for the advisor.
 *
 * A chat box is a text field with one verb. Everything else the page can do —
 * switch model, open the skills drawer, compact the thread, jump to another
 * tool — lived behind an icon in a toolbar, which meant it was discoverable
 * only by hovering things. Typing `/` puts the whole surface in one list, in
 * the shape people already know from Claude Code, Slack and Discord.
 *
 * The registry is data, not behaviour: this module knows what exists and how to
 * match it, and `Advisor.tsx` owns what each one does. That split is what keeps
 * the palette testable and stops a command list from growing a dependency on
 * the page's state.
 *
 * Installed skills are folded in at match time rather than listed here, because
 * they are per-account rows — see `buildCommandList`.
 */

export type CommandGroup = "session" | "context" | "tools" | "navigate" | "skill";

export interface AdvisorCommand {
  /** Canonical name, without the slash. */
  id: string;
  /** Alternative spellings that resolve to the same command. */
  aliases?: string[];
  summary: string;
  group: CommandGroup;
  /** Shown after the name when the command takes an argument. */
  argHint?: string;
  /** For skill commands — the slug to load. */
  slug?: string;
}

export const BUILTIN_COMMANDS: AdvisorCommand[] = [
  // ── The thread ───────────────────────────────────────────────────────
  {
    id: "compact",
    summary: "Summarise this conversation and free the context window",
    group: "context",
  },
  {
    id: "context",
    summary: "Show what is filling the context window right now",
    group: "context",
  },
  {
    id: "new",
    aliases: ["clear", "reset"],
    summary: "Start a fresh conversation",
    group: "session",
  },
  {
    id: "rename",
    summary: "Rename this conversation",
    group: "session",
    argHint: "<title>",
  },
  {
    id: "export",
    summary: "Download this conversation as a file",
    group: "session",
  },
  {
    id: "archive",
    summary: "Archive this conversation and start a new one",
    group: "session",
  },

  // ── Panels and settings ──────────────────────────────────────────────
  {
    id: "skills",
    summary: "Manage the skills you have installed",
    group: "tools",
  },
  {
    // Its own row rather than an alias of /skills: it opens the same sheet but
    // on the catalogue, and a palette that hides "plugins" behind "skills"
    // cannot answer the question the person typing it is asking.
    id: "plugins",
    aliases: ["install"],
    summary: "Browse plugins you can install",
    group: "tools",
  },
  {
    id: "artifacts",
    aliases: ["files"],
    summary: "Open the documents this conversation produced",
    group: "tools",
  },
  {
    id: "model",
    summary: "Switch the model answering you",
    group: "tools",
    argHint: "[name]",
  },
  {
    id: "effort",
    summary: "Set how hard the model thinks before replying",
    group: "tools",
    argHint: "[instant|low|balanced|deep]",
  },
  {
    id: "voice",
    summary: "Toggle reading answers aloud",
    group: "tools",
  },
  {
    id: "help",
    aliases: ["?", "commands"],
    summary: "List every command",
    group: "tools",
  },

  // ── Going somewhere ──────────────────────────────────────────────────
  { id: "dashboard", summary: "Go to your dashboard", group: "navigate" },
  { id: "journey", summary: "Go to your journey", group: "navigate" },
  { id: "outcomes", summary: "Go to your record and reading", group: "navigate" },
  { id: "essays", summary: "Go to your essays", group: "navigate" },
  { id: "activities", summary: "Browse activities", group: "navigate" },
  { id: "scholarships", summary: "Browse scholarships", group: "navigate" },
  { id: "planner", summary: "Open the weekly planner", group: "navigate" },
  { id: "profile", summary: "Open your profile", group: "navigate" },
  { id: "usage", aliases: ["credits"], summary: "See your credits and usage", group: "navigate" },
];

/** Where each navigation command goes. Kept beside the list it belongs to. */
export const COMMAND_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  journey: "/journey",
  outcomes: "/outcomes",
  essays: "/essays",
  activities: "/activities",
  scholarships: "/scholarships",
  planner: "/weekly-planner",
  profile: "/profile",
  usage: "/profile?section=usage",
};

export const COMMAND_GROUP_LABEL: Record<CommandGroup, string> = {
  context: "Context",
  session: "Conversation",
  tools: "Advisor",
  navigate: "Go to",
  skill: "Your skills",
};

/**
 * The full palette for this account: the built-ins plus one entry per enabled
 * skill, so `/essay-editor` is as real a command as `/compact`.
 */
export function buildCommandList(
  skills: { slug: string; name: string; description: string; enabled: boolean }[],
): AdvisorCommand[] {
  const skillCommands: AdvisorCommand[] = skills
    .filter((s) => s.enabled)
    // A skill whose slug collides with a built-in would shadow it, and losing
    // `/export` to a skill someone happened to name "Export" is the kind of
    // bug that is very hard to explain. Built-ins win; the skill keeps working
    // by name and by @mention.
    .filter((s) => !isBuiltinName(s.slug))
    .map((s) => ({
      id: s.slug,
      slug: s.slug,
      summary: s.description || `Use the ${s.name} skill`,
      group: "skill" as const,
    }));
  return [...BUILTIN_COMMANDS, ...skillCommands];
}

function isBuiltinName(name: string): boolean {
  return BUILTIN_COMMANDS.some((c) => c.id === name || c.aliases?.includes(name));
}

/**
 * The `/…` token being typed, if the caret is inside one.
 *
 * Only fires when the slash opens the message: `/compact` is a command, and
 * "the deadline is 12/15" is not. Anything after the first whitespace is the
 * argument, at which point the palette closes and the text is just text.
 */
export function readCommandDraft(input: string): { name: string; rest: string } | null {
  if (!input.startsWith("/")) return null;
  const body = input.slice(1);
  const space = body.search(/\s/);
  if (space === -1) return { name: body, rest: "" };
  return { name: body.slice(0, space), rest: body.slice(space + 1) };
}

/** True while the palette should be open — a name is being typed, no argument yet. */
export function isPaletteOpen(input: string): boolean {
  const draft = readCommandDraft(input);
  return draft !== null && draft.rest === "" && !/\s$/.test(input);
}

export function matchCommands(commands: AdvisorCommand[], query: string): AdvisorCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  const scored = commands
    .map((c) => {
      const names = [c.id, ...(c.aliases ?? [])];
      // Prefix beats contains, so typing "co" offers /compact and /context
      // ahead of a skill that merely mentions "college" in its description.
      if (names.some((n) => n.startsWith(q))) return { c, score: 0 };
      if (names.some((n) => n.includes(q))) return { c, score: 1 };
      if (c.summary.toLowerCase().includes(q)) return { c, score: 2 };
      return null;
    })
    .filter((x): x is { c: AdvisorCommand; score: number } => x !== null);
  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.c);
}

/** Resolve a typed name (or alias) to its command. */
export function resolveCommand(commands: AdvisorCommand[], name: string): AdvisorCommand | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  return (
    commands.find((c) => c.id === n) ??
    commands.find((c) => c.aliases?.includes(n)) ??
    null
  );
}
