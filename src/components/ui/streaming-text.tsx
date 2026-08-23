import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A short status line that reveals word-by-word as it changes, with a
 * blinking cursor while `active`. Built for Advisor's loading state — the
 * words the model is "thinking" through (e.g. "Reading your profile…")
 * arrive as plain, short strings from real state, never fabricated text, so
 * this only ever animates real data already flowing through the page.
 *
 * Deliberately does not touch the answer itself: that is rendered through
 * ReactMarkdown and re-parsed on every streamed chunk, so splitting it into
 * per-word spans here would risk breaking mid-token markup. This is for the
 * short status/keyword line only.
 */
export interface StreamingTextProps {
  text: string;
  /** Shows the blinking cursor and re-triggers the reveal on change. */
  active: boolean;
  className?: string;
}

export function StreamingText({ text, active, className }: StreamingTextProps) {
  const words = text.split(" ").filter(Boolean);
  const [revealKey, setRevealKey] = useState(0);
  const prevText = useRef(text);

  useEffect(() => {
    if (text !== prevText.current) {
      prevText.current = text;
      setRevealKey((k) => k + 1);
    }
  }, [text]);

  return (
    <span className={cn("inline", className)}>
      {words.map((word, i) => (
        <span
          key={`${revealKey}-${i}`}
          className="inline animate-fade-in"
          style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
        >
          {word}{" "}
        </span>
      ))}
      {active && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 animate-pulse rounded-full bg-primary"
        />
      )}
    </span>
  );
}
