import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Archive,
  Blocks,
  Compass,
  Gauge,
  LayoutDashboard,
  FileBox,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Puzzle,
  Search,
  Settings,
  Terminal,
  UserCircle,
  X,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PathforgeAvatar } from "@/components/avatar/PathforgeAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { transition } from "@/lib/motion";
import { ConversationList } from "@/components/advisor/ConversationList";
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
 * The advisor's sidebar.
 *
 * One navigation system, not a stack of panels. Four fixed bands and exactly
 * one scrolling one:
 *
 *   header     — brand and the collapse control          (fixed, 56px)
 *   actions    — New chat, Search                        (fixed)
 *   workspace  — Library, Skills, Plugins, Commands, …   (fixed)
 *   history    — Projects, Pinned, Chats                 (THE scroll region)
 *   footer     — Archived, Settings, account             (fixed, pinned bottom)
 *
 * The whole sidebar used to be one column where the chat list was merely the
 * tallest child, so a long history pushed Settings off-screen and Archived —
 * which lived at the very bottom of that list — could only be reached by
 * scrolling past every chat you had. Archived is now a destination in the
 * pinned footer that swaps what the scroll region shows, which is why
 * ConversationList takes a `view` rather than a disclosure flag.
 *
 * Every row is `SidebarRow` from sidebarKit: 32px, 16px icon at 1.75 stroke,
 * one gutter, one radius, one type scale. Collapsed, it is a 64px icon rail; it
 * deliberately does not expand on hover, because a sidebar that changes width
 * when the pointer crosses it reflows the chat pane by accident.
 *
 * Under md it is not a sidebar at all — it is a left drawer, always expanded,
 * with every row relaxed to a 36px touch target.
 */

const SIDEBAR_EXPANDED = 272;
const SIDEBAR_COLLAPSED = 64;

/** The one shared id for the workspace nav's sliding active fill. */
const NAV_INDICATOR = "advisor-workspace-active";

export interface SessionNavBarProps {
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
  onOpenSkills: () => void;
  /** Same sheet as onOpenSkills, opened on the catalogue rather than what is installed. */
  onOpenPlugins: () => void;
  onOpenArtifacts: () => void;
  onOpenCommands: () => void;
  /** Deep-links to /profile?section=usage. */
  onOpenUsage: () => void;
  onOpenProfile: () => void;
  skillCount: number;
  artifactCount: number;
  /** The signed-in account. `id` seeds the default Pathforge avatar. */
  user: {
    id?: string | null;
    name: string;
    email?: string | null;
    /** `profiles.avatar_url` verbatim — resolved by PathforgeAvatar. */
    avatarUrl?: string | null;
    plan?: string | null;
  };
  /** Desktop sidebar open state. Owned by the page so the top bar can toggle it. */
  pinned?: boolean;
  /** Collapse/expand from inside the sidebar's own header. */
  onPinnedChange?: (open: boolean) => void;
  /** Mobile drawer. */
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

/**
 * The search field.
 *
 * At rest it is indistinguishable from a nav row — same height, same gutter,
 * same muted label — so it reads as part of the navigation rather than as a
 * form dropped into it. Focus is where it becomes a search: the field fills,
 * the placeholder changes to say what will happen, and a clear control appears.
 */
function SidebarSearch({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const [focused, setFocused] = useState(false);
  const engaged = focused || value.length > 0;

  return (
    <div
      className={cn(
        "group/row relative flex h-8 items-center gap-2.5 rounded-md px-2 transition-colors duration-100",
        engaged ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.045]",
      )}
    >
      <Search
        size={ICON_SIZE}
        strokeWidth={ICON_STROKE}
        className={cn(
          "shrink-0 transition-colors",
          engaged ? "text-foreground" : "text-muted-foreground",
        )}
      />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.stopPropagation();
            onChange("");
          }
        }}
        placeholder={engaged ? "Search titles and messages" : "Search chats"}
        aria-label="Search conversations"
        className={cn(
          "min-w-0 flex-1 bg-transparent text-[13px] leading-none outline-none",
          "placeholder:text-muted-foreground",
          engaged ? "text-foreground" : "text-muted-foreground",
        )}
      />
      {value && (
        <SidebarIconButton onClick={() => onChange("")} aria-label="Clear search">
          <X size={14} strokeWidth={ICON_STROKE} />
        </SidebarIconButton>
      )}
    </div>
  );
}

/**
 * The sidebar's contents. Shared verbatim by the desktop sidebar and the mobile
 * drawer — the drawer just always passes `expanded`.
 */
function SidebarContent({
  props,
  expanded,
  onToggle,
  onNavigate,
}: {
  props: SessionNavBarProps;
  expanded: boolean;
  /** Collapse/expand control. Omitted on mobile, where the drawer owns it. */
  onToggle?: () => void;
  /** Called after any action that should close the mobile drawer. */
  onNavigate?: () => void;
}) {
  const {
    onNewChat,
    onOpenSkills,
    onOpenPlugins,
    onOpenArtifacts,
    onOpenCommands,
    onOpenUsage,
    onOpenProfile,
    skillCount,
    artifactCount,
    user,
  } = props;

  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"chats" | "archived">("chats");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [focusSearch, setFocusSearch] = useState(false);

  // Clicking the collapsed search icon expands the sidebar first; the input only
  // exists to focus once that has happened.
  useEffect(() => {
    if (!focusSearch || !expanded) return;
    searchRef.current?.focus();
    setFocusSearch(false);
  }, [focusSearch, expanded]);

  // A search is a search of everything, so it takes precedence over which
  // destination is selected. Leaving Archived selected underneath a result list
  // drawn from both would make the selected footer row a lie.
  useEffect(() => {
    if (query.trim()) setView("chats");
  }, [query]);

  const run = (fn: () => void) => () => {
    fn();
    onNavigate?.();
  };

  const initialsSeed = user.id || user.email || user.name;
  const onDashboard = location.pathname === "/dashboard";

  const workspace = [
    { icon: FileBox, label: "Library", count: artifactCount, onClick: run(onOpenArtifacts) },
    { icon: Puzzle, label: "Skills", count: skillCount, onClick: run(onOpenSkills) },
    { icon: Blocks, label: "Plugins", onClick: run(onOpenPlugins) },
    { icon: Terminal, label: "Commands", onClick: run(onOpenCommands) },
  ];

  /*
   * The Workspace nav, hoisted so it can be rendered in two places.
   *
   * Expanded, it renders INSIDE the scroll region. Pinned, it was 200px of
   * immovable chrome: measured on production at a 670px viewport — a laptop
   * with the update banner showing — header + actions + nav + footer came to
   * 451px of a 483px sidebar, leaving the chat list a 32px slit. Workspace is
   * navigation you reach for occasionally; the chat list is the thing you are
   * actually navigating, and it must never be the band that gets crushed.
   *
   * Nothing moves when there is room: the nav still sits directly under Search
   * in the same order, and the region simply does not scroll. It starts
   * scrolling only when the alternative is an unusable list.
   *
   * Collapsed there is no scroll region at all — a column of identical chat
   * glyphs carries no information — so the rail keeps the nav pinned.
   */
  // Every one of these opens something the advisor actually has. It stays above
  // the history so the sidebar reads top-to-bottom as "what you can do", then
  // "what you've said".
  const workspaceNav = (
    <nav className="shrink-0 px-2 pb-2" aria-label="Workspace">
      {expanded && <SidebarLabel className="mt-1">Workspace</SidebarLabel>}
      {workspace.map((item) => (
        <SidebarRow
          key={item.label}
          icon={item.icon}
          label={item.label}
          collapsed={!expanded}
          onClick={item.onClick}
          title={expanded ? undefined : item.label}
          aria-label={item.label}
          trailing={item.count !== undefined ? <SidebarCount value={item.count} /> : undefined}
        />
      ))}
      <SidebarRow
        icon={LayoutDashboard}
        label="Dashboard"
        to="/dashboard"
        active={onDashboard}
        indicatorId={NAV_INDICATOR}
        collapsed={!expanded}
        onClick={onNavigate}
        title={expanded ? undefined : "Dashboard"}
        aria-label="Dashboard"
      />
    </nav>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header. The mark is an outline glyph in the accent, not a filled tile —
          a saturated square in the top-left corner is the loudest thing in a
          sidebar and it is never the thing you came here to press. */}
      <header
        className={cn(
          // `pr-12` under md keeps the header clear of the drawer's own close
          // button. The desktop sidebar is `hidden md:flex`, so it only ever
          // sees `md:pr-2`.
          "flex h-14 shrink-0 items-center gap-2 border-b border-border/70 pl-3 pr-12 md:pr-2",
          !expanded && "justify-center px-0",
        )}
      >
        <Compass
          size={18}
          strokeWidth={ICON_STROKE}
          className="shrink-0 text-primary"
          aria-hidden="true"
        />
        {expanded && (
          <>
            <span className="min-w-0 flex-1 truncate font-display text-[13.5px] font-semibold tracking-tight text-foreground">
              Advisor
            </span>
            {user.plan && (
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {user.plan}
              </span>
            )}
            {onToggle && (
              <SidebarIconButton onClick={onToggle} aria-label="Collapse sidebar" title="Collapse sidebar">
                <PanelLeftClose size={ICON_SIZE} strokeWidth={ICON_STROKE} />
              </SidebarIconButton>
            )}
          </>
        )}
      </header>

      {/* Primary actions. */}
      <div className="shrink-0 space-y-0.5 px-2 pb-1 pt-2">
        {onToggle && !expanded && (
          <SidebarRow
            icon={PanelLeftOpen}
            label="Expand sidebar"
            collapsed
            onClick={onToggle}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          />
        )}

        {/*
         * New chat is the only bordered row in the sidebar. That is what makes
         * it read as the primary action — not a saturated fill, which at this
         * width becomes a 240px block of brand colour that outweighs the chat
         * you are actually reading.
         */}
        <SidebarRow
          icon={Plus}
          label="New chat"
          collapsed={!expanded}
          onClick={run(onNewChat)}
          title={expanded ? undefined : "New chat"}
          aria-label="New chat"
          /* `ring-inset`, not `border`. A 1px border is laid out inside the
             row, which shifted this row's icon one pixel right of the icon
             column every other row shares — the kind of miss you feel as
             "slightly off" without being able to name it. */
          className={cn(
            "bg-foreground/[0.03] font-medium text-foreground ring-1 ring-inset ring-border",
            "hover:bg-foreground/[0.06] hover:text-foreground hover:ring-foreground/20",
          )}
        />

        {expanded ? (
          <SidebarSearch value={query} onChange={setQuery} inputRef={searchRef} />
        ) : (
          <SidebarRow
            icon={Search}
            label="Search chats"
            collapsed
            title="Search chats"
            aria-label="Search chats"
            onClick={() => {
              setFocusSearch(true);
              onToggle?.();
            }}
          />
        )}
      </div>

      {!expanded && workspaceNav}

      {/* History — the only region that scrolls. Collapsed, a column of identical
          chat glyphs carries no information, so the rail drops it entirely and
          keeps the icons that still mean something. */}
      {expanded ? (
        <div className="flex min-h-0 flex-1 flex-col border-t border-border/70">
          {/*
           * `[&_[data-radix-scroll-area-viewport]>div]:!block` is not decoration.
           * Radix renders the viewport's single child as `display: table;
           * min-width: 100%`, and a table box is sized shrink-to-fit — so
           * `min-width` is only a floor and the child grows to the list's
           * *max-content* width instead. A long chat title made that 341px inside
           * a 255px viewport, which pushed every row's hover actions past the
           * sidebar's edge where they were clipped away, and stopped the titles
           * from ever truncating. Forcing the child back to a block box gives it
           * a definite width, so the rows fit and `truncate` does its job. This
           * sidebar only ever scrolls vertically, so nothing is lost.
           */}
          <ScrollArea className="min-h-0 flex-1 pt-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
            {workspaceNav}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={query.trim() ? "search" : view}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={transition.fast}
                className="px-2"
              >
                <ConversationList
                  conversations={props.conversations}
                  archivedConversations={props.archivedConversations}
                  projects={props.projects}
                  currentConversationId={props.currentConversationId}
                  query={query}
                  view={view}
                  onSelect={run2(props.onSelect, onNavigate)}
                  onRename={props.onRename}
                  onArchive={props.onArchive}
                  onDelete={props.onDelete}
                  onTogglePin={props.onTogglePin}
                  onExport={props.onExport}
                  onSetProject={props.onSetProject}
                  onNewProject={run(props.onNewProject)}
                  onRenameProject={props.onRenameProject}
                  onDeleteProject={props.onDeleteProject}
                />
              </motion.div>
            </AnimatePresence>
          </ScrollArea>
        </div>
      ) : (
        <div className="min-h-0 flex-1" />
      )}

      {/* Pinned footer. Never scrolls away, however long the history gets. */}
      <div className="shrink-0 space-y-0.5 border-t border-border/70 px-2 py-2">
        <SidebarRow
          icon={Archive}
          label="Archived"
          active={view === "archived" && !query.trim()}
          indicatorId={NAV_INDICATOR}
          collapsed={!expanded}
          title={expanded ? undefined : "Archived"}
          aria-label="Archived"
          onClick={() => {
            if (!expanded) {
              onToggle?.();
            }
            setQuery("");
            setView((v) => (v === "archived" ? "chats" : "archived"));
          }}
          trailing={<SidebarCount value={props.archivedConversations.length} />}
        />
        <SidebarRow
          icon={Settings}
          label="Settings"
          collapsed={!expanded}
          onClick={run(onOpenProfile)}
          title={expanded ? undefined : "Settings"}
          aria-label="Settings"
        />

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              data-sidebar-row=""
              type="button"
              title={expanded ? undefined : user.name}
              aria-label={`Account: ${user.name}`}
              className={cn(
                "group/row relative flex h-8 w-full items-center rounded-md text-left text-[13px] leading-none",
                "text-muted-foreground transition-colors duration-100",
                "hover:bg-foreground/[0.045] hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "data-[state=open]:bg-foreground/[0.06] data-[state=open]:text-foreground",
                expanded ? "gap-2.5 px-2" : "justify-center px-0",
              )}
            >
              {/* The avatar is 20px against 16px icons, so it sits in a 16px
                  centring box: it overhangs symmetrically, its centre lands on
                  the same column as every icon above it, and the name still
                  starts at the shared label column. */}
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center",
                  expanded ? "w-4" : "w-auto",
                )}
              >
                <PathforgeAvatar stored={user.avatarUrl} seed={initialsSeed} size={20} />
              </span>
              {expanded && <span className="min-w-0 flex-1 truncate">{user.name}</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" sideOffset={6} className="w-60">
            <div className="flex items-center gap-2 p-2">
              <PathforgeAvatar
                stored={user.avatarUrl}
                seed={initialsSeed}
                size={28}
                cutout="hsl(var(--popover))"
              />
              <div className="flex min-w-0 flex-col text-left">
                <span className="truncate text-sm font-medium">{user.name}</span>
                {user.email && (
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={run(onOpenProfile)} className="gap-2 text-xs">
              <UserCircle className="h-3.5 w-3.5" /> Profile &amp; settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={run(onOpenUsage)} className="gap-2 text-xs">
              <Gauge className="h-3.5 w-3.5" /> Usage
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onNavigate?.();
                void signOut().then(() => navigate("/"));
              }}
              className="gap-2 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** Selecting a chat should also close the mobile drawer. */
function run2<T>(fn: (arg: T) => void, after?: () => void) {
  return (arg: T) => {
    fn(arg);
    after?.();
  };
}

export function SessionNavBar(props: SessionNavBarProps) {
  const { pinned = true, onPinnedChange, mobileOpen, onMobileOpenChange } = props;
  const reduceMotion = useReducedMotion();
  const width = pinned ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  return (
    <>
      {/* Mobile: a drawer, always expanded, every row relaxed to a 36px touch
          target. A 64px strip would eat a sixth of a phone screen, and hover —
          which is how the rail reveals row actions — means nothing on touch. */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[86vw] max-w-[320px] border-r-0 bg-[hsl(var(--adv-rail))] p-0 md:hidden [&_[data-sidebar-row]]:!h-9"
        >
          <SheetTitle className="sr-only">Advisor sessions</SheetTitle>
          <SidebarContent props={props} expanded onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop: always mounted and open by default, width-animated so it
          pushes the chat pane rather than covering it. */}
      <motion.aside
        initial={false}
        animate={{ width }}
        transition={reduceMotion ? { duration: 0 } : transition.base}
        style={reduceMotion ? { width } : undefined}
        /* No right border and no card white: the rail is a slightly darker
           shade of the canvas it sits against, the way the reference separates
           them — a hairline plus two different whites read as two panels
           bolted together. */
        className="hidden shrink-0 flex-col overflow-hidden bg-[hsl(var(--adv-rail))] md:flex"
      >
        <SidebarContent
          props={props}
          expanded={pinned}
          onToggle={onPinnedChange ? () => onPinnedChange(!pinned) : undefined}
        />
      </motion.aside>
    </>
  );
}
