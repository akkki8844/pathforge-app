import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, Search, ShieldCheck, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { openCounsellorCommandPalette } from "@/lib/teacher/commandPalette";
import { NavPopout } from "@/components/layout/NavPopout";
import { PathforgeAvatar } from "@/components/avatar/PathforgeAvatar";
import { VariableFontHover } from "@/components/ui/variable-font-hover";
import { useAuth } from "@/contexts/AuthContext";
import { preloadRoute } from "@/lib/routePreload";
import { DURATION, EASE_OUT_EXPO, transition } from "@/lib/motion";
import {
  COUNSELLOR_MAIN,
  COUNSELLOR_OTHER,
  activeCounsellorHref,
  type CounsellorGroup,
} from "@/lib/teacher/nav";
import pathforgeLogo from "@/assets/pathforge-logo.webp";

/**
 * The counsellor bar.
 *
 * This is the student navbar with the counsellor's destinations in it: same
 * height, same sticky blur, same sliding underline, same hover mega-menu, same
 * right-hand cluster, same drawer on mobile. A counsellor and a student sitting
 * next to each other should be looking at one product, and the chrome is the
 * first thing that says so.
 *
 * It replaces a collapsible sidebar plus a second title bar — two rows of
 * chrome and a 14rem column of it — which is why the workspace now has the
 * same amount of page to work in as the student side does.
 */

const menuList = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.022, delayChildren: 0.01 } },
};

const menuItem = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.fast, ease: EASE_OUT_EXPO } },
};

/** The sliding underline, shared by every top-level item. */
function ActiveIndicator() {
  return (
    <motion.div
      layoutId="counsellor-nav-indicator"
      className="absolute inset-x-0 -bottom-[17px] h-0.5 bg-accent"
      transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
    />
  );
}

/**
 * The hover-opened "Other" menu: one column per department, each link with the
 * line that says what the page is for. The description is the reason this is a
 * mega-menu rather than a list — "Cohorts" and "Action plan" are not
 * self-explanatory names, and a counsellor should not have to click to find out.
 */
function OtherMenu({
  groups,
  isActive,
}: {
  groups: CounsellorGroup[];
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

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
        className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium outline-none transition-colors ${
          isActive ? "text-accent" : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Other
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
            className="absolute right-0 top-full z-50 w-[min(92vw,46rem)] pt-2"
            role="menu"
          >
            <motion.div
              variants={menuList}
              initial="hidden"
              animate="visible"
              className="grid max-h-[min(75vh,36rem)] grid-cols-3 gap-x-6 gap-y-4 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-popover p-5 shadow-xl"
            >
              {groups.map((group) => (
                <div key={group.title} className="min-w-0">
                  <p className="mb-2.5 border-b border-accent/30 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.links.map((l) => {
                      const itemActive = pathname === l.href;
                      const Icon = l.icon;
                      return (
                        <motion.div key={l.href} variants={menuItem}>
                          <Link
                            to={l.href}
                            onClick={() => setOpen(false)}
                            aria-current={itemActive ? "page" : undefined}
                            className={`flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors ${
                              itemActive
                                ? "bg-accent/10 text-accent"
                                : "text-foreground hover:bg-muted"
                            }`}
                            role="menuitem"
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium leading-tight">
                                {l.label}
                              </span>
                              <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                                {l.description}
                              </span>
                            </span>
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

/** One row in the mobile drawer. 44px minimum, same as the student drawer. */
function DrawerLink({
  to,
  label,
  onClick,
  isActive,
}: {
  to: string;
  label: string;
  onClick: () => void;
  isActive: boolean;
}) {
  return (
    <motion.div variants={menuItem}>
      <Link
        to={to}
        onClick={onClick}
        className={`flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
          isActive
            ? "bg-accent/10 text-accent"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {label}
      </Link>
    </motion.div>
  );
}

export function CounsellorNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile, teacherProfile, signOut } = useAuth();

  /*
   * Which key the palette answers to, on this machine.
   *
   * Printing the wrong one is worse than printing none: a Windows counsellor
   * told to press Cmd+K presses nothing. `userAgent` rather than the
   * deprecated `platform`, and guarded for SSR because this bar is
   * pre-rendered.
   */
  const shortcutLabel = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl K";
    return /mac|iphone|ipad/i.test(navigator.userAgent) ? "⌘ K" : "Ctrl K";
  }, []);

  const current = activeCounsellorHref(pathname);
  const otherHrefs = COUNSELLOR_OTHER.flatMap((g) => g.links.map((l) => l.href));
  const isOtherActive = !!current && otherHrefs.includes(current);

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const verified = !!teacherProfile?.verified;

  return (
    <motion.header
      className="pad-safe-top sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="mx-auto w-full max-w-[1400px] px-5 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand. The word next to the mark is what tells a counsellor which
              of the two workspaces they are in — the routes are different but
              the logo is not. */}
          <Link to="/teacher" className="group flex flex-shrink-0 items-center gap-2.5">
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
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:inline-block">
              Counsellor
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden items-center gap-2.5 lg:flex">
            {COUNSELLOR_MAIN.map((d) => {
              const isActive = current === d.href;
              return (
                <Link
                  key={d.href}
                  to={d.href}
                  onMouseEnter={() => preloadRoute(d.href)}
                  onFocus={() => preloadRoute(d.href)}
                  className={`group relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-accent" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <VariableFontHover
                    label={d.label}
                    fromFontVariationSettings="'wght' 500"
                    toFontVariationSettings="'wght' 800"
                    staggerDuration={0.02}
                    staggerFrom="center"
                  />
                  {isActive && <ActiveIndicator />}
                </Link>
              );
            })}

            <OtherMenu groups={COUNSELLOR_OTHER} isActive={isOtherActive} />
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            {/* Verification is the one piece of state that changes what the
                workspace will show you, so it stays in the bar rather than in
                a menu. Unverified is the loud one on purpose. */}
            {teacherProfile && (
              <span
                className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium md:inline-flex ${
                  verified
                    ? "bg-muted text-muted-foreground"
                    : "bg-destructive/10 text-destructive"
                }`}
                title={
                  verified
                    ? "Your school link is verified."
                    : "Student data unlocks once your school link is verified."
                }
              >
                {verified ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" />
                )}
                {verified ? "Verified" : "Unverified"}
              </span>
            )}

            {/*
              * The way in to Cmd+K.
              *
              * The palette is the fastest route to any of a counsellor's
              * students, and a shortcut nobody is told about is a shortcut
              * nobody uses — so the bar carries the affordance, with the key
              * printed on it. Below `sm` it collapses to the icon, because the
              * shortcut it advertises does not exist on a phone anyway.
              */}
            <button
              type="button"
              onClick={openCounsellorCommandPalette}
              aria-label="Search students and pages"
              className="hidden items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground sm:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Search</span>
              <kbd className="ml-1 hidden rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium lg:inline">
                {shortcutLabel}
              </kbd>
            </button>

            {user && (
              <NavPopout label="Notifications">
                <NotificationBell />
              </NavPopout>
            )}

            {user && (
              <DropdownMenu>
                <NavPopout label={profile?.full_name?.trim() || "Account"} align="right">
                  <DropdownMenuTrigger asChild>
                    {/* Not <Button>: buttonVariants pins any descendant svg to
                        16px, and the avatar is an inline svg. */}
                    <button
                      type="button"
                      aria-label="Counsellor menu"
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-150 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                <DropdownMenuContent align="end" className="w-60 bg-popover">
                  <div className="px-2 py-1.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {profile?.full_name || user.email}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {teacherProfile?.title || "Counsellor"}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/teacher/settings" className="cursor-pointer">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/contact" className="cursor-pointer">Contact</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <ThemeToggle />

            <NavPopout label={isOpen ? "Close" : "Menu"} className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
                aria-expanded={isOpen}
              >
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

        {/* Mobile drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pad-safe-bottom max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-border bg-background py-4 lg:hidden"
            >
              <motion.div
                variants={menuList}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-2"
              >
                {COUNSELLOR_MAIN.map((d) => (
                  <DrawerLink
                    key={d.href}
                    to={d.href}
                    label={d.label}
                    isActive={current === d.href}
                    onClick={() => setIsOpen(false)}
                  />
                ))}

                {COUNSELLOR_OTHER.map((group) => (
                  <div key={group.title}>
                    <motion.div
                      variants={menuItem}
                      className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {group.title}
                    </motion.div>
                    {group.links.map((l) => (
                      <DrawerLink
                        key={l.href}
                        to={l.href}
                        label={l.label}
                        isActive={current === l.href}
                        onClick={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                ))}

                <motion.div variants={menuItem} className="mt-2 border-t border-border pt-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleSignOut();
                    }}
                    className="w-full rounded-lg px-3 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    Log out
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
