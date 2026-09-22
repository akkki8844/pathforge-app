import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, Send } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A floating dock of people you can message without leaving the page.
 *
 * Collapsed it is a pill: a brand button, a row of faces, a menu button.
 * Clicking a face expands the pill into a single-line composer tinted with
 * that person's accent, and the menu button becomes the send button.
 *
 * WHAT THIS COMPONENT DOES AND DOES NOT KNOW
 *
 * It knows how to animate and how to collect a line of text. It knows nothing
 * about conversations, Supabase, or routing — every one of those arrives as a
 * prop or a callback, so the same dock can be driven by real chat data here
 * and by a fixture elsewhere without either one knowing about the other.
 * `MessageDockBar` is the piece that binds it to live data.
 *
 * WHY THE AVATAR IS A ReactNode
 *
 * The obvious shape for a dock person is `{ emoji: string }`, and that is what
 * the original sketch used. Pathforge does not have emoji people: an account's
 * picture is a `pf:<face>:<palette>` token that only `PathforgeAvatar` knows
 * how to resolve. Taking a rendered node instead of a string keeps that
 * resolver where it belongs and means this file never learns the token format.
 */

export interface DockPerson {
  /** Stable key. In practice a conversation id. */
  id: string;
  /** What to call them, used in the placeholder and the accessible name. */
  name: string;
  /** Already-rendered avatar. See the note above on why this is a node. */
  avatar: ReactNode;
  /** Presence dot. Leave undefined where presence genuinely is not known. */
  online?: boolean;
  /** Unread messages, rendered as a count badge. */
  unread?: number;
  /**
   * Two CSS colour stops for the expanded wash, light theme then dark. These
   * are literal strings rather than Tailwind classes because the value is
   * animated through an inline style, which the JIT never sees — a class built
   * by interpolation would produce no CSS at all.
   */
  gradient: { light: string; dark: string };
}

/**
 * A destination the dock can take you to directly.
 *
 * The dock is the one piece of Pathforge that is on screen on nearly every
 * page, and collapsed it was mostly empty pill. These fill that space with the
 * places a conversation usually ends up going next, rather than with padding.
 */
export interface DockShortcut {
  id: string;
  /** Tooltip and accessible name. There is no room for a visible one. */
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Optional count, for a shortcut that has something waiting behind it. */
  badge?: number;
}

export interface MessageDockProps {
  people: DockPerson[];
  /** Quick destinations shown after the faces while the dock is collapsed. */
  shortcuts?: DockShortcut[];
  /** Fires with the trimmed body. Returning false leaves the composer open. */
  onSend?: (message: string, person: DockPerson) => void | boolean;
  onSelect?: (person: DockPerson) => void;
  onToggle?: (isExpanded: boolean) => void;
  /** The left-hand button. Pathforge puts its logo here. */
  brand?: ReactNode;
  onBrandClick?: () => void;
  brandLabel?: string;
  /** The right-hand button while collapsed. */
  onMenuClick?: () => void;
  menuLabel?: string;
  /** True once the surrounding page knows the theme is dark. */
  isDark?: boolean;
  className?: string;
  expandedWidth?: number;
  position?: "bottom" | "top";
  placeholder?: (name: string) => string;
  autoFocus?: boolean;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  closeOnSend?: boolean;
  enableAnimations?: boolean;
}

export function MessageDock({
  people,
  shortcuts = [],
  onSend,
  onSelect,
  onToggle,
  brand,
  onBrandClick,
  brandLabel = "Open messages",
  onMenuClick,
  menuLabel = "All conversations",
  isDark = false,
  className,
  expandedWidth = 448,
  position = "bottom",
  placeholder = (name) => `Message ${name}...`,
  autoFocus = true,
  closeOnClickOutside = true,
  closeOnEscape = true,
  closeOnSend = true,
  enableAnimations = true,
}: MessageDockProps) {
  const shouldReduceMotion = useReducedMotion();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const dockRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [collapsedWidth, setCollapsedWidth] = useState(0);

  const selected = expandedId ? people.find((p) => p.id === expandedId) ?? null : null;
  const isExpanded = selected !== null;

  /*
   * The collapsed width has to be measured rather than declared, because it
   * depends on how many faces and shortcuts the caller passed.
   *
   * MEASURE THE CONTENT, NOT THE PILL. This used to read `dockRef.offsetWidth`,
   * which is the width Framer last animated the pill *to* — so the measurement
   * was of the previous state, not of what is now inside it. The dock mounts
   * with no conversations loaded, measures that empty pill, and then the
   * conversations arrive: the faces, the shortcut icons and the menu button are
   * all `shrink-0`, so they overflowed a pill still sized for an empty one and
   * spilled out past its rounded edge. That is the "deconstructed" dock — a
   * short white pill with half its controls sitting outside it on the page.
   *
   * `scrollWidth` on the content row is the natural extent of that content even
   * while the box around it is narrower, which is exactly the number wanted.
   * A ResizeObserver keeps it honest afterwards: the row cannot grow past the
   * pill, so the children are observed too, and an unread badge appearing or a
   * face arriving re-measures on its own without a dependency for each case.
   */
  useEffect(() => {
    if (isExpanded) return;
    const row = rowRef.current;
    if (!row) return;

    const measure = () => {
      // px-3 either side of the pill, plus its 1px border.
      const w = Math.ceil(row.scrollWidth) + 26;
      setCollapsedWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    for (const child of Array.from(row.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [people.length, shortcuts.length, isExpanded]);

  const close = () => {
    setExpandedId(null);
    setDraft("");
    onToggle?.(false);
  };

  useEffect(() => {
    if (!closeOnClickOutside || !isExpanded) return;
    const onDown = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeOnClickOutside, isExpanded]);

  /*
   * A conversation can disappear from under an open composer — someone leaves a
   * group, or the list refetches without it. Dropping the open state is the
   * only safe response; leaving `expandedId` pointing at nothing would render
   * an expanded pill with no recipient and a send button that resolves to no
   * conversation at all.
   */
  useEffect(() => {
    if (expandedId && !people.some((p) => p.id === expandedId)) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, expandedId]);

  const handleSelect = (person: DockPerson) => {
    if (expandedId === person.id) {
      close();
      return;
    }
    setExpandedId(person.id);
    setDraft("");
    onSelect?.(person);
    onToggle?.(true);
  };

  const handleSend = () => {
    const body = draft.trim();
    if (!body || !selected) return;
    const result = onSend?.(body, selected);
    setDraft("");
    if (closeOnSend && result !== false) close();
  };

  const spring = { type: "spring" as const, stiffness: 400, damping: 30 };
  const hover = shouldReduceMotion
    ? { scale: 1.02 }
    : { scale: 1.06, y: -6, transition: { type: "spring" as const, stiffness: 400, damping: 25 } };

  const wash = selected
    ? `linear-gradient(to right, ${isDark ? selected.gradient.dark : selected.gradient.light})`
    : undefined;

  return (
    <motion.div
      ref={dockRef}
      className={cn(
        "fixed left-1/2 z-40",
        position === "top" ? "top-6" : "bottom-6",
        className,
      )}
      /*
       * The horizontal centring is animated, not a class.
       *
       * `-translate-x-1/2` was on the element and was silently thrown away:
       * animating `scale` and `y` makes Framer write the whole `transform`
       * property, so the class's translate was overwritten on the first frame
       * and the dock sat half its own width right of centre. Centring the same
       * way it animates is what keeps the two from fighting.
       */
      initial={
        enableAnimations
          ? { opacity: 0, x: "-50%", y: position === "top" ? -60 : 60, scale: 0.9 }
          : { x: "-50%" }
      }
      animate={{ opacity: 1, x: "-50%", y: 0, scale: 1 }}
      transition={enableAnimations ? { type: "spring", stiffness: 300, damping: 30 } : { duration: 0 }}
    >
      <motion.div
        className="rounded-full border border-border px-3 py-2 shadow-2xl backdrop-blur"
        animate={{
          width: isExpanded ? expandedWidth : collapsedWidth || "auto",
          background: wash ?? "hsl(var(--card))",
        }}
        transition={
          enableAnimations
            ? { type: "spring", stiffness: 320, damping: 32, background: { duration: 0.2 } }
            : { duration: 0 }
        }
      >
        <div ref={rowRef} className="relative flex items-center gap-2">
          {/* Brand. Slides out of the way when the composer opens. */}
          {brand && (
            <motion.button
              type="button"
              onClick={onBrandClick}
              aria-label={brandLabel}
              title={brandLabel}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              animate={{
                opacity: isExpanded ? 0 : 1,
                x: isExpanded ? -16 : 0,
                scale: isExpanded ? 0.8 : 1,
                pointerEvents: isExpanded ? "none" : "auto",
              }}
              transition={spring}
              whileHover={!isExpanded ? hover : undefined}
              whileTap={{ scale: 0.95 }}
            >
              {brand}
            </motion.button>
          )}

          <motion.div
            aria-hidden
            className="h-6 w-px shrink-0 bg-border"
            animate={{ opacity: isExpanded ? 0 : 1, scaleY: isExpanded ? 0 : 1 }}
            transition={spring}
          />

          {people.map((person) => {
            const isSelectedOne = selected?.id === person.id;
            return (
              <motion.div
                key={person.id}
                className={cn(
                  "relative shrink-0",
                  isSelectedOne && isExpanded && "absolute left-0 top-0 z-20",
                )}
                style={{ width: isSelectedOne && isExpanded ? 0 : "auto" }}
                animate={{
                  opacity: isExpanded && !isSelectedOne ? 0 : 1,
                  y: isExpanded && !isSelectedOne ? 48 : 0,
                  scale: isExpanded && !isSelectedOne ? 0.8 : 1,
                  pointerEvents: isExpanded && !isSelectedOne ? "none" : "auto",
                }}
                transition={spring}
              >
                <motion.button
                  type="button"
                  onClick={() => handleSelect(person)}
                  aria-label={`Message ${person.name}`}
                  title={person.name}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full"
                  whileHover={!isExpanded ? hover : { scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {person.avatar}
                  {person.online !== undefined && (
                    <motion.span
                      aria-hidden
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                        person.online ? "bg-success" : "bg-muted-foreground/50",
                      )}
                      animate={{ scale: isExpanded && !isSelectedOne ? 0 : 1 }}
                      transition={spring}
                    />
                  )}
                  {!!person.unread && person.unread > 0 && (
                    <motion.span
                      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold tabular-nums text-destructive-foreground"
                      animate={{ scale: isExpanded ? 0 : 1 }}
                      transition={spring}
                    >
                      {person.unread > 9 ? "9+" : person.unread}
                    </motion.span>
                  )}
                </motion.button>
              </motion.div>
            );
          })}

          {shortcuts.length > 0 && (
            <motion.div
              aria-hidden={isExpanded}
              className="flex shrink-0 items-center gap-1"
              animate={{
                opacity: isExpanded ? 0 : 1,
                x: isExpanded ? 24 : 0,
                pointerEvents: isExpanded ? "none" : "auto",
              }}
              transition={spring}
            >
              <span aria-hidden className="mx-0.5 h-6 w-px bg-border" />
              {shortcuts.map((s) => (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={s.onClick}
                  aria-label={s.label}
                  title={s.label}
                  tabIndex={isExpanded ? -1 : 0}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {s.icon}
                  {!!s.badge && s.badge > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold tabular-nums text-accent-foreground">
                      {s.badge > 9 ? "9+" : s.badge}
                    </span>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}

          <AnimatePresence>
            {isExpanded && selected && (
              <motion.input
                key="composer"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                  if (e.key === "Escape" && closeOnEscape) close();
                }}
                placeholder={placeholder(selected.name)}
                aria-label={placeholder(selected.name)}
                autoFocus={autoFocus}
                /*
                 * The wash is a pastel in light mode and a deep tint in dark,
                 * so the text colour is pinned to the ink that reads on each
                 * rather than inherited. Inheriting is what would otherwise put
                 * mid-grey placeholder text on a mid-tone gradient.
                 */
                className={cn(
                  "absolute left-12 right-12 z-30 border-none bg-transparent text-sm font-medium outline-none",
                  isDark
                    ? "text-white placeholder:text-white/70"
                    : "text-zinc-900 placeholder:text-zinc-700",
                )}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.12, ...spring } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              />
            )}
          </AnimatePresence>

          <motion.div
            aria-hidden
            className="h-6 w-px shrink-0 bg-border"
            animate={{ opacity: isExpanded ? 0 : 1, scaleY: isExpanded ? 0 : 1 }}
            transition={spring}
          />

          <div
            className={cn(
              "flex shrink-0 items-center justify-center",
              isExpanded && "absolute right-0 z-30",
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {!isExpanded ? (
                <motion.button
                  key="menu"
                  type="button"
                  onClick={onMenuClick}
                  aria-label={menuLabel}
                  title={menuLabel}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  whileHover={hover}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={spring}
                >
                  <Menu className="h-5 w-5" />
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  aria-label="Send message"
                  title="Send"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    isDark
                      ? "bg-white/20 text-white hover:bg-white/30"
                      : "bg-white/80 text-zinc-900 hover:bg-white",
                  )}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  initial={{ opacity: 0, scale: 0, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0, transition: { delay: 0.16, ...spring } }}
                  exit={{ opacity: 0, scale: 0, rotate: 90, transition: { duration: 0.1 } }}
                >
                  <Send className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default MessageDock;
