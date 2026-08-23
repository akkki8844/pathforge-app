import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Mic, Compass, Briefcase, Map, ChevronDown, FileText, Linkedin, FileSignature, PenLine, GraduationCap, Target, BookOpen, Trophy, Quote, Award, CalendarDays } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlowButton } from "@/components/ui/flow-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { preloadRoute } from "@/lib/routePreload";
import { ROUTINE_DESTINATIONS } from "@/lib/routine/nav";
import { COMMUNICATIONS_DESTINATIONS, isCommsPath } from "@/lib/comms/nav";
import { useCommsBadges } from "@/hooks/comms/useCommsBadges";
import { DURATION, EASE_OUT_EXPO, transition } from "@/lib/motion";
import pathforgeLogo from "@/assets/pathforge-logo.webp";
import { PathforgeAvatar } from "@/components/avatar/PathforgeAvatar";
import { VariableFontHover } from "@/components/ui/variable-font-hover";
import { NavPopout } from "@/components/layout/NavPopout";

type NavIcon = React.ComponentType<{ className?: string }>;
type NavItem = { href: string; label: string; icon: NavIcon; badge?: number };
type NavGroup = { title: string; links: NavItem[] };

// The whole top-level bar, in the exact order requested: Journey, Advisor,
// Activities, Outcomes, Application Builder, Admissions, Planner. Everything
// else lives one level down, in the single "Other" dropdown below.
const mainLinks: NavItem[] = [
  { href: "/journey", label: "Journey", icon: Map },
  { href: "/advisor", label: "Advisor", icon: Mic },
  { href: "/activities", label: "Activities", icon: Compass },
  { href: "/outcomes", label: "Outcomes", icon: Briefcase },
  { href: "/application-builder", label: "Application Builder", icon: FileSignature },
  { href: "/admissions-probability", label: "Admissions", icon: Target },
  { href: "/weekly-planner", label: "Planner", icon: CalendarDays },
];

// Everything that isn't a top-seven link, folded into the one "Other"
// dropdown instead of the old separate Builders/Preparation/Others menus —
// arranged in the same departments-under-one-menu shape as a reference
// mega-menu the redesign was modeled on, not its colours.
const baseOtherGroups: NavGroup[] = [
  {
    title: "Builders",
    links: [
      { href: "/profile-builder", label: "LinkedIn Builder", icon: Linkedin },
      { href: "/resume", label: "Resume Builder", icon: FileText },
      { href: "/essays", label: "Essay Builder", icon: PenLine },
    ],
  },
  {
    title: "Preparation",
    links: [
      { href: "/requirements", label: "Requirements", icon: BookOpen },
      { href: "/college-readiness", label: "Readiness", icon: GraduationCap },
      { href: "/exemplar-essays", label: "Exemplar Essays", icon: Quote },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/scholarships", label: "Scholarships", icon: Award },
      { href: "/past-admits", label: "Past Admits", icon: Trophy },
      { href: "/lor", label: "Professors", icon: FileSignature },
    ],
  },
];

// Routine's nine pages, folded into "Other" as their own department instead
// of a standalone top-level dropdown — that's what "Other" is for. Only
// shown to signed-in users, since every Routine route sits behind
// ProtectedRoute.
const routineGroup: NavGroup = {
  title: "Routine",
  links: ROUTINE_DESTINATIONS.map((d) => ({ href: d.href, label: d.label, icon: d.icon })),
};

// Communications, folded into "Other" as its own department — same treatment
// as Routine. Signed-in only, since every /communications route sits behind
// ProtectedRoute.
// Built per render rather than as a module constant, because three of its four
// links carry a live count. A messaging section whose unread number is only
// visible once you are already inside it is a messaging section people miss.
function buildCommsGroup(badges: {
  chats: number;
  teams: number;
  objectives: number;
}): NavGroup {
  const countFor = (href: string): number | undefined => {
    if (href === "/communications/chats") return badges.chats || undefined;
    if (href === "/communications/teams") return badges.teams || undefined;
    if (href === "/communications/objectives") return badges.objectives || undefined;
    return undefined;
  };
  return {
    title: "Communications",
    links: COMMUNICATIONS_DESTINATIONS.map((d) => ({
      href: d.href,
      label: d.label,
      icon: d.icon,
      badge: countFor(d.href),
    })),
  };
}

const navLinks: NavItem[] = mainLinks;

/** The sliding underline shared by every top-level nav item. */
function ActiveIndicator() {
  return (
    <motion.div
      layoutId="navbar-indicator"
      className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-accent"
      transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
    />
  );
}

const menuList = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.022, delayChildren: 0.01 } },
};

const menuItem = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.fast, ease: EASE_OUT_EXPO } },
};

/**
 * Hover-opened "Other" menu — a wide, multi-column mega-menu. Each department
 * (Routine, Builders, Preparation, Resources) is its own column with an
 * accent-colored, underlined label, so the panel reads as a set of sections
 * rather than one long overflow list.
 */
function NavDropdown({
  label,
  icon: Icon,
  groups,
  isActive,
  align = "center",
}: {
  label: string;
  /** Optional — "Other" is a catch-all, so a glyph next to it just adds noise. */
  icon?: React.ComponentType<{ className?: string }>;
  groups: NavGroup[];
  isActive: boolean;
  align?: "center" | "right";
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const columns = Math.min(groups.length, 3) as 1 | 2 | 3;
  // A closed menu hides its own badges, so the trigger carries a dot for them.
  // Unread messages the user cannot see from the bar are unread messages they
  // never read.
  const hasBadge = groups.some((g) => g.links.some((l) => (l.badge ?? 0) > 0));
  // Tailwind's JIT scans for literal class strings, so the width has to be
  // one of these static options rather than built with template interpolation.
  const panelWidth = { 1: "w-[min(92vw,16rem)]", 2: "w-[min(92vw,30rem)]", 3: "w-[min(92vw,44rem)]" }[columns];

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        setOpen(true);
        groups.forEach((g) => g.links.forEach((l) => preloadRoute(l.href)));
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`relative px-3 py-2 text-sm font-medium transition-colors hover:font-semibold flex items-center gap-1.5 outline-none ${
          isActive ? "text-accent" : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
          className="inline-flex"
        >
          <ChevronDown className="h-3 w-3 opacity-70" />
        </motion.span>
        {hasBadge && !open && (
          <span
            className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-full bg-accent"
            aria-hidden="true"
          />
        )}
        {isActive && <ActiveIndicator />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute top-full pt-2 z-50 ${panelWidth} ${
              align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
            }`}
            role="menu"
          >
            <motion.div
              variants={menuList}
              initial="hidden"
              animate="visible"
              className="grid max-h-[min(75vh,36rem)] gap-x-8 gap-y-4 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-popover p-5 shadow-xl"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {groups.map((group) => (
                <div key={group.title} className="min-w-0">
                  <p className="mb-2.5 border-b border-accent/30 pb-1.5 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.links.map((l) => {
                      const itemActive = location.pathname === l.href;
                      return (
                        <motion.div key={l.href} variants={menuItem}>
                          <Link
                            to={l.href}
                            onClick={() => setOpen(false)}
                            aria-current={itemActive ? "page" : undefined}
                            className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-sm leading-tight transition-colors ${
                              itemActive
                                ? "bg-accent/10 font-semibold text-accent"
                                : "text-foreground hover:bg-muted"
                            }`}
                            role="menuitem"
                          >
                            <span className="truncate">{l.label}</span>
                            {!!l.badge && l.badge > 0 && (
                              <span className="ml-auto inline-flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold tabular-nums text-accent-foreground">
                                <span aria-hidden="true">{l.badge > 99 ? "99+" : l.badge}</span>
                                <span className="sr-only">{l.badge} needing attention</span>
                              </span>
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** One row in the mobile drawer. Slides in as part of the drawer's stagger. */
function MobileNavLink({
  to,
  label,
  isActive,
  onClick,
  badge,
}: {
  to: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <motion.div variants={menuItem}>
      <Link
        to={to}
        onClick={onClick}
        // min-h-[44px], not just padding: at py-2 these drawer rows were ~36px
        // tall and stacked with gap-2, which is under the touch-target floor on
        // every mobile platform guideline.
        className={`px-3 py-3 min-h-[44px] text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
          isActive
            ? "bg-accent/10 text-accent"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {label}
        {!!badge && badge > 0 && (
          <span className="ml-auto inline-flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold tabular-nums text-accent-foreground">
            <span aria-hidden="true">{badge > 99 ? "99+" : badge}</span>
            <span className="sr-only">{badge} needing attention</span>
          </span>
        )}
      </Link>
    </motion.div>
  );
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const commsBadges = useCommsBadges();

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  // Communications and Routine only show as "Other" departments once signed
  // in — their routes are all behind ProtectedRoute, so there's nothing there
  // for a guest.
  const otherGroups: NavGroup[] = user
    ? [buildCommsGroup(commsBadges), routineGroup, ...baseOtherGroups]
    : baseOtherGroups;
  const otherLinks: NavItem[] = otherGroups.flatMap((g) => g.links);
  const isOthersActive = otherLinks.some((l) => location.pathname === l.href) || isCommsPath(location.pathname);

  // The mobile drawer is a flat list of departments — same groups as desktop's
  // "Other" menu, Communications included since it's no longer a separate
  // top-level dropdown.
  const mobileGroups: NavGroup[] = otherGroups;

  // backdrop-blur-md, not -lg: this is a full-width bar that re-blurs whatever
  // is behind it on every scroll frame, and the cost scales with the radius.
  // At 80% background opacity the two radii are indistinguishable.
  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-border/50 bg-background/80 pad-safe-top backdrop-blur-md"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="section-container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo — signed-in students go to their dashboard, everyone else to the landing page. */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group flex-shrink-0">
            <motion.img
              src={pathforgeLogo}
              alt="Pathforge logo"
              width={96}
              height={96}
              className="h-10 w-auto object-contain"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={transition.spring}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2.5">
            {mainLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onMouseEnter={() => preloadRoute(link.href)}
                  onFocus={() => preloadRoute(link.href)}
                  className={`group relative px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <VariableFontHover
                    label={link.label}
                    fromFontVariationSettings="'wght' 500"
                    toFontVariationSettings="'wght' 800"
                    staggerDuration={0.02}
                    staggerFrom="center"
                  />
                  {isActive && <ActiveIndicator />}
                </Link>
              );
            })}

            {/* Other hover dropdown — every link that isn't in the top seven,
                grouped into departments (Communications and Routine when
                signed in, Builders, Preparation, Resources) */}
            <NavDropdown
              label="Other"
              groups={otherGroups}
              isActive={isOthersActive}
              align="right"
            />
          </div>

          {/* Theme Toggle & User Menu */}
          <div className="flex items-center gap-2">
            {user && (
              <NavPopout label="Notifications">
                <NotificationBell />
              </NavPopout>
            )}

            {!user && (
              <Link to="/auth" className="hidden sm:inline-flex">
                <FlowButton text="Sign in" className="px-5 py-2 text-xs" />
              </Link>
            )}
            {user && (
              <DropdownMenu>
                <NavPopout label={profile?.username ? `@${profile.username}` : "Account"} align="right">
                <DropdownMenuTrigger asChild>
                  {/* Deliberately NOT <Button>: buttonVariants carries
                      `[&_svg]:size-4`, a descendant selector that outranks any
                      h-/w- utility put on the avatar itself. The avatar is an
                      inline <svg>, so inside a Button it is pinned to 16px no
                      matter what size class it is given. */}
                  <button
                    type="button"
                    aria-label="User menu"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
                  >
                    <PathforgeAvatar
                      stored={profile?.avatar_url}
                      seed={user.id}
                      className="h-10 w-10 rounded-full ring-2 ring-border/70"
                      cutout="hsl(var(--background))"
                    />
                  </button>
                </DropdownMenuTrigger>
                </NavPopout>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium text-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile?section=connectors" className="cursor-pointer">
                      Connectors
                    </Link>
                  </DropdownMenuItem>
                  {/* About is a public/marketing page and is linked from the
                      landing page and the footer. It was in this signed-in menu
                      too, which put a "who we are" pitch in front of people who
                      had already bought. Contact stays — a signed-in user
                      needing support is a real errand. */}
                  <DropdownMenuItem asChild>
                    <Link to="/contact" className="cursor-pointer">Contact</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu Button */}
            <NavPopout label={isOpen ? "Close" : "Menu"} className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
                aria-expanded={isOpen}
              >
                {/* Crossfade the two icons through a quarter turn so the button
                    reads as one control changing state, not two swapping. */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={isOpen ? "close" : "open"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15, ease: EASE_OUT_EXPO }}
                    className="inline-flex"
                  >
                    {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </NavPopout>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              // dvh, not vh: on iOS Safari 100vh is the *large* viewport, so the
              // last rows of this drawer sat permanently under the browser
              // toolbar with no way to scroll to them.
              className="lg:hidden py-4 pad-safe-bottom border-t border-border max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain bg-background"
            >
              <motion.div
                variants={menuList}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-2"
              >
                {navLinks.map((link) => (
                  <MobileNavLink
                    key={link.href}
                    to={link.href}
                    label={link.label}
                    isActive={location.pathname === link.href}
                    onClick={() => setIsOpen(false)}
                  />
                ))}

                {/* Mobile groups — same departments as the desktop menus,
                    Communications and Routine included when signed in */}
                {mobileGroups.map((group) => (
                  <div key={group.title}>
                    <motion.div
                      variants={menuItem}
                      className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {group.title}
                    </motion.div>
                    {group.links.map((o) => (
                      <MobileNavLink
                        key={o.href}
                        to={o.href}
                        label={o.label}
                        badge={o.badge}
                        isActive={location.pathname === o.href}
                        onClick={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                ))}

                <motion.div variants={menuItem} className="border-t border-border mt-2 pt-2">
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground block"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground block"
                  >
                    Contact
                  </Link>
                  {user && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        handleSignOut();
                      }}
                      className="w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors text-destructive hover:bg-destructive/10 text-left"
                    >
                      Log out
                    </button>
                  )}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
