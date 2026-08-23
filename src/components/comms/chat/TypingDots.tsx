import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Three bouncing dots — the universal "someone is composing" signal. Plain
 * text alone ("X is typing…") is legible but static; this is the one place in
 * the thread where a little motion earns its keep.
 */
export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}
