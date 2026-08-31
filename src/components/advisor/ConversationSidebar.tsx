import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Blocks,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileBox,
  FolderOpen,
  Gauge,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Puzzle,
  Search,
  Settings,
  Terminal,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { transition } from "@/lib/motion";
import type { ConversationGroup, AdvisorProject } from "@/hooks/useAdvisorHistory";

/**
 * The advisor's conversation rail.
 *
 * Pulled out of Advisor.tsx because that file was doing three jobs at once, and
 * because the rail has its own state (search text, which project is collapsed,
 * which row is being renamed) that the chat has no business re-rendering for.
 *
 * Order is deliberate: search results replace everything when a query is
 * active; otherwise Pinned, then Projects, then date buckets, then Archived at
 * the bottom behind a disclosure.
 */

function groupByDate(conversations: ConversationGroup[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = today - 30 * 24 * 60 * 60 * 1000;

  const groups: { label: string; items: ConversationGroup[] }[] = [
    { label: "Today", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Previous 30 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const c of conversations) {
    const t = new Date(c.created_at).getTime();
    if (t >= today) groups[0].items.push(c);
    else if (t >= weekAgo) groups[1].items.push(c);
    else if (t >= monthAgo) groups[2].items.push(c);
    else groups[3].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

/** One row of the workspace rail: icon, name, and a count or shortcut on the right.
 *  Collapses to a centered icon-only button when the rail isn't expanded — the
 *  label/hint just aren't meaningful without the width to show them. */
function RailButton({
  icon: Icon,
  label,
  hint,
  onClick,
  expanded = true,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  onClick: () => void;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={expanded ? undefined : label}
      aria-label={label}
      className={cn(
        "flex h-8 w-full items-center rounded-lg transition-colors hover:bg-secondary/60",
        expanded ? "gap-2.5 px-2.5 text-left" : "justify-center px-0",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {expanded && (
        <>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{label}</span>
          {hint && (
            <span className="shrink-0 font-display text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {hint}
            </span>
          )}
        </>
      )}
    </button>
  );
}

export interface ConversationSidebarProps {
  conversations: ConversationGroup[];
  archivedConversations: ConversationGroup[];
  projects: AdvisorProject[];
  currentConversationId: string | null;
  onNewChat: () => void;
  onSelect: (conv: ConversationGroup) => void;
  onRename: (conversationId: string, name: string) => void;
  onArchive: (conversationId: string, archived: boolean) => void;
  onDelete: (conversationId: string) => void;
  onTogglePin: (conversationId: string, pinned: boolean) => void;
  onExport: (conversationId: string) => void;
  onSetProject: (conversationId: string, projectId: string | null) => void;
  onNewProject: () => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  /** The workspace rail below the chat list. */
  onOpenSkills: () => void;
  /** Same sheet as onOpenSkills, opened on the catalogue rather than what is installed. */
  onOpenPlugins: () => void;
  onOpenArtifacts: () => void;
  onOpenCommands: () => void;
  /** Deep-links to /profile?section=usage. */
  onOpenUsage: () => void;
  skillCount: number;
  artifactCount: number;
  /** The footer identity block. Name is all that is required — everything
   *  else degrades to initials and a plain "Account" line. */
  user: {
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
    plan?: string | null;
  };
  onOpenProfile: () => void;
  /** False renders the collapsed, icon-only rail (search/list/new-project
   *  hidden — a column of identical chat icons carries no information, so
   *  the rail only shows the parts that still mean something collapsed:
   *  "start a new chat" and the workspace icons below). */
  expanded?: boolean;
}


/**
 * The identity block at the foot of the rail.
 *
 * The rail previously ended at the archive disclosure, so there was nothing in
 * the advisor that said which account you were signed in as — you had to leave
 * for /profile to find out. It also gives the two account destinations the
 * "More" menu was carrying a permanent home, which is where anyone looks for
 * them.
 */
function SidebarFooter({
  user,
  expanded,
  onOpenProfile,
  onOpenUsage,
}: {
  user: ConversationSidebarProps["user"];
  expanded: boolean;
  onOpenProfile: () => void;
  onOpenUsage: () => void;
}) {
  const initials =
    user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  const avatar = (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[11px] font-semibold text-foreground">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );

  return (
    <div className="mt-auto border-t border-border p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={expanded ? undefined : user.name}
            aria-label={`Account: ${user.name}`}
            className={cn(
              "flex w-full items-center rounded-lg py-1.5 transition-colors hover:bg-secondary/60",
              expanded ? "gap-2.5 px-2 text-left" : "justify-center px-0",
            )}
          >
            {avatar}
            {expanded && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{user.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {user.plan || "Account"}
                  </span>
                </span>
                <MoreHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          {user.email && (
            <>
              <div className="truncate px-2 py-1.5 text-[11px] text-muted-foreground">
                {user.email}
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onOpenProfile} className="gap-2 text-xs">
            <Settings className="h-3.5 w-3.5" />
            Profile &amp; settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenUsage} className="gap-2 text-xs">
            <Gauge className="h-3.5 w-3.5" />
            Usage &amp; credits
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ConversationSidebar(props: ConversationSidebarProps) {
  const {
    expanded = true,
    conversations,
    archivedConversations,
    projects,
    currentConversationId,
    onNewChat,
    onSelect,
    onRename,
    onArchive,
    onDelete,
    onTogglePin,
    onExport,
    onSetProject,
    onNewProject,
    onRenameProject,
    onDeleteProject,
    onOpenSkills,
    onOpenPlugins,
    onOpenArtifacts,
    onOpenCommands,
    onOpenUsage,
    skillCount,
    artifactCount,
    user,
    onOpenProfile,
  } = props;

  const [query, setQuery] = useState("");
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const PROJECTS_VISIBLE_COUNT = 5;

  // The rail buttons jump to their sections, which live inside the scroll area.
  const projectsAnchorRef = useRef<HTMLDivElement | null>(null);
  const archivedAnchorRef = useRef<HTMLDivElement | null>(null);

  const trimmedQuery = query.trim().toLowerCase();
  const searching = trimmedQuery.length > 0;

  // Search spans titles and message bodies — a chat you remember by something
  // said in it is the whole reason to have search here.
  const searchResults = useMemo(() => {
    if (!searching) return [];
    const all = [...conversations, ...archivedConversations];
    return all
      .filter((c) => {
        if (c.name.toLowerCase().includes(trimmedQuery)) return true;
        return c.messages.some((m) => m.text.toLowerCase().includes(trimmedQuery));
      })
      .slice(0, 50);
  }, [searching, trimmedQuery, conversations, archivedConversations]);

  const pinned = useMemo(() => conversations.filter((c) => c.pinned), [conversations]);
  const projectMap = useMemo(() => {
    const m = new Map<string, ConversationGroup[]>();
    for (const p of projects) m.set(p.id, []);
    for (const c of conversations) {
      if (c.pinned) continue;
      if (c.project_id && m.has(c.project_id)) m.get(c.project_id)!.push(c);
    }
    return m;
  }, [conversations, projects]);
  const unassigned = useMemo(
    () => conversations.filter((c) => !c.pinned && !c.project_id),
    [conversations],
  );
  const dateGroups = useMemo(() => groupByDate(unassigned), [unassigned]);

  const commitRename = (conversationId: string) => {
    if (editName.trim()) onRename(conversationId, editName.trim());
    setEditingConvId(null);
    setEditName("");
  };

  const renderConv = (conv: ConversationGroup) => {
    const isActive = conv.conversation_id === currentConversationId;
    const isEditing = editingConvId === conv.conversation_id;
    const isConfirming = confirmDeleteId === conv.conversation_id;

    if (isEditing) {
      return (
        <div key={conv.conversation_id} className="flex items-center gap-1 p-1.5">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename(conv.conversation_id);
              if (e.key === "Escape") setEditingConvId(null);
            }}
            className="h-7 text-sm"
            autoFocus
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={() => commitRename(conv.conversation_id)}
            aria-label="Save conversation name"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={() => setEditingConvId(null)}
            aria-label="Cancel rename"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }

    if (isConfirming) {
      return (
        <div
          key={conv.conversation_id}
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-2.5 py-2"
        >
          <div className="truncate text-xs text-foreground">Delete "{conv.name}"?</div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-6 bg-destructive px-2 text-[11px] text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(conv.conversation_id);
                setConfirmDeleteId(null);
              }}
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              onClick={() => setConfirmDeleteId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={conv.conversation_id}
        className={cn(
          "group/row relative flex items-center rounded-lg transition-colors",
          isActive ? "bg-secondary" : "hover:bg-secondary/50",
        )}
      >
        <button
          onClick={() => onSelect(conv)}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
        >
          {conv.pinned ? (
            <Zap className="h-3.5 w-3.5 shrink-0 fill-accent text-accent" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          {/* No archived badge here any more: the action button on the right of
              the row already shows ArchiveRestore rather than Archive when a
              chat is archived, and two archive icons on one row is noise. */}
          <span className="flex-1 truncate text-sm">{conv.name}</span>
        </button>
        {/*
         * Archive gets its own always-visible control rather than living only
         * inside the overflow menu. It was reported as missing, and it was:
         * the menu trigger is hover-revealed on desktop, so on a pointer device
         * nothing about a row suggested it could be archived until you happened
         * to hover it. Archiving is the main thing anyone does to an old chat,
         * so it is worth the 28px.
         */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onArchive(conv.conversation_id, !conv.archived);
          }}
          className="rounded p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          aria-label={conv.archived ? `Restore "${conv.name}" from archive` : `Archive "${conv.name}"`}
          title={conv.archived ? "Restore from archive" : "Archive"}
        >
          {conv.archived ? (
            <ArchiveRestore className="h-3.5 w-3.5" />
          ) : (
            <Archive className="h-3.5 w-3.5" />
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              // Visible by default, hover-revealed only where there is a
              // pointer: rename/pin/export/archive have no other entry point,
              // so an opacity-0 trigger made them unreachable on touch.
              className="mr-1 rounded p-2 opacity-100 transition-opacity hover:bg-background focus:outline-none data-[state=open]:opacity-100 md:opacity-0 md:group-hover/row:opacity-100"
              aria-label="Conversation options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() => onTogglePin(conv.conversation_id, !conv.pinned)}
              className="gap-2 text-xs"
            >
              <Zap className="h-3.5 w-3.5" />
              {conv.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditingConvId(conv.conversation_id);
                setEditName(conv.name);
              }}
              className="gap-2 text-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onExport(conv.conversation_id)}
              className="gap-2 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export as Markdown
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <div className="px-2 py-1 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Move to project
            </div>
            <DropdownMenuItem
              onClick={() => onSetProject(conv.conversation_id, null)}
              className="gap-2 text-xs"
              disabled={!conv.project_id}
            >
              <X className="h-3.5 w-3.5" />
              No project
            </DropdownMenuItem>
            {projects.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => onSetProject(conv.conversation_id, p.id)}
                className="gap-2 text-xs"
                disabled={conv.project_id === p.id}
              >
                <FileBox className="h-3.5 w-3.5" />
                <span className="truncate">{p.name}</span>
              </DropdownMenuItem>
            ))}
            {projects.length === 0 && (
              <DropdownMenuItem onClick={onNewProject} className="gap-2 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Create project…
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onArchive(conv.conversation_id, !conv.archived)}
              className="gap-2 text-xs"
            >
              {conv.archived ? (
                <ArchiveRestore className="h-3.5 w-3.5" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              {conv.archived ? "Restore from archive" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmDeleteId(conv.conversation_id)}
              className="gap-2 text-xs text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const isEmpty = conversations.length === 0 && archivedConversations.length === 0;

  if (!expanded) {
    return (
      <div className="flex h-full flex-col items-center gap-1 border-b border-border py-3">
        <button
          type="button"
          onClick={onNewChat}
          title="New chat"
          aria-label="New chat"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="mt-auto w-full space-y-1 px-2">
          <RailButton icon={Puzzle} label="Skills" onClick={onOpenSkills} expanded={false} />
          <RailButton icon={Blocks} label="Plugins" onClick={onOpenPlugins} expanded={false} />
          <RailButton icon={Terminal} label="Commands" onClick={onOpenCommands} expanded={false} />
          <RailButton icon={FileBox} label="Artifacts" onClick={onOpenArtifacts} expanded={false} />
          <RailButton
            icon={FolderOpen}
            label="Projects"
            expanded={false}
            onClick={() => {
              if (projects.length === 0) onNewProject();
              else projectsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
          <RailButton icon={Archive} label="Archived" onClick={() => setArchivedOpen(true)} expanded={false} />
          <RailButton icon={Gauge} label="Usage & credits" onClick={onOpenUsage} expanded={false} />
        </div>
        <SidebarFooter
          user={user}
          expanded={false}
          onOpenProfile={onOpenProfile}
          onOpenUsage={onOpenUsage}
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="h-9 pl-8 pr-8 text-sm"
            aria-label="Search conversations"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/*
         * Top rail, in the requested order: New chat, Library, Plugins, then
         * everything else folded into one "More" menu instead of a fake
         * "Scheduled" row — the advisor has no scheduled-task feature, so
         * that slot isn't reproduced. Skills/Commands/Archived/Usage live in
         * "More" rather than in the always-on rail at the bottom, which this
         * replaces.
         */}
        <RailButton icon={Plus} label="New chat" onClick={onNewChat} />
        <RailButton
          icon={FileBox}
          label="Library"
          hint={artifactCount > 0 ? String(artifactCount) : undefined}
          onClick={onOpenArtifacts}
        />
        <RailButton icon={Blocks} label="Plugins" onClick={onOpenPlugins} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors hover:bg-secondary/60"
            >
              <MoreHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={onOpenSkills} className="gap-2 text-xs">
              <Puzzle className="h-3.5 w-3.5" />
              Skills
              {skillCount > 0 && <span className="ml-auto text-muted-foreground">{skillCount}</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenCommands} className="gap-2 text-xs">
              <Terminal className="h-3.5 w-3.5" />
              Commands
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setQuery("");
                setArchivedOpen(true);
                window.setTimeout(
                  () => archivedAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  50,
                );
              }}
              className="gap-2 text-xs"
            >
              <Archive className="h-3.5 w-3.5" />
              Archived
              <span className="ml-auto text-muted-foreground">{archivedConversations.length}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenUsage} className="gap-2 text-xs">
              <Gauge className="h-3.5 w-3.5" />
              Usage &amp; credits
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        {searching ? (
          <div>
            <div className="mb-1 px-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {searchResults.length === 0
                ? "No matches"
                : `${searchResults.length} result${searchResults.length > 1 ? "s" : ""}`}
            </div>
            {searchResults.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nothing matches "{query.trim()}".
              </p>
            ) : (
              <div className="space-y-0.5">{searchResults.map(renderConv)}</div>
            )}
          </div>
        ) : isEmpty ? (
          <div className="px-3 py-10 text-center">
            <MessageSquare className="mx-auto mb-2 h-5 w-5 text-muted-foreground/50" />
            <p className="text-sm font-medium">No chats yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ask the advisor anything — your history shows up here.
            </p>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="mb-4">
                <div className="mb-1 flex items-center gap-1 px-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <Zap className="h-3 w-3" /> Pinned
                </div>
                <div className="space-y-0.5">{pinned.map(renderConv)}</div>
              </div>
            )}

            <div ref={projectsAnchorRef} className="mb-4 scroll-mt-2">
                <div className="mb-1 flex items-center gap-1 px-2">
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Projects
                  </span>
                  <button
                    type="button"
                    onClick={onNewProject}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    aria-label="New project"
                    title="New project"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {projects.length === 0 && (
                  <button
                    type="button"
                    onClick={onNewProject}
                    className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-secondary/40"
                  >
                    No projects yet — create one.
                  </button>
                )}
                <div className="space-y-1">
                  {(showAllProjects ? projects : projects.slice(0, PROJECTS_VISIBLE_COUNT)).map((p) => {
                    const items = projectMap.get(p.id) || [];
                    const collapsed = !!collapsedProjects[p.id];
                    const isEditing = editingProjectId === p.id;
                    return (
                      <div key={p.id} className="rounded-md">
                        {isEditing ? (
                          <div className="flex items-center gap-1 p-1.5">
                            <Input
                              value={editProjectName}
                              onChange={(e) => setEditProjectName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  onRenameProject(p.id, editProjectName);
                                  setEditingProjectId(null);
                                }
                                if (e.key === "Escape") setEditingProjectId(null);
                              }}
                              className="h-7 text-sm"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              onClick={() => {
                                onRenameProject(p.id, editProjectName);
                                setEditingProjectId(null);
                              }}
                              aria-label="Save project name"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="group/proj flex items-center rounded px-2 py-1 hover:bg-secondary/40">
                            <button
                              onClick={() =>
                                setCollapsedProjects((s) => ({ ...s, [p.id]: !s[p.id] }))
                              }
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              <ChevronRight
                                className={cn(
                                  "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200",
                                  !collapsed && "rotate-90",
                                )}
                              />
                              <FileBox className="h-3.5 w-3.5 shrink-0 text-accent" />
                              <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {items.length}
                              </span>
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="ml-0.5 rounded p-2 opacity-100 transition-opacity hover:bg-background data-[state=open]:opacity-100 md:opacity-0 md:group-hover/proj:opacity-100"
                                  aria-label="Project options"
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingProjectId(p.id);
                                    setEditProjectName(p.name);
                                  }}
                                  className="gap-2 text-xs"
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => onDeleteProject(p.id)}
                                  className="gap-2 text-xs text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete project
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                        {!collapsed && items.length > 0 && (
                          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/60 pl-1.5">
                            {items.map(renderConv)}
                          </div>
                        )}
                        {!collapsed && items.length === 0 && (
                          <div className="ml-5 px-2 py-1 text-[11px] text-muted-foreground">
                            Empty — move a chat here.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {projects.length > PROJECTS_VISIBLE_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllProjects((v) => !v)}
                    className="mt-0.5 w-full rounded-lg px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
                  >
                    {showAllProjects ? "Show less" : `Show more (${projects.length - PROJECTS_VISIBLE_COUNT})`}
                  </button>
                )}
            </div>

            {(pinned.length > 0 || dateGroups.length > 0) && (
              <div className="mb-1 px-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Chats
              </div>
            )}
            {dateGroups.map((g) => (
              <div key={g.label} className="mb-4">
                <div className="mb-1 px-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {g.label}
                </div>
                <div className="space-y-0.5">{g.items.map(renderConv)}</div>
              </div>
            ))}
          </>
        )}

        {/* Rendered whether or not anything is archived. An archive that only
            exists once you have used it cannot be discovered, and the rail
            button above needs somewhere to land. */}
        {!searching && (
          <div ref={archivedAnchorRef} className="mt-4 scroll-mt-2 border-t border-border/60 pt-3">
            <button
              onClick={() => setArchivedOpen((v) => !v)}
              className="flex w-full items-center gap-1.5 px-2 py-1 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={archivedOpen}
            >
              {archivedOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Archive className="h-3 w-3" />
              Archived
              <span className="ml-auto font-normal normal-case text-muted-foreground/70">
                {archivedConversations.length}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {archivedOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={transition.fast}
                  className="overflow-hidden"
                >
                  {archivedConversations.length === 0 ? (
                    <p className="px-3 py-3 text-[11px] leading-relaxed text-muted-foreground">
                      Nothing archived. Use the archive button on any chat to move it out of the
                      list without deleting it.
                    </p>
                  ) : (
                    <div className="mt-1 space-y-0.5 opacity-80">
                      {archivedConversations.map(renderConv)}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      <SidebarFooter
        user={user}
        expanded
        onOpenProfile={onOpenProfile}
        onOpenUsage={onOpenUsage}
      />
    </>
  );
}
