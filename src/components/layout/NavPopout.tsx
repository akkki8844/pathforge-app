import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The dock's hover "popout" — magnify on hover, label pops up above it — as a
 * drop-in wrapper for a single navbar icon. Not the full dock (that magnifies
 * every item relative to the mouse's distance across a whole row, which is
 * built for a dense icon rail, not three spaced-out buttons); this keeps just
 * the two things that made the reference feel good: the spring scale-up and
 * the fading, sliding label — same typography, same motion values.
 */
export function NavPopout({
  label,
  children,
  className,
  align = "center",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  /** "right" keeps the label's right edge pinned to the icon's, for the
   * rightmost item in the bar, where a centered label would run off-screen. */
  align?: "center" | "right";
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.94 }}
      transition={{ mass: 0.1, stiffness: 150, damping: 12 }}
      className={cn("relative inline-flex", className)}
    >
      {children}
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "pointer-events-none absolute -top-6 w-fit whitespace-pre rounded-md border border-border bg-popover px-2 py-0.5 text-xs font-medium text-foreground shadow-sm",
              align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
            )}
            role="tooltip"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
