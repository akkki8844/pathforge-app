import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Blocks,
  Compass,
  FileBox,
  Gauge,
  LayoutDashboard,
  LogOut,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Terminal,
  Puzzle,
  UserCircle,
  ChevronsUpDown,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { ConversationList } from "@/components/advisor/ConversationList";
import type { ConversationGroup, AdvisorProject } from "@/hooks/useAdvisorHistory";

/**
 * The advisor's sidebar.
 *
 * A persistent 280px dashboard sidebar — open by default, collapsed to a 64px
 * icon rail only when the reader asks for it, from the toggle in its own
 * header or the one in the advisor top bar. It deliberately does *not* expand
 * on hover: a sidebar that changes width whenever the pointer crosses it
 * reflows the chat pane by accident and can never be read at rest, which is
 * what made the previous rail feel unfinished.
 *
 * Layout rules the whole thing is built on, so rows stay aligned as items are
 * added:
 *   - one 12px gutter (`px-3`) for every section, header and footer included,
 *     so every icon sits on the same vertical line at both widths;
 *   - rows are a fixed 36px with a 12px icon/label gap and `text-left` — a
 *     <button> is centred by the user-agent stylesheet, which is what threw
 *     "Library"/"Skills"/"Plugins" into the middle of the rail while the
 *     <a>-rendered "Dashboard" sat correctly at the left;
 *   - counts are pushed to the right edge with `ml-auto` rather than trailing
 *     the label, so the numbers form their own column.
 *
 * Everything in it is wired to something real: the chat list and its actions
 * come from the advisor's conversation hooks, the workspace entries open the
 * panels the advisor actually has, the route links go to routes that exist,
 * and the identity block is the signed-in account with its Pathforge avatar.
 *
 * On < md it is not a sidebar at all: it renders as a left drawer at full
 * width, always expanded.
 */

const SIDEBAR_EXPANDED = 280;
const SIDEBAR_COLLAPSED = 64;

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

/** A section heading. Only rendered at full width. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-1">
      <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
        {children}
      </span>
    </div>
  );
}

/** One sidebar row. Renders as a link when `to` is given, a button otherwise. */
function NavItem({
  icon: Icon,
  label,
  badge,
  active,
  expanded,
  onClick,
  to,
}: {
  icon: LucideIcon;
  label: string;
  badge?: number;
  active?: boolean;
  expanded: boolean;
  onClick?: () => void;
  to?: string;
}) {
  const className = cn(
    // `text-left` is load-bearing: without it a <button> centres its label and
    // the row stops lining up with the <a>-rendered rows beside it.
    "group flex h-9 w-full items-center rounded-lg text-left text-muted-foreground transition-colors",
    "hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    expanded ? "gap-3 px-3" : "justify-center px-0",
    active && "bg-secondary font-medium text-foreground",
  );

  const body = (
    <>
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active ? "text-primary" : "text-muted-foreground",
        )}
      />
      {expanded && (
        <>
          <span className="min-w-0 flex-1 truncate text-[13.5px] leading-none">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="ml-auto shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-muted-foreground group-hover:bg-background">
              {badge}
            </span>
          )}
        </>
      )}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        title={expanded ? undefined : label}
        aria-label={label}
        className={className}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={expanded ? undefined : label}
      aria-label={label}
      className={className}
    >
      {body}
    </button>
  );
}

/**
 * The sidebar's contents. Shared verbatim by the desktop sidebar and the
 * mobile drawer — the drawer just always passes `expanded`.
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

  const [query, setQuery] = useState("");
  const [archivedOpen, setArchivedOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [focusSearch, setFocusSearch] = useState(false);

  // Clicking the collapsed search icon expands the sidebar first; the input
  // only exists to focus once that has happened.
  useEffect(() => {
    if (!focusSearch || !expanded) return;
    searchRef.current?.focus();
    setFocusSearch(false);
  }, [focusSearch, expanded]);

  const run = (fn: () => void) => () => {
    fn();
    onNavigate?.();
  };

  const initialsSeed = user.id || user.email || user.name;

  return (
    <div className="flex h-full min-h-0 flex-col text-muted-foreground">
      {/* Header — brand, plan, and the collapse control. A sidebar that can
          only be collapsed from somewhere else is not a sidebar. */}
      <div
        className={cn(
          // `pr-10` under md keeps the plan badge clear of the sheet's own
          // close button, which sits at the drawer's top-right. The desktop
          // sidebar is `hidden md:flex`, so it only ever sees `md:pr-3`.
          "flex h-14 shrink-0 items-center border-b border-border pl-3 pr-10 md:pr-3",
          expanded ? "gap-2" : "justify-center",
        )}
      >
        {/* Brand, not a link. It used to navigate to /dashboard while reading
            "Advisor", so the one thing in the sidebar labelled with the page
            you are on took you somewhere else. Getting to the dashboard is
            the labelled Dashboard row below. */}
        <div
          className={cn(
            "flex min-w-0 items-center",
            // `px-3` matches every row below, so the brand tile's left edge
            // lands on the same vertical line as the nav icons.
            expanded ? "h-9 flex-1 gap-3 px-3" : "h-9 w-9 justify-center",
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" />
          </span>
          {expanded && (
            <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-foreground">
              Advisor
            </span>
          )}
          {expanded && user.plan && (
            <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {user.plan}
            </span>
          )}
        </div>
        {onToggle && expanded && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {onToggle && !expanded && (
        <div className="shrink-0 px-3 pt-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          </button>
        </div>
      )}

      {/* Primary action + search */}
      <div className="shrink-0 space-y-2 px-3 pb-2 pt-3">
        <button
          type="button"
          onClick={run(onNewChat)}
          title={expanded ? undefined : "New chat"}
          aria-label="New chat"
          className={cn(
            "flex h-9 w-full items-center rounded-lg bg-primary text-left font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90",
            expanded ? "gap-3 px-3" : "justify-center px-0",
          )}
        >
          <MessageSquarePlus className="h-[18px] w-[18px] shrink-0" />
          {expanded && (
            <span className="min-w-0 flex-1 truncate text-[13.5px] leading-none">New chat</span>
          )}
        </button>

        {expanded ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-9 rounded-lg pl-9 pr-9 text-[13.5px]"
              aria-label="Search conversations"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <NavItem
            icon={Search}
            label="Search chats"
            expanded={false}
            onClick={() => {
              setFocusSearch(true);
              onToggle?.();
            }}
          />
        )}
      </div>

      {/* Workspace — every one of these opens something the advisor has.
          Above the chat list so the sidebar reads top-to-bottom as "what you
          can do" then "what you've said". */}
      <div className="shrink-0 px-3 pb-2">
        {expanded && <SectionLabel>Workspace</SectionLabel>}
        <div className="space-y-0.5">
          <NavItem
            icon={FileBox}
            label="Library"
            badge={artifactCount}
            expanded={expanded}
            onClick={run(onOpenArtifacts)}
          />
          <NavItem
            icon={Puzzle}
            label="Skills"
            badge={skillCount}
            expanded={expanded}
            onClick={run(onOpenSkills)}
          />
          <NavItem icon={Blocks} label="Plugins" expanded={expanded} onClick={run(onOpenPlugins)} />
          <NavItem
            icon={Terminal}
            label="Commands"
            expanded={expanded}
            onClick={run(onOpenCommands)}
          />
          {/* No "Archived" row here on purpose: the chat list below ends with
              its own always-visible Archived collapsible, and two controls
              that open the same drawer were costing the list a row of height
              it needs far more. */}
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            to="/dashboard"
            active={location.pathname === "/dashboard"}
            expanded={expanded}
            onClick={onNavigate}
          />
        </div>
      </div>

      {/* History. Collapsed, a column of identical chat bubbles carries no
          information, so the sidebar simply drops it and keeps the icons that
          still mean something. */}
      {expanded ? (
        // No section heading of its own: ConversationList already labels
        // Pinned / Projects / Chats / the date buckets / Archived, and a
        // fourth heading above those read as a duplicate while costing the
        // list height.
        <div className="flex min-h-0 flex-1 flex-col border-t border-border pt-3">
          {/*
           * `[&_[data-radix-scroll-area-viewport]>div]:!block` is not
           * decoration. Radix renders the viewport's single child as
           * `display: table; min-width: 100%`, and a table box is sized
           * shrink-to-fit — so `min-width` is only a floor and the child grows
           * to the list's *max-content* width instead. A long chat title made
           * that 341px inside a 255px viewport, which pushed every row's
           * archive and overflow button past the sidebar's edge where they
           * were clipped away, and stopped the titles from ever truncating.
           * Forcing the child back to a block box gives it a definite width,
           * so the rows fit and `truncate` does its job. This sidebar only
           * ever scrolls vertically, so nothing is lost.
           */}
          <ScrollArea className="min-h-0 flex-1 px-3 pb-3 [&_[data-radix-scroll-area-viewport]>div]:!block">
            <ConversationList
              conversations={props.conversations}
              archivedConversations={props.archivedConversations}
              projects={props.projects}
              currentConversationId={props.currentConversationId}
              query={query}
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
              archivedOpen={archivedOpen}
              onArchivedOpenChange={setArchivedOpen}
            />
          </ScrollArea>
        </div>
      ) : (
        <div className="min-h-0 flex-1" />
      )}

      {/* Identity */}
      <div className="shrink-0 space-y-0.5 border-t border-border px-3 py-2">
        <NavItem icon={Settings} label="Settings" expanded={expanded} onClick={run(onOpenProfile)} />
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={expanded ? undefined : user.name}
              aria-label={`Account: ${user.name}`}
              className={cn(
                "flex w-full items-center rounded-lg text-left transition-colors hover:bg-secondary/70 hover:text-foreground",
                expanded ? "h-11 gap-3 px-3" : "h-9 justify-center px-0",
              )}
            >
              {/* The avatar is 26px against the 18px nav icons, so it sits in
                  an 18px-wide centering box: it overhangs symmetrically, its
                  centre lands on the same column as every icon above it, and
                  the name still starts at the shared 54px label column. */}
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center",
                  expanded ? "w-[18px]" : "w-auto",
                )}
              >
                <PathforgeAvatar stored={user.avatarUrl} seed={initialsSeed} size={26} />
              </span>
              {expanded && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium leading-tight text-foreground">
                      {user.name}
                    </span>
                    {user.email && (
                      <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-muted-foreground">
                        {user.email}
                      </span>
                    )}
                  </span>
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/60" />
                </>
              )}
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

  return (
    <>
      {/* Mobile: a drawer, always expanded. A 64px strip would eat a sixth of
          a phone screen and hover means nothing on touch. */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[86vw] max-w-[320px] border-r border-border bg-card p-0 md:hidden"
        >
          <SheetTitle className="sr-only">Advisor sessions</SheetTitle>
          <SidebarContent props={props} expanded onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop: always mounted and open by default, width-transitioned so it
          pushes the chat pane rather than covering it. */}
      <aside
        style={{ width: pinned ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }}
        className="hidden shrink-0 flex-col overflow-hidden border-r border-border bg-card/60 backdrop-blur-md transition-[width] duration-200 ease-out md:flex"
      >
        <SidebarContent
          props={props}
          expanded={pinned}
          onToggle={onPinnedChange ? () => onPinnedChange(!pinned) : undefined}
        />
      </aside>
    </>
  );
}
