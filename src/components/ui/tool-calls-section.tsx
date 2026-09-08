import { useState, type ReactNode } from "react";
import { ChevronDown, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The receipt strip: everything a turn actually did, collapsed to one line.
 *
 * A settled tool call is worth keeping and not worth reading twice, so this
 * shows the count and the icons by default and opens into the trace — each
 * call on a connector line, with its input and output behind a second click.
 *
 * Nothing is inferred. `message` is the caller's own description of what the
 * call did; when there isn't one the tool's name is shown as-is rather than a
 * sentence written to sound like a summary. A call with no input and no output
 * recorded simply does not expand.
 */

export interface ToolCallEntry {
  /** The tool's own name. Shown verbatim when there is no `message`. */
  toolName: string;
  /** What the call did, in the caller's words. */
  message?: string;
  /** Group it belongs to, e.g. "navigation". Hidden when absent. */
  category?: string;
  /** Icon for the call. Falls back to a wrench. */
  icon?: ReactNode;
  /** Arguments the call was made with. */
  inputs?: Record<string, unknown> | null;
  /** What came back. */
  output?: string | null;
  /** Rendered muted with a line through it — a call that did not run. */
  refused?: boolean;
}

export interface ToolCallsSectionProps {
  calls: readonly ToolCallEntry[];
  /** How many icons to stack before collapsing to a count. */
  maxIcons?: number;
  defaultExpanded?: boolean;
  className?: string;
}

function humanise(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Chevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <ChevronDown
      className={cn(
        "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
        open && "rotate-180",
        className,
      )}
    />
  );
}

export function ToolCallsSection({
  calls,
  maxIcons = 6,
  defaultExpanded = false,
  className,
}: ToolCallsSectionProps) {
  const [open, setOpen] = useState(defaultExpanded);
  const [openCalls, setOpenCalls] = useState<Set<number>>(() => new Set());

  if (calls.length === 0) return null;

  const toggleCall = (i: number) =>
    setOpenCalls((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const shown = calls.slice(0, maxIcons);
  const overflow = calls.length - shown.length;

  return (
    <div className={cn("w-fit max-w-full", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
        aria-expanded={open}
      >
        <span className="flex min-h-7 items-center -space-x-1.5">
          {shown.map((call, i) => (
            <span
              key={`${call.toolName}-${i}`}
              className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card"
              style={{
                rotate: shown.length > 1 ? (i % 2 === 0 ? "7deg" : "-7deg") : "0deg",
                zIndex: i,
              }}
            >
              {call.icon ?? <Wrench className="h-3.5 w-3.5" />}
            </span>
          ))}
          {overflow > 0 && (
            <span className="z-0 flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted text-[11px] tabular-nums">
              +{overflow}
            </span>
          )}
        </span>
        <span className="text-xs font-medium">
          {calls.length === 1 ? "1 action" : `${calls.length} actions`}
        </span>
        <Chevron open={open} />
      </button>

      <div
        className={cn(
          "grid transition-all duration-200",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-1">
            {calls.map((call, i) => {
              const hasDetail =
                (!!call.inputs && Object.keys(call.inputs).length > 0) || !!call.output;
              const isOpen = openCalls.has(i);
              return (
                <div key={`${call.toolName}-row-${i}`} className="flex items-stretch gap-2.5">
                  <div className="flex flex-col items-center self-stretch">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                      {call.icon ?? <Wrench className="h-3.5 w-3.5" />}
                    </span>
                    {i < calls.length - 1 && <span className="min-h-3 w-px flex-1 bg-border" />}
                  </div>

                  <div className="min-w-0 flex-1 pb-2">
                    <button
                      type="button"
                      onClick={() => hasDetail && toggleCall(i)}
                      className={cn(
                        "flex items-center gap-1 pt-1.5 text-left",
                        hasDetail ? "cursor-pointer" : "cursor-default",
                      )}
                      aria-expanded={hasDetail ? isOpen : undefined}
                    >
                      <span
                        className={cn(
                          "text-xs font-medium text-foreground",
                          call.refused && "text-muted-foreground line-through",
                        )}
                      >
                        {call.message || humanise(call.toolName)}
                      </span>
                      {hasDetail && <Chevron open={isOpen} className="h-3 w-3" />}
                    </button>

                    {call.category && (
                      <p className="text-[11px] text-muted-foreground">{humanise(call.category)}</p>
                    )}

                    {isOpen && hasDetail && (
                      <div className="mt-2 w-fit max-w-full space-y-2 rounded-xl bg-muted/60 p-3 text-[11px]">
                        {!!call.inputs && Object.keys(call.inputs).length > 0 && (
                          <div>
                            <p className="mb-1 font-medium text-muted-foreground">Input</p>
                            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground">
                              {JSON.stringify(call.inputs, null, 2)}
                            </pre>
                          </div>
                        )}
                        {call.output && (
                          <div>
                            <p className="mb-1 font-medium text-muted-foreground">Output</p>
                            <p className="whitespace-pre-wrap break-words leading-relaxed text-foreground">
                              {call.output}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ToolCallsSection;
