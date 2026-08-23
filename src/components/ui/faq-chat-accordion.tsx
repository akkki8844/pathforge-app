import { cn } from "@/lib/utils";

export interface FaqItem {
  question: string;
  answer: string;
  /** iMessage-style tapback emoji, shown on some messages only. */
  reaction?: string;
  /** Which bubble the reaction sits on. Defaults to "answer". */
  reactOn?: "question" | "answer";
}

interface FaqAccordionProps {
  data: FaqItem[];
  className?: string;
  questionClassName?: string;
  answerClassName?: string;
}

/**
 * iMessage-style FAQ thread: the question is the "sent" bubble (blue, right,
 * tail on the bottom-right), the answer is the "received" bubble (gray, left,
 * tail on the bottom-left) directly beneath it — both always visible, so
 * reading the FAQ never requires tapping anything open.
 */
export function FaqAccordion({
  data,
  className,
  questionClassName,
  answerClassName,
}: FaqAccordionProps) {
  return (
    <div className={cn("w-full space-y-3", className)}>
      {data.map((item, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <div className="flex justify-end">
            <div
              className={cn(
                "relative max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-left text-sm leading-snug text-accent-foreground shadow-sm sm:max-w-[75%]",
                questionClassName,
              )}
            >
              {item.question}
              {item.reaction && item.reactOn === "question" && (
                <span
                  aria-hidden="true"
                  className="absolute -top-3 -left-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-sm shadow-md"
                >
                  {item.reaction}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-start">
            <div
              className={cn(
                "relative max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm leading-snug text-foreground sm:max-w-[75%]",
                answerClassName,
              )}
            >
              {item.answer}
              {item.reaction && (!item.reactOn || item.reactOn === "answer") && (
                <span
                  aria-hidden="true"
                  className="absolute -top-3 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-sm shadow-md"
                >
                  {item.reaction}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
