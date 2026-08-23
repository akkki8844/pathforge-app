import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";
import {
  forwardRef,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

/**
 * A spring-physics button: presses inward, lifts on hover, optionally ripples.
 *
 * This is the high-intent CTA button — the one used where a click costs the
 * user money or commits them to something. It sits alongside `./button.tsx`
 * rather than replacing it: that one is the shadcn workhorse behind hundreds of
 * call sites, and swapping every one of them for a motion component would put a
 * spring animation on things like "Cancel" and "Close", which is noise.
 *
 * Two deliberate deviations from the source this was adapted from:
 *
 * 1. **It imports `framer-motion`, not `motion/react`.** The `motion` package is
 *    the renamed framer-motion, and this app already depends on
 *    `framer-motion@12`. Installing both would ship two copies of the same
 *    engine *and* split the animation context — an `AnimatePresence` from one
 *    package does not track `motion` children from the other, so exit
 *    animations silently stop running. Same API, same behaviour, one library.
 *
 * 2. **It uses the shared `cn` from `@/lib/utils`** instead of redeclaring one.
 *    A second `twMerge(clsx(...))` would behave identically today and drift the
 *    moment either is configured with custom Tailwind groups.
 *
 * The easing and spring constants are re-exported below so a copy-pasted usage
 * from the source keeps compiling, but new code should prefer `@/lib/motion`,
 * which is where the rest of the app's motion vocabulary lives.
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

export const EASE_OUT_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/** The press. Stiff and lightly damped, so it snaps back rather than settling. */
export const SPRING_PRESS = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.6,
} as const;

export const SPRING_SWAP = {
  type: "spring",
  stiffness: 460,
  damping: 30,
  mass: 0.55,
} as const;

export const SPRING_PANEL = {
  type: "spring",
  stiffness: 420,
  damping: 40,
  mass: 0.5,
} as const;

export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 360,
  damping: 32,
  mass: 0.6,
} as const;

export const SPRING_MOUSE = {
  stiffness: 200,
  damping: 15,
  mass: 0.3,
} as const;

/**
 * Whether this device has a real pointer that can hover.
 *
 * Without it, `whileHover` fires on touch as a sticky state: the button lifts on
 * tap and stays lifted, because a finger never produces a "leave". Gating the
 * hover scale on `(hover: hover) and (pointer: fine)` is what keeps the press
 * feeling like a press on a phone.
 */
export function useHoverCapable() {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mq.matches);

    update();
    mq.addEventListener?.("change", update);

    return () => mq.removeEventListener?.("change", update);
  }, []);

  return canHover;
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pressScale?: number;
  ripple?: boolean;
  children?: ReactNode;
}

type Ripple = {
  id: number;
  x: number;
  y: number;
  size: number;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-card text-foreground hover:border-border",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-primary/5",
  outline: "border border-border bg-transparent text-foreground hover:bg-primary/5",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-full",
  md: "h-10 px-5 text-sm gap-2 rounded-full",
  lg: "h-12 px-6 text-base gap-2 rounded-full",
  icon: "h-8 w-8 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      pressScale = 0.93,
      ripple = false,
      className,
      children,
      onPointerDown,
      ...rest
    },
    ref,
  ) {
    const reduce = useReducedMotion();
    const canHover = useHoverCapable();
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const nextId = useRef(0);

    const handlePointerDown = useCallback(
      (event: PointerEvent<HTMLButtonElement>) => {
        if (ripple && !reduce) {
          const rect = event.currentTarget.getBoundingClientRect();
          // Twice the longest edge, so the circle covers the button from any
          // origin — including a tap in a corner.
          const size = Math.max(rect.width, rect.height) * 2;

          setRipples((prev) => [
            ...prev,
            {
              id: nextId.current++,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              size,
            },
          ]);
        }

        onPointerDown?.(event);
      },
      [ripple, reduce, onPointerDown],
    );

    return (
      <motion.button
        ref={ref}
        type="button"
        whileTap={reduce ? undefined : { scale: pressScale }}
        whileHover={reduce || !canHover ? undefined : { scale: 1.02 }}
        transition={SPRING_PRESS}
        onPointerDown={handlePointerDown}
        className={cn(
          "inline-flex items-center justify-center font-medium select-none",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          ripple && "relative overflow-hidden",
          VARIANT_CLASS[variant],
          SIZE_CLASS[size],
          // Last, so a caller's `rounded-xl h-11 w-full` wins over the size
          // preset — twMerge resolves the conflict rather than emitting both.
          className,
        )}
        {...rest}
      >
        {ripple && !reduce ? (
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <AnimatePresence>
              {ripples.map((r) => (
                <motion.span
                  key={r.id}
                  className="absolute rounded-full bg-current"
                  style={{
                    left: r.x,
                    top: r.y,
                    width: r.size,
                    height: r.size,
                    x: "-50%",
                    y: "-50%",
                  }}
                  initial={{ scale: 0, opacity: 0.3 }}
                  animate={{ scale: 1, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.6, ease: EASE_OUT }}
                  // Ripples are unbounded otherwise: a user who taps twenty
                  // times leaves twenty invisible spans in the tree.
                  onAnimationComplete={() =>
                    setRipples((prev) => prev.filter((x) => x.id !== r.id))
                  }
                />
              ))}
            </AnimatePresence>
          </span>
        ) : null}

        {children}
      </motion.button>
    );
  },
);
