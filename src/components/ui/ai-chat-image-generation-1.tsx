import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The wait for a generated image, shown as a wipe rather than a spinner.
 *
 * Four changes from the component as published, each for a reason:
 *
 * 1. `motion/react` is not installed here; `framer-motion` is, and it is the
 *    same library under its previous name.
 * 2. `var(--color-muted-foreground)` is Tailwind v4's theme-variable syntax.
 *    This project is on v3, where those custom properties do not exist and the
 *    shimmer gradient would have resolved to nothing. The tokens are read as
 *    `hsl(var(--muted-foreground))` instead.
 * 3. The original's interval is started inside a `setTimeout` callback and
 *    "cleaned up" by a return value that React never sees, so it kept firing
 *    after unmount. Both timers are held in refs and cleared for real.
 * 4. `done` is new, and it is the honest part. Without it the bar is a 30-second
 *    guess that hits 100% whether or not an image exists. Pass `done` and the
 *    wipe advances to a ceiling and waits there for the real event, so the page
 *    never claims the image is finished before it is.
 */

export interface ImageGenerationProps {
  /** The image being revealed. Rendered underneath the blur from the first frame. */
  children: React.ReactNode;
  /**
   * The real completion signal. Leave undefined to let the wipe drive itself to
   * 100% on a timer — only appropriate where there is nothing real to wait for.
   */
  done?: boolean;
  /** How long the wipe takes to cross the image, in ms. */
  duration?: number;
  /** Pause before the wipe starts, in ms. */
  startDelay?: number;
  /** Replaces the three status lines. */
  labels?: { starting: string; generating: string; completed: string };
  className?: string;
}

const DEFAULT_LABELS = {
  starting: "Getting started.",
  generating: "Creating image. May take a moment.",
  completed: "Image created.",
};

/**
 * Where the wipe stops while it is still waiting on a real answer.
 *
 * Not 100: a full bar means finished, and a bar that sits full for another
 * twenty seconds teaches people to distrust every bar in the product.
 */
const CEILING = 92;

export function ImageGeneration({
  children,
  done,
  duration = 30_000,
  startDelay = 600,
  labels = DEFAULT_LABELS,
  className,
}: ImageGenerationProps) {
  const controlled = done !== undefined;
  const [progress, setProgress] = React.useState(0);
  const [loadingState, setLoadingState] = React.useState<"starting" | "generating" | "completed">(
    "starting",
  );

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      setLoadingState((s) => (s === "completed" ? s : "generating"));
      const startedAt = Date.now();
      const ceiling = controlled ? CEILING : 100;
      interval = setInterval(() => {
        const pct = Math.min(ceiling, ((Date.now() - startedAt) / duration) * 100);
        setProgress((p) => (p >= 100 ? p : pct));
        if (pct >= 100) {
          if (interval) clearInterval(interval);
          setLoadingState("completed");
        }
      }, 16);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [duration, startDelay, controlled]);

  // The real event, when there is one: finish the wipe wherever it had got to.
  React.useEffect(() => {
    if (!done) return;
    setProgress(100);
    setLoadingState("completed");
  }, [done]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <motion.span
        className="bg-[length:200%_100%] bg-clip-text text-base font-medium text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(110deg, hsl(var(--muted-foreground)), 35%, hsl(var(--foreground)), 50%, hsl(var(--muted-foreground)), 75%, hsl(var(--muted-foreground)))",
        }}
        initial={{ backgroundPosition: "200% 0" }}
        animate={{ backgroundPosition: loadingState === "completed" ? "0% 0" : "-200% 0" }}
        transition={{
          repeat: loadingState === "completed" ? 0 : Infinity,
          duration: 3,
          ease: "linear",
        }}
      >
        {loadingState === "starting" && labels.starting}
        {loadingState === "generating" && labels.generating}
        {loadingState === "completed" && labels.completed}
      </motion.span>
      <div className="relative max-w-md overflow-hidden rounded-xl border border-border bg-card">
        {children}
        <motion.div
          className="pointer-events-none absolute -top-[25%] h-[125%] w-full backdrop-blur-3xl"
          initial={false}
          animate={{
            clipPath: `polygon(0 ${progress}%, 100% ${progress}%, 100% 100%, 0 100%)`,
            opacity: loadingState === "completed" ? 0 : 1,
          }}
          style={{
            clipPath: `polygon(0 ${progress}%, 100% ${progress}%, 100% 100%, 0 100%)`,
            maskImage:
              progress === 0
                ? "linear-gradient(to bottom, black -5%, black 100%)"
                : `linear-gradient(to bottom, transparent ${progress - 5}%, transparent ${progress}%, black ${progress + 5}%)`,
            WebkitMaskImage:
              progress === 0
                ? "linear-gradient(to bottom, black -5%, black 100%)"
                : `linear-gradient(to bottom, transparent ${progress - 5}%, transparent ${progress}%, black ${progress + 5}%)`,
          }}
        />
      </div>
    </div>
  );
}

ImageGeneration.displayName = "ImageGeneration";

export default ImageGeneration;
