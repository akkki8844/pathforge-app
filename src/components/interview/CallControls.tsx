/**
 * The bar along the bottom of the call.
 *
 * Every real video app puts the same five things here in roughly the same
 * order, and matching that is the point — a control layout a student has to
 * learn is a control layout that pulls them out of the interview. The one
 * addition is "Done answering", which exists because the alternative is sitting
 * through the silence timer when you already know you've finished.
 *
 * Leaving is an AlertDialog, not a button. Half an interview is worth less than
 * none and a misclick on a trackpad should not be able to end one.
 */
import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, Captions, CaptionsOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import type { InterviewPhase } from "@/hooks/useInterviewSession";

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ControlButton({
  label,
  active,
  danger,
  onClick,
  disabled,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950",
            "disabled:cursor-not-allowed disabled:opacity-40",
            danger
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : active
                ? "bg-white/15 text-white hover:bg-white/25"
                : "bg-white/[0.07] text-white/55 hover:bg-white/15 hover:text-white/80",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function CallControls({
  phase,
  elapsedSeconds,
  micOn,
  cameraOn,
  captionsOn,
  onToggleMic,
  onToggleCamera,
  onToggleCaptions,
  onSubmitAnswer,
  onLeave,
  className,
}: {
  phase: InterviewPhase;
  elapsedSeconds: number;
  micOn: boolean;
  cameraOn: boolean;
  captionsOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleCaptions: () => void;
  onSubmitAnswer: () => void;
  onLeave: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO, delay: 0.15 }}
      className={cn(
        "flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-2 shadow-2xl backdrop-blur-md sm:gap-2.5 sm:px-4",
        className,
      )}
    >
      <span className="hidden min-w-[3.25rem] px-1 font-display text-sm font-bold tabular-nums text-white/70 sm:inline">
        {formatClock(elapsedSeconds)}
      </span>

      <ControlButton label={micOn ? "Mute microphone" : "Unmute microphone"} active={micOn} onClick={onToggleMic}>
        {micOn ? <Mic className="h-[18px] w-[18px]" /> : <MicOff className="h-[18px] w-[18px]" />}
      </ControlButton>

      <ControlButton label={cameraOn ? "Turn camera off" : "Turn camera on"} active={cameraOn} onClick={onToggleCamera}>
        {cameraOn ? <Video className="h-[18px] w-[18px]" /> : <VideoOff className="h-[18px] w-[18px]" />}
      </ControlButton>

      <ControlButton label={captionsOn ? "Hide captions" : "Show captions"} active={captionsOn} onClick={onToggleCaptions}>
        {captionsOn ? <Captions className="h-[18px] w-[18px]" /> : <CaptionsOff className="h-[18px] w-[18px]" />}
      </ControlButton>

      <div className="mx-0.5 h-6 w-px bg-white/10" />

      {/*
        Only offered while the floor is actually theirs. Shown disabled rather
        than hidden so the bar doesn't reflow every time the interviewer starts
        or stops talking — a control that moves is a control you misclick.
      */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={phase !== "listening"}
            onClick={onSubmitAnswer}
            className="h-9 rounded-full border-0 bg-white/10 px-3 text-white hover:bg-white/20 disabled:opacity-35 sm:px-4"
          >
            <span className="font-display text-xs font-bold uppercase tracking-[0.08em]">
              Done answering
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          Send your answer now instead of waiting for the pause
        </TooltipContent>
      </Tooltip>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 rounded-full bg-destructive px-3 text-destructive-foreground hover:bg-destructive/90 sm:px-4"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            <span className="hidden font-display text-xs font-bold uppercase tracking-[0.08em] sm:inline">
              Leave
            </span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave the interview?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll still get a report on what you've said so far, but a short interview
              gives thin feedback. If you're mid-thought, go back and finish the answer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay in the call</AlertDialogCancel>
            <AlertDialogAction
              onClick={onLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave and get my report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
