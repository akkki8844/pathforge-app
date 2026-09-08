import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StreamingText } from "@/components/ui/streaming-text";
import { ChatReasoning } from "@/components/ui/chat-reasoning";

/**
 * The advisor's reasoning, shown the way Claude shows it: a collapsible block
 * that sits above the answer, streams live while the model thinks, and settles
 * into a one-line summary once the answer starts.
 *
 * Inside, the trace is drawn as steps on a rail rather than as one paragraph —
 * a turn that thinks, reconsiders, then concludes reads as three moves instead
 * of a wall. The steps are the model's own paragraph breaks; nothing is
 * summarised, relabelled or invented on the way through.
 *
 * The glowing keyword is deliberately kept from the previous implementation —
 * it is the part of this screen with the most personality. It only ever glows
 * while `streaming` is true, and reduced-motion users get the colour without
 * the pulse.
 */

const THINKING_KEYWORDS = [
  "Tinkering",
  "Discombobulating",
  "Calibrating",
  "Triangulating",
  "Untangling",
  "Synthesizing",
  "Cross-checking",
  "Pressure-testing",
  "Refining",
] as const;

/** Round-robin from a random start: no repeats back-to-back, no first-item bias. */
let keywordCursor = Math.floor(Math.random() * THINKING_KEYWORDS.length);
export function nextThinkingKeyword(): string {
  const word = THINKING_KEYWORDS[keywordCursor % THINKING_KEYWORDS.length];
  keywordCursor += 1;
  return word;
}

export interface ThinkingBlockProps {
  /** Raw reasoning text streamed so far. */
  reasoning: string;
  /** True while the model is still working on this turn. */
  streaming: boolean;
  /** Seconds elapsed for this turn. */
  seconds: number;
  /** The held keyword for this turn. */
  keyword: string;
  /** Effort label ("Balanced", "Deep") shown next to the timer. */
  effortLabel: string;
  /** Server-sent status line, e.g. "Building your file…". */
  status?: string | null;
  /** Answer text received so far — used to decide the auto-collapse moment. */
  hasAnswer: boolean;
}

export function ThinkingBlock({
  reasoning,
  streaming,
  seconds,
  keyword,
  effortLabel,
  status,
  hasAnswer,
}: ThinkingBlockProps) {
  const prefersReducedMotion = useReducedMotion();
  const hasReasoning = reasoning.trim().length > 0;

  // Open while thinking, closed once the answer starts — but a manual toggle
  // wins from then on, so expanding to read the reasoning doesn't snap shut
  // the moment the first token of the answer lands.
  const [manual, setManual] = useState<boolean | null>(null);
  const auto = streaming && !hasAnswer;
  const open = manual ?? auto;

  // The model's own paragraph breaks are the steps. Splitting anywhere else
  // would be this component inventing structure the model did not produce.
  const steps = useMemo(
    () =>
      reasoning
        .split(/\n{2,}/)
        .map((s) => s.trim())
        .filter(Boolean),
    [reasoning],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open || !streaming) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [reasoning, open, streaming]);

  const summary = streaming
    ? status || (hasReasoning ? "Thinking through it" : "Working on it")
    : hasReasoning
      ? `Thought for ${seconds}s`
      : `Answered in ${seconds}s`;

  const trigger = (
    <span className="flex flex-1 items-baseline gap-2">
      {/* Real turn status, not a decorative spinner: it mirrors `streaming` /
          `hasAnswer` exactly, the same booleans the summary line below reads. */}
      {streaming ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 translate-y-[2px] animate-spin text-accent" />
      ) : hasReasoning ? (
        <Check className="h-3.5 w-3.5 shrink-0 translate-y-[2px] text-accent" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 translate-y-[2px] text-muted-foreground opacity-0" />
      )}
      {streaming ? (
        <>
          {/* Glowing accent keyword, Claude-CLI style. Tuned twice: softer on
              the cream light background, brighter on dark navy. */}
          <motion.span
            className={cn(
              "text-sm font-medium text-accent",
              "[text-shadow:0_0_10px_hsl(var(--accent)_/_0.40),0_0_24px_hsl(var(--accent)_/_0.18)]",
              "dark:[text-shadow:0_0_10px_hsl(var(--accent)_/_0.60),0_0_26px_hsl(var(--accent)_/_0.32)]",
            )}
            animate={prefersReducedMotion ? undefined : { opacity: [1, 0.6, 1] }}
            transition={
              prefersReducedMotion
                ? undefined
                : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
            }
          >
            {keyword}
          </motion.span>
          <span className="text-xs text-muted-foreground">
            ({seconds}s ·{" "}
            <StreamingText text={status || `thinking with ${effortLabel}`} active />)
          </span>
        </>
      ) : (
        <span className="text-xs font-medium text-muted-foreground">{summary}</span>
      )}
    </span>
  );

  return (
    <div className="mb-2 rounded-xl border border-border/70 bg-card/60">
      <div ref={scrollRef} className="max-h-72 overflow-y-auto">
        <ChatReasoning
          parts={steps}
          renderPart={(step) => (
            <p className="whitespace-pre-wrap py-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {step}
            </p>
          )}
          summary={trigger}
          open={open}
          onOpenChange={(next) => setManual(next)}
          disabled={!hasReasoning && !streaming}
          emptyText={
            streaming
              ? "No reasoning yet for this turn."
              : "No reasoning trace for this turn — this model answers directly."
          }
        />
      </div>
    </div>
  );
}
