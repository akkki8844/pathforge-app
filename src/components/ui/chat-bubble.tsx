import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * The people in a conversation, as a bubble that opens on hover.
 *
 * This is the presentational half only: it is handed participants and renders
 * them. Everything it shows — who is a member, who is connected right now, who
 * is mid-message — is resolved by the caller from real membership, the
 * directory RPC and the conversation's presence channel. There is no sample
 * data path through this file, so an empty list renders nothing rather than
 * inventing a plausible-looking crowd.
 *
 * Two departures from the component this was modelled on, both because the
 * product has no feature to back the original:
 *
 * - There is no voice channel, so the microphone and the "speaking" state are
 *   gone. The animated indicator survives, driven by the typing state the
 *   thread already tracks — the one live per-person signal that genuinely
 *   exists.
 * - "Join Now" would be a button that joins nothing. The footer action is
 *   whatever the caller passes, and in the chat header that is "open the
 *   details pane", which is a real destination.
 *
 * **On hover as the trigger.** Hover alone is not an interaction: it is
 * unreachable by keyboard and does not exist on a touchscreen. So the bubble
 * opens on pointer-enter *and* on focus, closes on pointer-leave, blur or
 * Escape, and is a plain toggle button when the pointer is coarse — one
 * control, three ways in.
 */

export interface ChatBubbleParticipant {
  id: string;
  /** Already resolved for display — never a raw id. */
  name: string;
  avatarUrl?: string | null;
  /** Up to two letters, for people with no photo. */
  initials: string;
  /** From the presence channel. Omit where presence is not tracked. */
  online?: boolean;
  /** True while this person is actually typing in the conversation. */
  typing?: boolean;
  /** Marks the signed-in user, who is listed but not introduced by name. */
  isYou?: boolean;
}

export interface ChatBubbleProps {
  participants: ChatBubbleParticipant[];
  /** How many avatars ride in the collapsed bubble. @default 4 */
  maxVisibleAvatars?: number;
  /** Heading inside the panel. @default "In this conversation" */
  title?: string;
  /** Footer action. Omitted entirely rather than rendered dead. */
  actionLabel?: string;
  onAction?: () => void;
  /** One line under the action, for whatever the action is about to do. */
  actionHint?: string;
  className?: string;
}

/** How long the panel survives the pointer crossing the gap to reach it. */
const CLOSE_DELAY_MS = 180;

/**
 * Three bars, moving.
 *
 * Rendered only for someone who is typing right now, which is a real event on
 * the conversation's broadcast channel. Heights are fixed per bar rather than
 * randomised: a random height re-rolled on every render is a re-render storm
 * dressed up as liveliness, and at this size nobody can tell the difference.
 */
function TypingPulse({ className }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <span
      aria-hidden
      className={cn(
        "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-card",
        className,
      )}
    >
      <span className="flex h-3 w-3 items-end justify-center gap-[1.5px] rounded-full bg-primary p-[3px]">
        {[0.45, 1, 0.65].map((peak, i) => (
          <motion.span
            key={i}
            className="w-[1.5px] rounded-full bg-primary-foreground"
            initial={{ height: "40%" }}
            animate={reduced ? { height: "70%" } : { height: ["35%", `${peak * 100}%`, "35%"] }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }
            }
          />
        ))}
      </span>
    </span>
  );
}

function ParticipantAvatar({
  participant,
  size,
  ring,
}: {
  participant: ChatBubbleParticipant;
  size: "sm" | "lg";
  /** Ringed against the bubble it sits in, so the stack reads as separate faces. */
  ring?: boolean;
}) {
  const dim = size === "sm" ? "h-9 w-9 text-[11px]" : "h-12 w-12 text-sm";

  return (
    <span className="relative inline-flex shrink-0">
      <Avatar className={cn(dim, ring ? "ring-2 ring-card" : "border border-border")}>
        {participant.avatarUrl && <AvatarImage src={participant.avatarUrl} alt="" />}
        <AvatarFallback className="bg-muted font-semibold text-muted-foreground">
          {participant.initials}
        </AvatarFallback>
      </Avatar>
      {participant.typing ? (
        <TypingPulse />
      ) : (
        participant.online !== undefined && (
          <span
            aria-hidden
            className={cn(
              "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card",
              size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
              participant.online ? "bg-success" : "bg-muted-foreground/40",
            )}
          />
        )
      )}
    </span>
  );
}

export function ChatBubble({
  participants,
  maxVisibleAvatars = 4,
  title = "In this conversation",
  actionLabel,
  onAction,
  actionHint,
  className,
}: ChatBubbleProps) {
  const [open, setOpen] = React.useState(false);
  /**
   * Whether this opening was a hover. A hover must not steal focus from
   * whatever the user was doing; a keyboard opening must hand focus over.
   */
  const byHover = React.useRef(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  React.useEffect(() => cancelClose, [cancelClose]);

  const openByHover = (event: React.PointerEvent) => {
    // A tap fires pointerenter too; on a touchscreen the button's own click is
    // the way in, otherwise the panel opens under the finger and then toggles
    // shut on the same gesture.
    if (event.pointerType === "touch") return;
    cancelClose();
    byHover.current = true;
    setOpen(true);
  };

  const scheduleClose = (event: React.PointerEvent) => {
    if (event.pointerType === "touch") return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  if (participants.length === 0) return null;

  const visible = participants.slice(0, maxVisibleAvatars);
  const overflow = Math.max(0, participants.length - visible.length);
  const onlineCount = participants.filter((p) => p.online).length;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        cancelClose();
        // Anything that is not a hover — a click, Enter, Escape — is a
        // deliberate act, so it gets focus.
        if (next) byHover.current = false;
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerEnter={openByHover}
          onPointerLeave={scheduleClose}
          onFocus={() => {
            byHover.current = false;
            cancelClose();
            setOpen(true);
          }}
          aria-label={`${participants.length} ${
            participants.length === 1 ? "person" : "people"
          } in this conversation`}
          className={cn(
            "group inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border",
            "bg-card py-1 pl-1 pr-2.5 text-left shadow-sm transition-colors",
            "hover:border-accent/40 hover:bg-muted/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "data-[state=open]:border-accent/40 data-[state=open]:bg-muted/50",
            className,
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users className="h-4 w-4" />
          </span>

          <span className="flex -space-x-2.5">
            {visible.map((p, index) => (
              <span key={p.id} style={{ zIndex: visible.length - index }}>
                <ParticipantAvatar participant={p} size="sm" ring />
              </span>
            ))}
          </span>

          {overflow > 0 && (
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              +{overflow}
            </span>
          )}

          <ChevronRight
            aria-hidden
            className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-data-[state=open]:rotate-90"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        // A hover must not pull the caret out of the composer.
        onOpenAutoFocus={(e) => {
          if (byHover.current) e.preventDefault();
        }}
        onPointerEnter={cancelClose}
        onPointerLeave={scheduleClose}
        aria-label={title}
        className="w-[19rem] overflow-hidden rounded-2xl border-border bg-card p-0 shadow-lg"
      >
        <div className="flex items-baseline justify-between gap-2 px-4 pb-3 pt-4">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          <span className="text-xs tabular-nums text-muted-foreground">
            {onlineCount > 0
              ? `${onlineCount} online`
              : `${participants.length} ${participants.length === 1 ? "member" : "members"}`}
          </span>
        </div>

        <ul className="grid max-h-64 grid-cols-4 gap-x-2 gap-y-4 overflow-y-auto px-4 pb-4">
          {participants.map((p, index) => (
            <motion.li
              key={p.id}
              className="flex flex-col items-center gap-1.5"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: DURATION.base,
                ease: EASE_OUT_EXPO,
                delay: reduced ? 0 : Math.min(index * 0.03, 0.24),
              }}
            >
              <ParticipantAvatar participant={p} size="lg" />
              <span className="w-full truncate text-center text-[11px] font-medium leading-tight text-foreground">
                {p.isYou ? "You" : p.name}
              </span>
            </motion.li>
          ))}
        </ul>

        {actionLabel && onAction && (
          <div className="flex flex-col gap-1.5 border-t border-border bg-muted/40 p-4">
            <Button
              size="sm"
              className="w-full rounded-xl"
              onClick={() => {
                setOpen(false);
                onAction();
              }}
            >
              {actionLabel}
            </Button>
            {actionHint && (
              <p className="text-center text-[11px] text-muted-foreground">{actionHint}</p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
