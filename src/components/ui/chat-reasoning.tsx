import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/**
 * A model's reasoning, as a collapsible trace rather than a wall of text.
 *
 * Each step is drawn against a vertical rail — a dot for the step, a line down
 * to the next one, fading out at the last — so a turn that thought, called a
 * tool, then thought again reads in the order it happened instead of as two
 * paragraphs with a card wedged between them.
 *
 * The component owns none of the content. `parts` is whatever the caller has
 * actually got for this turn and `renderPart` decides how each one looks, so
 * nothing here can invent a step that did not happen: an empty `parts` renders
 * an empty rail.
 *
 * Open state is controlled by the caller. Advisor wants it open while the model
 * is working and closed once the answer starts, but with a manual toggle that
 * wins from then on, and that rule belongs to the caller, not here.
 */
export interface ChatReasoningProps<T> {
  /** The steps of this turn, in the order they happened. */
  parts: readonly T[];
  /** Draws one step. The index is the step's position on the rail. */
  renderPart: (part: T, index: number) => ReactNode;
  /** What the trigger says — the caller's own status line. */
  summary: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** No trace to show: the trigger stays, unopenable. */
  disabled?: boolean;
  /** Shown in place of the rail when there are no parts. */
  emptyText?: string;
  className?: string;
}

export function ChatReasoning<T>({
  parts,
  renderPart,
  summary,
  open,
  onOpenChange,
  disabled = false,
  emptyText,
  className,
}: ChatReasoningProps<T>) {
  return (
    <Accordion
      type="single"
      collapsible
      value={open && !disabled ? "reasoning" : ""}
      onValueChange={(v) => onOpenChange(v === "reasoning")}
      className={cn("w-full", className)}
    >
      <AccordionItem value="reasoning" className="w-full border-b-0">
        <AccordionTrigger
          disabled={disabled}
          className={cn(
            "w-full rounded-xl px-3 py-2 text-left hover:no-underline",
            !disabled && "hover:bg-secondary/40",
            disabled && "cursor-default [&>svg]:opacity-0",
          )}
        >
          {summary}
        </AccordionTrigger>

        <AccordionContent className="px-3 pb-3 pt-0">
          {parts.length === 0 ? (
            emptyText ? (
              <p className="text-[12.5px] italic leading-relaxed text-muted-foreground">
                {emptyText}
              </p>
            ) : null
          ) : (
            <div className="flex flex-col">
              {parts.map((part, index) => (
                <div key={index} className="flex gap-2.5">
                  {/* The rail. The last segment fades rather than stopping
                      square, so the trace reads as ending instead of as cut. */}
                  <div className="-mb-1 flex flex-col items-center gap-1 pt-2">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    <div
                      className={cn(
                        "min-h-0 w-px flex-1 bg-border",
                        index === parts.length - 1 &&
                          "bg-gradient-to-b from-border to-transparent",
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1 pb-1">{renderPart(part, index)}</div>
                </div>
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
