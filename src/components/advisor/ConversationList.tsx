import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileBox,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// One small-caps label for every section heading in this rail — Pinned,
// Projects, Chats, the date buckets under it, and Archived all used to carry
// slightly different sizes, weights and tracking, which is what made the list
// read as several components stitched together rather than one list.
const SECTION_EYEBROW = "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
// The date buckets ("Previous 7 days"...) sit one level under "Chats"; a
// lighter, smaller label plus extra indent is what actually reads as nested
// rather than another top-level section of equal weight.
const SUBGROUP_LABEL = "text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70";
// The neutral count next to a project name — same pill shape as the primary-
// tinted badges in the rail's workspace links, in muted ink since it is
// informational rather than something new to look at.
const COUNT_PILL = "inline-flex shrink-0 items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground";

/**
 * The advisor's chat history, without any surrounding chrome.
 *
 * Extracted from ConversationSidebar so the hover-expanding rail
 * (SessionNavBar) can own the shell — header, workspace nav, identity footer —
 * while this file keeps the part that is genuinely about conversations:
 * search results, Pinned, Projects, date buckets, and Archived at the bottom
 * behind a disclosure, plus every per-row action (rename, pin, export, move to
 * project, archive, delete).
 *
 * `query` is owned by the parent because the collapsed rail needs a search
 * button that can put a query in flight before this list is even visible.
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

export interface ConversationListProps {
  conversations: ConversationGroup[];
  archivedConversations: ConversationGroup[];
  projects: AdvisorProject[];
  currentConversationId: string | null;
  /** Search text, owned by the rail so its collapsed search button can drive it. */
  query: string;
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
  /** Archive disclosure, lifted so the rail's "Archived" button can open it. */
  archivedOpen: boolean;
  onArchivedOpenChange: (open: boolean) => void;
}

const PROJECTS_VISIBLE_COUNT = 5;

export function ConversationList({
  conversations,
  archivedConversations,
  projects,
  currentConversationId,
  query,
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
  archivedOpen,
  onArchivedOpenChange,
}: ConversationListProps) {
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const archivedAnchorRef = useRef<HTMLDivElement | null>(null);

  // Opening the archive from the rail should also bring it into view — it
  // lives at the very bottom of a long list.
  useEffect(() => {
    if (!archivedOpen) return;
    const id = window.setTimeout(
      () => archivedAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      60,
    );
    return () => window.clearTimeout(id);
  }, [archivedOpen]);

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
          "group/row relative flex min-h-9 items-center rounded-lg transition-colors",
          isActive ? "bg-secondary" : "hover:bg-secondary/50",
        )}
      >
        <button
          onClick={() => onSelect(conv)}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
        >
          {conv.pinned ? (
            <Zap className="h-4 w-4 shrink-0 fill-accent text-accent" />
          ) : (
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="flex-1 truncate text-[13px] font-medium">{conv.name}</span>
        </button>
        {/*
         * Archive keeps its own always-visible control rather than living only
         * inside the overflow menu: the menu trigger is hover-revealed on
         * desktop, so nothing about a row would suggest it can be archived.
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
            <div className={cn("px-2 py-1", SECTION_EYEBROW)}>Move to project</div>
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

  return (
    <>
      {searching ? (
        <div>
          <div className={cn("mb-1 px-2", SECTION_EYEBROW)}>
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
            <div className="mb-5">
              <div className={cn("mb-1.5 flex items-center gap-1.5 px-2", SECTION_EYEBROW)}>
                <Zap className="h-3 w-3" /> Pinned
              </div>
              <div className="space-y-0.5">{pinned.map(renderConv)}</div>
            </div>
          )}

          <div className="mb-5 scroll-mt-2">
            <div className="mb-1.5 flex items-center gap-1.5 px-2">
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className={cn("flex-1", SECTION_EYEBROW)}>Projects</span>
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
                          onClick={() => setCollapsedProjects((s) => ({ ...s, [p.id]: !s[p.id] }))}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <ChevronRight
                            className={cn(
                              "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200",
                              !collapsed && "rotate-90",
                            )}
                          />
                          <FileBox className="h-4 w-4 shrink-0 text-accent" />
                          <span className="flex-1 truncate text-[13px] font-medium">{p.name}</span>
                          <span className={COUNT_PILL}>{items.length}</span>
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
                {showAllProjects
                  ? "Show less"
                  : `Show more (${projects.length - PROJECTS_VISIBLE_COUNT})`}
              </button>
            )}
          </div>

          {(pinned.length > 0 || dateGroups.length > 0) && (
            <div className={cn("mb-2 px-2", SECTION_EYEBROW)}>Chats</div>
          )}
          {dateGroups.map((g) => (
            <div key={g.label} className="mb-3">
              <div className={cn("mb-1 px-3", SUBGROUP_LABEL)}>{g.label}</div>
              <div className="space-y-0.5">{g.items.map(renderConv)}</div>
            </div>
          ))}
        </>
      )}

      {/* Rendered whether or not anything is archived — an archive that only
          exists once you have used it cannot be discovered, and the rail's
          Archived button needs somewhere to land. */}
      {!searching && (
        <div ref={archivedAnchorRef} className="mt-5 scroll-mt-2 border-t border-border pt-4">
          <button
            onClick={() => onArchivedOpenChange(!archivedOpen)}
            className={cn(
              "flex w-full items-center gap-1.5 px-2 py-1 transition-colors hover:text-foreground",
              SECTION_EYEBROW,
            )}
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
                    Nothing archived. Use the archive button on any chat to move it out of the list
                    without deleting it.
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
    </>
  );
}
