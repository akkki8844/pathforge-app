import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Archive,
  Blocks,
  Compass,
  FileBox,
  Gauge,
  LayoutDashboard,
  LogOut,
  MessageSquarePlus,
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
import { Separator } from "@/components/ui/separator";
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
 * The advisor's session rail.
 *
 * A collapsed 56px strip of icons that expands to a full 288px sidebar on
 * hover (or stays open when pinned from the top bar), in the shape of the
 * SessionNavBar pattern the design was taken from. Everything in it is wired
 * to something real: the chat list and its actions come from the advisor's
 * conversation hooks, the workspace entries open the panels the advisor
 * actually has, the one route link goes to a route that exists, and the
 * identity block is the signed-in account with its Pathforge avatar.
 *
 * Deliberately dropped from the reference: the organization switcher
 * ("Manage members" / "Integrations" / "Create or join an organization") and
 * the Deals/Accounts/Competitors/Reports/Feedback/Document-review links —
 * Pathforge has no organizations and none of those destinations exist, and a
 * rail full of dead links is worse than a short one.
 *
 * On < md the rail is not a rail at all: hover has no meaning on touch, so it
 * renders as a left drawer at full width, always expanded.
 */

const RAIL_COLLAPSED = 56;
const RAIL_EXPANDED = 288;

/** Label animation, straight from the reference: slide + fade with the width. */
const labelVariants = {
  open: { x: 0, opacity: 1, transition: { x: { stiffness: 1000, velocity: -100 } } },
  closed: { x: -12, opacity: 0, transition: { x: { stiffness: 100 } } },
};

const staggerVariants = {
  open: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
  closed: {},
};

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
  /** Keeps the desktop rail open regardless of hover (top-bar toggle). */
  pinned?: boolean;
  /** Mobile drawer. */
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

/** One rail row. Renders as a link when `to` is given, a button otherwise. */
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
    "flex h-9 w-full items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground",
    expanded ? "gap-2.5 px-2.5" : "justify-center px-0",
    active && "bg-secondary text-primary",
  );

  const body = (
    <>
      <Icon className="h-4 w-4 shrink-0" />
      {expanded && (
        <motion.span variants={labelVariants} className="flex min-w-0 flex-1 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="shrink-0 rounded bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
              {badge}
            </span>
          )}
        </motion.span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} title={expanded ? undefined : label} aria-label={label} className={className}>
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
 * The rail's contents. Shared verbatim by the desktop rail and the mobile
 * drawer — the drawer just always passes `expanded`.
 */
function RailContent({
  props,
  expanded,
  onNavigate,
}: {
  props: SessionNavBarProps;
  expanded: boolean;
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

  // Clicking the collapsed search icon has to wait for the width animation
  // before the input exists to focus.
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
    <motion.div
      variants={staggerVariants}
      initial={false}
      animate={expanded ? "open" : "closed"}
      className="flex h-full min-h-0 flex-col text-muted-foreground"
    >
      {/* Header — brand, plan, and the way back to the dashboard. Replaces the
          reference's organization switcher, which has no counterpart here. */}
      <div className="flex h-[54px] shrink-0 items-center border-b border-border px-2">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          title={expanded ? undefined : "Pathforge dashboard"}
          aria-label="Pathforge dashboard"
          className={cn(
            "flex h-9 w-full items-center rounded-lg transition-colors hover:bg-secondary/70",
            expanded ? "gap-2.5 px-2" : "justify-center px-0",
          )}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Compass className="h-3.5 w-3.5" />
          </span>
          {expanded && (
            <motion.span variants={labelVariants} className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold text-foreground">
                Advisor
              </span>
              {user.plan && (
                <span className="shrink-0 rounded border-none bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {user.plan}
                </span>
              )}
            </motion.span>
          )}
        </Link>
      </div>

      {/* New chat + search */}
      <div className="shrink-0 space-y-1 p-2">
        <button
          type="button"
          onClick={run(onNewChat)}
          title={expanded ? undefined : "New chat"}
          aria-label="New chat"
          className={cn(
            "flex h-9 w-full items-center rounded-lg border border-border bg-background/60 text-foreground transition-colors hover:border-primary/40 hover:bg-secondary/70",
            expanded ? "gap-2.5 px-2.5" : "justify-center px-0",
          )}
        >
          <MessageSquarePlus className="h-4 w-4 shrink-0 text-primary" />
          {expanded && (
            <motion.span
              variants={labelVariants}
              className="min-w-0 flex-1 truncate text-left text-[13px] font-medium"
            >
              New chat
            </motion.span>
          )}
        </button>

        {expanded ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
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
        ) : (
          <NavItem
            icon={Search}
            label="Search chats"
            expanded={false}
            onClick={() => setFocusSearch(true)}
          />
        )}
      </div>

      {/* History. Collapsed, a column of identical chat bubbles carries no
          information, so the rail simply drops it and keeps the icons that
          still mean something. */}
      {expanded ? (
        <ScrollArea className="min-h-0 flex-1 px-2 pb-2">
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
      ) : (
        <div className="min-h-0 flex-1" />
      )}

      <Separator className="shrink-0" />

      {/* Workspace — every one of these opens something the advisor has. */}
      <div className="shrink-0 space-y-1 p-2">
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
        <NavItem icon={Terminal} label="Commands" expanded={expanded} onClick={run(onOpenCommands)} />
        <NavItem
          icon={Archive}
          label="Archived"
          badge={props.archivedConversations.length}
          expanded={expanded}
          onClick={() => {
            setQuery("");
            setArchivedOpen(true);
          }}
        />
        <NavItem
          icon={LayoutDashboard}
          label="Dashboard"
          to="/dashboard"
          active={location.pathname === "/dashboard"}
          expanded={expanded}
          onClick={onNavigate}
        />
      </div>

      {/* Identity */}
      <div className="shrink-0 border-t border-border p-2">
        <NavItem
          icon={Settings}
          label="Settings"
          expanded={expanded}
          onClick={run(onOpenProfile)}
        />
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={expanded ? undefined : user.name}
                aria-label={`Account: ${user.name}`}
                className={cn(
                  "flex h-9 w-full items-center rounded-lg transition-colors hover:bg-secondary/70 hover:text-foreground",
                  expanded ? "gap-2.5 px-2" : "justify-center px-0",
                )}
              >
                <PathforgeAvatar
                  stored={user.avatarUrl}
                  seed={initialsSeed}
                  size={22}
                  className="shrink-0"
                />
                {expanded && (
                  <motion.span
                    variants={labelVariants}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {user.name}
                      </span>
                      {user.email && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {user.email}
                        </span>
                      )}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  </motion.span>
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
    </motion.div>
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
  const { pinned = false, mobileOpen, onMobileOpenChange } = props;
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;

  return (
    <>
      {/* Mobile: a drawer, always expanded. Hover-to-expand means nothing on
          touch, and a 56px strip would eat a tenth of a phone screen. */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[86vw] max-w-[320px] border-r border-border bg-card p-0 md:hidden"
        >
          <SheetTitle className="sr-only">Advisor sessions</SheetTitle>
          <div className="flex h-full min-h-0 flex-col">
            <RailContent props={props} expanded onNavigate={() => onMobileOpenChange(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: always mounted, width-animated so it pushes the chat pane
          rather than covering it. */}
      <motion.aside
        initial={false}
        animate={{ width: expanded ? RAIL_EXPANDED : RAIL_COLLAPSED }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        // Keyboard users never hover: tabbing into the rail has to expand it
        // too, or the labels are unreachable without a pointer.
        onFocusCapture={() => setHovered(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(false);
        }}
        className="hidden shrink-0 flex-col overflow-hidden border-r border-border bg-card/60 backdrop-blur-md md:flex"
      >
        <RailContent props={props} expanded={expanded} />
      </motion.aside>
    </>
  );
}
