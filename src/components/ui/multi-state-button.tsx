import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A button that shows what happened to the thing it started.
 *
 * Generation buttons across Pathforge all had the same shape: swap the label
 * for a spinner, await, swap it back. That tells you a request is in flight and
 * nothing else — the moment it returns, the button looks exactly as it did
 * before it was pressed, so success and failure are indistinguishable unless
 * you happen to catch the toast. On a slow generate, people press it again.
 *
 * This keeps four states in one control: idle, working, done, failed. Done and
 * failed hold for a beat and then fall back to idle, because a button stuck on
 * "Generated" is lying about what it will do if you press it again.
 *
 * Two ways to drive it. Hand it an async `onClick` and it runs the state
 * machine itself — resolve is success, throw is failure. Or pass `state`
 * explicitly when the truth already lives somewhere else, such as a React Query
 * mutation.
 */

export type ButtonState = "idle" | "loading" | "success" | "error";

export interface MultiStateButtonProps
  extends Omit<ComponentProps<typeof Button>, "onClick" | "children"> {
  idleLabel: ReactNode;
  loadingLabel?: ReactNode;
  successLabel?: ReactNode;
  errorLabel?: ReactNode;
  /** Icon for the resting state. The other three are fixed by meaning. */
  idleIcon?: ReactNode;
  /** Async work. Resolving shows success; throwing shows failure. */
  onClick?: () => void | Promise<unknown>;
  /** Drive the state from outside instead. Disables the internal machine. */
  state?: ButtonState;
  /** How long success and error hold before returning to idle. */
  resetAfterMs?: number;
}

const HOLD_MS = 1800;

export function MultiStateButton({
  idleLabel,
  loadingLabel = "Working…",
  successLabel = "Done",
  errorLabel = "Failed — try again",
  idleIcon,
  onClick,
  state: controlledState,
  resetAfterMs = HOLD_MS,
  className,
  disabled,
  ...rest
}: MultiStateButtonProps) {
  const reduced = useReducedMotion();
  const [internal, setInternal] = useState<ButtonState>("idle");
  const state = controlledState ?? internal;

  // Guards against setting state on an unmounted button — a generate that
  // navigates away on success would otherwise warn on every use.
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => {
    if (state !== "success" && state !== "error") return;
    const t = setTimeout(() => {
      if (!alive.current) return;
      if (controlledState === undefined) setInternal("idle");
    }, resetAfterMs);
    return () => clearTimeout(t);
  }, [state, controlledState, resetAfterMs]);

  const run = useCallback(async () => {
    if (!onClick) return;
    if (controlledState !== undefined) {
      // Externally driven: just forward the click and let the owner decide.
      await onClick();
      return;
    }
    setInternal("loading");
    try {
      await onClick();
      if (alive.current) setInternal("success");
    } catch {
      // Swallowed on purpose. The button's job here is to show that it failed;
      // re-throwing would surface an unhandled rejection to the bug capture
      // engine for a failure the user has already been told about.
      if (alive.current) setInternal("error");
    }
  }, [onClick, controlledState]);

  const content: Record<ButtonState, { icon: ReactNode; label: ReactNode }> = {
    idle: { icon: idleIcon, label: idleLabel },
    loading: { icon: <Loader2 className="h-4 w-4 animate-spin" />, label: loadingLabel },
    success: { icon: <Check className="h-4 w-4" />, label: successLabel },
    error: { icon: <TriangleAlert className="h-4 w-4" />, label: errorLabel },
  };
  const { icon, label } = content[state];

  return (
    <Button
      {...rest}
      onClick={() => void run()}
      disabled={disabled || state === "loading"}
      aria-busy={state === "loading"}
      /* The state is carried in text, not only in colour and an icon: a screen
         reader gets the same information a sighted user does. `aria-live` is
         polite so it does not interrupt, and only announces the change. */
      className={cn(
        "relative overflow-hidden",
        state === "error" && "border-destructive/40 text-destructive",
        className,
      )}
    >
      <span className="sr-only" aria-live="polite">
        {state === "loading" ? loadingLabel : state === "success" ? successLabel : state === "error" ? errorLabel : ""}
      </span>

      {/* Laid out in a grid so every state occupies the same cell. Crossfading
          two absolutely-positioned children instead would collapse the button's
          width to zero mid-transition. */}
      <span className="grid place-items-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state}
            aria-hidden
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="col-start-1 row-start-1 inline-flex items-center gap-2 whitespace-nowrap"
          >
            {icon}
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </Button>
  );
}
