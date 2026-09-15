import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Seo } from "@/components/Seo";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { SAT_SECTIONS, activeSection, sectionHref } from "@/lib/testprep/nav";
import { EYEBROW, FOCUS, SURFACE } from "@/lib/testprep/ui";

/**
 * The frame every SAT page renders inside.
 *
 * Same role as `RoutineShell` and `CommsShell`, with one structural difference:
 * this section has its own persistent sidebar. Test Prep is a product inside
 * the product — a student in the middle of working through Advanced Math is not
 * navigating Pathforge, they are navigating the SAT — so the five destinations
 * stay on screen rather than living one hover away in the global bar. The
 * global navbar is untouched above it.
 *
 * The exam and practice runners deliberately do *not* use this shell. A timed
 * module with a sidebar offering four other places to go is not a testing
 * environment.
 */
export function TestPrepShell({
  testId,
  testName,
  testSubtitle,
  title,
  path,
  seoTitle,
  seoDescription,
  children,
}: {
  testId: string;
  testName: string;
  testSubtitle: string;
  /** Page name, used for the document title only — pages draw their own headers. */
  title: string;
  path: string;
  seoTitle?: string;
  seoDescription?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();

  return (
    <>
      <Seo
        title={seoTitle ?? `${testName} ${title}`}
        description={seoDescription ?? `${testSubtitle} — ${title.toLowerCase()}.`}
        path={path}
        noindex
      />
      <div className="bluebook mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="lg:grid lg:grid-cols-[4.5rem_minmax(0,1fr)] lg:gap-10">
          <TestPrepSidebar testId={testId} testName={testName} />
          {/*
            The route transition. Each SAT page is its own lazy chunk, so the
            shell is rebuilt on navigation and there is no outgoing element to
            animate — an `AnimatePresence` here would be decoration that never
            runs. A short entrance is the honest version of the same effect, and
            it is deliberately faster than a content entrance so the page frame
            never feels like it is loading twice.
          */}
          <motion.div
            key={path}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
            className="mt-7 min-w-0 lg:mt-0"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </>
  );
}

/**
 * The section navigation.
 *
 * Desktop is a collapsed icon rail (~4.5rem) that expands into a labelled
 * panel on hover, absolutely positioned so the flyout overlaps the content
 * rather than reflowing it — the collapsed track is what the page grid
 * actually reserves, which is what gives the content column the width back
 * that a permanently-open 13rem rail used to take. Smaller screens keep the
 * existing scrolling row of pills untouched.
 *
 * Active state is carried three ways — a filled accent rail, a quiet surface
 * behind the label, and the label's own weight — so it survives being read
 * without colour, and the rail is moved between items with a shared `layoutId`
 * so it slides rather than jumping.
 */
function TestPrepSidebar({ testId, testName }: { testId: string; testName: string }) {
  const location = useLocation();
  const active = activeSection(location.pathname, testId);
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  const groups = SAT_SECTIONS.reduce<Record<number, typeof SAT_SECTIONS>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <nav aria-label={`${testName} sections`}>
      {/* Desktop rail */}
      <div className="sticky top-24 hidden lg:block">
        <motion.div
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          initial={false}
          animate={{ width: expanded ? 224 : 60 }}
          transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
          className={cn(
            "absolute left-0 top-0 z-20 overflow-hidden rounded-xl border border-border/60 bg-card py-4 shadow-sm",
            expanded && "shadow-lg",
          )}
        >
          <p
            className={cn(
              EYEBROW,
              "overflow-hidden whitespace-nowrap px-4 transition-opacity",
              expanded ? "opacity-100" : "opacity-0",
            )}
          >
            {testName} Prep
          </p>
          <div className="mt-3.5 space-y-5 px-2.5">
            {Object.entries(groups).map(([group, items], gi) => (
              <div
                key={group}
                className={cn("space-y-0.5", gi > 0 && "border-t border-border/60 pt-3.5")}
              >
                {items.map((item) => {
                  const href = sectionHref(testId, item.segment);
                  const isActive = active?.segment === item.segment;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={href}
                      to={href}
                      aria-current={isActive ? "page" : undefined}
                      title={!expanded ? item.label : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-md py-2 pl-2 pr-3 text-sm transition-colors",
                        FOCUS,
                        isActive
                          ? "bg-muted/70 font-semibold text-foreground"
                          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId={reduced ? undefined : "testprep-rail"}
                          aria-hidden="true"
                          className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-[hsl(var(--bb-blue))]"
                          transition={{ type: "spring", stiffness: 520, damping: 40 }}
                        />
                      )}
                      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      <span
                        className={cn(
                          "whitespace-nowrap transition-opacity",
                          expanded ? "opacity-100" : "pointer-events-none opacity-0",
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Below lg the rail becomes a single scrolling row. The group boundaries
          are dropped rather than rendered as separators, because on a phone
          they'd read as five sections of one item each. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden">
        <ul className="flex w-max items-center gap-1.5">
          {SAT_SECTIONS.map((item) => {
            const href = sectionHref(testId, item.segment);
            const isActive = active?.segment === item.segment;
            return (
              <li key={href}>
                <Link
                  to={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-[34px] items-center rounded-full px-3.5 text-xs transition-colors",
                    FOCUS,
                    "border",
                    isActive
                      ? "border-transparent font-semibold text-[hsl(var(--bb-blue-foreground))]"
                      : "border-border/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId={reduced ? undefined : "testprep-pill"}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-[hsl(var(--bb-blue))]"
                      transition={{ type: "spring", stiffness: 520, damping: 40 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/**
 * The page header used by all five SAT pages.
 *
 * Deliberately small. This is a dashboard, not a landing page: the title is a
 * label for where you are, and the space belongs to the content under it.
 */
export function PageHeader({
  title,
  purpose,
  actions,
}: {
  title: string;
  purpose?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {purpose && (
          <p className="mt-1.5 max-w-2xl text-sm leading-snug text-muted-foreground">{purpose}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * A titled panel. One card shape across the section, so a panel on Practice and
 * a panel on Progress are the same object.
 */
export function Panel({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(SURFACE, "overflow-hidden", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-[13px] font-semibold tracking-[-0.005em] text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** The section's empty state. A sentence, not an illustration. */
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
