import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, User, Mic, Compass, Briefcase, Map, ChevronDown, FileText, Linkedin, FileSignature, PenLine, GraduationCap, Target, BookOpen, Trophy, Quote } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { DURATION, EASE_OUT_EXPO, transition } from "@/lib/motion";
import pathforgeLogo from "@/assets/pathforge-logo.png";
import { PathforgeAvatar } from "@/components/avatar/PathforgeAvatar";

type NavIcon = React.ComponentType<{ className?: string }>;
/** Top-level links; a couple sit in the bar without an icon. */
type NavLink = { href: string; label: string; icon?: NavIcon };
/** Dropdown entries always carry an icon. */
type NavItem = { href: string; label: string; icon: NavIcon };

// Links rendered BEFORE the Builders dropdown
const preBuilderLinks: NavItem[] = [
  { href: "/journey", label: "Journey", icon: Map },
  { href: "/advisor", label: "Advisor", icon: Mic },
  { href: "/activities", label: "Activities", icon: Compass },
];

// Links rendered AFTER the Preparation dropdown
const postBuilderLinks: NavLink[] = [
  { href: "/scholarships", label: "Scholarships" },
  { href: "/weekly-planner", label: "Planner" },
];

const builderLinks: NavItem[] = [
  { href: "/application-builder", label: "Application Builder", icon: FileSignature },
  { href: "/profile-builder", label: "LinkedIn Builder", icon: Linkedin },
  { href: "/resume", label: "Resume Builder", icon: FileText },
  { href: "/essays", label: "Essay Builder", icon: PenLine },
  { href: "/lor", label: "Letters of Rec", icon: FileSignature },
];

const prepLinks: NavItem[] = [
  { href: "/requirements", label: "Requirements", icon: BookOpen },
  { href: "/college-readiness", label: "Readiness", icon: GraduationCap },
  { href: "/admissions-probability", label: "Admissions", icon: Target },
  { href: "/outcomes", label: "Outcomes", icon: Trophy },
];

const otherLinks: NavItem[] = [
  { href: "/exemplar-essays", label: "Exemplar Essays", icon: Quote },
  { href: "/past-admits", label: "Past Admits", icon: Trophy },
];

const navLinks: NavLink[] = [...preBuilderLinks, ...postBuilderLinks, ...prepLinks];

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
 * Hover-opened nav dropdown. Builders, Preparation and Others were three
 * copies of the same 60 lines, which is how they drifted apart — only one of
 * them had the right menu width.
 */
function NavDropdown({
  label,
  icon: Icon,
  links,
  isActive,
  align = "center",
  width = "w-52",
}: {
  label: string;
  /** Optional — "Others" is a catch-all, so a glyph next to it just adds noise. */
  icon?: React.ComponentType<{ className?: string }>;
  links: NavItem[];
  isActive: boolean;
  align?: "center" | "right";
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        setOpen(true);
        links.forEach((l) => preloadRoute(l.href));
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`relative px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 outline-none ${
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
        {isActive && <ActiveIndicator />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute top-full pt-2 z-50 ${width} ${
              align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
            }`}
            role="menu"
          >
            <motion.div
              variants={menuList}
              initial="hidden"
              animate="visible"
              className="rounded-md border border-border bg-popover shadow-lg overflow-hidden py-1"
            >
              {links.map((l) => {
                const ItemIcon = l.icon;
                const itemActive = location.pathname === l.href;
                return (
                  <motion.div key={l.href} variants={menuItem}>
                    <Link
                      to={l.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        itemActive ? "bg-accent/10 text-accent" : "text-foreground hover:bg-muted"
                      }`}
                      role="menuitem"
                    >
                      <ItemIcon className="h-4 w-4" />
                      {l.label}
                    </Link>
                  </motion.div>
                );
              })}
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
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  to: string;
  icon?: React.ComponentType<{ className?: string }> | null;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div variants={menuItem}>
      <Link
        to={to}
        onClick={onClick}
        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
          isActive
            ? "bg-accent/10 text-accent"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </Link>
    </motion.div>
  );
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const isBuilderActive = builderLinks.some((l) => location.pathname === l.href);
  const isPrepActive = prepLinks.some((l) => location.pathname === l.href);
  const isOthersActive = otherLinks.some((l) => location.pathname === l.href);

  // backdrop-blur-md, not -lg: this is a full-width bar that re-blurs whatever
  // is behind it on every scroll frame, and the cost scales with the radius.
  // At 80% background opacity the two radii are indistinguishable.
  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="section-container">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
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
          <div className="hidden lg:flex items-center gap-1">
            {preBuilderLinks.map((link) => {
              const isActive = location.pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onMouseEnter={() => preloadRoute(link.href)}
                  onFocus={() => preloadRoute(link.href)}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {link.label}
                  {isActive && <ActiveIndicator />}
                </Link>
              );
            })}

            {/* Builders hover dropdown — placed AFTER Activities */}
            <NavDropdown
              label="Builders"
              icon={FileSignature}
              links={builderLinks}
              isActive={isBuilderActive}
            />

            {/* Preparation hover dropdown */}
            <NavDropdown
              label="Preparation"
              icon={GraduationCap}
              links={prepLinks}
              isActive={isPrepActive}
              width="w-56"
            />

            {postBuilderLinks.map((link) => {
              const isActive = location.pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onMouseEnter={() => preloadRoute(link.href)}
                  onFocus={() => preloadRoute(link.href)}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {link.label}
                  {isActive && <ActiveIndicator />}
                </Link>
              );
            })}

            {/* Others hover dropdown */}
            <NavDropdown
              label="Others"
              links={otherLinks}
              isActive={isOthersActive}
              align="right"
            />
          </div>

          {/* Theme Toggle & User Menu */}
          <div className="flex items-center gap-2">
            {user && <NotificationBell />}
            
            {!user && (
              <Button asChild size="sm" variant="default" className="hidden sm:inline-flex">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-14 w-14" aria-label="User menu">
                    <PathforgeAvatar
                      stored={profile?.avatar_url}
                      seed={user.id}
                      className="h-12 w-12 ring-2 ring-border/70"
                      cutout="hsl(var(--background))"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium text-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile?section=connectors" className="cursor-pointer">
                      <Linkedin className="mr-2 h-4 w-4" fill="currentColor" strokeWidth={0} />
                      Connectors
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/about" className="cursor-pointer">About</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/contact" className="cursor-pointer">Contact</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
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
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden py-4 border-t border-border max-h-[calc(100vh-4rem)] overflow-y-auto bg-background"
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
                    icon={link.icon}
                    label={link.label}
                    isActive={location.pathname === link.href}
                    onClick={() => setIsOpen(false)}
                  />
                ))}

                {/* Mobile Builders group */}
                <motion.div
                  variants={menuItem}
                  className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Builders
                </motion.div>
                {builderLinks.map((b) => (
                  <MobileNavLink
                    key={b.href}
                    to={b.href}
                    icon={b.icon}
                    label={b.label}
                    isActive={location.pathname === b.href}
                    onClick={() => setIsOpen(false)}
                  />
                ))}

                {/* Mobile Others group */}
                <motion.div
                  variants={menuItem}
                  className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Others
                </motion.div>
                {otherLinks.map((o) => (
                  <MobileNavLink
                    key={o.href}
                    to={o.href}
                    icon={o.icon}
                    label={o.label}
                    isActive={location.pathname === o.href}
                    onClick={() => setIsOpen(false)}
                  />
                ))}

                <motion.div variants={menuItem} className="border-t border-border mt-2 pt-2">
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    to="/about"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground block"
                  >
                    About
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
                      className="w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors text-destructive hover:bg-destructive/10 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
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
