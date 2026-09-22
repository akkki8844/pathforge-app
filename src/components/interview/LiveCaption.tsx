/**
 * Live captions.
 *
 * On by default, and that is a deliberate call rather than an accessibility
 * checkbox. Speech recognition mishears, and a candidate who can see that
 * "robotics" was transcribed as "rebate" knows to say it again — without the
 * captions they would find out from a report that graded the wrong word. It
 * also makes the room usable with the sound off, on a train, in a library.
 *
 * The interviewer's line is revealed progressively rather than all at once, at
 * roughly speaking rate, so reading it tracks hearing it instead of racing
 * ahead.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import type { InterviewPhase } from "@/hooks/useInterviewSession";

/** Words per minute the reveal runs at. Unhurried conversational speech. */
const REVEAL_WPM = 165;

export function LiveCaption({
  phase,
  interviewerName,
  line,
  transcript,
  interim,
  className,
}: {
  phase: InterviewPhase;
  interviewerName: string;
  /** The interviewer's current utterance. */
  line: string;
  /** What the candidate has said so far this turn. */
  transcript: string;
  /** The in-flight guess at the words being said right now. */
  interim: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState("");
  const lineRef = useRef(line);

  useEffect(() => {
    lineRef.current = line;
    if (!line) { setRevealed(""); return; }

    const words = line.split(/(\s+)/);
    const perWord = 60_000 / REVEAL_WPM;
    let i = 0;
    setRevealed("");

    const id = window.setInterval(() => {
      // A new line replacing this one mid-reveal must stop the old interval
      // writing over it — otherwise two utterances interleave word by word.
      if (lineRef.current !== line) { window.clearInterval(id); return; }
      i += 1;
      setRevealed(words.slice(0, i * 2).join(""));
      if (i * 2 >= words.length) window.clearInterval(id);
    }, perWord);

    return () => window.clearInterval(id);
  }, [line]);

  const candidateText = [transcript, interim].filter(Boolean).join(" ").trim();
  const showingCandidate = phase === "listening" || phase === "thinking";
  const body = showingCandidate ? candidateText : revealed;
  const speaker = showingCandidate ? "You" : interviewerName;

  const placeholder =
    phase === "listening" && !candidateText
      ? "Listening…"
      : phase === "thinking" && !candidateText
        ? "…"
        : "";

  return (
    <div className={cn("pointer-events-none flex justify-center px-4", className)}>
      <AnimatePresence mode="wait">
        {(body || placeholder) && (
          <motion.div
            key={showingCandidate ? "candidate" : `line-${line.slice(0, 24)}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            className="max-w-3xl rounded-2xl border border-white/10 bg-black/55 px-4 py-3 shadow-xl backdrop-blur-md sm:px-5 sm:py-3.5"
          >
            <p
              className={cn(
                "mb-1 font-display text-[10px] font-bold uppercase tracking-[0.16em]",
                showingCandidate ? "text-accent" : "text-white/55",
              )}
            >
              {speaker}
            </p>
            <p className="text-balance text-[15px] leading-relaxed text-white/95 sm:text-base">
              {body || <span className="text-white/45">{placeholder}</span>}
              {showingCandidate && interim && (
                <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-accent" />
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
