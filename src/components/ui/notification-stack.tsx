import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A notification list whose rows stack in and swipe away.
 *
 * Two behaviours the plain list did not have.
 *
 * **Stacked entry.** Rows animate in from underneath the one above rather than
 * each sliding in from the right independently, so a burst of notifications
 * reads as one deck landing instead of eight unrelated things flying past. The
 * stagger is capped: with fifty rows, a per-row delay would make the last one
 * arrive two and a half seconds late.
 *
 * **Swipe to dismiss.** Drag a row horizontally and it leaves. The row's
 * opacity tracks the drag distance, so the gesture shows you what it is going
 * to do before you commit to it, and a drag that does not reach the threshold
 * springs back rather than silently doing nothing.
 *
 * Swipe is never the only way to dismiss. It is invisible until you try it and
 * impossible with a keyboard, so every row also carries a real dismiss button
 * that appears on hover and on focus. The gesture is the shortcut, not the
 * interface.
 */

export interface NotificationStackItem {
  id: string;
  title: string;
  message?: string | null;
  /** Small text under the message: source, time, whatever the caller wants. */
  meta?: ReactNode;
  icon?: ReactNode;
  unread?: boolean;
}

export interface NotificationStackProps {
  items: NotificationStackItem[];
  /** Called when a row is activated by click, Enter or Space. */
  onActivate?: (id: string) => void;
  /** Called when a row is swiped away or its dismiss button is pressed. */
  onDismiss?: (id: string) => void;
  /** Word used in the dismiss button's accessible name, e.g. "Dismiss". */
  dismissLabel?: string;
  className?: string;
  children?: ReactNode;
}

/** How far a row must travel before letting go removes it. */
const DISMISS_PX = 96;
/** Rows after this one all animate in together. */
const MAX_STAGGER = 8;

function NotificationRow({
  item,
  index,
  onActivate,
  onDismiss,
  dismissLabel,
}: {
  item: NotificationStackItem;
  index: number;
  onActivate?: (id: string) => void;
  onDismiss?: (id: string) => void;
  dismissLabel: string;
}) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  // Fades with distance in either direction, so the row visibly commits to
  // leaving as it approaches the threshold.
  const opacity = useTransform(x, [-DISMISS_PX * 1.4, 0, DISMISS_PX * 1.4], [0, 1, 0]);
  const [hovered, setHovered] = useState(false);

  const draggable = Boolean(onDismiss) && !reduced;

  return (
    <motion.li
      layout={!reduced}
      // Entry: from beneath the previous row rather than in from the side.
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0, scale: 0.98 }}
      transition={{
        duration: 0.28,
        delay: Math.min(index, MAX_STAGGER) * 0.035,
        layout: { duration: 0.2 },
      }}
      style={draggable ? { x, opacity } : undefined}
      drag={draggable ? "x" : false}
      dragDirectionLock
      dragElastic={0.5}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > DISMISS_PX) onDismiss?.(item.id);
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        "relative list-none overflow-hidden",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div
        role={onActivate ? "button" : undefined}
        tabIndex={onActivate ? 0 : undefined}
        onClick={() => onActivate?.(item.id)}
        onKeyDown={(e) => {
          if (!onActivate) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onActivate(item.id);
          }
        }}
        className={cn(
          "flex items-start gap-3 px-4 py-3.5 text-left transition-colors",
          onActivate && "cursor-pointer hover:bg-accent/40 focus-visible:bg-accent/40",
          "focus-visible:outline-none",
          item.unread && "bg-primary/5",
        )}
      >
        {item.icon && <div className="mt-0.5 flex-shrink-0">{item.icon}</div>}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.unread && (
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" aria-hidden />
            )}
            <h4 className="truncate text-sm font-medium">{item.title}</h4>
          </div>
          {item.message && (
            <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
              {item.message}
            </p>
          )}
          {item.meta && (
            <div className="mt-1.5 text-[11px] text-muted-foreground">{item.meta}</div>
          )}
        </div>

        {/* The keyboard and no-pointer path to the same action as the swipe.
            `focus-within` on the row is not enough — the button must be able to
            receive focus itself, so it is always rendered and only visually
            faded when idle. */}
        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(item.id);
            }}
            aria-label={`${dismissLabel}: ${item.title}`}
            className={cn(
              "-mr-1 mt-0.5 flex-shrink-0 rounded-md p-1 text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              hovered ? "opacity-100" : "opacity-0",
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.li>
  );
}

export function NotificationStack({
  items,
  onActivate,
  onDismiss,
  dismissLabel = "Dismiss",
  className,
  children,
}: NotificationStackProps) {
  // Only the first render staggers. Without this, marking one row read
  // re-runs the entry animation on every row below it.
  const mounted = useRef(false);
  const firstRender = !mounted.current;
  mounted.current = true;

  if (items.length === 0) return <>{children}</>;

  return (
    <ul className={cn("divide-y divide-border/40", className)}>
      <AnimatePresence initial={firstRender}>
        {items.map((item, index) => (
          <NotificationRow
            key={item.id}
            item={item}
            index={firstRender ? index : MAX_STAGGER}
            onActivate={onActivate}
            onDismiss={onDismiss}
            dismissLabel={dismissLabel}
          />
        ))}
      </AnimatePresence>
    </ul>
  );
}
