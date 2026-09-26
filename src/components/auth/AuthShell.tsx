import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import pathforgeLogo from "@/assets/pathforge-logo.webp";

/**
 * The shell both sign-in pages sit in.
 *
 * A full-height split: the product's own side on the left, the form on the
 * right, and on a phone only the form. That is the shape every sign-in page a
 * school administrator has ever used takes, which is the point — this screen is
 * the first thing a new counsellor sees, and it should look like software their
 * IT department would approve rather than like a landing page.
 *
 * What it deliberately does not do: no card floating in the middle of an empty
 * viewport, no logo that springs in on a rotation, no fields that unblur on a
 * stagger, no button tinted with a hardcoded hex that ignores the theme. The
 * previous version had all four, and on a slow machine the form was unreadable
 * for the first half-second of every visit.
 */
export function AuthShell({
  aside,
  children,
  /** Small caps label over the left column, e.g. "Counsellor portal". */
  eyebrow,
  /**
   * The left panel's colour.
   *
   * "primary" is a solid field of the brand colour, which is what makes the
   * form column read as the thing to act on — the counsellor portal uses it.
   * "muted" is a quiet neutral panel, for asides that carry their own
   * light-background content (the student page runs review cards there, and
   * they would be unreadable inverted).
   */
  tone = "primary",
  /**
   * What sits under the form on the narrow layout, where the left column is
   * gone entirely.
   *
   * The aside is hidden below `lg`, so on a phone the panel's whole argument
   * disappears and the page is eight inputs on an empty background. This slot
   * is for the one piece of it worth carrying down — in practice the editorial
   * line — at the bottom of the column rather than above the fields, because
   * nothing should sit between a sign-in page's heading and its first input.
   */
  narrowAside,
  /** Where the back link goes. Defaults to the landing page. */
  backTo = "/",
  backLabel = "Back to Pathforge",
}: {
  aside: ReactNode;
  children: ReactNode;
  eyebrow?: string;
  tone?: "primary" | "muted";
  narrowAside?: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  const dark = tone === "primary";

  return (
    <div className="grid min-h-[100svh] bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
      {/* Left: one flat field of colour, no gradient. */}
      <aside
        className={cn(
          "relative hidden flex-col justify-between p-10 lg:flex xl:p-14",
          dark
            // Not `--primary`: that token lightens to 65% in dark mode, and
            // white body copy on it sits under 3:1. The panel is instead a
            // fixed deep indigo per theme — same hue as the brand, chosen for
            // the text that has to sit on it.
            ? "bg-[hsl(226_62%_44%)] text-white dark:bg-[hsl(226_44%_15%)]"
            : "border-r border-border bg-muted/40 text-foreground",
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={pathforgeLogo}
              alt="Pathforge logo"
              className={cn("h-9 w-auto", dark && "brightness-0 invert")}
            />
            <span className="text-[15px] font-semibold tracking-tight">Pathforge</span>
          </Link>
          {eyebrow && (
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                dark ? "border-white/25 text-white/80" : "border-border text-muted-foreground",
              )}
            >
              {eyebrow}
            </span>
          )}
        </div>

        {/* Wide enough for the student page's review columns to land whole:
            a column clipped down its middle reads as a rendering bug, not as a
            crawl continuing off-panel. */}
        <div className="max-w-2xl py-10 2xl:max-w-3xl">{aside}</div>

        <Link
          to={backTo}
          className={cn(
            "inline-flex items-center gap-2 text-[13px] transition-colors",
            dark
              ? "text-white/70 hover:text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      </aside>

      {/* Right: the form. */}
      <main className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-12">
        {/* The mark only appears on the narrow layout, where the left column
            that carries it is gone. */}
        <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={pathforgeLogo} alt="Pathforge logo" className="h-9 w-auto" />
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              Pathforge
            </span>
          </Link>
          {eyebrow && (
            <span className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {eyebrow}
            </span>
          )}
        </div>

        <div className="mx-auto w-full max-w-[26rem]">{children}</div>

        {narrowAside && (
          <div className="mx-auto mt-12 w-full max-w-[26rem] border-t border-border pt-8 lg:hidden">
            {narrowAside}
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * The heading pair at the top of the form column.
 *
 * One h1, one line under it, no animation on either — the title of a sign-in
 * page changing state is not an event that needs a transition.
 */
export function AuthHeading({
  title,
  sub,
  className,
}: {
  title: string;
  sub: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-7", className)}>
      <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.03em] text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{sub}</p>
    </div>
  );
}

/** The "or use email" rule between the OAuth buttons and the fields. */
export function AuthDivider({ label = "or use email" }: { label?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
