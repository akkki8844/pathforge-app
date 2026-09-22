import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronRight,
  Download,
  Folder,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
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
import {
  ICON_SIZE,
  ICON_STROKE,
  SidebarCount,
  SidebarIconButton,
  SidebarLabel,
  SidebarRow,
} from "@/components/advisor/sidebarKit";
import type { ConversationGroup, AdvisorProject } from "@/hooks/useAdvisorHistory";

/**
 * The advisor's chat history — projects, pinned chats, date buckets, search
 * results and the archive — with no chrome of its own.
 *
 * Every row here is the shared `SidebarRow`, so a conversation and a Workspace
 * entry are the same object at the same height with the same hover. This file
 * used to draw its own rows, its own three different section-heading styles and
 * its own count pills, which is why the sidebar looked like two products.
 *
 * `query` and `view` are both owned by the parent: the collapsed rail can put a
 * search in flight before this list is visible, and Archived is a destination
 * in the sidebar's pinned footer rather than a disclosure buried under a long
 * scroll.
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
  /** Which destination the scroll region is showing. */
  view: "chats" | "archived";
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
}

const PROJECTS_VISIBLE_COUNT = 5;

export function ConversationList({
  conversations,
  archivedConversations,
  projects,
  currentConversationId,
  query,
  view,
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
}: ConversationListProps) {
  const reduceMotion = useReducedMotion();
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);

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

  /** Rows enter and leave, but never on first paint — a list that animates in on
   *  every mount makes navigating back to the advisor feel slow. */
  const rowMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: "auto" as const },
        exit: { opacity: 0, height: 0 },
        transition: transition.fast,
      };

  const renderConv = (conv: ConversationGroup, depth = 0) => {
    const isActive = conv.conversation_id === currentConversationId;
    const isEditing = editingConvId === conv.conversation_id;
    const isConfirming = confirmDeleteId === conv.conversation_id;

    if (isEditing) {
      return (
        <div key={conv.conversation_id} className="flex items-center gap-1 px-2 py-0.5">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename(conv.conversation_id);
              if (e.key === "Escape") setEditingConvId(null);
            }}
            className="h-7 rounded-md px-2 text-[13px]"
            autoFocus
          />
          <SidebarIconButton
            onClick={() => commitRename(conv.conversation_id)}
            aria-label="Save conversation name"
          >
            <Check size={14} strokeWidth={ICON_STROKE} />
          </SidebarIconButton>
          <SidebarIconButton onClick={() => setEditingConvId(null)} aria-label="Cancel rename">
            <X size={14} strokeWidth={ICON_STROKE} />
          </SidebarIconButton>
        </div>
      );
    }

    if (isConfirming) {
      return (
        <div
          key={conv.conversation_id}
          className="mx-2 rounded-md border border-destructive/30 bg-destructive/[0.06] px-2.5 py-2"
        >
          <p className="truncate text-[12px] text-foreground">Delete “{conv.name}”?</p>
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              className="rounded bg-destructive px-2 py-1 text-[11px] font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              onClick={() => {
                onDelete(conv.conversation_id);
                setConfirmDeleteId(null);
              }}
            >
              Delete
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setConfirmDeleteId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <SidebarRow
        key={conv.conversation_id}
        depth={depth}
        active={isActive}
        onClick={() => onSelect(conv)}
        label={conv.name}
        title={conv.name}
        leading={
          conv.pinned ? (
            <Pin size={ICON_SIZE} strokeWidth={ICON_STROKE} className="fill-current opacity-70" />
          ) : (
            <MessageSquare size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          )
        }
        tone="content"
        actions={
          <>
            <SidebarIconButton
              onClick={(e) => {
                e.stopPropagation();
                onArchive(conv.conversation_id, !conv.archived);
              }}
              aria-label={
                conv.archived ? `Restore “${conv.name}” from archive` : `Archive “${conv.name}”`
              }
              title={conv.archived ? "Restore from archive" : "Archive"}
            >
              {conv.archived ? (
                <ArchiveRestore size={14} strokeWidth={ICON_STROKE} />
              ) : (
                <Archive size={14} strokeWidth={ICON_STROKE} />
              )}
            </SidebarIconButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarIconButton
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Options for “${conv.name}”`}
                >
                  <MoreHorizontal size={14} strokeWidth={ICON_STROKE} />
                </SidebarIconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => onTogglePin(conv.conversation_id, !conv.pinned)}
                  className="gap-2 text-xs"
                >
                  <Pin className="h-3.5 w-3.5" />
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
                <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
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
                    <Folder className="h-3.5 w-3.5" />
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
          </>
        }
      />
    );
  };

  /** A short, quiet line. Not an illustrated empty state with a call to action —
   *  the call to action is the New chat button two inches above it. */
  const emptyNote = (text: string) => (
    <p className="px-2 py-3 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
  );

  if (searching) {
    return (
      <div className="pb-2">
        <SidebarLabel>
          {searchResults.length === 0
            ? "No matches"
            : `${searchResults.length} result${searchResults.length > 1 ? "s" : ""}`}
        </SidebarLabel>
        {searchResults.length === 0
          ? emptyNote(`Nothing matches “${query.trim()}”.`)
          : searchResults.map((c) => renderConv(c))}
      </div>
    );
  }

  if (view === "archived") {
    return (
      <div className="pb-2">
        <SidebarLabel>Archived</SidebarLabel>
        {archivedConversations.length === 0
          ? emptyNote(
              "Nothing archived. Use the archive button on any chat to move it out of the list without deleting it.",
            )
          : archivedConversations.map((c) => renderConv(c))}
      </div>
    );
  }

  const nothingYet = conversations.length === 0;

  return (
    <div className="pb-2">
      {/* Projects */}
      <SidebarLabel
        action={
          <SidebarIconButton
            onClick={onNewProject}
            aria-label="New project"
            title="New project"
            className="md:opacity-0 md:group-hover/label:opacity-100 md:focus-visible:opacity-100"
          >
            <Plus size={14} strokeWidth={ICON_STROKE} />
          </SidebarIconButton>
        }
      >
        Projects
      </SidebarLabel>

      {projects.length === 0
        ? emptyNote("No projects yet. Group related chats to keep long threads together.")
        : (showAllProjects ? projects : projects.slice(0, PROJECTS_VISIBLE_COUNT)).map((p) => {
            const items = projectMap.get(p.id) || [];
            const collapsed = !!collapsedProjects[p.id];
            const isEditing = editingProjectId === p.id;

            if (isEditing) {
              return (
                <div key={p.id} className="flex items-center gap-1 px-2 py-0.5">
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
                    className="h-7 rounded-md px-2 text-[13px]"
                    autoFocus
                  />
                  <SidebarIconButton
                    onClick={() => {
                      onRenameProject(p.id, editProjectName);
                      setEditingProjectId(null);
                    }}
                    aria-label="Save project name"
                  >
                    <Check size={14} strokeWidth={ICON_STROKE} />
                  </SidebarIconButton>
                </div>
              );
            }

            return (
              <div key={p.id}>
                <SidebarRow
                  label={p.name}
                  title={p.name}
                  onClick={() => setCollapsedProjects((s) => ({ ...s, [p.id]: !s[p.id] }))}
                  leading={
                    <ChevronRight
                      size={ICON_SIZE}
                      strokeWidth={ICON_STROKE}
                      className={cn(
                        "transition-transform duration-150",
                        !collapsed && "rotate-90",
                      )}
                    />
                  }
                  trailing={<SidebarCount value={items.length} />}
                  actions={
                    <>
                      <span className="pr-1">
                        <SidebarCount value={items.length} />
                      </span>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarIconButton
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Options for project “${p.name}”`}
                            >
                              <MoreHorizontal size={14} strokeWidth={ICON_STROKE} />
                            </SidebarIconButton>
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
                    </>
                  }
                />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div {...rowMotion} className="overflow-hidden">
                      {items.length > 0 ? (
                        items.map((c) => renderConv(c, 1))
                      ) : (
                        <p className="py-1 pl-[42px] pr-2 text-[11.5px] text-muted-foreground">
                          Empty — move a chat here.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

      {projects.length > PROJECTS_VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setShowAllProjects((v) => !v)}
          className="mt-0.5 w-full rounded-md px-2 py-1 text-left text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {showAllProjects ? "Show less" : `Show ${projects.length - PROJECTS_VISIBLE_COUNT} more`}
        </button>
      )}

      {/* Pinned */}
      {pinned.length > 0 && (
        <>
          <SidebarLabel className="mt-3">Pinned</SidebarLabel>
          {pinned.map((c) => renderConv(c))}
        </>
      )}

      {/* Chats. The date buckets under it are only labelled when there is more
          than one — a lone "Today" heading directly under "Chats" is a second
          heading that adds a row of height and no information. */}
      {(nothingYet || dateGroups.length <= 1) && (
        <SidebarLabel className="mt-3">Chats</SidebarLabel>
      )}
      {nothingYet
        ? emptyNote("No chats yet. Ask the advisor anything and it shows up here.")
        : dateGroups.map((g, i) => (
            <div key={g.label}>
              {dateGroups.length > 1 && (
                <SidebarLabel className={i === 0 ? "mt-3" : "mt-2"}>{g.label}</SidebarLabel>
              )}
              {g.items.map((c) => renderConv(c))}
            </div>
          ))}
    </div>
  );
}
