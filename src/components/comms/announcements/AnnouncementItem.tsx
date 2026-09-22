import { useEffect, useRef, useState, type ReactNode } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Check, ChevronDown, Pin, PinOff } from "lucide-react";
import pathforgeLogo from "@/assets/pathforge-logo.webp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnnouncementPriority } from "@/lib/comms/types";

/**
 * One announcement in the feed, whether it came from a team, a class, a school
 * or from Pathforge itself.
 *
 * WHY ONE COMPONENT FOR BOTH SOURCES
 *
 * The feed used to render platform announcements with their own inline markup
 * and team announcements with a card component, so two things that are the same
 * kind of thing to a reader - "somebody announced this to me" - had different
 * type sizes, different date formats and different affordances. Where they
 * genuinely differ is only in who is speaking and what you can do about it, and
 * that is what the props carry: an avatar, a source label, and an optional set
 * of author controls.
 *
 * WHY READ STATE IS TIED TO VISIBILITY, NOT TO HOVER
 *
 * The card used to mark itself read on `onMouseEnter`. Sweeping the pointer
 * down the page marked the lot read without any of it being seen, and on a
 * touch screen, where there is no hover at all, nothing was ever marked read.
 * It now reports itself read once it has actually been on screen for a moment,
 * which is the claim "read" is supposed to make.
 */

/**
 * Priority, as a word.
 *
 * It used to be a filled, bordered chip - tinted background, coloured border,
 * a warning triangle inside it for "urgent". Three pieces of decoration for a
 * one-word fact, sitting on a line that already carries a title, an unread dot
 * and sometimes a pin. It is now set in the same small uppercase style as the
 * day headings, coloured and nothing else; "urgent" in red is not a thing
 * anyone misses for want of a triangle.
 */
const PRIORITY_STYLE: Record<AnnouncementPriority, string> = {
  normal: "text-muted-foreground",
  important: "text-warning",
  urgent: "text-destructive",
};

/** How long a card must be on screen before it counts as read. */
const DWELL_MS = 900;
/** Bodies longer than this get a Show more control rather than filling the page. */
const CLAMP_CHARS = 420;

function formatAnnouncementDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return `Today, ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, "HH:mm")}`;
  return format(d, "d MMM yyyy, HH:mm");
}

export interface AnnouncementItemProps {
  title: string;
  body: string;
  /** ISO timestamp shown under the title. */
  at: string;
  priority?: AnnouncementPriority;
  pinned?: boolean;
  /** Undefined means this kind of announcement has no per-reader read state. */
  isRead?: boolean;
  onRead?: () => void;
  /** Who is speaking: an avatar for a person, an emblem for Pathforge. */
  avatar: ReactNode;
  /** "Priya Raman", "Pathforge" — the name under the title. */
  authorLabel: string;
  /** Where it was posted: a team name, a class, "Everyone on Pathforge". */
  sourceLabel?: string;
  /** Turns the source label into a link when the source has a page. */
  sourceHref?: string;
  requiresAck?: boolean;
  hasAcknowledged?: boolean;
  onAcknowledge?: () => void;
  /** Present only for the author: pin and unpublish. */
  canManage?: boolean;
  onTogglePin?: () => void;
  onUnpublish?: () => void;
  /** Author-only: how many people have acknowledged so far. */
  ackCount?: number;
  className?: string;
}

export function AnnouncementItem({
  title,
  body,
  at,
  priority = "normal",
  pinned = false,
  isRead,
  onRead,
  avatar,
  authorLabel,
  sourceLabel,
  sourceHref,
  requiresAck = false,
  hasAcknowledged = false,
  onAcknowledge,
  canManage = false,
  onTogglePin,
  onUnpublish,
  ackCount,
  className,
}: AnnouncementItemProps) {
  const ref = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);

  // Callers pass an inline arrow, so depending on `onRead` itself would tear
  // down and rebuild the observer on every render of the feed.
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;

  const unread = isRead === false;
  const long = body.length > CLAMP_CHARS;
  const shown = long && !expanded ? `${body.slice(0, CLAMP_CHARS).trimEnd()}…` : body;

  useEffect(() => {
    if (!unread) return;
    const el = ref.current;
    if (!el) return;
    const fire = () => onReadRef.current?.();

    // No IntersectionObserver (old browser, jsdom) means falling back to
    // marking read on mount — worse than dwell, but still better than never.
    if (typeof IntersectionObserver === "undefined") {
      fire();
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(fire, DWELL_MS);
        } else if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      io.disconnect();
    };
  }, [unread]);

  return (
    <article
      ref={ref}
      className={cn(
        "rounded-2xl border bg-card p-4 transition-colors sm:p-5",
        pinned ? "border-accent/40 bg-accent/[0.04]" : "border-border",
        unread && "ring-1 ring-inset ring-accent/25",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">{avatar}</div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {unread && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                aria-label="Unread"
              />
            )}
            <h3 className="text-sm font-semibold leading-snug text-foreground">{title}</h3>
            {pinned && <Pin className="h-3 w-3 shrink-0 text-accent" aria-label="Pinned" />}
            {priority !== "normal" && (
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.12em]",
                  PRIORITY_STYLE[priority],
                )}
              >
                {priority}
              </span>
            )}
          </div>

          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{authorLabel}</span>
            {sourceLabel && (
              <>
                <span aria-hidden>·</span>
                {sourceHref ? (
                  <a href={sourceHref} className="hover:text-accent hover:underline">
                    {sourceLabel}
                  </a>
                ) : (
                  <span>{sourceLabel}</span>
                )}
              </>
            )}
            <span aria-hidden>·</span>
            <time dateTime={at}>{formatAnnouncementDate(at)}</time>
          </p>
        </div>

        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            {onTogglePin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onTogglePin}
                aria-label={pinned ? "Unpin announcement" : "Pin announcement"}
                title={pinned ? "Unpin" : "Pin to the top"}
              >
                {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </Button>
            )}
            {onUnpublish && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onUnpublish}
                className="text-muted-foreground hover:text-destructive"
              >
                Remove
              </Button>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {shown}
      </p>

      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        </button>
      )}

      {(requiresAck || typeof ackCount === "number") && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {requiresAck && !hasAcknowledged && (
            <>
              <p className="flex-1 text-xs text-muted-foreground">
                This one asks you to confirm you've seen it.
              </p>
              <Button size="sm" variant="outline" onClick={onAcknowledge}>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Acknowledge
              </Button>
            </>
          )}
          {requiresAck && hasAcknowledged && (
            <p className="flex-1 text-xs font-medium text-success">
              <Check className="mr-1 inline h-3.5 w-3.5" />
              You acknowledged this.
            </p>
          )}
          {typeof ackCount === "number" && (
            <p className="text-xs text-muted-foreground">
              {ackCount === 0
                ? "No acknowledgements yet"
                : `${ackCount} ${ackCount === 1 ? "person has" : "people have"} acknowledged`}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * The emblem that stands in for an author on a platform announcement.
 *
 * It was a lucide `ShieldCheck` (or `AlertTriangle`) inside a tinted accent
 * circle, which is the stock way to draw "official" and says nothing about who
 * is actually speaking. Pathforge has a mark of its own, so the mark is what
 * sits where a person's face would sit. Severity is carried by the priority
 * label on the title line, as it is for every other announcement in the feed,
 * rather than by swapping the speaker's face for a warning sign.
 */
export function PathforgeEmblem() {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
      <img
        src={pathforgeLogo}
        alt=""
        aria-hidden="true"
        width={40}
        height={40}
        className="h-6 w-6 object-contain"
      />
    </span>
  );
}
