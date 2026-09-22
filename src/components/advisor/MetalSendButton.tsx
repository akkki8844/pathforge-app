import { useRef } from "react";
import { useTheme } from "next-themes";
import { useReducedMotion } from "framer-motion";
import { Send } from "lucide-react";
import { MetalFx, useMetalBend } from "metal-fx";
import { cn } from "@/lib/utils";

/**
 * The composer's send button, wrapped in metal-fx.
 *
 * Three things this wrapper exists to get right, none of which the library can
 * do on its own:
 *
 * 1. THEME. `MetalFx` defaults to `theme="auto"`, which resolves through
 *    `matchMedia('(prefers-color-scheme: dark)')`. Pathforge does not theme off
 *    the OS — it is class-based through next-themes, and a student can run the
 *    app in light mode on a dark desktop or the reverse. Left on auto, the
 *    preset would pick its dark tuning for a light composer roughly whenever
 *    those two disagree. The resolved app theme is passed explicitly instead.
 *
 * 2. MOTION. The effect is a continuously animating shader with a wandering
 *    halo. That is motion with no informational content, so it is `paused`
 *    under `prefers-reduced-motion` — the button keeps its metal surface, it
 *    just stops moving. `useMetalBend` (the cursor dent) is skipped for the
 *    same reason.
 *
 * 3. FALLBACK. Without WebGL2 the library renders the plain child, so the
 *    button still works; it just isn't metal. Nothing here depends on the
 *    effect being present, and the accessible name lives on the <button>, not
 *    on the wrapper.
 */
export function MetalSendButton({
  disabled,
  className,
}: {
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Deliberately never attached to anything. `useMetalBend` takes a ref, and
  // handing it a fresh `{ current: null }` literal would change identity on
  // every render and make the hook re-subscribe each time.
  const detached = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  // The cursor dent tracks the pointer every frame. Nothing is communicated by
  // it, so it does not run for a reader who asked for less movement.
  useMetalBend(reduceMotion ? detached : ref);

  return (
    <MetalFx
      ref={ref}
      preset="chromatic"
      variant="circle"
      innerShadow
      paused={!!reduceMotion}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      className={cn("shrink-0 rounded-full", className)}
    >
      <button
        type="submit"
        disabled={disabled}
        aria-label="Send message"
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground sm:h-8 sm:w-8",
          "transition-transform duration-100 active:scale-[0.97] disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <Send className="h-4 w-4" />
      </button>
    </MetalFx>
  );
}
