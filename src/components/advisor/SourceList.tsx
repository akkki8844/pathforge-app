import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { AdvisorSource } from "@/lib/advisorStream";
import { cn } from "@/lib/utils";

/**
 * The pages the advisor read before answering.
 *
 * WHY THIS IS NOT OPTIONAL CHROME
 *
 * The advisor can now search the live web, and a searched answer is a
 * different kind of claim from an advised one. "Cornell's deadline is 2
 * January" sounds identical whether it came from a page published this week or
 * from a model's memory of a page published three years ago, and a student
 * planning around the wrong date finds out too late to fix it. This strip is
 * what makes the difference checkable: every answer built from a search shows
 * exactly which pages it was built from, and every one of them is a link.
 *
 * It appears as soon as the search returns, before the answer written from it
 * has been generated, because at that point it is the only thing on screen
 * that says what is happening.
 *
 * Collapsed by default past the first two. A chat bubble followed by six link
 * rows buries the answer under its own footnotes, and the common case is that
 * the student wants the answer and only occasionally wants the receipts.
 */
export function SourceList({
  sources,
  className,
}: {
  sources: AdvisorSource[];
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  const visible = open ? sources : sources.slice(0, 2);
  const hidden = sources.length - visible.length;

  return (
    <div className={cn("mt-3 rounded-xl border border-border bg-card/60 p-3", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {sources.length === 1 ? "Source" : `${sources.length} sources`}
      </p>

      <ul className="mt-2 space-y-1.5">
        {visible.map((source, i) => (
          <li key={source.url} className="flex items-start gap-2">
            {/* The index is the citation number the answer refers to, so it has
                to keep counting across the collapse rather than restarting. */}
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-1 text-[13px] font-medium leading-snug text-foreground group-hover:underline">
                <span className="truncate">{source.title}</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
              </span>
              {/* The host, not the full URL: a signed or query-heavy link is
                  three lines of noise, and what a reader checks is who
                  published it. */}
              <span className="block truncate text-[11px] text-muted-foreground">
                {hostOf(source.url)}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {(hidden > 0 || open) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 rounded-sm text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={open ? "less" : "more"}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {open ? "Show fewer" : `${hidden} more`}
            </motion.span>
          </AnimatePresence>
          <ChevronDown
            className={cn("h-3 w-3 transition-transform duration-200", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}

/** Hostname without the `www.`, or the raw string if it will not parse. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
